import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Loader2, CheckCircle2, X } from 'lucide-react';

export default function ShareHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [error, setError] = useState('');

  useEffect(() => {
    const handleShare = async () => {
      const url = searchParams.get('url');
      const text = searchParams.get('text');
      const title = searchParams.get('title');

      // Some apps share the link in the 'text' field or 'url' field
      let targetUrl = url || '';
      if (!targetUrl && text) {
        // Simple regex to extract URL from text if needed
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = text.match(urlRegex);
        if (matches && matches.length > 0) {
          targetUrl = matches[0];
        }
      }

      if (!targetUrl) {
        setStatus('error');
        setError('No valid link found in share data.');
        return;
      }

      try {
        await api.processUrl(targetUrl);
        setStatus('success');
        setTimeout(() => navigate('/inbox'), 2000);
      } catch (err) {
        setStatus('error');
        setError(err.message || 'Failed to process shared link');
      }
    };

    handleShare();
  }, [searchParams, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      {status === 'processing' && (
        <>
          <div className="w-16 h-16 bg-white rounded-[24px] neo-shadow flex items-center justify-center mb-6">
            <Loader2 size={32} className="spinner text-[#33b1ff]" />
          </div>
          <h2 className="text-xl font-extrabold text-[#1a1d1f] mb-2">Processing Shared Content</h2>
          <p className="text-sm font-bold text-black/30">We're capturing that for you...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-16 h-16 bg-[#98fb98] rounded-[24px] neo-shadow flex items-center justify-center mb-6 text-white">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-[#1a1d1f] mb-2">Clip Captured!</h2>
          <p className="text-sm font-bold text-black/30">Redirecting to your inbox...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-16 h-16 bg-red-50 rounded-[24px] neo-shadow flex items-center justify-center mb-6 text-red-500">
            <X size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-[#1a1d1f] mb-2">Sharing Failed</h2>
          <p className="text-sm font-bold text-red-400 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/inbox')}
            className="btn-primary"
          >
            Go to Inbox
          </button>
        </>
      )}
    </div>
  );
}
