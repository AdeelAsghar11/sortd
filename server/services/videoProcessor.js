import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import ogs from 'open-graph-scraper';
import { v4 as uuidv4 } from 'uuid';
import { transcribeAudio } from './transcription.js';
import { summarizeContent, categorizeContent } from './gemini.js';
import { createNote, getAllLists, createList } from './database.js';
import { cacheThumbnail } from './storage.js';

const TEMP_DIR = path.resolve('temp');
const YT_DLP_PATH = path.resolve('bin', 'yt-dlp');
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const COBALT_URL = process.env.COBALT_URL;

const PLATFORM_CONFIGS = {
  youtube: {
    flags: ['-x', '--audio-format', 'mp3', '--audio-quality', '5', '--max-filesize', '25m', '--no-playlist', '--socket-timeout', '30'],
    retries: 1,
    timeoutMs: 60_000,
  },
  instagram: {
    flags: [
      '-x', '--audio-format', 'mp3', '--audio-quality', '5', 
      '--max-filesize', '25m', '--no-playlist', '--socket-timeout', '30',
      '--no-check-certificate',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    ],
    retries: 1,
    timeoutMs: 90_000,
  },
  tiktok: {
    flags: ['-x', '--audio-format', 'mp3', '--audio-quality', '5', '--max-filesize', '25m', '--no-playlist', '--socket-timeout', '30', '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', '--extractor-args', 'tiktok:api_hostname=api22-normal-c-alisg.tiktokv.com'],
    retries: 1,
    timeoutMs: 90_000,
  },
  default: {
    flags: ['-x', '--audio-format', 'mp3', '--audio-quality', '5', '--max-filesize', '25m', '--no-playlist', '--socket-timeout', '30'],
    retries: 1,
    timeoutMs: 60_000,
  }
};

export function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes('instagram.com') || u.includes('instagr.am')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be'))     return 'youtube';
  if (u.includes('tiktok.com'))                                 return 'tiktok';
  if (u.includes('twitter.com') || u.includes('x.com'))         return 'twitter';
  if (u.includes('reddit.com'))                                 return 'reddit';
  if (u.includes('linkedin.com'))                               return 'linkedin';
  if (u.includes('facebook.com') || u.includes('fb.watch'))     return 'facebook';
  return 'web';
}

async function scrapeMetadata(url) {
  try {
    const { result } = await ogs({ url, timeout: 10000 });
    return {
      title: result.ogTitle || result.twitterTitle || result.pageTitle || new URL(url).hostname,
      description: result.ogDescription || result.twitterDescription || '',
      image: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || null,
    };
  } catch (err) {
    console.error('Metadata scraping failed:', err.message);
    return { title: new URL(url).hostname, description: '', image: null };
  }
}

async function downloadAudio(url, config) {
  const fileName = `audio_${Date.now()}_${uuidv4().slice(0, 8)}.mp3`;
  const filePath = path.join(TEMP_DIR, fileName);
  
  return new Promise((resolve, reject) => {
    const args = [...config.flags, '-o', filePath.replace('.mp3', '.%(ext)s'), url];
    console.log(`Running yt-dlp with args: ${args.join(' ')}`);
    
    const child = spawn(YT_DLP_PATH, args);
    
    let errorOutput = '';
    child.stderr.on('data', (data) => { errorOutput += data.toString(); });
    
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('yt-dlp timed out'));
    }, config.timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        // yt-dlp might have saved it as something else if -x failed, but we requested mp3
        if (fs.existsSync(filePath)) {
          resolve(filePath);
        } else {
          // Check for other extensions
          const base = filePath.replace('.mp3', '');
          const files = fs.readdirSync(TEMP_DIR);
          const found = files.find(f => f.startsWith(path.basename(base)));
          if (found) {
            resolve(path.join(TEMP_DIR, found));
          } else {
            reject(new Error(`yt-dlp succeeded but file not found: ${filePath}`));
          }
        }
      } else {
        reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
      }
    });
  });
}

