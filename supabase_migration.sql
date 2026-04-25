ALTER TABLE lists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Optional: If you want to enable Row Level Security (RLS) policies later, you can add them, but for now this fixes the schema error.
-- To ensure the schema cache is reloaded and the new columns are recognized:
NOTIFY pgrst, 'reload schema';
