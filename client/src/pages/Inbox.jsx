import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import NoteCard from '../components/NoteCard';
import ProcessingOverlay from '../components/ProcessingOverlay';
import ManageListsSheet from '../components/ManageListsSheet';
import { FolderIcon } from '../components/icons';
import { useSSE } from '../hooks/useSSE';
import { Search, Filter, Loader2, Inbox as InboxIcon, ChevronDown, Layers, Youtube, Instagram, Zap } from 'lucide-react';

const PLACEHOLDER_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sortd';
const PINNED_KEY = 'sortd_pinned_lists';
const PAGE_SIZE = 10;

function getPinnedIds() {
  try {
    const s = localStorage.getItem(PINNED_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export default function Inbox() {
  const [notes, setNotes]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch]         = useState('');
  const [activeJobs, setActiveJobs] = useState([]);
  const [lists, setLists]             = useState([]);
  const [pinnedIds, setPinnedIds]     = useState(getPinnedIds);
  const [isManaging, setIsManaging]   = useState(false);
  const [showSearch, setShowSearch]   = useState(false);
  const [page, setPage]               = useState(0);
  const [hasMore, setHasMore]         = useState(true);
  const searchRef                     = useRef(null);

  const fetchNotes = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const currentPage = isLoadMore ? page + 1 : 0;
      const { notes: newNotes, total } = await api.getNotes({ 
        search, 
        limit: PAGE_SIZE, 
        offset: currentPage * PAGE_SIZE 
      });
      
      if (isLoadMore) {
        setNotes(prev => [...prev, ...newNotes]);
        setPage(currentPage);
      } else {
        setNotes(newNotes);
        setPage(0);
      }
      
      setHasMore(notes.length + newNotes.length < total);
    } catch (err) {
      console.error('Failed to fetch notes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchLists = async () => {
    try { setLists(await api.getLists()); }
    catch (err) { console.error('Failed to fetch lists'); }
  };

  useEffect(() => { fetchNotes(); }, [search]);
  useEffect(() => { fetchLists(); }, []);

  const handleToggleFavorite = async (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // Optimistic update
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, starred: !n.starred } : n));
    
    try {
      const updated = await api.updateNote(noteId, { starred: !note.starred });
      setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
    } catch (err) {
      console.error('Failed to toggle favourite');
      // Revert on failure
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, starred: note.starred } : n));
    }
  };

  const handleToggleListInInbox = (listId) => {
    const current    = pinnedIds ?? lists.map(l => l.id);
    const newPinned  = current.includes(listId)
      ? current.filter(id => id !== listId)
      : [...current, listId];
    setPinnedIds(newPinned);
    localStorage.setItem(PINNED_KEY, JSON.stringify(newPinned));
  };

  const listsWithVisibility = lists.map(l => ({
    ...l,
    showInInbox: pinnedIds === null ? true : pinnedIds.includes(l.id),
  }));
  const visibleLists = listsWithVisibility.filter(l => l.showInInbox).slice(0, 6);

  const handleEvent = useCallback((event) => {
    const notifsActive = localStorage.getItem('sortd_notifications_active') === 'true';

    if (event.type === 'job_done') {
      const note = event.data.note;
      setNotes(prev => {
        if (prev.find(n => n.id === note.id)) return prev;
        return [note, ...prev];
      });
      api.getLists().then(setLists).catch(console.error);

      if (notifsActive && Notification.permission === 'granted') {
        new Notification("New Clip Captured!", {
          body: note.title || "Your content has been processed.",
          icon: note.thumbnail || "/pwa-192.png",
          badge: "/pwa-192.png"
        });
      }
    }

    if (event.type === 'job_queued' || event.type === 'job_started') {
      setActiveJobs(prev => {
        const exists = prev.find(j => (j.data?.jobId || j.jobId) === (event.data?.jobId || event.jobId));
        if (exists) return prev.map(j => (j.data?.jobId || j.jobId) === (event.data?.jobId || event.jobId) ? event : j);
        return [...prev, event];
      });
    } else if (event.type === 'job_done' || event.type === 'job_failed') {
      if (event.type === 'job_failed' && notifsActive && Notification.permission === 'granted') {
        new Notification("Processing Failed", {
          body: "We couldn't process that link. Please try another one.",
          icon: "/pwa-192.png"
        });
      }

      setActiveJobs(prev =>
        prev.map(j =>
          (j.data?.jobId || j.jobId) === (event.data?.jobId || event.jobId) ? event : j
        )
      );
      setTimeout(() => {
        setActiveJobs(prev =>
          prev.filter(j =>
            (j.data?.jobId || j.jobId) !== (event.data?.jobId || event.jobId)
          )
        );
      }, 5000);
    }
  }, []);

  useSSE(handleEvent);

  return (
    <div className="px-6 pt-12 pb-32 max-w-[680px] mx-auto">
      <ProcessingOverlay jobs={activeJobs} />

      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="transition-transform active:scale-95">
            <img
              src={PLACEHOLDER_AVATAR}
              alt="avatar"
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            />
          </Link>
          <div className="w-1 h-1 bg-black/10 rounded-full" />
          <span className="text-[14px] font-black opacity-20 uppercase tracking-widest">
            Sortd
          </span>
        </div>

        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-2 bg-white rounded-full neo-shadow border border-black/5 active:scale-95 transition-transform"
        >
          <Search size={20} className="text-black/30" />
        </button>
      </div>

      {/* Search input */}
      {showSearch && (
        <div className="mb-6">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search your captures..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-flat"
            autoFocus
          />
        </div>
      )}

      {/* Folder grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[22px] font-extrabold tracking-tight">Your Lists</h2>
        <button
          onClick={() => setIsManaging(true)}
          className="text-[12px] font-bold text-black/30 flex items-center gap-1 hover:text-black transition-colors"
        >
          Manage <Filter size={12} />
        </button>
      </div>

      {visibleLists.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {visibleLists.map(l => (
            <Link 
              key={l.id} 
              to={`/lists/${l.id}`}
              className="folder-card flex flex-col gap-3 relative overflow-hidden transition-transform active:scale-95 hover:opacity-90"
              style={{ background: l.color || '#a2d2ff' }}
            >
              <div className="text-[10px] font-bold text-white/60 absolute top-3 right-3">
                {l.note_count ?? 0}
              </div>
              <FolderIcon color="rgba(255,255,255,0.4)" size={28} />
              <div className="text-[11px] font-extrabold text-white tracking-tight">
                {l.name}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white/50 border border-dashed border-black/10 rounded-2xl py-6 text-center mb-8">
          <p className="text-[12px] font-bold text-black/30">No lists selected</p>
          <button onClick={() => setIsManaging(true)} className="text-[12px] font-bold text-[#33b1ff] mt-1">
            Configure
          </button>
        </div>
      )}

      {/* Recent Clips */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[22px] font-extrabold tracking-tight">Recent Clips</h2>
      </div>

      {loading && page === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="spinner text-[#33b1ff]" />
        </div>
      ) : notes.length > 0 ? (
        <>
          {notes.map(note => (
            <NoteCard key={note.id} note={note} onToggleFavorite={handleToggleFavorite} />
          ))}
          
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => fetchNotes(true)} 
                disabled={loadingMore}
                className="btn-primary flex items-center gap-2"
                style={{ background: 'white', color: '#1a1d1f', border: '1px solid #efefef' }}
              >
                {loadingMore ? (
                  <Loader2 size={18} className="spinner" />
                ) : (
                  <>
                    Load More <ChevronDown size={18} />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center py-8 px-6 bg-white rounded-[32px] neo-shadow border border-black/5 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#33b1ff] to-[#7b61ff]" />
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <Layers className="text-[#33b1ff]" size={24} />
          </div>
          <h3 className="text-[18px] font-extrabold tracking-tight mb-2">Ready to save your first clip?</h3>
          <p className="text-[13px] text-black/40 font-bold leading-relaxed mb-5 max-w-[280px]">
            Paste a link from Instagram or YouTube to create an organized, searchable note in seconds.
          </p>
          
          <div className="flex flex-col gap-2 w-full max-w-[240px]">
            <div className="flex items-center gap-3 p-3 bg-[#f5f7f9] rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-black/5">
                <Youtube size={16} className="text-red-500" />
              </div>
              <span className="text-[12px] font-bold text-black/60 text-left">Save a recipe <br/>or tutorial</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f5f7f9] rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-black/5">
                <Instagram size={16} className="text-pink-500" />
              </div>
              <span className="text-[12px] font-bold text-black/60 text-left">Keep a travel <br/>reel for later</span>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#33b1ff]">
            Tap the + button to get started
          </div>
        </div>
      )}

      {isManaging && (
        <ManageListsSheet
          lists={listsWithVisibility}
          onToggle={handleToggleListInInbox}
          onClose={() => setIsManaging(false)}
        />
      )}
    </div>
  );
}
