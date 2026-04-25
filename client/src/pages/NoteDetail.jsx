import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, Star, Trash2, ExternalLink, Folder, Loader2, Save, Sparkles, ChevronDown } from 'lucide-react';

export default function NoteDetail() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const [note, setNote]           = useState(null);
  const [lists, setLists]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [editedNote, setEditedNote] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [noteData, listData] = await Promise.all([api.getNote(id), api.getLists()]);
        setNote(noteData);
        setEditedNote(noteData);
        setLists(listData);
      } catch (err) {
        console.error('Failed to fetch note');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleToggleStar = async () => {
    try {
      const updated = await api.updateNote(id, { starred: !note.starred });
      setNote(updated);
    } catch { alert('Update failed'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this note?')) return;
    try {
      await api.deleteNote(id);
      navigate('/');
    } catch { alert('Delete failed'); }
  };

  const handleSave = async () => {
    try {
      const updated = await api.updateNote(id, editedNote);
      setNote(updated);
      setEditing(false);
    } catch { alert('Save failed'); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} className="spinner" style={{ color: '#33b1ff' }} />
      </div>
    );
  }

  if (!note) {
    return (
      <div style={{ padding: '48px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Note not found</h1>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 24px 80px', maxWidth: '680px', margin: '0 auto', background: '#f5f7f9', minHeight: '100vh' }}>

      {/* ── Top navigation ──────────────────────────── */}
      <div className="flex items-center justify-between" style={{ paddingBottom: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 transition-opacity"
          style={{ color: 'rgba(0,0,0,0.35)', fontWeight: 700, fontSize: '14px' }}
        >
          <ArrowLeft size={20} /> Back
        </button>

        <div className="flex items-center" style={{ gap: '12px' }}>
          <button
            onClick={handleToggleStar}
            style={{ color: note.starred ? '#f59e0b' : 'rgba(0,0,0,0.25)', transition: 'all 0.2s' }}
          >
            <Star size={22} fill={note.starred ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
          <button onClick={handleDelete} style={{ color: 'rgba(0,0,0,0.25)', transition: 'all 0.2s' }}>
            <Trash2 size={22} />
          </button>
          {editing ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 btn-primary"
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              <Save size={15} /> Save
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              style={{
                padding: '8px 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 700,
                background: 'rgba(0,0,0,0.06)', color: '#1a1d1f',
              }}
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* ── Source + title ───────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <div className="flex items-center" style={{ gap: '12px', marginBottom: '12px' }}>
          {note.source_platform && (
            <span
              style={{
                fontSize: '11px', fontWeight: 800, textTransform: 'capitalize',
                background: 'rgba(0,0,0,0.06)', color: '#1a1d1f',
                padding: '4px 10px', borderRadius: '999px', letterSpacing: '0.05em',
              }}
            >
              {note.source_platform}
            </span>
          )}
          {note.source_url && (
            <a
              href={note.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
              style={{ fontSize: '13px', fontWeight: 700, color: '#33b1ff' }}
            >
              Open Original <ExternalLink size={13} />
            </a>
          )}
        </div>

        {editing ? (
          <input
            className="input-flat"
            style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', padding: '12px 16px', width: '100%' }}
            value={editedNote.title}
            onChange={e => setEditedNote({ ...editedNote, title: e.target.value })}
          />
        ) : (
          <h1 style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.5px', color: '#1a1d1f' }}>
            {note.title}
          </h1>
        )}
      </div>

      {/* ── Organisation row ─────────────────────────── */}
      <div
        className="flex items-center"
        style={{ gap: '20px', padding: '16px', background: 'white', borderRadius: '20px', marginBottom: '24px' }}
      >
        <div className="flex items-center" style={{ gap: '8px', color: '#6f767e' }}>
          <Folder size={16} />
          <select
            value={editing ? editedNote.list_id : note.list_id}
            disabled={!editing}
            onChange={e => setEditedNote({ ...editedNote, list_id: e.target.value })}
            style={{
              border: 'none', background: 'transparent', fontWeight: 700,
              fontSize: '14px', color: '#1a1d1f', cursor: editing ? 'pointer' : 'default',
              fontFamily: 'inherit',
            }}
          >
            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── AI Summary card (dark) ───────────────────── */}
      {note.content && (
        <div
          style={{
            background: '#1a1a1a', borderRadius: '20px',
            padding: '24px', marginBottom: '20px',
          }}
        >
          <div className="flex items-center" style={{ gap: '8px', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
                background: '#6e56cf', color: 'white', padding: '4px 10px', borderRadius: '999px',
              }}
            >
              AI Summary
            </span>
            <Sparkles size={14} style={{ color: '#6e56cf' }} />
          </div>

          {editing ? (
            <textarea
              value={editedNote.content}
              onChange={e => setEditedNote({ ...editedNote, content: e.target.value })}
              rows={8}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                padding: '12px 14px', color: 'rgba(255,255,255,0.9)',
                fontSize: '15px', lineHeight: 1.6, resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          ) : (
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.82)', whiteSpace: 'pre-wrap' }}>
              {note.content}
            </p>
          )}
        </div>
      )}

      {/* ── Full transcript (collapsible) ────────────── */}
      {note.raw_text && (
        <div
          style={{
            background: 'white', borderRadius: '20px',
            overflow: 'hidden', marginBottom: '20px',
          }}
        >
          <button
            onClick={() => setShowTranscript(s => !s)}
            className="w-full flex items-center justify-between transition-all"
            style={{ padding: '16px 20px', fontWeight: 700 }}
          >
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.4)' }}>
              Full Transcript
            </span>
            <ChevronDown
              size={18}
              style={{
                color: 'rgba(0,0,0,0.3)',
                transform: showTranscript ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </button>
          {showTranscript && (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid #efefef' }}>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#6f767e', marginTop: '16px', whiteSpace: 'pre-wrap' }}>
                {note.raw_text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
