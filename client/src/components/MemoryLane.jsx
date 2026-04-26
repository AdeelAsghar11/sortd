import { Sparkles, RefreshCw, Zap, ArrowRight, PlayCircle, Video, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { SourceIcon } from './icons';

export default function MemoryLane() {
  const { data: note, isLoading: loading, mutate } = useSWR(
    '/api/notes/random', 
    () => api.getRandomNote(),
    { 
      revalidateOnFocus: false, 
      revalidateOnReconnect: false,
      revalidateIfStale: false
    }
  );

  const fetchRandom = () => {
    mutate();
  };

  if (loading && !note) {
    return (
      <div className="w-full h-[120px] bg-white rounded-[24px] animate-pulse neo-shadow border border-black/5 mb-8" />
    );
  }

  if (!note) return null;

  const isOld = new Date(note.created_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const isVideo = note.source_type === 'url' || note.isVideo;
  const platform = (note.source_platform || note.source || 'manual').toLowerCase();

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-[#33b1ff]" fill="#33b1ff" fillOpacity={0.2} />
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-black/30">
            {isOld ? 'Memory Lane' : 'Resurfaced'}
          </span>
        </div>
        
        <button 
          onClick={fetchRandom}
          disabled={loading}
          className="flex items-center gap-1.5 text-[12px] font-bold text-black/30 hover:text-[#33b1ff] active:scale-95 transition-colors"
        >
          {loading ? 'Thinking...' : 'Shuffle'}
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={note.id}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            to={`/notes/${note.id}`}
            className="block bg-white rounded-[24px] p-4 neo-shadow transition-all border border-transparent hover:border-[#33b1ff]/20 relative overflow-hidden group"
          >
            <div className="flex items-center gap-4">
              {/* Thumbnail Section */}
              <div className="flex-shrink-0">
                {note.thumbnail ? (
                  <div className="relative w-20 h-20">
                    <img 
                      src={note.thumbnail} 
                      alt="" 
                      className="w-20 h-20 rounded-2xl object-cover" 
                    />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center text-white bg-black/10 rounded-2xl">
                        <PlayCircle size={24} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-[#f5f7f9] rounded-2xl flex items-center justify-center">
                    {isVideo ? (
                      <Video className="text-[#a39e98]" size={24} strokeWidth={1.5} />
                    ) : (
                      <LinkIcon className="text-[#a39e98]" size={24} strokeWidth={1.5} />
                    )}
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="flex-1 overflow-hidden">
                {/* Source Tag Row */}
                <div className="flex items-center gap-2 mb-1 h-5">
                  <div 
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      platform === 'instagram' ? 'bg-[#98fb98]' : 
                      platform === 'youtube' ? 'bg-[#a2d2ff]' : 
                      platform === 'tiktok' ? 'bg-[#98fb98]' : 'bg-[#f5f7f9]'
                    }`}
                  >
                    <SourceIcon 
                      source={platform} 
                      size={10} 
                      className={platform === 'manual' ? 'text-[#a39e98]' : 'text-white'} 
                    />
                  </div>
                  <span className="text-[9px] font-extrabold text-black/20 uppercase tracking-[0.1em]">
                    {platform}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-[15px] font-extrabold mb-0.5 tracking-tight leading-tight text-[#1a1d1f] line-clamp-1 group-hover:text-[#33b1ff] transition-colors">
                  {note.title || 'Untitled Note'}
                </h3>
                
                {/* Description */}
                <p className="text-[13px] text-black/40 line-clamp-2 leading-snug">
                  {note.summary || note.content?.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^- /gm, '')}
                </p>
              </div>
            </div>
            
            <div className="absolute top-4 right-4 text-black/5 group-hover:text-[#33b1ff]/20 transition-colors">
              <Sparkles size={16} />
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
