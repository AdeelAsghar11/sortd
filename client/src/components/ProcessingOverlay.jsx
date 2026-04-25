import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProcessingOverlay({ jobs }) {
  if (jobs.length === 0) return null;

  return (
    <div className="processing-container">
      <AnimatePresence>
        {jobs.map((job) => (
          <motion.div
            key={job.jobId}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`job-toast ${job.type === 'job_failed' ? 'failed' : job.type === 'job_done' ? 'done' : ''}`}
          >
            <div className="job-info">
              {job.type === 'job_queued' || job.type === 'job_started' ? (
                <Loader2 className="spinner" size={20} />
              ) : job.type === 'job_done' ? (
                <CheckCircle2 className="success-icon" size={20} />
              ) : (
                <AlertCircle className="error-icon" size={20} />
              )}
              
              <div className="job-text">
                <span className="job-label">
                  {job.type === 'job_queued' ? 'Queued' : 
                   job.type === 'job_started' ? (job.data.step || 'Processing') :
                   job.type === 'job_done' ? 'Complete' : 'Failed'}
                </span>
                {job.type === 'job_done' && (
                  <Link to={`/notes/${job.data.note.id}`} className="view-link">
                    View Note <ArrowRight size={14} />
                  </Link>
                )}
                {job.type === 'job_failed' && (
                  <span className="error-msg">{job.data.error}</span>
                )}
              </div>
            </div>
            
            {job.type === 'job_started' && (
              <div className="progress-bar">
                <motion.div 
                  className="progress-fill"
                  animate={{ width: '100%' }}
                  transition={{ duration: 30, ease: "linear" }}
                />
              </div>
            )}
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
        .job-toast.done { border-left: 4px solid #98fb98; }
        .job-toast.failed { border-left: 4px solid #ff4d4d; }
        
        .job-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .job-text {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
        }
        .job-label {
          font-weight: 800;
          font-size: 14px;
          letter-spacing: -0.01em;
        }
        .view-link {
          color: #33b1ff;
          font-size: 13px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .error-msg {
          font-size: 12px;
          color: #ff4d4d;
          font-weight: 600;
        }
        .progress-bar {
          height: 4px;
          background: #f5f7f9;
          border-radius: 2px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: #33b1ff;
          width: 10%;
        }
        .spinner { 
          animation: spin 1s linear infinite; 
          color: #33b1ff;
        }
        .success-icon { color: #4ade80; }
        .error-icon { color: #ff4d4d; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
