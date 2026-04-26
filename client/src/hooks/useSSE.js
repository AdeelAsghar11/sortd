import { useEffect, useRef } from 'react';
import { supabase } from '../contexts/AuthContext';

const SSE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api/events';

export function useSSE(onEvent) {
  const onEventRef = useRef(onEvent);
  
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let es = null;
    let isMounted = true;

    const connect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted || !session) return;

      const urlWithAuth = `${SSE_URL}?token=${session.access_token}`;
      es = new EventSource(urlWithAuth);

      const eventNames = ['job_queued', 'job_started', 'job_progress', 'job_done', 'job_failed', 'watch_status'];
      
      const handler = (name) => (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onEventRef.current) {
            onEventRef.current({ type: name, data });
          }
        } catch (err) {
          console.error('Failed to parse SSE data:', err);
        }
      };

      eventNames.forEach(name => {
        es.addEventListener(name, handler(name));
      });

      es.onopen = () => {
        console.log('✅ SSE Connected');
        retryCount = 0;
      };

      es.onerror = (err) => {
        console.error('❌ SSE Error, reconnecting...', err);
        es.close();
        
        // Exponential backoff
        const timeout = Math.min(1000 * Math.pow(2, retryCount), 30000);
        setTimeout(() => {
          if (isMounted) {
            retryCount++;
            connect();
          }
        }, timeout);
      };
    };

    let retryCount = 0;
    connect();

    return () => {
      isMounted = false;
      if (es) {
        es.close();
        console.log('🔌 SSE Disconnected');
      }
    };
  }, []);
}
