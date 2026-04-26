import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';

import * as db from './services/database.js';
import * as storage from './services/storage.js';
import { enqueue, getQueueStats, addSSEClient, startWorker } from './services/queue.js';
import { resetGeminiClient } from './services/gemini.js';
import { authenticate } from './services/auth.js';
import { queryRAG } from './services/rag.js';
import { generateEmbedding } from './services/gemini.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Trust proxy for Railway
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://sortd-client.vercel.app',
    'https://sortd-frontend.vercel.app',
    /.*\.vercel\.app$/ // Allow ANY Vercel deployment
  ],
  credentials: true
}));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development/testing
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const tempDir = path.resolve('temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Multer for image uploads
const upload = multer({ dest: tempDir });

// Routes

// Notes
app.get('/api/notes', authenticate, async (req, res) => {
  try {
    const notes = await db.getAllNotes(req.query, req.user.id);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notes/:id', authenticate, async (req, res) => {
  try {
    const note = await db.getNoteById(req.params.id, req.user.id);
    res.json(note);
  } catch (err) {
    res.status(404).json({ error: 'Note not found' });
  }
});

app.post('/api/notes', authenticate, async (req, res) => {
  try {
    const note = await db.createNote({
      id: uuidv4(),
      ...req.body,
      source_type: 'manual'
    }, req.user.id);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notes/:id', authenticate, async (req, res) => {
  try {
    const note = await db.updateNote(req.params.id, req.body, req.user.id);
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', authenticate, async (req, res) => {
  try {
    const result = await db.deleteNote(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notes-random', authenticate, async (req, res) => {
  try {
    const note = await db.getRandomNote(req.user.id);
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lists
app.get('/api/lists', authenticate, async (req, res) => {
  try {
    const lists = await db.getAllLists(req.user.id);
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lists', authenticate, async (req, res) => {
  try {
    const list = await db.createList({
      id: uuidv4(),
      ...req.body
    }, req.user.id);
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/lists/:id', authenticate, async (req, res) => {
  try {
    const list = await db.updateList(req.params.id, req.body, req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lists/:id', authenticate, async (req, res) => {
  try {
    const result = await db.deleteList(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(err.code === 'DEFAULT_LIST_PROTECTED' ? 400 : 500).json({ error: err.message });
  }
});

// Processing
app.post('/api/process-url', authenticate, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    console.log(`🔗 Processing URL: ${url}`);

    console.log(`🔍 Checking for duplicates: ${url}`);
    
    // 1. Check if note already exists
    const { data: existingNote } = await db.supabase
      .from('notes')
      .select('id')
      .eq('source_url', url)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existingNote) {
      console.log(`✨ Found existing note: ${existingNote.id}`);
      return res.status(303).json({ noteId: existingNote.id });
    }

    // 2. Check if job is already in queue
    const { data: existingJob } = await db.supabase
      .from('jobs')
      .select('id')
      .contains('payload', { url })
      .eq('user_id', req.user.id)
      .in('state', ['pending', 'processing'])
      .maybeSingle();

    if (existingJob) {
      console.log(`⏳ Job already in queue: ${existingJob.id}`);
      return res.status(202).json({ jobId: existingJob.id, message: 'Already in queue' });
    }

    console.log('🔄 Enqueueing new URL job...');
    const jobId = await enqueue({
      type: 'url',
      source: 'api',
      userId: req.user.id,
      payload: { url }
    });

    res.status(202).json({ jobId });
  } catch (err) {
    console.error('💥 /api/process-url failed:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/process-image', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      console.warn('⚠️ No file in /api/process-image request');
      return res.status(400).json({ error: 'Image file is required' });
    }

    console.log(`📸 Processing image: ${req.file.originalname} (${req.file.size} bytes)`);

    const jobId = await enqueue({
      type: 'image',
      source: 'api',
      userId: req.user.id,
      payload: { 
        filePath: req.file.path,
        sourceType: 'screenshot'
      }
    });

    res.status(202).json({ jobId });
  } catch (err) {
    console.error('💥 /api/process-image failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Queue
app.get('/api/queue/stats', authenticate, async (req, res) => {
  res.json(await getQueueStats());
});

// Settings
app.get('/api/settings', authenticate, async (req, res) => {
  try {
    const geminiKey = await db.getSetting('gemini_api_key');
    res.json({
      geminiKeySet: !!geminiKey,
      queueStats: await getQueueStats()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/gemini-key', authenticate, async (req, res) => {
  try {
    await db.setSetting('gemini_api_key', req.body.key);
    resetGeminiClient();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.post('/api/ai/chat', authenticate, async (req, res) => {
  try {
    const { query } = req.body;
    console.log(`🤖 Chat Request: "${query}" from user ${req.user.id}`);
    if (!query) return res.status(400).json({ error: 'Query is required' });
    
    const result = await queryRAG(query, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Chat Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search', authenticate, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query is required' });
    
    const embedding = await generateEmbedding(query);
    if (!embedding) throw new Error('Failed to generate search vector');
    
    const results = await db.searchNotesSemantic(embedding, req.user.id);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SSE
app.get('/api/events', authenticate, async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  
  // Send connection confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({ serverTime: new Date().toISOString() })}\n\n`);
  
  // Sync current active jobs immediately on connect
  try {
    const activeJobs = await db.getActiveJobsForUser(req.user.id);
    activeJobs.forEach(job => {
      const eventType = job.state === 'pending' ? 'job_queued' : 'job_started';
      const eventData = {
        jobId: job.id,
        type: job.type,
        step: job.step || (job.state === 'pending' ? 'queued' : 'starting'),
        timestamp: job.updated_at
      };
      res.write(`event: ${eventType}\ndata: ${JSON.stringify(eventData)}\n\n`);
    });
  } catch (err) {
    console.error('Failed to sync active jobs on connect:', err);
  }

  addSSEClient(res, req.user.id);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('💥 Global Error Handler:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start Server
async function start() {
  try {
    await db.initDB();
    await db.initJobsTable();
    await storage.initStorage();
    startWorker();

    app.listen(port, () => {
      console.log(`🚀 Sortd Backend running at http://localhost:${port}`);
    });

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Periodically clean orphaned temp files
    setInterval(() => {
      const now = Date.now();
      const files = fs.readdirSync(tempDir);
      files.forEach(file => {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtime.getTime() > 3600000) { // 1 hour
          fs.unlinkSync(filePath);
        }
      });
    }, 1800000);

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
