import { useState } from 'react';
import { api } from '../api';
import { X, Send, Loader2 } from 'lucide-react';
import UploadZone from './UploadZone';

export default function AddContentSheet({ onClose }) {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setIsProcessing(true);
    const currentUrl = url;
    
    // Optimistic UI close
    setUrl('');
    onClose();
    
    try {
      await api.processUrl(currentUrl);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      await api.processImage(file);
      onClose();
    } catch (err) {
      alert('Upload failed');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center modal-overlay"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl neo-shadow bottom-sheet-anim"
        style={{ borderRadius: '40px 40px 0 0', padding: '16px 24px 0' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          className="mx-auto mb-4"
          style={{ width: '40px', height: '5px', borderRadius: '999px', background: 'rgba(0,0,0,0.05)' }}
        />

        {/* Header */}
        <div className="flex justify-between items-center mb-6 px-2">
          <h3 className="text-[26px] font-extrabold tracking-tight" style={{ color: '#1a1d1f' }}>
            Add Content
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: '#f5f7f9' }}
          >
            <X size={20} style={{ color: '#1a1d1f' }} />
          </button>
        </div>

        {/* URL Form */}
        <div className="px-2 mb-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-black/20 mb-3 ml-1">
            Paste Link
          </h4>
          <form onSubmit={handleUrlSubmit} className="relative">
            <div className="relative flex items-center">
              <input
                type="url"
                placeholder="Instagram, YouTube, or web link..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input-flat !pl-5 !pr-[54px] text-[15px] placeholder:text-[13px] placeholder:text-black/20"
                required
              />
              <button 
                type="submit" 
                disabled={isProcessing || !url} 
                className="absolute right-2 w-9 h-9 rounded-2xl bg-[#33b1ff]/20 text-[#33b1ff] flex items-center justify-center transition-all active:scale-90 disabled:opacity-20"
              >
                {isProcessing ? <Loader2 className="spinner" size={16} /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-[11px] font-bold text-black/25 mt-2.5 ml-1">
              Works best with Instagram Reels and YouTube Shorts
            </p>
          </form>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 px-2 mb-6">
          <div className="flex-1 h-[1px] bg-black/5" />
          <span className="text-[9px] font-black text-black/10 uppercase tracking-widest">OR</span>
          <div className="flex-1 h-[1px] bg-black/5" />
        </div>

        {/* Image Upload */}
        <div className="px-2 pb-8">
          <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-black/20 mb-3 ml-1">
            Upload Screenshot
          </h4>
          <UploadZone onUpload={handleFileUpload} />
          <p className="text-[11px] font-bold text-black/25 mt-3 ml-1 leading-relaxed">
            Every upload is organized and summarized automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
