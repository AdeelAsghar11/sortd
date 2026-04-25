import { v4 as uuidv4 } from 'uuid';
import { processUrl } from './videoProcessor.js';
import { processImage } from './imageProcessor.js';
import { logError } from './database.js';

const QUEUE_CONFIG = {
  maxConcurrency: 2,
  maxGeminiPerMinute: 30,
  maxGeminiPerDay: 900,
  pollIntervalMs: 500,
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
let jobs = [];
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

function getEstimatedDuration() {
  if (durations.length === 0) return DEFAULT_DURATION;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

export function enqueue({ type, source, payload, userId }) {
  const job = {
    id: uuidv4(),
    type,
    source,
    payload,
    userId,
    state: 'pending',
    step: null,
    result: null,
    error: null,
    errorCode: null,
    attempts: 0,
    maxAttempts: 2,
    createdAt: new Date(),
  };

  jobs.push(job);
  broadcastSSE('job_queued', {
    jobId: job.id,
    type: job.type,
    source: job.source,
    position: jobs.filter(j => j.state === 'pending' && j.userId === job.userId).length,
    timestamp: job.createdAt,
  }, job.userId);

  return job.id;
}

async function processJob(job) {
  job.state = 'processing';
  job.startedAt = new Date();
  broadcastSSE('job_started', {
    jobId: job.id,
    type: job.type,
    step: 'starting',
    timestamp: job.startedAt,
  }, job.userId);

  const updateStep = (step) => {
    job.step = step;
    broadcastSSE('job_started', {
      jobId: job.id,
      type: job.type,
      step,
      timestamp: new Date(),
    }, job.userId);
  };

  try {
    rateLimiter.record();
    let result;
    if (job.type === 'url') {
      result = await processUrl(job.payload.url, updateStep, job.userId);
    } else if (job.type === 'image') {
      result = await processImage(job.payload.filePath, job.payload.sourceType, updateStep, job.userId);
    }

    job.state = 'done';
    job.result = result;
    job.completedAt = new Date();
    
    const duration = job.completedAt - job.startedAt;
    durations.push(duration);
    if (durations.length > 10) durations.shift();

    broadcastSSE('job_done', {
      jobId: job.id,
      note: result,
      processingTimeMs: duration,
      timestamp: job.completedAt,
    }, job.userId);
  } catch (err) {
    console.error(`Job ${job.id} failed:`, err.message);
    job.attempts++;
    
    if (job.attempts < job.maxAttempts && err.message !== 'FILE_TOO_LARGE') {
      job.state = 'pending';
      console.log(`Retrying job ${job.id} (attempt ${job.attempts})`);
    } else {
      job.state = 'failed';
      job.error = err.message;
      job.errorCode = err.code || 'UNKNOWN';
      
      await logError(job.id, err.message, err.stack, job.payload);
      
      broadcastSSE('job_failed', {
        jobId: job.id,
        type: job.type,
        error: err.message,
        errorCode: job.errorCode,
        timestamp: new Date(),
      }, job.userId);
    }
  }
}

export function getQueueStats() {
  const pending = jobs.filter(j => j.state === 'pending').length;
  const processing = jobs.filter(j => j.state === 'processing').length;
  const done = jobs.filter(j => j.state === 'done').length;
  const failed = jobs.filter(j => j.state === 'failed').length;
  const remaining = rateLimiter.remaining();

  return {
    pending,
    processing,
    done,
    failed,
    dailyApiCalls: rateLimiter.dayCount,
    rateLimitRemaining: remaining.perDay,
    perMinuteRemaining: remaining.perMinute,
  };
}

export function startWorker() {
  console.log('🚀 Queue worker started');
  setInterval(async () => {
    const activeCount = jobs.filter(j => j.state === 'processing').length;
    if (activeCount >= QUEUE_CONFIG.maxConcurrency) return;

    if (!rateLimiter.canProceed()) return;

    const nextJob = jobs.find(j => j.state === 'pending');
    if (nextJob) {
      processJob(nextJob);
    }
  }, QUEUE_CONFIG.pollIntervalMs);

  // Cleanup old jobs from memory every 30 mins
  setInterval(() => {
    const now = Date.now();
    jobs = jobs.filter(j => {
      if (j.state === 'pending' || j.state === 'processing') return true;
      return now - new Date(j.completedAt || j.createdAt).getTime() < 3600000; // Keep for 1 hour
    });
  }, 1800000);
}
