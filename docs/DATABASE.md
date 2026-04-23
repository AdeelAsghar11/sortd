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
  is_default  INTEGER DEFAULT 0,
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
  list_id          TEXT DEFAULT 'inbox' REFERENCES lists(id) ON DELETE NO ACTION,
  starred          INTEGER DEFAULT 0,
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

---

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_notes_list    ON notes(list_id);
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_starred ON notes(starred);
CREATE INDEX IF NOT EXISTS idx_tags_name     ON tags(name);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag  ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
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
}
```

---

## Migration: JSON Tags → Junction Table

On startup, `initDB()` checks if the old `tags` column exists on `notes`. If so, it runs a migration:

```javascript
function migrateTagsColumn() {
  // Check if column exists
  const columns = db.prepare("PRAGMA table_info(notes)").all();
  const hasTagsCol = columns.some(c => c.name === 'tags');
  if (!hasTagsCol) return; // already migrated

  console.log('🔄 Migrating tags column to junction table...');

  const notes = db.prepare("SELECT id, tags FROM notes WHERE tags IS NOT NULL AND tags != '[]'").all();

  const migrate = db.transaction(() => {
    for (const note of notes) {
      try {
        const tagNames = JSON.parse(note.tags);
        for (const name of tagNames) {
          const tag = getOrCreateTag(name);
          db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)')
            .run(note.id, tag.id);
        }
      } catch { /* skip malformed JSON */ }
    }

    // Safe option: don't DROP COLUMN.
    // SQLite DROP COLUMN requires 3.35.0+ — older distros (Ubuntu 20.04 = 3.31)
    // will error here. Leaving the column is harmless; it just stops being read.
    // If you want to drop it, uncomment the line below after confirming SQLite >= 3.35.0:
    // db.exec('ALTER TABLE notes DROP COLUMN tags');
  });

  migrate();
  console.log(`✅ Migrated tags for ${notes.length} notes (old column left in place)`);
}
```

---

## Query Helper Functions

### Notes

#### `createNote(params) → Note`
```javascript
createNote({
  title: string,
  content: string,           // AI summary
  raw_text: string,          // transcript or OCR text
  source_type: 'url' | 'screenshot' | 'folder' | 'manual',
  source_url: string | null,
  source_platform: string | null,
  thumbnail: string | null,
  list_id: string,           // defaults to 'inbox'
  tags: string[],            // tag names — stored via junction table
  starred: boolean | 0 | 1,  // normalized to 0|1 before INSERT (same as updateNote)
}) → Note
```
Generates a UUID, normalizes `starred` to `0|1` (`starred: starred ? 1 : 0`), inserts the note, calls `setNoteTags()` for each tag, returns the full note with tags attached.

#### `getNoteById(id) → Note | undefined`
```javascript
getNoteById(id: string) → Note | undefined
```
Returns the note with tags joined as a `string[]` on the `tags` property.

#### `getAllNotes(filters?) → Note[]`
```javascript
getAllNotes({
  list_id?: string,
  starred?: boolean,
  search?: string,           // LIKE search on title, content, raw_text
  tag?: string,              // filter by tag name
  limit?: number,            // default 50
  offset?: number,           // default 0
}) → Note[]
```
LEFT JOINs `note_tags` + `tags` to attach `tags: string[]` to each note. Tag filtering uses a subquery (not an INNER JOIN) so it doesn't break `GROUP_CONCAT` for notes with multiple tags.

Query structure:
```sql
SELECT n.*, GROUP_CONCAT(t.name) as tag_names
FROM notes n
LEFT JOIN note_tags nt ON n.id = nt.note_id
LEFT JOIN tags t ON nt.tag_id = t.id
WHERE 1=1
  [AND n.list_id = ?]
  [AND n.starred = 1]
  [AND (n.title LIKE ? OR n.content LIKE ? OR n.raw_text LIKE ?)]
  [AND n.id IN (
    SELECT nt2.note_id FROM note_tags nt2
    JOIN tags t2 ON nt2.tag_id = t2.id
    WHERE t2.name = ? COLLATE NOCASE
  )]
