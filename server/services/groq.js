
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Queries Groq LLM as a fallback
 * @param {string} prompt - The prompt to send
 * @param {string} model - The model to use (default: llama-3.3-70b-versatile)
 * @returns {Promise<string>} - The AI response
 */
export async function queryGroq(prompt, model = 'llama-3.3-70b-versatile') {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: model,
    });

    return chatCompletion.choices[0]?.message?.content || "";
  } catch (err) {
    console.error('Groq API Error:', err.message);
    throw err;
  }
}
