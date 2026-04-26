import { processUrl } from './videoProcessor.js';
import { processImage } from './imageProcessor.js';
import { generateEmbedding } from './gemini.js';
import { logError, createJob, updateJob, getNextPendingJob, getActiveJobsCount, getJobStats, updateNote, resetStuckJobs, claimJob } from './database.js';

const QUEUE_CONFIG = {
  maxConcurrency: 2,
  maxGeminiPerMinute: 30,
  maxGeminiPerDay: 900,
  pollIntervalMs: 500, // Reduced for much faster processing
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
  const jobInfo = data.jobId ? `(Job: ${data.jobId})` : '';
  const userInfo = userId ? `(User: ${userId})` : '';
  console.log(`📡 SSE Broadcast: ${event} ${jobInfo} ${userInfo}`);
  
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  let sentCount = 0;
  
  sseClients.forEach(client => {
    if (userId && client.userId !== userId) return;
    try {
      client.write(message);
      sentCount++;
    } catch (err) {
      // client might be closed
    }
  });
  
  if (sentCount === 0 && userId) {
    console.warn(`⚠️ No active SSE clients found for user ${userId} to receive ${event}`);
  } else {
    console.log(`📨 Sent ${event} to ${sentCount} clients`);
  }
}

export async function enqueue({ type, source, payload, userId }) {
  const job = await createJob({
    type,
    source,
    payload,
    user_id: userId,
    state: 'pending',
    max_attempts: 3,
  });

  broadcastSSE('job_queued', {
    jobId: job.id,
    type: job.type,
    source: job.source,
    timestamp: job.created_at,
  }, userId);

  // Direct process if queue is empty and we have capacity
  if (processingIds.size < QUEUE_CONFIG.maxConcurrency && rateLimiter.canProceed()) {
    const claimedJob = await claimJob(job.id);
    if (claimedJob) {
      console.log(`⚡ Direct processing job ${job.id} (Queue had capacity)`);
      processingIds.add(job.id);
      
      processJob(claimedJob).finally(() => {
        processingIds.delete(job.id);
      });
    }
  }

  return job.id;
}

const processingIds = new Set();

async function processJob(job) {
  const startedAt = new Date().toISOString();

  // If we haven't already claimed it in the tick, do it here (failsafe)
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
    } else if (job.type === 'image' || job.type === 'image_processing') {
      const path = job.payload.filePath || job.payload.path;
      console.log(`🖼️ Processing image job ${job.id} from path: ${path}`);
      result = await processImage(path, job.payload.sourceType || 'screenshot', updateStep, job.user_id);
    }

    // Generate embedding for semantic search & RAG
    if (result && result.id) {
      await updateStep('embedding');
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
      // LAST RESORT: Create a manual clip so data isn't lost
      if (job.type === 'image' || job.type === 'image_processing') {
        try {
          console.log('🛡️ All AI attempts failed. Saving fail-safe manual clip...');
          const { createNote } = await import('./database.js');
          const { v4: uuidv4 } = await import('uuid');
          const failSafeNote = await createNote({
            id: uuidv4(),
            title: 'Manual Clip (AI Failed)',
            content: 'AI processing reached limit. Saved original image.',
            raw_text: 'Processing failed after multiple attempts.',
            source_type: 'screenshot',
            thumbnail: '',
            list_id: null,
          }, job.user_id);
          broadcastSSE('job_done', { jobId: job.id, note: failSafeNote }, job.user_id);
        } catch (fse) {
          console.error('Failed to create fail-safe note:', fse.message);
        }
      }

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
    inFlight: processingIds.size
  };
}

export async function startWorker() {
  console.log('🚀 Persistent Queue worker started');

  // Cleanup stuck jobs on startup
  const resetCount = await resetStuckJobs();
  if (resetCount > 0) console.log(`🧹 Reset ${resetCount} stuck jobs to pending.`);

  const tick = async () => {
    try {
      const activeCount = await getActiveJobsCount();

      if (activeCount < QUEUE_CONFIG.maxConcurrency && processingIds.size < QUEUE_CONFIG.maxConcurrency) {
        if (rateLimiter.canProceed()) {
          const nextJob = await getNextPendingJob();

          if (nextJob && !processingIds.has(nextJob.id)) {
            // Use claimJob to atomically mark as processing
            const claimedJob = await claimJob(nextJob.id);
            
            if (claimedJob) {
              console.log(`📦 Worker: Claiming job ${claimedJob.id} (Type: ${claimedJob.type})...`);
              processingIds.add(claimedJob.id);

              processJob(claimedJob).finally(() => {
                processingIds.delete(claimedJob.id);
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ Queue worker error:', err.message);
    }
    setTimeout(tick, QUEUE_CONFIG.pollIntervalMs);
  };

  tick();
}
