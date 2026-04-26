import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { api } from '../api';
import NoteCard from '../components/NoteCard';
import { ArrowLeft, Loader2, Trash2, Folder } from 'lucide-react';

export default function ListView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: lists, isLoading: listsLoading } = useSWR('/api/lists', () => api.getLists());
  const list = lists?.find(l => l.id === id);

  const { data: notesData, isLoading: notesLoading, mutate: mutateNotes } = useSWR(`/api/notes?list_id=${id}`, async () => {
    const res = await api.getNotes({ list_id: id });
    return res.notes;
  });

  const notes = notesData || [];
  const loading = listsLoading || notesLoading;

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this list? Notes will be moved to Inbox.')) {
      navigate('/');
      try {
        await api.deleteList(id);
      } catch (err) {
        alert('Failed to delete list');
      }
    }
  };

  const handleToggleFavorite = async (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // Optimistic update
    mutateNotes(notes.map(n => n.id === noteId ? { ...n, starred: !n.starred } : n), false);
    
    try {
      await api.updateNote(noteId, { starred: !note.starred });
    } catch (err) {
      console.error('Failed to toggle favourite');
      mutateNotes();
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="spinner text-[#33b1ff]" size={32} />
    </div>
  );

  if (!list) return (
    <div className="px-6 pt-12 pb-32 max-w-[680px] mx-auto text-center">
      <h1 className="text-[24px] font-extrabold tracking-tight">List not found</h1>
    </div>
  );

  return (
    <div className="px-6 pt-12 pb-32 max-w-[680px] mx-auto">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/')}
          className="p-2 bg-white rounded-full neo-shadow border border-black/5 active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} className="text-black/30" />
        </button>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full neo-shadow border border-black/5">
          <Folder size={16} color={list.color || '#33b1ff'} />
          <span className="text-[12px] font-black uppercase tracking-widest text-black/60">
            {list.name}
          </span>
        </div>
        
        <button
          onClick={handleDelete}
          className="p-2 bg-white rounded-full neo-shadow border border-black/5 active:scale-95 transition-transform hover:bg-red-50"
        >
          <Trash2 size={20} className="text-red-400" />
        </button>
      </div>

      <div className="flex items-center justify-between mb-8 px-1">
        <h2 className="text-[22px] font-extrabold tracking-tight">Saved Clips</h2>
        <span className="text-[12px] font-bold text-black/30 bg-black/5 px-3 py-1 rounded-full">
          {notes.length} notes
        </span>
      </div>

      {notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {notes.map(note => (
            <NoteCard key={note.id} note={note} onToggleFavorite={handleToggleFavorite} />
          ))}
        </div>
      ) : (
        <div className="bg-white/50 border border-dashed border-black/10 rounded-2xl py-12 flex flex-col items-center justify-center mb-8">
          <Folder size={32} className="mb-3 text-black/20" />
          <p className="text-[14px] font-bold text-black/30">No notes in this list yet</p>
        </div>
      )}
    </div>
  );
}
