import React, { createContext, useContext, useState, useCallback } from 'react';
import { useSSE } from '../hooks/useSSE';

const ProcessingContext = createContext();

export function ProcessingProvider({ children }) {
  const [activeJobs, setActiveJobs] = useState([]);

  const handleEvent = useCallback((event) => {
    const jobId = event.data?.jobId || event.jobId;
    if (!jobId) return;

    const normalizedEvent = {
      ...event,
      jobId, // Ensure jobId is at the top level for easy access
    };

    if (event.type === 'job_queued' || event.type === 'job_started' || event.type === 'job_progress') {
      setActiveJobs(prev => {
        const exists = prev.find(j => j.jobId === jobId);
        if (exists) {
          return prev.map(j => j.jobId === jobId ? { 
            ...j, 
            ...normalizedEvent, 
            data: { ...j.data, ...event.data } 
          } : j);
        }
        return [...prev, normalizedEvent];
      });
    } else if (event.type === 'job_done' || event.type === 'job_failed') {
      setActiveJobs(prev => {
        const exists = prev.find(j => j.jobId === jobId);
        if (exists) {
          return prev.map(j => j.jobId === jobId ? normalizedEvent : j);
        }
        return [...prev, normalizedEvent];
      });
      
      // Remove from overlay after 3 seconds
      setTimeout(() => {
        setActiveJobs(prev => prev.filter(j => j.jobId !== jobId));
      }, 3000);
    }
  }, []);

  useSSE(handleEvent);

  return (
    <ProcessingContext.Provider value={{ activeJobs, handleEvent }}>
      {children}
    </ProcessingContext.Provider>
  );
}

export const useProcessing = () => useContext(ProcessingContext);
