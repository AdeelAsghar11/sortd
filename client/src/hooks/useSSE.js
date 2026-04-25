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

    const connect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const urlWithAuth = `${SSE_URL}?token=${session.access_token}`;
      es = new EventSource(urlWithAuth);

    const eventNames = ['job_queued', 'job_started', 'job_done', 'job_failed', 'watch_status'];
    
    const handler = (name) => (e) => {
      const data = JSON.parse(e.data);
      if (onEventRef.current) {
        onEventRef.current({ type: name, data });
      }
    };

    eventNames.forEach(name => {
      es.addEventListener(name, handler(name));
    });

    es.onopen = () => console.log('✅ SSE Connected');
    es.onerror = (err) => {
      console.error('❌ SSE Error:', err);
    };
    };

    connect();

    return () => {
      if (es) {
        es.close();
        console.log('🔌 SSE Disconnected');
      }
    };
  }, []);
}
