import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProcessingOverlay({ jobs }) {
  if (jobs.length === 0) return null;

  const getStepText = (job) => {
    if (job.type === 'job_done') return 'Successfully saved';
    if (job.type === 'job_failed') return 'Failed to process';
    
    const step = job.data?.step;
    switch (step) {
      case 'starting': return 'Initializing...';
      case 'downloading': return 'Downloading content...';
      case 'transcribing': return 'Transcribing audio...';
      case 'optimizing': return 'Optimizing image...';
      case 'uploading': return 'Uploading to storage...';
      case 'analyzing': return 'Llama 4 is analyzing...';
      case 'embedding': return 'Generating context...';
      case 'saving': return 'Saving to your inbox...';
      default: return 'Waiting in queue...';
    }
  };

  const getProgressWidth = (job) => {
    if (job.type === 'job_done') return '100%';
    if (job.type === 'job_failed') return '100%';
    
    const step = job.data?.step;
    switch (step) {
      case 'starting': return '15%';
      case 'downloading': return '30%';
      case 'transcribing': return '50%';
      case 'optimizing': return '35%';
      case 'uploading': return '60%';
      case 'analyzing': return '80%';
      case 'embedding': return '90%';
      case 'saving': return '95%';
      default: return '10%';
    }
  };

  return (
    <div className="processing-container">
      <AnimatePresence>
        {jobs.map((job, index) => (
          <motion.div
            key={job.jobId}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={`job-toast ${job.type === 'job_failed' ? 'failed' : job.type === 'job_done' ? 'done' : ''}`}
          >
            <div className="job-info">
              <div className="job-text">
                <span className="job-label">
                  {getStepText(job)}
                </span>
                {job.type === 'job_done' && (
                  <Link to="/inbox" className="view-link">
                    View <ArrowRight size={14} />
                  </Link>
                )}
                {job.type === 'job_failed' && (
                  <span className="error-msg">Error</span>
                )}
              </div>
            </div>
            
            <div className="progress-container-inner">
              <div className="progress-bar">
                <motion.div 
                  className="progress-fill"
                  animate={{ width: getProgressWidth(job) }}
                  transition={{ type: "spring", stiffness: 50, damping: 20 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <style>{`
        .processing-container {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2000;
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: calc(100% - 32px);
          max-width: 400px;
        }
        .job-toast {
          background: white;
          color: #1a1d1f;
          padding: 12px 16px;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.05);
        }
        .job-toast.done { border-bottom: 3px solid #4ade80; }
        .job-toast.failed { border-bottom: 3px solid #ff4d4d; }
        
        .job-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }
        .job-text {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
        }
        .job-label {
          font-weight: 500;
          font-size: 14px;
          letter-spacing: -0.01em;
          color: #1a1d1f;
        }
        .view-link {
          color: #33b1ff;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: #f0f9ff;
          border-radius: 10px;
        }
        .error-msg {
          font-size: 12px;
          color: #ff4d4d;
          font-weight: 600;
        }
        .progress-container-inner {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .progress-bar {
          height: 6px;
          background: #f0f2f5;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }
        .progress-fill {
          height: 100%;
          background: #33b1ff;
          border-radius: 10px;
          width: 0%;
        }
      `}</style>
    </div>
  );
}
