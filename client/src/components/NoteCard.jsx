import { Link } from 'react-router-dom';
import { Heart, PlayCircle, Video, Link as LinkIcon } from 'lucide-react';
import { SourceIcon } from './icons';

export default function NoteCard({ note, onToggleFavorite }) {
  const isVideo     = note.source_type === 'url' || note.isVideo;
  const isFavorite  = note.starred || note.isFavorite;
  const platform    = (note.source_platform || note.source || 'manual').toLowerCase();

  return (
    <Link
      to={`/notes/${note.id}`}
      className="block bg-white rounded-[24px] p-4 neo-shadow transition-all cursor-pointer border border-transparent hover:border-[#a2d2ff]/20 relative"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="flex items-center gap-4">
        {/* Thumbnail Section - Vertically Centered */}
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
        <div className="flex-1 overflow-hidden pr-8">
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

          {/* Title - 1 line */}
          <h3 className="text-[15px] font-extrabold mb-0.5 tracking-tight leading-tight text-[#1a1d1f] line-clamp-1">
            {note.title || 'Untitled Note'}
          </h3>
          
          {/* Description - 2 lines */}
          <p className="text-[13px] text-black/40 line-clamp-2 leading-snug">
            {note.content?.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^- /gm, '')}
          </p>
        </div>
      </div>
      
      {/* Heart Button - Sized to match Platform Icon */}
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite(note.id);
        }}
        className={`absolute top-4 right-5 h-5 flex items-center transition-all ${isFavorite ? 'text-rose-500' : 'text-black/5 hover:text-black/10'}`}
      >
        <Heart 
          size={18} 
          fill={isFavorite ? "currentColor" : "none"} 
          strokeWidth={2.5} 
        />
      </button>
    </Link>
  );
}
