import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGroqClient, queryGroq, groqKeys } from './groq.js';
import { getSetting } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

// Manage multiple Gemini keys

// Manage multiple Gemini keys
export const geminiKeys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
let currentGeminiIndex = 0;

let genAI = null;
let model = null;

// Groq for text-only fallback
// Groq logic now handled via groq.js

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
  
  // Detect content characteristics upfront to give the model better framing
  const isLikelyCreative = /[\u0600-\u06FF]/.test(text) || // Urdu/Arabic script
    text.split('\n').length > 4; // multi-line = likely poetry or structured content
  
  const contentType = isLikelyCreative ? 'creative/poetic' : 'informational';

  const prompt = `
You are Sortd AI — a highly perceptive content intelligence engine.
Your job is to extract the MAXIMUM possible meaning and specificity from content.

CONTENT PLATFORM: ${platform}
CONTENT TYPE HINT: ${contentType}
WORD COUNT: ${text.split(' ').length} words

---
CONTENT TO ANALYZE:
${text}
---

STRICT RULES:

TITLE (max 8 words):
- Must contain the MOST specific detail from the content
- BAD: "Interesting Recipe Found" | GOOD: "Lahori Karahi with Bone Marrow Recipe"
- BAD: "Motivational Quote" | GOOD: "Rumi on the Pain of Longing"
- BAD: "Fitness Tips" | GOOD: "Zone 2 Cardio for Metabolic Health"
- If Urdu/Arabic: title can be in original language or transliterated

SUMMARY (minimum 3 sentences, use Markdown):
- Sentence 1: What IS this content, specifically? Name names, techniques, ingredients, concepts.
- Sentence 2: What is the KEY insight, lesson, emotion, or actionable takeaway?
- Sentence 3: Why does this matter or who is it for?
- IMPORTANT: All Markdown formatting (like blockquotes or line breaks) MUST be contained WITHIN the JSON string value.
- For POETRY/QUOTES: Do NOT paraphrase into dry prose. 
  Include the original text inside a blockquote (using >) followed by 1-2 lines of emotional context.
  Example string value:
  "> Hazaron saal Nargis apni benoori pe roti hai\\n\\n*Allama Iqbal meditates on the rarity of a visionary...*"
- For RECIPES: List the 3 most important ingredients or techniques.
- For TUTORIALS/LEARN: State the specific skill being taught and the level (beginner/intermediate/advanced).
- PRESERVE original language for Urdu, Arabic, or other scripts. Never translate poetry.

CATEGORY — pick exactly one:
watch-later, events, opportunities, poems-quotes, recipes, ideas, deals, learn, saved, inbox
${customListNames.length > 0 ? `Custom categories (prioritize these if relevant): ${customListNames.join(', ')}` : ''}

TAGS (exactly 4-5 tags, be SPECIFIC not generic):
- BAD: ["food", "recipe", "cooking"] 
- GOOD: ["lahori-karahi", "bone-marrow", "pakistani-cuisine", "restaurant-style"]
- BAD: ["motivation", "quotes", "life"]
- GOOD: ["iqbal", "urdu-shayari", "self-actualization", "khudi"]
- Include: platform name, content creator if mentioned, specific topic, niche subtopic

Return ONLY this JSON, nothing else:
{
  "title": "...",
  "summary": "...",
  "category": "...",
  "tags": ["...", "...", "...", "...", "..."]
}
`;

  // Groq primary path — uses the SAME rich prompt
  if (groqKeys && groqKeys.length > 0) {
    try {
      console.log('🚀 Querying Groq (Primary) for summarization...');
      const client = getGroqClient();
      const chatCompletion = await client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 1024,
      });
      return JSON.parse(chatCompletion.choices[0].message.content);
    } catch (err) {
      console.warn('⚠️ Groq Primary failed, falling back to Gemini...', err.message);
    }
  }

  // Gemini fallback with key rotation
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
      throw err;
    }
  }
}

/**
 * Analyze an image. Gemini only (Vision required).
 */
