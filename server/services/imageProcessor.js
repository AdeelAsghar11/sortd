import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import sharp from 'sharp';
import { analyzeImage } from './gemini.js';
import { createNote, getAllLists, createList } from './database.js';
import { uploadImage } from './storage.js';

/**
 * Process an image file: Optimize -> Llama 4 Vision -> Storage -> Supabase Note
 */
export async function processImage(filePath, sourceType = 'screenshot', updateJobStep, userId) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Image file not found: ${filePath}`);
  }

  try {
    // 0. Initial state
    await updateJobStep('starting');

    // 1. Optimize Image
    await updateJobStep('optimizing');
    
    // Create high-quality version for storage
    const optimizedBuffer = await sharp(filePath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Create low-resolution version for AI (Much faster for OCR/Analysis)
    const aiBuffer = await sharp(filePath)
      .resize(800, 800, { fit: 'inside' })
      .webp({ quality: 50 })
      .toBuffer();

    // 2. Parallelize Analysis and Upload
    await updateJobStep('analyzing'); // Frontend says "Llama 4 is analyzing..."
    
    const lists = await getAllLists(userId);
    
    console.log('⚡ Starting parallel AI Analysis and Storage Upload...');
    const [aiResult, thumbnail] = await Promise.all([
      analyzeImage(aiBuffer, 'image/webp', lists.map(l => l.name)),
      uploadImage(optimizedBuffer, 'image/webp')
    ]);

    // 3. Categorize and Save
    await updateJobStep('saving'); // Frontend says "Saving to inbox..."
    
    // Use AI extracted text as rawText
    let rawText = aiResult.extracted_text || aiResult.summary || '';
    
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
      raw_text: rawText || aiResult.summary,
      source_type: sourceType,
      thumbnail: thumbnail,
      list_id: targetListId,
    }, userId);
  } catch (err) {
    throw err;
  }
}
