import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { api } from '../api';
import NoteCard from '../components/NoteCard';
import ProcessingOverlay from '../components/ProcessingOverlay';
import ManageListsSheet from '../components/ManageListsSheet';
import MemoryLane from '../components/MemoryLane';
import { FolderIcon } from '../components/icons';
import { useProcessing } from '../contexts/ProcessingContext';
import { useAuth, supabase } from '../contexts/AuthContext';
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
  const [search, setSearch]           = useState('');
  const { activeJobs }                = useProcessing();
  const { user }                      = useAuth();
  const [pinnedIds, setPinnedIds]     = useState(getPinnedIds);
  const [isManaging, setIsManaging]   = useState(false);
  const [showSearch, setShowSearch]   = useState(false);
  const searchRef                     = useRef(null);
  const processedJobsRef              = useRef(new Set());

  // SWR for Lists
  const { data: lists = [], mutate: mutateLists } = useSWR('/api/lists', () => api.getLists());

  // SWR for Notes (Infinite)
  const getKey = (pageIndex, previousPageData) => {
    if (previousPageData && !previousPageData.notes.length) return null;
    return ['/api/notes', search, pageIndex];
  };

  const { data, isLoading, size: page, setSize: setPage, mutate: mutateNotes } = useSWRInfinite(
    getKey,
    async ([url, searchStr, pageIndex]) => {
      return await api.getNotes({ search: searchStr, limit: PAGE_SIZE, offset: pageIndex * PAGE_SIZE });
    },
    { revalidateFirstPage: true, keepPreviousData: true }
  );

  const notes = data ? data.flatMap(p => p.notes) : [];
  const total = data?.[0]?.total ?? 0;
  const hasMore = data ? notes.length < total : true;
  const loadingMore = isLoading || (page > 0 && data && typeof data[page - 1] === "undefined");
  const loading = isLoading && notes.length === 0;

  const handleToggleFavorite = async (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // Optimistic update
    mutateNotes(currentData => {
      if (!currentData) return currentData;
      return currentData.map(p => ({
        ...p,
        notes: p.notes.map(n => n.id === noteId ? { ...n, starred: !n.starred } : n)
      }));
    }, false);
    
    try {
      await api.updateNote(noteId, { starred: !note.starred });
    } catch (err) {
      console.error('Failed to toggle favourite');
      mutateNotes();
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

  const listsWithVisibility = [...lists]
    .sort((a, b) => (b.note_count || 0) - (a.note_count || 0))
    .map(l => ({
      ...l,
      showInInbox: pinnedIds === null ? true : pinnedIds.includes(l.id),
    }));
  const visibleLists = listsWithVisibility.filter(l => l.showInInbox).slice(0, 3);

  // 🟢 Supabase Realtime Subscription
  useEffect(() => {
    if (!user?.id) return;

    console.log('📡 [Realtime] Initializing subscription for user:', user.id);
    
    const channel = supabase
      .channel(`inbox-changes-${user.id}`) // Unique channel name
      .on('postgres_changes', { 
        event: '*', 
        table: 'notes', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        console.group('🔄 [Realtime] Note Change Detected');
        console.log('Event Type:', payload.eventType);
        console.log('Payload:', payload);
        console.groupEnd();
        
        // Force a fresh fetch from server
        mutateNotes(undefined, { revalidate: true });
      })
      .on('postgres_changes', { 
        event: '*', 
        table: 'lists', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        console.log('🔄 [Realtime] List Change Detected:', payload.eventType);
        mutateLists();
      })
      .subscribe((status) => {
        console.log('📡 [Realtime] Subscription Status:', status);
      });

    return () => {
      console.log('🔌 [Realtime] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, mutateNotes, mutateLists]);

  // Handle job notifications and data refresh
  useEffect(() => {
    activeJobs.forEach(job => {
      const jobId = job.data?.jobId || job.jobId;
      if (job.type === 'job_done' && jobId && !processedJobsRef.current.has(jobId)) {
        processedJobsRef.current.add(jobId);
        
        console.log('🎉 [Job Done] Refreshing Inbox data...');
        mutateNotes();
        mutateLists();
        
        // Notification logic
        const note = job.data?.note;
        const notifsActive = localStorage.getItem('sortd_notifications_active') === 'true';
        if (notifsActive && Notification.permission === 'granted') {
          new Notification("New Clip Captured!", {
            body: note?.title || "Your content has been processed.",
            icon: note?.thumbnail || "/pwa-192.png"
          });
        }
      }
    });
  }, [activeJobs, mutateNotes, mutateLists]);

  return (
    <div className="px-6 md:px-12 pt-12 pb-32 w-full max-w-5xl mx-auto">

      <div className="hidden md:block mb-12">
        <h1 className="text-[32px] md:text-[42px] font-black tracking-tighter text-[#1a1d1f] leading-tight mb-2">
          Organize your <br className="hidden md:block" /> digital universe.
        </h1>
        <p className="text-sm md:text-base font-bold text-black/30">Capture everything that inspires you.</p>
      </div>

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

      {/* Memory Lane */}
      <MemoryLane />

      {/* Folder grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[22px] font-extrabold tracking-tight">Your Lists</h2>
        <button
          onClick={() => setIsManaging(true)}
          className="text-[12px] font-bold text-black/30 flex items-center gap-1 hover:text-[#33b1ff] transition-colors"
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
              className="relative w-full aspect-[40/32] flex items-center justify-center transition-transform active:scale-95 group"
            >
              <FolderIcon color={l.color || '#33b1ff'} />
              <div className="absolute inset-0 flex items-center justify-center pt-[12%] px-[15%] text-center">
                <div className="text-[clamp(10px,2.5vw,12px)] font-black text-white leading-tight line-clamp-1">
                  {l.name}
                </div>
              </div>
              <div className="absolute top-[0%] right-[2%] bg-white/80 backdrop-blur-lg rounded-full w-[22%] aspect-square flex items-center justify-center text-[clamp(8px,1.5vw,10px)] font-black text-[#33b1ff] border border-white/60 shadow-sm group-hover:scale-110 transition-transform">
                {l.note_count ?? 0}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            {notes.map(note => (
              <NoteCard key={note.id} note={note} onToggleFavorite={handleToggleFavorite} />
            ))}
          </div>
          
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => setPage(page + 1)} 
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
