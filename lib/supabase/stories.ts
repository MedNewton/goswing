// lib/supabase/stories.ts
// Phase 1 stub — story creation requires R2 storage (Phase 2). All reads return
// empty results; writes resolve as no-ops; story counts surface as zero.
// See docs/superpowers/specs/2026-05-20-rest-api-read-side-migration.md § 6.3.

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

function stubLog(name: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[STUB] lib/supabase/stories.${name}()`);
  }
}

export async function createEventStory(
  _input: CreateEventStoryInput,
): Promise<EventStory> {
  stubLog('createEventStory');
  const now = new Date().toISOString();
  return {
    id: '',
    userId: '',
    eventId: '',
    photoUrl: '',
    caption: null,
    createdAt: now,
    expiresAt: now,
  };
}

export async function getStoriesForEvent(
  _eventId: string,
): Promise<ReadonlyArray<EventStory>> {
  stubLog('getStoriesForEvent');
  return [];
}

export async function getMyStoryForEvent(
  _eventId: string,
): Promise<EventStory | null> {
  stubLog('getMyStoryForEvent');
  return null;
}

export async function getStoryCountForEvent(_eventId: string): Promise<number> {
  stubLog('getStoryCountForEvent');
  return 0;
}

export async function getStoriesWithUserInfo(
  _eventId: string,
): Promise<ReadonlyArray<EventStoryWithUser>> {
  stubLog('getStoriesWithUserInfo');
  return [];
}

export async function deleteStory(_storyId: string): Promise<void> {
  stubLog('deleteStory');
}
