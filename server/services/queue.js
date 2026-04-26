import { processUrl } from './videoProcessor.js';
import { processImage } from './imageProcessor.js';
import { generateEmbedding } from './gemini.js';
import { logError, createJob, updateJob, getNextPendingJob, getActiveJobsCount, getJobStats, updateNote } from './database.js';

const QUEUE_CONFIG = {
  maxConcurrency: 2,
  maxGeminiPerMinute: 30,
  maxGeminiPerDay: 900,
  pollIntervalMs: 2000, // Increased poll interval for DB
};

class RateLimiter {
  constructor(maxPerMinute, maxPerDay) {
    this.maxPerMinute = maxPerMinute;
    this.maxPerDay = maxPerDay;
    this.minuteWindow = [];
    this.dayCount = 0;
    this.dayStart = Date.now();
  }

  canProceed() {
    this.pruneMinuteWindow();
    this.checkDayReset();
    return this.minuteWindow.length < this.maxPerMinute && this.dayCount < this.maxPerDay;
  }

  record() {
    this.minuteWindow.push(Date.now());
    this.dayCount++;
  }

  pruneMinuteWindow() {
    const now = Date.now();
    this.minuteWindow = this.minuteWindow.filter(t => now - t < 60000);
  }

  checkDayReset() {
    const now = Date.now();
    if (now - this.dayStart > 86400000) {
      this.dayCount = 0;
      this.dayStart = now;
    }
  }

  getWaitMs() {
    if (this.minuteWindow.length < this.maxPerMinute) return 0;
    const oldest = this.minuteWindow[0];
    return Math.max(0, 60000 - (Date.now() - oldest));
  }

  remaining() {
    this.pruneMinuteWindow();
    return {
      perMinute: this.maxPerMinute - this.minuteWindow.length,
      perDay: this.maxPerDay - this.dayCount,
    };
  }
}

const rateLimiter = new RateLimiter(QUEUE_CONFIG.maxGeminiPerMinute, QUEUE_CONFIG.maxGeminiPerDay);
let sseClients = [];
const durations = [];
const DEFAULT_DURATION = 30000;

export function addSSEClient(res, userId) {
  res.userId = userId;
  sseClients.push(res);
  res.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
}

function broadcastSSE(event, data, userId = null) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    if (userId && client.userId !== userId) return;
    try { client.write(message); }
    catch (err) { /* ignore */ }
  });
}

export async function enqueue({ type, source, payload, userId }) {
  const job = await createJob({
    type,
    source,
    payload,
    user_id: userId,
    state: 'pending',
    max_attempts: 2,
  });

  broadcastSSE('job_queued', {
    jobId: job.id,
    type: job.type,
    source: job.source,
    timestamp: job.created_at,
  }, userId);

  return job.id;
}

async function processJob(job) {
  const startedAt = new Date().toISOString();
  await updateJob(job.id, { 
    state: 'processing', 
    started_at: startedAt 
  });

  broadcastSSE('job_started', {
    jobId: job.id,
    type: job.type,
    step: 'starting',
    timestamp: startedAt,
  }, job.user_id);

  const updateStep = async (step) => {
    await updateJob(job.id, { step });
    broadcastSSE('job_started', {
      jobId: job.id,
      type: job.type,
      step,
      timestamp: new Date(),
    }, job.user_id);
  };

  try {
    rateLimiter.record();
    let result;
    if (job.type === 'url') {
      result = await processUrl(job.payload.url, updateStep, job.user_id);
    } else if (job.type === 'image') {
      result = await processImage(job.payload.filePath, job.payload.sourceType, updateStep, job.user_id);
    }

    // Generate embedding for semantic search & RAG
    if (result && result.id) {
      updateStep('embedding');
      try {
        const textToEmbed = `${result.title || ''}\n\n${result.content || ''}\n\n${result.raw_text || ''}`;
        const embedding = await generateEmbedding(textToEmbed);
        if (embedding) {
          await updateNote(result.id, { embedding }, job.user_id);
          result.embedding = embedding;
        }
      } catch (embErr) {
        console.error(`Failed to generate embedding for note ${result.id}:`, embErr.message);
      }
    }

    const completedAt = new Date().toISOString();
    await updateJob(job.id, {
      state: 'done',
      result,
      completed_at: completedAt
    });
    
    const duration = new Date(completedAt) - new Date(startedAt);
    durations.push(duration);
    if (durations.length > 10) durations.shift();

    broadcastSSE('job_done', {
      jobId: job.id,
      note: result,
      processingTimeMs: duration,
      timestamp: completedAt,
    }, job.user_id);
  } catch (err) {
    console.error(`Job ${job.id} failed:`, err.message);
    const attempts = (job.attempts || 0) + 1;
    
    if (attempts < (job.max_attempts || 2) && err.message !== 'FILE_TOO_LARGE') {
      await updateJob(job.id, { 
        state: 'pending', 
        attempts 
      });
      console.log(`Retrying job ${job.id} (attempt ${attempts})`);
    } else {
      const errorCode = err.code || 'UNKNOWN';
      await updateJob(job.id, {
        state: 'failed',
        error: err.message,
        error_code: errorCode,
        attempts
      });
      
      await logError(job.id, err.message, err.stack, job.payload);
      
      broadcastSSE('job_failed', {
        jobId: job.id,
        type: job.type,
        error: err.message,
        errorCode,
        timestamp: new Date(),
      }, job.user_id);
    }
  }
}

export async function getQueueStats() {
  const stats = await getJobStats();
  const remaining = rateLimiter.remaining();

  return {
    ...stats,
    dailyApiCalls: rateLimiter.dayCount,
    rateLimitRemaining: remaining.perDay,
    perMinuteRemaining: remaining.perMinute,
  };
}

export function startWorker() {
  console.log('🚀 Persistent Queue worker started');
  setInterval(async () => {
    try {
      const activeCount = await getActiveJobsCount();
      if (activeCount >= QUEUE_CONFIG.maxConcurrency) return;

      if (!rateLimiter.canProceed()) return;

      const nextJob = await getNextPendingJob();
      if (nextJob) {
        processJob(nextJob);
      }
    } catch (err) {
      console.error('Queue worker error:', err.message);
    }
  }, QUEUE_CONFIG.pollIntervalMs);
}
