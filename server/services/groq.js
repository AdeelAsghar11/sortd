import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Manage multiple Groq keys
export const groqKeys = (process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
let currentGroqIndex = 0;

export function getGroqClient(forceRotate = false) {
  if (forceRotate && groqKeys.length > 1) {
    currentGroqIndex = (currentGroqIndex + 1) % groqKeys.length;
    console.log(`🔄 Rotating to Groq Key #${currentGroqIndex + 1}`);
  }

  const apiKey = groqKeys[currentGroqIndex];
  if (!apiKey) {
    throw new Error('No Groq API keys available. Please set GROQ_API_KEY in .env');
  }

  return new Groq({ apiKey });
}

/**
 * Queries Groq LLM with rotation support
 * @param {string} prompt - The prompt to send
 * @param {object} options - Options including model and JSON format
 * @returns {Promise<string|object>} - The AI response
 */
export async function queryGroq(prompt, options = {}) {
  const { 
    model = 'llama-3.3-70b-versatile', 
    json = false 
  } = options;

  for (let i = 0; i < Math.max(1, groqKeys.length); i++) {
    try {
      const client = getGroqClient(i > 0);
      const chatCompletion = await client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: model,
        response_format: json ? { type: 'json_object' } : undefined,
      });

      const content = chatCompletion.choices[0]?.message?.content || "";
      return json ? JSON.parse(content) : content;
    } catch (err) {
      if (err.message.includes('429') && i < groqKeys.length - 1) {
        console.warn(`⚠️ Groq Key #${currentGroqIndex + 1} quota hit. Rotating...`);
        continue;
      }
      throw err;
    }
  }
}
