import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { api } from '../api';
import { FolderIcon } from '../components/icons';
import { Loader2 } from 'lucide-react';

export default function Lists() {
  const { data: lists = [], isLoading } = useSWR('/api/lists', () => api.getLists());
  const sortedLists = [...lists].sort((a, b) => (b.note_count || 0) - (a.note_count || 0));

  return (
    <div className="px-6 md:px-12 pt-12 pb-32 w-full max-w-5xl mx-auto">
      <h1 className="text-[32px] md:text-[42px] font-black tracking-tighter text-[#1a1d1f] mb-8">Collections</h1>
      
      {isLoading && lists.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="spinner text-[#33b1ff]" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6 md:gap-12">
          {sortedLists.map(l => (
            <Link
              key={l.id}
              to={`/lists/${l.id}`}
              className="relative w-full aspect-[40/32] flex items-center justify-center transition-all hover:scale-[1.05] group"
            >
              <FolderIcon color={l.color || '#33b1ff'} />
              <div className="absolute inset-0 flex items-center justify-center pt-[12%] px-[15%] text-center">
                <h3 className="text-[clamp(12px,3.5vw,22px)] font-black text-white leading-tight tracking-tight line-clamp-2">
                  {l.name}
                </h3>
              </div>
              <div className="absolute top-[0%] right-[2%] bg-white/80 backdrop-blur-lg rounded-full w-[22%] aspect-square flex items-center justify-center text-[clamp(10px,2vw,16px)] font-black text-[#33b1ff] border border-white/60 shadow-[0_8px_20px_rgba(0,0,0,0.12)] group-hover:scale-110 transition-transform">
                {l.note_count ?? 0}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