export async function processUrl(url, updateJobStep, userId) {
  const platform = detectPlatform(url);
  const config = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.default;

  updateJobStep('downloading');
  let lastDownloadErr = null;
  const [metadata, audioFile] = await Promise.all([
    scrapeMetadata(url),
    downloadAudioWithRetry(url, config).catch(err => { 
      console.error('Download failed for', url, ':', err.message);
      lastDownloadErr = err; 
      return null; 
    }),
  ]);

  if (audioFile) {
    console.log('✅ Download successful:', audioFile);
  } else {
    console.log('⚠️ Processing with metadata only (Download failed)');
  }

  let transcript = null;
  let aiResult;
  let thumbnail = metadata.image;
  let lists = [];

  try {
    lists = await getAllLists(userId);
    if (audioFile) {
      const stats = fs.statSync(audioFile);
      if (stats.size > MAX_AUDIO_SIZE) {
        throw new Error('FILE_TOO_LARGE');
      }

      updateJobStep('transcribing');
      transcript = await transcribeAudio(audioFile);
      
      updateJobStep('categorizing');
      aiResult = await summarizeContent(transcript, platform, lists.map(l => l.name));
      aiResult.transcript = transcript;
    } else {
      updateJobStep('categorizing');
      const text = [metadata.title, metadata.description].filter(Boolean).join('\n\n');
      aiResult = text
        ? await categorizeContent(text, platform, lists.map(l => l.name))
        : { title: metadata.title || url, summary: '', category: 'inbox', tags: [platform] };
      aiResult.transcript = '';
    }
  } catch (err) {
    console.error('AI Processing failed:', err.message);
    aiResult = {
      title: metadata.title || url,
      summary: 'AI processing failed. Original content preserved.',
      category: 'inbox',
      tags: [platform, 'failed-ai']
    };
    aiResult.transcript = transcript || '';
  } finally {
    if (audioFile && fs.existsSync(audioFile)) {
      fs.unlinkSync(audioFile);
    }
  }

  // Cache thumbnail if available
  if (thumbnail) {
    thumbnail = await cacheThumbnail(thumbnail);
  }

  let targetListId;
  let targetList = lists.find(l => l.name.toLowerCase() === (aiResult.category || '').toLowerCase());
  
  if (targetList) {
    targetListId = targetList.id;
  } else if (aiResult.category && aiResult.category.trim() !== '') {
    try {
      const newList = await createList({
        id: uuidv4(),
        name: aiResult.category.trim(),
        sort_order: lists.length
      }, userId);
      targetListId = newList.id;
    } catch (err) {
      console.error('Failed to create new list from AI category:', err);
      const inboxList = lists.find(l => l.name.toLowerCase() === 'inbox');
      targetListId = inboxList ? inboxList.id : null;
    }
  } else {
    const inboxList = lists.find(l => l.name.toLowerCase() === 'inbox');
    targetListId = inboxList ? inboxList.id : null;
  }

  // Save to Supabase
  return createNote({
    id: uuidv4(),
    title: aiResult.title,
    content: aiResult.summary,
    raw_text: aiResult.transcript || '',
    source_type: 'url',
    source_url: url,
    source_platform: platform,
    thumbnail: thumbnail,
    list_id: targetListId,
    tags: aiResult.tags,
  }, userId);
}

async function downloadAudioWithRetry(url, config) {
  // 1. Try Cobalt first if configured
  if (COBALT_URL) {
    try {
      console.log('🚀 Attempting download via Cobalt...');
      return await downloadWithCobalt(url);
    } catch (err) {
      console.error('⚠️ Cobalt failed:', err.message);
      console.log('🔄 Falling back to local yt-dlp...');
    }
  }

  // 2. Fallback to local yt-dlp
  let attempts = 0;
  while (attempts <= config.retries) {
    try {
      return await downloadAudio(url, config);
    } catch (err) {
      attempts++;
      if (attempts <= config.retries) {
        console.log(`Retrying download (${attempts}/${config.retries})...`);
        await new Promise(r => setTimeout(r, 2000 * attempts));
      } else {
        throw err;
      }
    }
  }
}

async function downloadWithCobalt(url) {
  const cobaltApi = COBALT_URL.endsWith('/') ? COBALT_URL : `${COBALT_URL}/`;
  const response = await fetch(cobaltApi, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      url: url,
      aFormat: 'mp3',
      isAudioOnly: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cobalt API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.status === 'error') {
    throw new Error(`Cobalt error: ${data.text}`);
  }

  const downloadUrl = data.url;
  const fileName = `audio_${Date.now()}.mp3`;
  const filePath = path.join(TEMP_DIR, fileName);

  console.log('📥 Downloading from Cobalt stream...');
  const fileResponse = await fetch(downloadUrl);
  if (!fileResponse.ok) throw new Error('Failed to stream from Cobalt');

  const fileStream = fs.createWriteStream(filePath);
  const reader = fileResponse.body.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fileStream.write(Buffer.from(value));
  }
  
  return new Promise((resolve, reject) => {
    fileStream.end();
    fileStream.on('finish', () => resolve(filePath));
    fileStream.on('error', reject);
  });
}
