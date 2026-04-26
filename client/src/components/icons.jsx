import { Link as LinkIcon } from 'lucide-react';

export const TikTokIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export const InstagramIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export const YoutubeIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
  </svg>
);

export const FolderIcon = ({ color = "rgba(255,255,255,0.4)", size = "100%", className = "" }) => (
  <svg 
    width={size} 
    style={{ aspectRatio: '40/32' }} 
    viewBox="0 0 40 32" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M0 6C0 2.68629 2.68629 0 6 0H14.5L18.5 4H34C37.3137 4 40 6.68629 40 10V26C40 29.3137 37.3137 32 34 32H6C2.68629 32 0 29.3137 0 26V6Z" fill={color} />
  </svg>
);

export const SourceIcon = ({ source, size = 10, className = "" }) => {
  const s = (source || '').toLowerCase();
  switch (s) {
    case 'instagram': return <InstagramIcon size={size} className={className} />;
    case 'youtube': return <YoutubeIcon size={size} className={className} />;
    case 'tiktok': return <TikTokIcon size={size} className={className} />;
    default: return <LinkIcon size={size} className={className} />;
  }
};
