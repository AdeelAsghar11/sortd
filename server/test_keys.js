
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const keys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);

async function testKeys() {
  console.log(`🔍 Testing ${keys.length} API keys...`);
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const genAI = new GoogleGenerativeAI(key);
    // Use the model we configured in gemini.js
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    
    console.log(`\n🔑 Key #${i + 1} (${key.substring(0, 10)}...):`);
    
    try {
      const result = await model.generateContent("Hi, are you working?");
      const text = result.response.text();
      console.log(`   ✅ SUCCESS: "${text.substring(0, 50)}..."`);
    } catch (err) {
      if (err.message.includes('429')) {
        console.log(`   ❌ 429: Quota exceeded/exhausted.`);
      } else if (err.message.includes('404')) {
        console.log(`   ❌ 404: Model not supported.`);
      } else {
        console.log(`   ❌ ERROR: ${err.message.split('\n')[0]}`);
      }
    }
  }
}

testKeys();
