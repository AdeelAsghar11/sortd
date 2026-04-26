-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create an index for vector similarity search (IVFFlat or HNSW)
-- Using HNSW for better performance at small-medium scales
CREATE INDEX IF NOT EXISTS idx_notes_embedding ON notes USING hnsw (embedding vector_cosine_ops);

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_notes (
  query_embedding vector(768),
  match_threshold float,
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
  similarity float
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
    1 - (notes.embedding <=> query_embedding) AS similarity
  FROM notes
  WHERE 1 - (notes.embedding <=> query_embedding) > match_threshold
    AND notes.user_id = p_user_id
  ORDER BY notes.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
