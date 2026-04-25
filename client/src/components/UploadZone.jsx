import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function UploadZone({ onUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFiles(files[0]);
    }
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      await handleFiles(files[0]);
    }
  };

  const handleFiles = async (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isUploading && fileInputRef.current.click()}
      style={{
        background: '#f5f7f9',
        border: '2px dashed rgba(0,0,0,0.05)',
        borderRadius: '32px',
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />
      
      {isUploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="spinner text-[#33b1ff]" size={32} />
          <p className="text-[14px] font-bold text-black/40">Processing...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <ImageIcon className="text-black/20" size={48} strokeWidth={1.5} />
            <div className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm border border-black/5">
              <Upload className="text-[#33b1ff]" size={14} strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="text-[16px] font-extrabold tracking-tight text-[#1a1d1f] mb-1">
            Drop screenshot or tap to upload
          </h3>
          <p className="text-[13px] font-bold text-black/20">
            Supports PNG, JPG, WEBP
          </p>
        </div>
      )}

      <style>{`
        .upload-zone:hover {
          background: #eff2f5;
          border-color: rgba(51, 177, 255, 0.2);
        }
        .upload-zone.dragging {
          background: rgba(51, 177, 255, 0.05);
          border-color: #33b1ff;
          transform: scale(1.01);
        }
      `}</style>
    </div>
  );
}
