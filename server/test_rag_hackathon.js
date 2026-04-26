
import { queryRAG } from './services/rag.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    console.log('Testing RAG for "hackathon"...');
    const result = await queryRAG('what was that hackathon I saved?', '0eab8f61-13af-47e9-b904-bdf5f7d6ba2d'); 
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Caught Error:', err.message);
  }
}

test();
