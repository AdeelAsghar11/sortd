
import { supabase } from './services/database.js';
import { generateEmbedding } from './services/gemini.js';
import dotenv from 'dotenv';
dotenv.config();

async function backfill() {
  console.log('🚀 Starting embedding backfill...');

  // 1. Find notes without embeddings
  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, title, content, raw_text')
    .is('embedding', null);

  if (error) {
    console.error('Error fetching notes:', error.message);
    return;
  }

  console.log(`📝 Found ${notes.length} notes needing embeddings.`);

  for (const note of notes) {
    try {
      console.log(`🧠 Generating embedding for: "${note.title}"...`);
      
      // Combine title and content for a better embedding
      const textToEmbed = `Title: ${note.title}\nContent: ${note.content || ''}\n${note.raw_text || ''}`;
      const embedding = await generateEmbedding(textToEmbed);

      if (embedding) {
        const { error: updateError } = await supabase
          .from('notes')
          .update({ embedding })
          .eq('id', note.id);

        if (updateError) {
          console.error(`❌ Failed to update note ${note.id}:`, updateError.message);
        } else {
          console.log(`✅ Updated note ${note.id}`);
        }
      } else {
        console.warn(`⚠️ Could not generate embedding for note ${note.id}`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (err) {
      console.error(`💥 Error processing note ${note.id}:`, err.message);
    }
  }

  console.log('🏁 Backfill complete!');
  process.exit(0);
}

backfill();
