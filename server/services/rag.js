import { generateEmbedding, summarizeContent } from './gemini.js';
import { searchNotesSemantic, getAllNotes } from './database.js';
import { getGeminiClient } from './gemini.js';
import { queryGroq } from './groq.js';

export async function queryRAG(query, userId) {
  try {
    // 1. Generate embedding for the query
    console.log(`🧠 RAG: Generating embedding for query: "${query}"`);
    const embedding = await generateEmbedding(query);
    if (!embedding) {
      throw new Error('Could not generate embedding for query');
    }

    // 2. Retrieve relevant context
    console.log('🔍 RAG: Searching for relevant notes...');
    let notes = [];
    try {
      const result = await searchNotesSemantic(embedding, userId, 5);
      notes = result.notes;
    } catch (err) {
      console.error(`Semantic search failed, falling back to keyword: ${err.message}`);
      // Clean query for keyword search (remove stop words, etc)
      const searchTerms = query.toLowerCase()
        .replace(/[?.,!]/g, '')
        .split(' ')
        .filter(w => w.length > 3) // Only keep significant words
        .join(' ');
      
      const { data } = await getAllNotes({ search: searchTerms || query }, userId);
      notes = data || [];
    }

    // Limit to top 3 notes to avoid token limits and focus the AI
    const topNotes = notes.slice(0, 3);
    
    if (topNotes.length === 0) {
      return {
        response: "I couldn't find any specific notes related to your question. Could you try rephrasing or asking about something else you've saved?",
        sources: []
      };
    }

    // 3. Construct context string and prompt
    const context = topNotes.map(n => `Title: ${n.title}\nContent: ${n.content || n.raw_text}`).join('\n\n---\n\n');
    const prompt = `You are a helpful assistant for a personal note-taking app. 
    Use the following notes context to answer the user's question. 
    If the answer isn't in the context, say you don't know based on the notes.
    
    Context:
    ${context}
    
    User Question: ${query}`;

    // 4. Generate response with rotation support (Gemini -> Groq -> Manual)
    const { geminiKeys } = await import('./gemini.js');
    let aiExhausted = false;

    for (let i = 0; i < Math.max(1, (geminiKeys?.length || 1)); i++) {
      try {
        const { model } = await getGeminiClient(i > 0, { responseMimeType: 'text/plain' });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return {
          response: responseText,
          sources: topNotes.map(n => ({ id: n.id, title: n.title }))
        };
      } catch (err) {
        if (err.message.includes('429') && geminiKeys && i < geminiKeys.length - 1) {
          console.warn(`⚠️ RAG Gemini quota hit. Rotating to key #${i + 2}...`);
          continue;
        }
        
        if (err.message.includes('429')) {
          console.warn('⚠️ All Gemini keys exhausted. Trying Groq fallback...');
          aiExhausted = true;
          break; // Exit Gemini loop to try Groq
        }
        
        throw err;
      }
    }

    // Try Groq if Gemini failed with 429
    if (aiExhausted) {
      try {
        console.log('🚀 RAG: Querying Groq (Llama 3)...');
        const groqResponse = await queryGroq(prompt);
        if (groqResponse) {
          return {
            response: groqResponse,
            sources: topNotes.map(n => ({ id: n.id, title: n.title }))
          };
        }
      } catch (groqErr) {
        console.error('Groq Fallback Failed:', groqErr.message);
      }
    }

    // Final Fallback: If all AI fails but we have notes, return a formatted list
    let fallbackResponse = "I'm having some trouble connecting to my AI brain right now, but here are the most relevant notes I found for you:\n\n";
    topNotes.forEach((n, idx) => {
      fallbackResponse += `${idx + 1}. **${n.title}**\n   ${n.content || n.raw_text?.substring(0, 150) || 'No content'}...\n\n`;
    });

    return {
      response: fallbackResponse,
      sources: topNotes.map(n => ({ id: n.id, title: n.title }))
    };

  } catch (err) {
    console.error('RAG Error:', err.message);
    throw err;
  }
}
