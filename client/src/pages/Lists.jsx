import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { FolderIcon } from '../components/icons';
import { Loader2 } from 'lucide-react';

export default function Lists() {
  const [lists, setLists]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const data = await api.getLists();
        setLists(data);
      } catch (err) {
        console.error('Failed to fetch lists');
      } finally {
        setLoading(false);
      }
    };
    fetchLists();
  }, []);

  return (
    <div className="px-6 pt-12 pb-32 max-w-[680px] mx-auto">
      <h1 className="text-[28px] font-extrabold tracking-tight mb-8">Collections</h1>
      
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="spinner text-[#33b1ff]" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {lists.map(l => (
            <Link
              key={l.id}
              to={`/lists/${l.id}`}
              className="folder-card flex flex-col gap-4 relative overflow-hidden aspect-square justify-between p-5"
              style={{ background: l.color || '#a2d2ff' }}
            >
              <div className="text-[12px] font-bold text-white/60 absolute top-5 right-5">
                {l.note_count ?? 0}
              </div>
              <FolderIcon color="white" size={28} />
              <h3 className="text-[18px] font-extrabold text-white tracking-tight leading-tight">
                {l.name}
              </h3>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
