import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function ensureUserLists(userId) {
  const defaultLists = [
    { name: 'Inbox', emoji: '📥', sort_order: -1, is_default: true },
    { name: 'Watch Later', emoji: '📺', sort_order: 0 },
    { name: 'Learn', emoji: '🧠', sort_order: 1 },
    { name: 'Ideas', emoji: '💡', sort_order: 2 },
    { name: 'Opportunities', emoji: '🚀', sort_order: 3 },
    { name: 'Recipes', emoji: '🍳', sort_order: 4 },
    { name: 'Quotes', emoji: '✍️', sort_order: 5 },
    { name: 'Deals', emoji: '🏷️', sort_order: 6 },
    { name: 'Events', emoji: '📅', sort_order: 7 },
    { name: 'Saved', emoji: '🔖', sort_order: 8 }
  ];

  const { data: existing } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (!existing || existing.length === 0) {
    console.log(`Initializing default lists for user ${userId}...`);
    const listsToInsert = defaultLists.map(l => ({
      ...l,
      id: crypto.randomUUID(),
      user_id: userId
    }));
    await supabase.from('lists').insert(listsToInsert);
  }
}

export async function initDB() {
  const { error } = await supabase.from('lists').select('id').limit(1);
  if (error) {
    console.error('Supabase connection failed:', error.message);
    throw new Error(`Supabase connection failed: ${error.message}`);
  }
  console.log('✅ Supabase connected');
}

// Notes
export async function createNote(params, userId) {
  const { tags, ...noteData } = params;
  
  const { data: note, error } = await supabase
    .from('notes')
    .insert([{ ...noteData, user_id: userId }])
    .select()
    .single();

  if (error) throw error;

  if (tags && tags.length > 0) {
    await setNoteTags(note.id, tags);
  }

  return getNoteById(note.id, userId);
}

export async function getNoteById(id, userId) {
  const { data, error } = await supabase
    .from('notes')
    .select('*, note_tags(tags(name))')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  // Flatten tags
  const tags = data.note_tags.map(nt => nt.tags.name);
  delete data.note_tags;
  return { ...data, tags };
}

export async function getAllNotes(filters = {}, userId) {
  let query = supabase.from('notes').select('*, note_tags(tags(name))', { count: 'exact' });

  query = query.eq('user_id', userId);

  if (filters.list_id) {
    query = query.eq('list_id', filters.list_id);
  }
  if (filters.starred !== undefined) {
    query = query.eq('starred', filters.starred);
  }
  if (filters.search) {
    query = query.textSearch('search_vector', filters.search, {
      type: 'websearch',
      config: 'english'
    });
  }

  if (filters.limit) {
    const limit = parseInt(filters.limit);
    const offset = parseInt(filters.offset || 0);
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error, count } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  let notes = data.map(n => ({
    ...n,
    tags: (n.note_tags || []).map(nt => nt.tags?.name).filter(Boolean)
  }));
  
  notes.forEach(n => delete n.note_tags);

  if (filters.tag) {
    notes = notes.filter(n => n.tags.includes(filters.tag));
  }

  return { notes, total: count };
}

export async function updateNote(id, updates, userId) {
  const { tags, ...noteData } = updates;

  if (Object.keys(noteData).length > 0) {
    const { error } = await supabase
      .from('notes')
      .update({ ...noteData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  if (tags !== undefined) {
    await setNoteTags(id, tags);
  }

  return getNoteById(id, userId);
}

export async function deleteNote(id, userId) {
  const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
  return { success: true };
}

// Tags
export async function getOrCreateTag(name) {
  const id = name.toLowerCase().replace(/\s+/g, '-');
  const { data, error } = await supabase
    .from('tags')
    .upsert({ id, name }, { onConflict: 'name' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setNoteTags(noteId, tagNames) {
  // Delete existing tags
  await supabase.from('note_tags').delete().eq('note_id', noteId);

  if (!tagNames || tagNames.length === 0) return;

  // Create tags if they don't exist
  const tags = await Promise.all(tagNames.map(name => getOrCreateTag(name)));

  // Link tags to note
  const noteTags = tags.map(tag => ({
    note_id: noteId,
    tag_id: tag.id
  }));

  const { error } = await supabase.from('note_tags').insert(noteTags);
  if (error) throw error;
}

// Lists
export async function getAllLists(userId) {
  await ensureUserLists(userId);

  const { data: lists, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  
  const { data: notesData } = await supabase
    .from('notes')
    .select('list_id')
    .eq('user_id', userId);
    
  const countMap = {};
  if (notesData) {
    notesData.forEach(n => {
      if (n.list_id) {
        countMap[n.list_id] = (countMap[n.list_id] || 0) + 1;
      }
    });
  }
  
  const result = lists.map(list => ({
    ...list,
    note_count: countMap[list.id] || 0
  }));
  
  result.sort((a, b) => a.note_count - b.note_count);
  return result;
}

export async function createList(data, userId) {
  const { data: list, error } = await supabase
    .from('lists')
    .insert([{ ...data, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return list;
}

export async function updateList(id, data, userId) {
  const { data: list, error } = await supabase
    .from('lists')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return list;
}

export async function deleteList(id, userId) {
  const { data: list } = await supabase
    .from('lists')
    .select('is_default')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (list?.is_default) {
    const error = new Error('Cannot delete default list');
    error.code = 'DEFAULT_LIST_PROTECTED';
    throw error;
  }
  
  // Find inbox for this user
  const { data: inbox } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single();

  if (inbox) {
    // Move notes to inbox first
    await supabase
      .from('notes')
      .update({ list_id: inbox.id })
      .eq('list_id', id)
      .eq('user_id', userId);
  }

  const { error } = await supabase.from('lists').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
  return { success: true };
}

// Settings
export async function getSetting(key) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.value || null;
}

export async function setSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value });
  if (error) throw error;
}

// Errors
export async function logError(jobId, message, stack, payload) {
  const { error } = await supabase
    .from('errors')
    .insert([{ job_id: jobId, error_message: message, stack, payload }]);
  if (error) console.error('Failed to log error to DB:', error.message);
}

export { supabase };
