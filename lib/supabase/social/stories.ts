// lib/supabase/social/stories.ts
// User-level ephemeral stories (images or videos) that expire after 24h.
// Distinct from event stories in lib/supabase/stories.ts (those are per-event).

import { supabase } from '@/lib/supabase';
import { removeUserContentByUrl, uploadUserContent } from '@/lib/supabase/storage';
import type { MediaType, UserStory } from '@/lib/social/types';

const STORY_COLS =
  'id, user_id, media_type, media_url, thumbnail_url, caption, created_at, expires_at';

function mapRow(row: any): UserStory {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    mediaType: (row.media_type === 'video' ? 'video' : 'image') as MediaType,
    mediaUrl: String(row.media_url),
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
    caption: row.caption ? String(row.caption) : null,
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
  };
}

/** Active (non-expired) stories for a single user, newest first. */
export async function listActiveUserStories(
  userId: string,
): Promise<ReadonlyArray<UserStory>> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_stories')
    .select(STORY_COLS)
    .eq('user_id', userId)
    .gt('expires_at', now)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export type AddUserStoryInput = Readonly<{
  /** Clerk user id of the author — used only to namespace the storage path. */
  userId: string;
  uri: string;
  caption?: string | null;
  kind?: MediaType;
}>;

export async function addUserStory(input: AddUserStoryInput): Promise<UserStory> {
  const uri = input.uri?.trim();
  if (!uri) throw new Error('No media selected.');

  const uploaded = await uploadUserContent(
    `stories/${input.userId || 'me'}`,
    uri,
    input.kind,
  );

  const payload: Record<string, unknown> = {
    media_type: uploaded.mediaType,
    media_url: uploaded.url,
    caption: input.caption?.trim() || null,
  };

  const { data, error } = await supabase
    .from('user_stories')
    .insert(payload)
    .select(STORY_COLS)
    .single();

  if (error) {
    await removeUserContentByUrl(uploaded.url);
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function deleteUserStory(storyId: string): Promise<void> {
  const id = storyId?.trim();
  if (!id) throw new Error('Missing story id.');

  const { data: existing } = await supabase
    .from('user_stories')
    .select('media_url')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('user_stories').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (existing?.media_url) await removeUserContentByUrl(String(existing.media_url));
}
