import Tesseract from 'tesseract.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import sharp from 'sharp';
import { analyzeImage } from './gemini.js';
import { createNote, getAllLists } from './database.js';
import { uploadImage } from './storage.js';

/**
 * Process an image file: Optimize -> Gemini Vision -> Storage -> Supabase Note
 */
export async function processImage(filePath, sourceType = 'screenshot', updateJobStep, userId) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Image file not found: ${filePath}`);
  }

  try {
    updateJobStep('optimizing');
    
    // Optimize image: Convert to WebP, resize if too large, and compress
    const optimizedBuffer = await sharp(filePath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    updateJobStep('analyzing');
    const lists = await getAllLists(userId);
    
    // Use optimized WebP for Gemini analysis (saves bandwidth and latency)
    const aiResult = await analyzeImage(optimizedBuffer, 'image/webp', lists.map(l => l.name));

    updateJobStep('uploading');
    // Save optimized WebP to storage
    const thumbnail = await uploadImage(optimizedBuffer, 'image/webp');

    // Run OCR in background for full-text searchability
    // We use the original file for OCR as it might have higher resolution
    let rawText = '';
    try {
      const { data: { text } } = await Tesseract.recognize(filePath, 'eng+urd');
      rawText = text;
    } catch (ocrErr) {
      console.warn('OCR fallback failed, continuing with Gemini result');
    }

    // Save to Supabase
    return createNote({
      id: uuidv4(),
      title: aiResult.title,
      content: aiResult.summary,
      raw_text: rawText || aiResult.summary,
      source_type: sourceType,
      thumbnail: thumbnail,
      list_id: aiResult.category,
    }, userId);
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
