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

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development/testing
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Multer for image uploads
const upload = multer({ dest: 'temp/' });

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
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Check duplicate for this user
  const { data: existing } = await db.supabase
    .from('notes')
    .select('id')
    .eq('source_url', url)
    .eq('user_id', req.user.id)
    .single();

  if (existing) {
    return res.status(303).json({ noteId: existing.id });
  }

  const jobId = enqueue({
    type: 'url',
    source: 'api',
    userId: req.user.id,
    payload: { url }
  });

  res.status(202).json({ jobId });
});

app.post('/api/process-image', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image file is required' });

  const jobId = enqueue({
    type: 'image',
    source: 'api',
    userId: req.user.id,
    payload: { 
      filePath: req.file.path,
      sourceType: 'screenshot'
    }
  });

  res.status(202).json({ jobId });
});

// Queue
app.get('/api/queue/stats', authenticate, (req, res) => {
  res.json(getQueueStats());
});

// Settings
app.get('/api/settings', authenticate, async (req, res) => {
  try {
    const geminiKey = await db.getSetting('gemini_api_key');
    res.json({
      geminiKeySet: !!geminiKey,
      queueStats: getQueueStats()
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

// SSE
app.get('/api/events', authenticate, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ serverTime: new Date().toISOString() })}\n\n`);
  addSSEClient(res, req.user.id);
});

// Start Server
async function start() {
  try {
    await db.initDB();
    await storage.initStorage();
    startWorker();

    app.listen(port, () => {
      console.log(`🚀 Sortd Backend running at http://localhost:${port}`);
    });

    // Cleanup temp files on startup
    const tempDir = path.resolve('temp');
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach(file => fs.unlinkSync(path.join(tempDir, file)));
    } else {
      fs.mkdirSync(tempDir);
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
