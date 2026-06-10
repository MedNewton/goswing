// lib/supabase/stories.ts
// Event stories — backed by the Gooswing REST API (routes P.1–P.5).
// Photo upload is a multipart POST; the server stores the file and handles
// the 24h expiry.

import * as engagementApi from '@/lib/api/engagement';
import type { ApiEventStory } from '@/lib/api/types';

export type CreateEventStoryInput = Readonly<{
  eventId: string;
  photoUri: string;
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

export type EventStoryWithUser = EventStory &
  Readonly<{
    userName: string | null;
    userAvatarUrl: string | null;
  }>;

function mapStory(raw: ApiEventStory, eventId?: string): EventStory {
  return {
    id: String(raw.id),
    userId: String(raw.userId ?? ''),
    eventId: String(raw.eventId ?? eventId ?? ''),
    photoUrl: String(raw.photoUrl ?? ''),
    caption: raw.caption ?? null,
    createdAt: String(raw.createdAt ?? ''),
    expiresAt: String(raw.expiresAt ?? ''),
  };
}

function photoPartFromUri(photoUri: string): { uri: string; name: string; type: string } {
  const cleanPath = photoUri.split('?')[0] ?? photoUri;
  const ext = (cleanPath.split('.').pop() ?? '').toLowerCase();
  const isPng = ext === 'png';
  return {
    uri: photoUri,
    name: `story.${isPng ? 'png' : 'jpg'}`,
    type: isPng ? 'image/png' : 'image/jpeg',
  };
}

export async function createEventStory(
  input: CreateEventStoryInput,
): Promise<EventStory> {
  const raw = await engagementApi.createStory(
    input.eventId,
    photoPartFromUri(input.photoUri),
    {
      caption: input.caption ?? null,
      reservationId: input.reservationId ?? null,
    },
  );
  return mapStory(raw, input.eventId);
}

export async function getStoriesForEvent(
  eventId: string,
): Promise<ReadonlyArray<EventStory>> {
  const page = await engagementApi.listStories(eventId, { limit: 100 });
  return (page.items ?? []).map((s) => mapStory(s, eventId));
}

export async function getMyStoryForEvent(
  eventId: string,
): Promise<EventStory | null> {
  const { story } = await engagementApi.getMyStory(eventId);
  return story ? mapStory(story, eventId) : null;
}

export async function getStoryCountForEvent(eventId: string): Promise<number> {
  const { count } = await engagementApi.getStoryCount(eventId);
  return typeof count === 'number' ? count : 0;
}

export async function getStoriesWithUserInfo(
  eventId: string,
): Promise<ReadonlyArray<EventStoryWithUser>> {
  const page = await engagementApi.listStories(eventId, { limit: 100 });
  return (page.items ?? []).map((s) => ({
    ...mapStory(s, eventId),
    userName: s.userName ?? null,
    userAvatarUrl: s.userAvatarUrl ?? null,
  }));
}

export async function deleteStory(storyId: string): Promise<void> {
  await engagementApi.deleteStory(storyId);
}
