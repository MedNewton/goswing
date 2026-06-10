// lib/supabase/saved.ts
// Phase 1 stub — favorites are not supported by the new REST API in this phase.
// Reads return empty results; writes resolve as no-ops.
// See docs/superpowers/specs/2026-05-20-rest-api-read-side-migration.md § 6.3.

import type { SupabaseClient } from '@supabase/supabase-js';

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

function stubLog(name: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[STUB] lib/supabase/saved.${name}()`);
  }
}

export async function addFavorite(_params: {
  supabase: SupabaseClient;
  userId: string;
  eventId: string;
}): Promise<void> {
  stubLog('addFavorite');
}

export async function removeFavorite(_params: {
  supabase: SupabaseClient;
  userId: string;
  eventId: string;
}): Promise<void> {
  stubLog('removeFavorite');
}

export async function listFavoriteEventIds(_params: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<ReadonlyArray<string>> {
  stubLog('listFavoriteEventIds');
  return [];
}

export async function listFavoriteEvents(_params: {
  supabase: SupabaseClient;
  userId: string;
  limit?: number;
}): Promise<ReadonlyArray<SavedEventWithFavorite>> {
  stubLog('listFavoriteEvents');
  return [];
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
