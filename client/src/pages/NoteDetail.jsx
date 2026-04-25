import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, Star, Trash2, ExternalLink, Folder, Loader2, Save } from 'lucide-react';

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedNote, setEditedNote] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [noteData, listData] = await Promise.all([
          api.getNote(id),
          api.getLists()
        ]);
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
    } catch (err) {
      alert('Update failed');
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this note?')) {
      try {
        await api.deleteNote(id);
        navigate('/');
      } catch (err) {
        alert('Delete failed');
      }
    }
  };

  const handleSave = async () => {
    try {
      const updated = await api.updateNote(id, editedNote);
      setNote(updated);
      setEditing(false);
    } catch (err) {
      alert('Save failed');
    }
  };

  if (loading) return <div className="container loading-state"><Loader2 className="spinner" size={32} /></div>;
  if (!note) return <div className="container"><h1>Note not found</h1></div>;

  return (
    <div className="container note-detail-page">
      <div className="header-nav">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <div className="nav-actions">
          <button onClick={handleToggleStar} className={note.starred ? 'starred' : ''}>
            <Star size={24} fill={note.starred ? 'var(--color-accent)' : 'none'} color={note.starred ? 'var(--color-accent)' : 'currentColor'} />
          </button>
          <button onClick={handleDelete}>
            <Trash2 size={24} />
          </button>
          {editing ? (
            <button className="btn-primary flex items-center gap-8" onClick={handleSave}>
              <Save size={18} /> Save
            </button>
          ) : (
            <button className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
          )}
        </div>
      </div>

      <div className="note-hero">
        <div className="hero-content">
          <div className="source-meta">
            <span className="source-badge">{note.source_platform}</span>
            {note.source_url && (
              <a href={note.source_url} target="_blank" rel="noopener noreferrer" className="source-link">
                Original Source <ExternalLink size={14} />
              </a>
            )}
          </div>
          
          {editing ? (
            <input 
              className="title-input"
              value={editedNote.title}
              onChange={e => setEditedNote({...editedNote, title: e.target.value})}
            />
          ) : (
            <h1 className="note-title">{note.title}</h1>
          )}
        </div>
      </div>

      <div className="note-organization">
        <div className="org-item">
          <Folder size={18} />
          <select 
            value={editing ? editedNote.list_id : note.list_id} 
            disabled={!editing}
            onChange={e => setEditedNote({...editedNote, list_id: e.target.value})}
          >
            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      <div className="note-body">
        {editing ? (
          <textarea 
            className="content-input"
            value={editedNote.content}
            onChange={e => setEditedNote({...editedNote, content: e.target.value})}
            rows={10}
          />
        ) : (
          <div className="content-text">{note.content}</div>
        )}
        
        {note.transcription && (
          <div className="transcription-section">
            <h3>Transcription</h3>
            <p>{note.transcription}</p>
          </div>
        )}
      </div>

      <style>{`
        .note-detail-page {
          padding-bottom: var(--space-64);
        }
        .header-nav {
          display: flex;
          justify-content: space-between;
          padding: var(--space-20) 0;
          align-items: center;
        }
        .nav-actions {
          display: flex;
          gap: var(--space-20);
          align-items: center;
        }
        .note-hero {
          margin-bottom: var(--space-32);
        }
        .source-meta {
          display: flex;
          gap: var(--space-16);
          margin-bottom: var(--space-12);
          align-items: center;
        }
        .source-link {
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }
        .note-title {
          font-size: 32px;
          line-height: 1.2;
          letter-spacing: -1px;
        }
        .title-input {
          font-size: 32px;
          font-weight: 700;
          border: none;
          border-bottom: 2px solid var(--color-accent);
          width: 100%;
          outline: none;
        }
        .note-organization {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-24);
          padding: var(--space-16);
          background: var(--color-bg-warm);
          border-radius: var(--radius-card);
          margin-bottom: var(--space-32);
        }
        .org-item {
          display: flex;
          align-items: center;
          gap: var(--space-8);
          color: var(--color-text-secondary);
        }
        .org-item select {
          border: none;
          background: transparent;
          font-weight: 600;
          font-size: 14px;
          color: var(--color-text);
          cursor: pointer;
        }
        .note-body {
          font-size: 18px;
          line-height: 1.6;
          color: var(--color-text);
        }
        .content-input {
          width: 100%;
          padding: var(--space-16);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          font-size: 18px;
          line-height: 1.6;
        }
        .transcription-section {
          margin-top: var(--space-48);
          padding-top: var(--space-24);
          border-top: 1px solid var(--color-border);
        }
        .transcription-section h3 {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--color-text-muted);
          margin-bottom: var(--space-12);
        }
        .transcription-section p {
          font-size: 14px;
          color: var(--color-text-secondary);
          white-space: pre-wrap;
        }
        .spinner { animation: spin 1s linear infinite; color: var(--color-accent); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
