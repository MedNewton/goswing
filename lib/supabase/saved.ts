// src/lib/supabase/saved.ts
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

type FavoriteIdRow = Readonly<{ event_id: string }>;

function asError(e: unknown, fallback = 'Unknown error'): Error {
  if (e instanceof Error) return e;
  if (typeof e === 'string') return new Error(e);
  try {
    return new Error(JSON.stringify(e));
  } catch {
    return new Error(fallback);
  }
}

function computePriceLabel(isFree: boolean, minPriceCents: number | null): string {
  if (isFree || (minPriceCents ?? 0) === 0) return 'Free';
  const dollars = (minPriceCents ?? 0) / 100;
  return `From $${Math.round(dollars)}`;
}

/**
 * Add a favorite for the current authenticated user (RLS enforced).
 * Your RLS policy requires: user_id = requesting_user_id()
 */
export async function addFavorite(params: {
  supabase: SupabaseClient;
  userId: string;
  eventId: string; // MUST be events.id (uuid string)
}): Promise<void> {
  const { supabase, userId, eventId } = params;

  const payload: Pick<FavoriteRow, 'user_id' | 'event_id'> = {
    user_id: userId,
    event_id: eventId,
  };

  const { error } = await supabase
    .from('event_favorites')
    .upsert(payload, { onConflict: 'user_id,event_id', ignoreDuplicates: true });

  if (error) throw asError(error);
}

export async function removeFavorite(params: {
  supabase: SupabaseClient;
  userId: string;
  eventId: string; // MUST be events.id (uuid string)
}): Promise<void> {
  const { supabase, userId, eventId } = params;

  const { error } = await supabase
    .from('event_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', eventId);

  if (error) throw asError(error);
}

/**
 * List favorite event ids for user (fast and reliable; no join assumptions).
 */
export async function listFavoriteEventIds(params: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<ReadonlyArray<string>> {
  const { supabase, userId } = params;

  const { data, error } = await supabase
    .from('event_favorites')
    .select('event_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw asError(error);

  const rows = (data ?? []) as unknown as ReadonlyArray<FavoriteIdRow>;
  return rows.map((r) => String(r.event_id));
}

/**
 * List favorite events (correct for your schema).
 *
 * Uses:
 * - event_favorites (user_id, event_id, created_at)
 * - events (id, title, starts_at, hero_image_url, min_price_cents, is_free, organizer_id, venue_id)
 * - organizers (id, name)
 * - venues (id, name, city)
 *
 * Keeps order by event_favorites.created_at DESC.
 */
type DbVenue = Readonly<{ name: string | null; city: string | null }>;
type DbOrganizer = Readonly<{ name: string | null }>;

type DbEvent = Readonly<{
  id: string;
  title: string | null;
  starts_at: string | null;
  hero_image_url: string | null;
  min_price_cents: number | null;
  is_free: boolean | null;
  organizers: DbOrganizer | null;
  venues: DbVenue | null;
}>;

type DbFavoriteRow = Readonly<{
  created_at: string | null;
  events: DbEvent | null;
}>;

export async function listFavoriteEvents(params: {
  supabase: SupabaseClient;
  userId: string;
  limit?: number;
}): Promise<ReadonlyArray<SavedEventWithFavorite>> {
  const { supabase, userId, limit = 50 } = params;

  const { data, error } = await supabase
    .from('event_favorites')
    .select(
      `
      created_at,
      events:event_id (
        id,
        title,
        starts_at,
        hero_image_url,
        min_price_cents,
        is_free,
        organizers:organizer_id ( name ),
        venues:venue_id ( name, city )
      )
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw asError(error);

  const rows = (data ?? []) as unknown as ReadonlyArray<DbFavoriteRow>;

  return rows
    .map((r) => r.events)
    .filter((e): e is DbEvent => Boolean(e?.id))
    .map((e) => ({
      id: String(e.id),
      title: String(e.title ?? ''),
      organizer: String(e.organizers?.name ?? ''),
      venue: String(e.venues?.name ?? ''),
      city: e.venues?.city ?? null,
      startsAtIso: e.starts_at ? new Date(e.starts_at).toISOString() : new Date().toISOString(),
      imageUrl: e.hero_image_url ?? null,
      priceLabel: computePriceLabel(Boolean(e.is_free), e.min_price_cents),
      favorite: true,
    }));
}

/**
 * Utility: merge favorites into an existing event list you already loaded.
 */
export function markFavorites<T extends Readonly<{ id: string }>>(params: {
  events: ReadonlyArray<T>;
  favoriteIds: ReadonlyArray<string>;
}): ReadonlyArray<T & Readonly<{ favorite: boolean }>> {
  const { events, favoriteIds } = params;
  const set = new Set(favoriteIds.map(String));

  return events.map((e) => ({
    ...e,
    favorite: set.has(String(e.id)),
  }));
}