GROUP BY n.id
ORDER BY n.created_at DESC
LIMIT ? OFFSET ?
```

Post-processing: `tag_names` (comma-separated string from GROUP_CONCAT) is split into a `string[]`.

#### `updateNote(id, updates) → Note`
```javascript
updateNote(id: string, {
  title?: string,
  content?: string,
  list_id?: string,
  tags?: string[],           // replaces all tags
  starred?: boolean,         // normalized to 0|1 for SQLite storage
}) → Note
```
Allowed fields are whitelisted. If `tags` is provided, calls `setNoteTags()` which deletes existing tags and inserts new ones. Sets `updated_at = datetime('now')`.

#### `deleteNote(id) → RunResult`
```javascript
deleteNote(id: string) → { changes: number }
```
Junction table rows auto-cascade via `ON DELETE CASCADE`.

---

### Tags

#### `getOrCreateTag(name) → Tag`
```javascript
getOrCreateTag(name: string) → { id: string, name: string }
```
Case-insensitive lookup. If found, returns existing. If not, creates with new UUID.

```javascript
function getOrCreateTag(name) {
  const normalized = name.trim().toLowerCase();
  let tag = db.prepare('SELECT * FROM tags WHERE name = ? COLLATE NOCASE').get(normalized);
  if (!tag) {
    const id = uuidv4();
    db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(id, normalized);
    tag = { id, name: normalized };
  }
  return tag;
}
```

#### `getNoteTags(noteId) → string[]`
```javascript
getNoteTags(noteId: string) → string[]
```
```sql
SELECT t.name FROM tags t
JOIN note_tags nt ON t.id = nt.tag_id
WHERE nt.note_id = ?
```

#### `setNoteTags(noteId, tagNames) → void`
```javascript
setNoteTags(noteId: string, tagNames: string[]) → void
```
Transaction: delete all existing `note_tags` for this note, then insert new ones via `getOrCreateTag()`.

```javascript
const setTags = db.transaction((noteId, names) => {
  db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId);
  for (const name of names) {
    const tag = getOrCreateTag(name);
    db.prepare('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)').run(noteId, tag.id);
  }
});
```

#### `getNotesByTag(tagName) → Note[]`
```javascript
getNotesByTag(tagName: string) → Note[]
```
```sql
SELECT n.* FROM notes n
JOIN note_tags nt ON n.id = nt.note_id
JOIN tags t ON nt.tag_id = t.id
WHERE t.name = ? COLLATE NOCASE
ORDER BY n.created_at DESC
```

#### `getAllTags() → Tag[]`
```javascript
getAllTags() → { id: string, name: string, count: number }[]
```
```sql
SELECT t.id, t.name, COUNT(nt.note_id) as count
FROM tags t
LEFT JOIN note_tags nt ON t.id = nt.tag_id
GROUP BY t.id
ORDER BY count DESC
```

---

### Lists

#### `getAllLists() → List[]`
Returns all lists ordered by `sort_order`, with `note_count` attached via a subquery.

#### `getListById(id) → List | undefined`
Simple primary key lookup.

#### `createList({ name, emoji?, color? }) → List`
Generates UUID. Sets `sort_order = MAX(sort_order) + 1`.

#### `updateList(id, { name?, emoji?, color?, sort_order? }) → List`
Whitelisted fields only.

#### `deleteList(id) → RunResult`
If `is_default = 1`, throws a structured error:
```javascript
const err = new Error('Cannot delete default list');
err.code = 'DEFAULT_LIST_PROTECTED';
err.status = 400;
throw err;
// Express 5 global error handler catches this and returns:
// 400 { "error": "Cannot delete default list", "code": "DEFAULT_LIST_PROTECTED" }
```
Moves orphaned notes to Inbox first:
```sql
UPDATE notes SET list_id = 'inbox' WHERE list_id = ?;
DELETE FROM lists WHERE id = ?;
```

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
  starred: boolean;            // stored as 0|1 in SQLite, normalized at query boundary
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
  is_default: 0 | 1;
  note_count: number;         // attached at query time
  created_at: string;
}

interface Tag {
  id: string;
  name: string;
  count?: number;             // from getAllTags()
}
```
