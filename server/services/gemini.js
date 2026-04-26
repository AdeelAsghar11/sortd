import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { getSetting } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

// Manage multiple Gemini keys
export const geminiKeys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
let currentGeminiIndex = 0;

let genAI = null;
let model = null;

// Groq for text-only fallback
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

export async function getGeminiClient(forceRotate = false, config = {}) {
  if (forceRotate) {
    currentGeminiIndex = (currentGeminiIndex + 1) % geminiKeys.length;
    genAI = null;
    model = null;
    console.log(`🔄 Rotating to Gemini Key #${currentGeminiIndex + 1}`);
  }

  if (genAI && model && Object.keys(config).length === 0) return { genAI, model };

  let apiKey = geminiKeys[currentGeminiIndex];
  if (!apiKey) {
    apiKey = await getSetting('gemini_api_key');
  }

  if (!apiKey) {
    throw new Error('No Gemini API keys available');
  }

  genAI = new GoogleGenerativeAI(apiKey);
  
  const defaultConfig = {
    responseMimeType: 'application/json',
    temperature: 0.3,
  };

  const finalModel = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-lite',
    generationConfig: { ...defaultConfig, ...config }
  });

  // Only cache if it's the default config (for summarization)
  if (Object.keys(config).length === 0) {
    model = finalModel;
  }

  return { genAI, model: finalModel };
}

/**
 * Summarize and categorize content. Uses Gemini with rotation, and Groq as final fallback.
 */
export async function summarizeContent(text, platform, customListNames = []) {
  const prompt = `
You are a content categorization assistant for "Sortd".
Analyze the following content from a ${platform} and return JSON.

Available categories: watch-later, events, opportunities, poems-quotes, recipes, ideas, deals, learn, saved, inbox
${customListNames.length > 0 ? `Custom user categories: ${customListNames.join(', ')}` : ''}

Return JSON: { "title": "...", "summary": "...", "category": "..." }

Content:
${text}
`;

  // Try Gemini first (with rotation)
  for (let i = 0; i < Math.max(1, geminiKeys.length); i++) {
    try {
      const { model } = await getGeminiClient(i > 0);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return parseAIResponse(response.text());
    } catch (err) {
      if (err.message.includes('429') && i < geminiKeys.length - 1) {
        console.warn(`⚠️ Gemini Key #${currentGeminiIndex + 1} quota exceeded. Rotating...`);
        continue;
      }
      
      // If we've tried all Gemini keys or it's not a 429, try Groq
      if (groq) {
        console.log('🚀 Gemini failed or quota hit. Falling back to Groq (Llama 3)...');
        return summarizeWithGroq(text, platform, customListNames);
      }
      throw err;
    }
  }
}

/**
 * Analyze an image. Gemini only (Vision required).
 */
export async function analyzeImage(buffer, mimeType, customListNames = []) {
  const prompt = `
You are a content capture assistant. Look at this image (likely a screenshot).
1. Identify the CORE content. If it's a social media post, IGNORE the app UI.
2. Extract EXACT text in its original language (Urdu, English, etc.).
3. Categorize into: watch-later, events, opportunities, poems-quotes, recipes, ideas, deals, learn, saved.
${customListNames.length > 0 ? `Custom user categories: ${customListNames.join(', ')}` : ''}

Return JSON: { "title": "...", "summary": "...", "category": "..." }
`;

  const imagePart = {
    inlineData: { data: buffer.toString('base64'), mimeType }
  };

  for (let i = 0; i < Math.max(1, geminiKeys.length); i++) {
    try {
      const { model } = await getGeminiClient(i > 0);
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return parseAIResponse(response.text());
    } catch (err) {
      if (err.message.includes('429') && i < geminiKeys.length - 1) {
        console.warn('⚠️ Gemini Vision quota hit. Rotating...');
        continue;
      }
      throw err;
    }
  }
}

async function summarizeWithGroq(text, platform, customListNames) {
  const prompt = `Analyze this ${platform} content and return JSON: { "title": "...", "summary": "...", "category": "..." }. 
  Categories: watch-later, events, opportunities, poems-quotes, recipes, ideas, deals, learn, saved, inbox.
  Content: ${text}`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },
  });

  return JSON.parse(chatCompletion.choices[0].message.content);
}

function parseAIResponse(textResponse) {
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

export async function categorizeContent(text, platform, customListNames = []) {
  return summarizeContent(text, platform, customListNames);
}

export async function generateEmbedding(text) {
  if (!text) return null;
  
  // Clean text: remove newlines and extra spaces
  const cleanText = text.replace(/\s+/g, ' ').trim();

  for (let i = 0; i < Math.max(1, geminiKeys.length); i++) {
    try {
      const { genAI } = await getGeminiClient(i > 0);
      const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-2' });
      const result = await embeddingModel.embedContent({ 
        content: { parts: [{ text: cleanText.substring(0, 30000) }] }, 
        outputDimensionality: 768 
      });
      return result.embedding.values;
    } catch (err) {
      if (err.message.includes('429') && i < geminiKeys.length - 1) {
        console.warn('⚠️ Embedding quota exceeded. Rotating...');
        continue;
      }
      console.error('Embedding generation failed:', err.message);
      return null;
    }
  }
}

export function resetGeminiClient() {
  genAI = null;
  model = null;
}