export async function analyzeImage(buffer, mimeType, customListNames = []) {
  const prompt = `
You are Sortd AI — a highly perceptive visual intelligence engine.
Your mission is to extract the soul and utility from this image.

1. CORE IDENTITY: What is this content, really? Ignore generic UI (likes/buttons).
2. EXTRACTION: Extract key text in original language (Urdu, Arabic, English).
3. SOULFUL SUMMARY:
   - MANDATORY for POETRY/QUOTES: You MUST include the original text EXACTLY as written inside a Markdown blockquote (>).
   - DO NOT summarize the poem into your own words. Preserve the words, then add 1-2 lines of emotional context below it.
   - Always preserve original cultural scripts (Urdu, Arabic).
4. CATEGORY: watch-later, events, opportunities, poems-quotes, recipes, ideas, deals, learn, saved.
${customListNames.length > 0 ? `Custom user categories: ${customListNames.join(', ')}` : ''}

Return JSON: 
{ 
  "title": "Evocative, high-specificity title", 
  "summary": "Minimum 3 sentences. If poetry, the FIRST line must be the blockquoted original text. Sentence 2: the key insight/emotion. Sentence 3: why it matters. IMPORTANT: All Markdown formatting MUST be contained WITHIN the JSON string value.", 
  "extracted_text": "Full extracted text", 
  "category": "category",
  "tags": ["3-5 deep, specific tags"]
}
`;

    const imagePart = {
    inlineData: { data: buffer.toString('base64'), mimeType }
  };

  // Try Groq Vision first as primary
  if (groqKeys.length > 0) {
    try {
      console.log('🚀 Querying Groq Vision (Primary) for image analysis...');
      return await analyzeWithGroq(buffer, mimeType, customListNames);
    } catch (err) {
      console.warn('⚠️ Groq Vision Primary failed, falling back to Gemini...', err.message);
    }
  }

  // Fallback to Gemini Vision
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

async function analyzeWithGroq(buffer, mimeType, customListNames) {
  const prompt = `
You are a content capture assistant. Look at this image (likely a screenshot).
1. Identify the CORE content. If it's a social media post, IGNORE the app UI (likes, buttons).
2. Extract EXACT text in its original language (Urdu, English, etc.).
3. MANDATORY for POETRY/QUOTES: You MUST include the original text EXACTLY as written inside a Markdown blockquote (>).
   DO NOT summarize it. Preserve the words, then add 1-2 lines of emotional context below it.
4. Categorize into: watch-later, events, opportunities, poems-quotes, recipes, ideas, deals, learn, saved.
${customListNames.length > 0 ? `Custom user categories: ${customListNames.join(', ')}` : ''}

Return JSON: 
{ 
  "title": "Short title", 
  "summary": "Minimum 3 sentences. If poetry, FIRST line must be the blockquoted original text. Sentence 2: key insight or emotion. Sentence 3: why it matters. IMPORTANT: All Markdown formatting MUST be contained WITHIN the JSON string value. Preserve Urdu/Arabic script exactly.", 
  "extracted_text": "Full text", 
  "category": "category",
  "tags": ["tag1", "tag2"]
}
`;

  const base64Image = buffer.toString('base64');
  const client = getGroqClient();
  const chatCompletion = await client.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  });

  const content = chatCompletion.choices[0].message.content;
  console.log('🤖 Llama 4 Analysis Complete:', content.substring(0, 100) + '...');
  return parseAIResponse(content);
}

// summarizeWithGroq removed as its logic is now consolidated into summarizeContent

function parseAIResponse(textResponse) {
  if (!textResponse) throw new Error('Empty AI response');
  
  // Try to find the JSON structure by looking for the first { and last }
  const start = textResponse.indexOf('{');
  const end = textResponse.lastIndexOf('}');
  
  if (start === -1 || end === -1 || end <= start) {
    console.error('No JSON braces found in response:', textResponse);
    throw new Error('AI response did not contain a valid JSON object');
  }

  const jsonCandidate = textResponse.substring(start, end + 1).trim();
  
  try {
    return JSON.parse(jsonCandidate);
  } catch (err) {
    // If it still fails, try one more cleanup: removing common AI junk
    try {
      const secondaryClean = jsonCandidate
        .replace(/\\n/g, ' ') // Replace escaped newlines
        .replace(/\n/g, ' ')  // Replace actual newlines
        .trim();
      return JSON.parse(secondaryClean);
    } catch (err2) {
      console.error('Terminal JSON parse failure. Raw:', textResponse);
      throw new Error(`AI returned invalid JSON structure: ${err.message}`);
    }
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
