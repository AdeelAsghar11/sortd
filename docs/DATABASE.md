# Database

Supabase (PostgreSQL). Schema defined via SQL editor.

---

## Schema

### `lists`

```sql
CREATE TABLE IF NOT EXISTS lists (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  emoji       TEXT DEFAULT '📋',
  color       TEXT DEFAULT '#0075de',
  sort_order  INTEGER DEFAULT 0,
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `notes`

```sql
CREATE TABLE IF NOT EXISTS notes (
  id               TEXT PRIMARY KEY,
  title            TEXT,
  content          TEXT,
  raw_text         TEXT,
  source_type      TEXT CHECK(source_type IN ('url', 'screenshot', 'folder', 'manual')),
  source_url       TEXT,
  source_platform  TEXT,
  thumbnail        TEXT,
  list_id          TEXT DEFAULT 'inbox' REFERENCES lists(id) ON DELETE SET DEFAULT,
  starred          BOOLEAN DEFAULT FALSE,
  search_vector    tsvector,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### `tags`

```sql
CREATE TABLE IF NOT EXISTS tags (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);
```

### `note_tags`

```sql
CREATE TABLE IF NOT EXISTS note_tags (
  note_id  TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

### `settings`

```sql
CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT
);

### `errors`

```sql
CREATE TABLE IF NOT EXISTS errors (
  id             SERIAL PRIMARY KEY,
  job_id         TEXT,
  error_message  TEXT,
  stack          TEXT,
  payload        JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```
```

---

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_notes_list    ON notes(list_id);
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_starred ON notes(starred);
CREATE INDEX IF NOT EXISTS idx_tags_name     ON tags(name);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag  ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_notes_search  ON notes USING GIN(search_vector);
```

---

## Initialization

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function initDB() {
  const { error } = await supabase.from('lists').select('id').limit(1);
  if (error) throw new Error(`Supabase connection failed: ${error.message}`);
  console.log('✅ Supabase connected');
  
  // Ensure default 'inbox' list exists
  const { data: inbox } = await supabase.from('lists').select('id').eq('id', 'inbox').single();
  if (!inbox) {
    await supabase.from('lists').insert({
      id: 'inbox',
      name: 'Inbox',
      emoji: '📥',
      is_default: true,
      sort_order: -1
    });
  }
}
```

---

## Query Helper Functions

All helpers use the `supabase` client.

### Notes

#### `createNote(params) → Note`
Inserts note and handles tag insertion via `setNoteTags`.

#### `getNoteById(id) → Note`
Fetches note with tags joined.

#### `getAllNotes(filters) → Note[]`
Supports filtering by `list_id`, `starred`, `search` (via `websearch_to_tsquery` on `search_vector`), and `tag`.

#### `updateNote(id, updates) → Note`
Handles field updates and tag replacement.

#### `deleteNote(id)`
Deletes note; tags auto-cascade.

---

### Tags

#### `getOrCreateTag(name) → Tag`
Uses `upsert` with `onConflict: 'name'` to handle concurrent creations.

#### `setNoteTags(noteId, tagNames)`
RPC or batch operation: delete existing `note_tags`, then insert new ones.

---

### Settings

#### `getSetting(key) → string`
#### `setSetting(key, value)`

---

## Type Definitions

```typescript
interface Note {
  id: string;
  title: string;
  content: string;            // AI summary
  raw_text: string;           // original transcript / OCR
  source_type: 'url' | 'screenshot' | 'folder' | 'manual';
  source_url: string | null;
  source_platform: string | null;
  thumbnail: string | null;
  list_id: string;
  starred: boolean;
  tags: string[];             // joined from note_tags
  created_at: string;         // ISO datetime
  updated_at: string;
}

interface List {
  id: string;
  name: string;
  emoji: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  note_count: number;
  created_at: string;
}
```
