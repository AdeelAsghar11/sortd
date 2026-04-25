import { useState, useEffect } from 'react';
import { api } from '../api';
import { Activity, ChevronUp, ChevronDown } from 'lucide-react';

export default function QueueStatus() {
  const [stats, setStats] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await api.getQueueStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch queue stats');
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats || (stats.pending === 0 && stats.processing === 0)) return null;

  return (
    <div className={`queue-status ${isExpanded ? 'expanded' : ''}`}>
      <div className="queue-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-left">
          <Activity className="pulse" size={16} />
          <span>Processing {stats.processing} (Queued: {stats.pending})</span>
        </div>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </div>
      
      {isExpanded && (
        <div className="queue-details">
          <div className="stat-row">
            <span>Jobs Done Today</span>
            <span>{stats.done}</span>
          </div>
          <div className="stat-row">
            <span>API Quota</span>
            <span>{stats.rateLimitRemaining} left</span>
          </div>
          <div className="stat-row">
            <span>Failures</span>
            <span className={stats.failed > 0 ? 'text-error' : ''}>{stats.failed}</span>
          </div>
        </div>
      )}

      <style>{`
        .queue-status {
          position: fixed;
          bottom: 110px;
          right: 16px;
          background: white;
          color: #1a1d1f;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          z-index: 1500;
          width: 220px;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid rgba(0,0,0,0.05);
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .queue-header {
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
        }
        .pulse {
          color: #33b1ff;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .queue-details {
          padding: 0 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          border-top: 1px solid rgba(0,0,0,0.05);
          padding-top: 10px;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 700;
          color: rgba(0,0,0,0.4);
        }
        .text-error { color: #ff4d4d; }
      `}</style>
    </div>
  );
}
