// lib/supabase/saved.ts
// Favorites — backed by the Gooswing REST API (routes K.1–K.4).

import * as engagementApi from '@/lib/api/engagement';

export type FavoriteRow = Readonly<{
  user_id: string;
  event_id: string;
  created_at?: string | null;
}>;

export type SavedEvent = Readonly<{
  id: string;
  title: string;
  organizer: string;
  venue: string;
  city?: string | null;
  startsAtIso: string;
  imageUrl?: string | null;
  priceLabel?: string | null;
}>;

export type SavedEventWithFavorite = SavedEvent & Readonly<{ favorite: boolean }>;

export async function addFavorite(params: { eventId: string }): Promise<void> {
  await engagementApi.addFavorite(params.eventId);
}

export async function removeFavorite(params: { eventId: string }): Promise<void> {
  await engagementApi.removeFavorite(params.eventId);
}

export async function listFavoriteEventIds(): Promise<ReadonlyArray<string>> {
  const { eventIds } = await engagementApi.listFavoriteIds();
  return (eventIds ?? []).map(String);
}

export async function listFavoriteEvents(params?: {
  limit?: number;
}): Promise<ReadonlyArray<SavedEventWithFavorite>> {
  const page = await engagementApi.listFavorites({ limit: params?.limit ?? 50 });
  return (page.items ?? []).map((e) => ({
    id: String(e.id),
    title: String(e.title ?? ''),
    organizer: String(e.organizer ?? ''),
    venue: String(e.venue ?? ''),
    city: e.city ?? null,
    startsAtIso: String(e.startsAtIso ?? ''),
    imageUrl: e.imageUrl ?? null,
    priceLabel: e.priceLabel ?? null,
    favorite: e.favorite ?? true,
  }));
}

/** Pure utility — unchanged. */
export function markFavorites<T extends Readonly<{ id: string }>>(params: {
  events: ReadonlyArray<T>;
  favoriteIds: ReadonlyArray<string>;
}): ReadonlyArray<T & Readonly<{ favorite: boolean }>> {
  const { events, favoriteIds } = params;
  const set = new Set(favoriteIds.map(String));
  return events.map((e) => ({ ...e, favorite: set.has(String(e.id)) }));
}
