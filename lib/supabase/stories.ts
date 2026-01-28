// lib/supabase/stories.ts
import { supabase } from "@/lib/supabase";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

function asString(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function normalizeNullableString(v: unknown): string | null {
  if (v == null) return null;
  const s = typeof v === "string" ? v.trim() : String(v).trim();
  return s.length ? s : null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_REGEX.test(s);
}

async function resolveEventPk(eventIdOrExternalId: string): Promise<string> {
  const key = String(eventIdOrExternalId).trim();

  // If it's already a UUID, verify it exists
  if (isUuid(key)) {
    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("id", key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.id) throw new Error(`Event not found for id "${key}"`);
    return String(data.id);
  }

  // Otherwise try external_id lookup
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("external_id", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error(`Could not resolve event id for "${key}"`);
  return String(data.id);
}

// ============================================
// TYPES
// ============================================

export type CreateEventStoryInput = Readonly<{
  eventId: string;
  photoUri: string; // Local file URI from image picker
  caption?: string | null;
  reservationId?: string | null;
}>;

export type EventStory = Readonly<{
  id: string;
  userId: string;
  eventId: string;
  photoUrl: string;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
}>;

// ============================================
// PHOTO UPLOAD
// ============================================

async function uploadStoryPhoto(
  photoUri: string,
  eventId: string
): Promise<string> {
  // Generate unique filename using eventId and timestamp
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extension = photoUri.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${eventId}/${timestamp}-${randomSuffix}.${extension}`;

  // Read file as base64 using expo-file-system
  const base64 = await FileSystem.readAsStringAsync(photoUri, {
    encoding: "base64",
  });

  // Convert base64 to ArrayBuffer for Supabase upload
  const arrayBuffer = decode(base64);

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("story-photos")
    .upload(fileName, arrayBuffer, {
      contentType: `image/${extension === "png" ? "png" : "jpeg"}`,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload photo: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("story-photos")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// ============================================
// CREATE STORY
// ============================================

export async function createEventStory(
  input: CreateEventStoryInput
): Promise<EventStory> {
  const rawEventId = asString(input.eventId).trim();
  if (!rawEventId) throw new Error("Missing eventId.");

  const photoUri = asString(input.photoUri).trim();
  if (!photoUri) throw new Error("Missing photo.");

  // Resolve to actual UUID primary key
  const eventId = await resolveEventPk(rawEventId);

  // Upload photo to storage (organized by eventId)
  const photoUrl = await uploadStoryPhoto(photoUri, eventId);

  // Insert story record
  const payload: Record<string, unknown> = {
    event_id: eventId,
    photo_url: photoUrl,
    caption: normalizeNullableString(input.caption),
  };

  const reservationId = normalizeNullableString(input.reservationId);
  if (reservationId) payload.reservation_id = reservationId;

  const { data, error } = await supabase
    .from("event_stories")
    .insert(payload)
    .select("id, user_id, event_id, photo_url, caption, created_at, expires_at")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to share story.");
  }

  return {
    id: asString(data.id),
    userId: asString(data.user_id),
    eventId: asString(data.event_id),
    photoUrl: asString(data.photo_url),
    caption: normalizeNullableString(data.caption),
    createdAt: asString(data.created_at),
    expiresAt: asString(data.expires_at),
  };
}

// ============================================
// GET STORIES FOR EVENT
// ============================================

export async function getStoriesForEvent(
  eventId: string
): Promise<ReadonlyArray<EventStory>> {
  const rawId = asString(eventId).trim();
  if (!rawId) throw new Error("Missing eventId.");

  // Resolve to actual UUID primary key
  const id = await resolveEventPk(rawId);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("event_stories")
    .select("id, user_id, event_id, photo_url, caption, created_at, expires_at")
    .eq("event_id", id)
    .or(`expires_at.gt.${now},expires_at.is.null`) // Active or no expiry
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: asString(row.id),
    userId: asString(row.user_id),
    eventId: asString(row.event_id),
    photoUrl: asString(row.photo_url),
    caption: normalizeNullableString(row.caption),
    createdAt: asString(row.created_at),
    expiresAt: asString(row.expires_at),
  }));
}

// ============================================
// GET MY STORY FOR EVENT
// ============================================

export async function getMyStoryForEvent(
  eventId: string
): Promise<EventStory | null> {
  const rawId = asString(eventId).trim();
  if (!rawId) throw new Error("Missing eventId.");

  // Resolve to actual UUID primary key
  const id = await resolveEventPk(rawId);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("event_stories")
    .select("id, user_id, event_id, photo_url, caption, created_at, expires_at")
    .eq("event_id", id)
    .or(`expires_at.gt.${now},expires_at.is.null`)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: asString(data.id),
    userId: asString(data.user_id),
    eventId: asString(data.event_id),
    photoUrl: asString(data.photo_url),
    caption: normalizeNullableString(data.caption),
    createdAt: asString(data.created_at),
    expiresAt: asString(data.expires_at),
  };
}

// ============================================
// GET STORY COUNT FOR EVENT (lightweight check)
// ============================================

export async function getStoryCountForEvent(eventId: string): Promise<number> {
  const rawId = asString(eventId).trim();
  if (!rawId) return 0;

  try {
    // Try to resolve the event ID
    const id = await resolveEventPk(rawId);
    const now = new Date().toISOString();

    const { count, error } = await supabase
      .from("event_stories")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id)
      .or(`expires_at.gt.${now},expires_at.is.null`);

    if (error) {
      console.error("[getStoryCountForEvent] Error:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (e) {
    console.error("[getStoryCountForEvent] Exception:", e);
    return 0;
  }
}

// ============================================
// GET STORIES WITH USER INFO (for enhanced viewer)
// ============================================

export type EventStoryWithUser = EventStory &
  Readonly<{
    userName: string | null;
    userAvatarUrl: string | null;
  }>;

export async function getStoriesWithUserInfo(
  eventId: string
): Promise<ReadonlyArray<EventStoryWithUser>> {
  const rawId = asString(eventId).trim();
  if (!rawId) throw new Error("Missing eventId.");

  // Resolve to actual UUID primary key
  const id = await resolveEventPk(rawId);

  // First, get stories without the join (more reliable)
  // Filter by expires_at > now, but also include stories with NULL expires_at
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("event_stories")
    .select("id, user_id, event_id, photo_url, caption, created_at, expires_at")
    .eq("event_id", id)
    .or(`expires_at.gt.${now},expires_at.is.null`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getStoriesWithUserInfo] Query error:", error.message);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get unique user IDs
  const userIds = [...new Set(data.map((row: any) => row.user_id).filter(Boolean))];

  // Fetch user profiles separately (if we have user IDs)
  let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};

  if (userIds.length > 0) {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profiles) {
        for (const p of profiles) {
          profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        }
      }
    } catch {
      // Profiles fetch failed, continue without user info
      console.warn("[getStoriesWithUserInfo] Could not fetch profiles");
    }
  }

  return data.map((row: any) => {
    const profile = profilesMap[row.user_id] ?? { full_name: null, avatar_url: null };
    return {
      id: asString(row.id),
      userId: asString(row.user_id),
      eventId: asString(row.event_id),
      photoUrl: asString(row.photo_url),
      caption: normalizeNullableString(row.caption),
      createdAt: asString(row.created_at),
      expiresAt: asString(row.expires_at),
      userName: normalizeNullableString(profile.full_name),
      userAvatarUrl: normalizeNullableString(profile.avatar_url),
    };
  });
}

// ============================================
// DELETE STORY
// ============================================

export async function deleteStory(storyId: string): Promise<void> {
  const id = asString(storyId).trim();
  if (!id) throw new Error("Missing storyId.");

  // Get the story first to delete the photo from storage
  const { data: story } = await supabase
    .from("event_stories")
    .select("photo_url")
    .eq("id", id)
    .single();

  // Delete from database (RLS ensures only owner can delete)
  const { error } = await supabase.from("event_stories").delete().eq("id", id);

  if (error) throw new Error(error.message);

  // Clean up photo from storage if we got it
  if (story?.photo_url) {
    try {
      const url = new URL(story.photo_url);
      const pathParts = url.pathname.split("/story-photos/");
      if (pathParts[1]) {
        await supabase.storage.from("story-photos").remove([pathParts[1]]);
      }
    } catch {
      // Ignore storage cleanup errors
    }
  }
}
