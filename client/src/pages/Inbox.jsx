import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import NoteCard from '../components/NoteCard';
import ProcessingOverlay from '../components/ProcessingOverlay';
import ManageListsSheet from '../components/ManageListsSheet';
import { FolderIcon } from '../components/icons';
import { useSSE } from '../hooks/useSSE';
import { Search, Filter, Loader2, Inbox as InboxIcon } from 'lucide-react';

const PLACEHOLDER_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sortd';
const PINNED_KEY = 'sortd_pinned_lists';

function getPinnedIds() {
  try {
    const s = localStorage.getItem(PINNED_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export default function Inbox() {
  const [notes, setNotes]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [activeJobs, setActiveJobs] = useState([]);
  const [lists, setLists]             = useState([]);
  const [pinnedIds, setPinnedIds]     = useState(getPinnedIds);
  const [isManaging, setIsManaging]   = useState(false);
  const [showSearch, setShowSearch]   = useState(false);
  const searchRef                     = useRef(null);

  const fetchNotes = async () => {
    try {
      const data = await api.getNotes({ search });
      setNotes(data);
    } catch (err) {
      console.error('Failed to fetch notes');
    } finally {
      setLoading(false);
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
    try {
      const updated = await api.updateNote(noteId, { starred: !note.starred });
      setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
    } catch (err) {
      console.error('Failed to toggle favourite');
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
    if (event.type === 'job_done') {
      setNotes(prev => [event.data.note, ...prev]);
    }
    if (event.type === 'job_queued' || event.type === 'job_started') {
      setActiveJobs(prev => {
        const exists = prev.find(j => j.data?.jobId === event.data?.jobId);
        if (exists) return prev.map(j => j.data?.jobId === event.data?.jobId ? event : j);
        return [...prev, event];
      });
    } else if (event.type === 'job_done' || event.type === 'job_failed') {
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

      {/* ── Top bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <img
            src={PLACEHOLDER_AVATAR}
            alt="avatar"
            className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
          />
          <div className="w-1 h-1 bg-black/10 rounded-full" />
          <span className="text-[14px] font-extrabold opacity-20 uppercase tracking-widest">
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

      {/* ── Search input ─────────────────────────────── */}
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

      {/* ── Folder grid ──────────────────────────────── */}
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
            <div 
              key={l.id} 
              className="folder-card flex flex-col gap-3 relative overflow-hidden"
              style={{ background: l.color || '#a2d2ff' }}
            >
              <div className="text-[10px] font-bold text-white/60 absolute top-3 right-3">
                {l.note_count ?? 0}
              </div>
              <FolderIcon color="rgba(255,255,255,0.4)" size={28} />
              <div className="text-[11px] font-extrabold text-white tracking-tight">
                {l.name}
              </div>
            </div>
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

      {/* ── Recent Clips ──────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[22px] font-extrabold tracking-tight">Recent Clips</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="spinner text-[#33b1ff]" />
        </div>
      ) : notes.length > 0 ? (
        notes.map(note => (
          <NoteCard key={note.id} note={note} onToggleFavorite={handleToggleFavorite} />
        ))
      ) : (
        <div className="flex flex-col items-center py-20 opacity-25">
          <InboxIcon size={56} strokeWidth={1} />
          <p className="mt-4 font-bold">Your inbox is empty</p>
          <p className="text-[14px] mt-1 text-center max-w-[260px] text-[#6f767e]">
            Paste a URL or upload a screenshot in the Add tab
          </p>
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
