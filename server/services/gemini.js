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
    // 1. Direct parse
    return JSON.parse(textResponse);
  } catch (err) {
    try {
      // 2. Strip potential markdown and find first/last braces
      const cleaned = textResponse
        .replace(/```json\n?|```/g, '')
        .trim();
      
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      
      if (start !== -1 && end !== -1) {
        return JSON.parse(cleaned.substring(start, end + 1));
      }
      throw err;
    } catch (parseErr) {
      console.error('Final JSON parse failure. Raw response:', textResponse);
      throw new Error(`AI returned invalid JSON: ${parseErr.message}`);
    }
  }
}

/**
 * Categorize metadata-only content.
 * @param {string} text - metadata title + description
 * @param {string} platform
 * @param {string[]} customListNames
 */
export async function categorizeContent(text, platform, customListNames = []) {
  // Uses the same logic but with a slightly different context if needed
  // For now, summarizeContent is robust enough
  return summarizeContent(text, platform, customListNames);
}

/**
 * Update the in-memory Gemini client (used when API key is updated via settings)
 */
export function resetGeminiClient() {
  genAI = null;
  model = null;
}
