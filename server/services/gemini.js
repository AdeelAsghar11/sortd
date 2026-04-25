import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSetting } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

let genAI = null;
let model = null;

async function getClient() {
  if (genAI) return { genAI, model };

  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    apiKey = await getSetting('gemini_api_key');
  }

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment or database');
  }

  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ 
    model: 'gemini-flash-latest',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    }
  });

  return { genAI, model };
}

/**
 * Summarize and categorize content from a transcript or OCR.
 * @param {string} text - full text content
 * @param {string} platform - source platform name
 * @param {string[]} customListNames - optional user list names
 * @returns {Promise<{
 *   title: string,
 *   summary: string,
 *   category: string
 * }>}
 */
export async function summarizeContent(text, platform, customListNames = []) {
  const { model } = await getClient();

  const prompt = `
You are a content categorization assistant for "Sortd".
Analyze the following content from a ${platform} and return JSON.

IMPORTANT: If this is a screenshot from social media (Instagram, TikTok, etc.), IGNORE the interface elements (usernames, buttons, metrics). Focus entirely on the main content (text, poetry, quotes, or information) displayed in the center.

Available categories: watch-later, events, opportunities, poems-quotes,
recipes, ideas, deals, learn, saved, inbox
${customListNames.length > 0 ? `Custom user categories: ${customListNames.join(', ')}` : ''}

Rules:
1. "title" should be a concise, catchy title for the note.
2. "summary" should be a high-quality summary of the main points (markdown allowed).
3. "category" MUST be one of the available categories listed above. Choose the best fit.

Return ONLY valid JSON:
{ "title": "...", "summary": "...", "category": "..." }

Content:
${text}
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const textResponse = response.text();
  
  try {
    return JSON.parse(textResponse.replace(/```json\n?|```/g, '').trim());
  } catch (err) {
    const cleaned = textResponse.replace(/```json\n?|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(cleaned.substring(start, end + 1));
    }
    throw new Error(`AI returned invalid JSON: ${err.message}`);
  }
}

/**
 * Analyze an image directly using Gemini Vision.
 * @param {Buffer} buffer 
 * @param {string} mimeType 
 * @param {string[]} customListNames
 */
export async function analyzeImage(buffer, mimeType, customListNames = []) {
  const { model } = await getClient();

  const prompt = `
You are a content capture assistant. Look at this image (likely a screenshot).

1. Identify the CORE content. If it's a social media post, IGNORE the app UI (likes, comments, profile info). Focus on the image or text in the center.
2. If there is text in a different language (like Urdu or Arabic), transcribe it or summarize it accurately.
3. Categorize it into one of: watch-later, events, opportunities, poems-quotes, recipes, ideas, deals, learn, saved.
${customListNames.length > 0 ? `Custom user categories: ${customListNames.join(', ')}` : ''}

Return JSON:
{ "title": "...", "summary": "...", "category": "..." }
`;

  const imagePart = {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType
    }
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  const textResponse = response.text();

  try {
    return JSON.parse(textResponse.replace(/```json\n?|```/g, '').trim());
  } catch (err) {
    const cleaned = textResponse.replace(/```json\n?|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(cleaned.substring(start, end + 1));
    }
    throw err;
  }
}

/**
 * Categorize metadata-only content.
 * @param {string} text - metadata title + description
 * @param {string} platform
 * @param {string[]} customListNames
 */
export async function categorizeContent(text, platform, customListNames = []) {
  return summarizeContent(text, platform, customListNames);
}

/**
 * Update the in-memory Gemini client (used when API key is updated via settings)
 */
export function resetGeminiClient() {
  genAI = null;
  model = null;
}
