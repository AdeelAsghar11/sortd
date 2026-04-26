
import { supabase } from './services/database.js';

const sql = `
DROP FUNCTION IF EXISTS match_notes(vector, float, int, uuid);
DROP FUNCTION IF EXISTS match_notes(vector, float8, int, uuid);

CREATE OR REPLACE FUNCTION match_notes (
  query_embedding vector(768),
  match_threshold float8,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  raw_text text,
  thumbnail text,
  created_at timestamptz,
  similarity float8
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    notes.id,
    notes.title,
    notes.content,
    notes.raw_text,
    notes.thumbnail,
    notes.created_at,
    (1 - (notes.embedding <=> query_embedding))::float8 AS similarity
  FROM notes
  WHERE notes.embedding IS NOT NULL
    AND 1 - (notes.embedding <=> query_embedding) > match_threshold
    AND notes.user_id = p_user_id
  ORDER BY notes.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
`;

async function run() {
  // We can't use exec_sql if it's not defined, so we hope the user runs this in the dashboard 
  // OR we try to find another way. 
  // Actually, I'll just give the user the SQL to run.
  console.log("SQL to run in Supabase Dashboard:");
  console.log(sql);
}

run();
