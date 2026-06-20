// lib/supabase/social/media.ts
// Persistent profile media (photos & videos) shown on the Photos / Videos tabs.

import { supabase } from '@/lib/supabase';
import { removeUserContentByUrl, uploadUserContent } from '@/lib/supabase/storage';
import type { MediaType, UserMedia } from '@/lib/social/types';

const MEDIA_COLS =
  'id, user_id, media_type, media_url, thumbnail_url, caption, created_at';

function mapRow(row: any): UserMedia {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    mediaType: (row.media_type === 'video' ? 'video' : 'image') as MediaType,
    mediaUrl: String(row.media_url),
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
    caption: row.caption ? String(row.caption) : null,
    createdAt: String(row.created_at),
  };
}

export async function listUserMedia(
  userId: string,
  kind?: MediaType,
): Promise<ReadonlyArray<UserMedia>> {
  let query = supabase
    .from('user_media')
    .select(MEDIA_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (kind) query = query.eq('media_type', kind);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export type AddUserMediaInput = Readonly<{
  /** Clerk user id of the uploader — used only to namespace the storage path.
   *  The DB column defaults to the JWT `sub`, so it is not sent in the row. */
  userId: string;
  uri: string;
  caption?: string | null;
  /** Override auto-detection (image/video) if the picker already told us. */
  kind?: MediaType;
}>;

export async function addUserMedia(input: AddUserMediaInput): Promise<UserMedia> {
  const uri = input.uri?.trim();
  if (!uri) throw new Error('No media selected.');

  const uploaded = await uploadUserContent(
    `media/${input.userId || 'me'}`,
    uri,
    input.kind,
  );

  const payload: Record<string, unknown> = {
    media_type: uploaded.mediaType,
    media_url: uploaded.url,
    caption: input.caption?.trim() || null,
  };

  const { data, error } = await supabase
    .from('user_media')
    .insert(payload)
    .select(MEDIA_COLS)
    .single();

  if (error) {
    // Roll back the orphaned upload if the row insert failed.
    await removeUserContentByUrl(uploaded.url);
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function deleteUserMedia(mediaId: string): Promise<void> {
  const id = mediaId?.trim();
  if (!id) throw new Error('Missing media id.');

  const { data: existing } = await supabase
    .from('user_media')
    .select('media_url')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('user_media').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (existing?.media_url) await removeUserContentByUrl(String(existing.media_url));
}
