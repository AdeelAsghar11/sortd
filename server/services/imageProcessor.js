import Tesseract from 'tesseract.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { analyzeImage } from './gemini.js';
import { createNote, getAllLists } from './database.js';
import { uploadImage } from './storage.js';

/**
 * Process an image file: Gemini Vision -> Supabase Note
 * @param {string} filePath 
 * @param {string} sourceType 
 * @param {Function} updateJobStep 
 */
export async function processImage(filePath, sourceType = 'screenshot', updateJobStep) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Image file not found: ${filePath}`);
  }

  try {
    updateJobStep('analyzing');
    const buffer = fs.readFileSync(filePath);
    const lists = await getAllLists();
    
    // Use Gemini Vision for intelligent screenshot analysis
    // This handles non-English text and ignores UI elements automatically
    const aiResult = await analyzeImage(buffer, 'image/jpeg', lists.map(l => l.name));

    updateJobStep('uploading');
    const thumbnail = await uploadImage(buffer, 'image/jpeg');

    // Run OCR in background for full-text searchability
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
    });
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
