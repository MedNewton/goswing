// lib/supabase/storage.ts
// Reusable upload helper for user-generated images & videos, backed by the
// public `user-content` Supabase Storage bucket. Mirrors the base64 ->
// ArrayBuffer pattern already used by lib/supabase/stories.ts, generalized to
// support videos and arbitrary path prefixes (avatars, covers, media, stories).

import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export const USER_CONTENT_BUCKET = 'user-content';

export type MediaKind = 'image' | 'video';

const VIDEO_EXT = new Set(['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv', '3gp']);

function extOf(uri: string): string {
  const clean = uri.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
}

/** Best-effort image/video classification from a local file URI. */
export function detectMediaType(uri: string): MediaKind {
  return VIDEO_EXT.has(extOf(uri)) ? 'video' : 'image';
}

function contentTypeFor(ext: string, kind: MediaKind): string {
  if (kind === 'video') {
    if (ext === 'mov') return 'video/quicktime';
    if (ext === 'm4v') return 'video/x-m4v';
    if (ext === 'webm') return 'video/webm';
    if (ext === '3gp') return 'video/3gpp';
    return 'video/mp4';
  }
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

export type UploadResult = Readonly<{
  url: string;
  path: string;
  mediaType: MediaKind;
}>;

/**
 * Upload a local file (image or video) into the `user-content` bucket under
 * `<folder>/<timestamp>-<rand>.<ext>` and return its public URL.
 */
export async function uploadUserContent(
  folder: string,
  uri: string,
  explicitKind?: MediaKind,
): Promise<UploadResult> {
  const ext = extOf(uri) || 'jpg';
  const mediaType = explicitKind ?? detectMediaType(uri);
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const path = `${cleanFolder}/${timestamp}-${rand}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const arrayBuffer = decode(base64);

  const { error } = await supabase.storage
    .from(USER_CONTENT_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: contentTypeFor(ext, mediaType),
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(USER_CONTENT_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path, mediaType };
}

/** Remove a previously uploaded object given its public URL. Best-effort. */
export async function removeUserContentByUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split(`/${USER_CONTENT_BUCKET}/`);
    if (parts[1]) {
      await supabase.storage.from(USER_CONTENT_BUCKET).remove([decodeURIComponent(parts[1])]);
    }
  } catch {
    // ignore storage cleanup errors — the row delete is what matters
  }
}
