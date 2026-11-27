// screens/map/api.ts — data the map needs beyond the shared events list.
//
// Phase 4 routes (docs/superpowers/specs/2026-11-27-rest-api-phase-4-redesign-routes.md)
// are called through `optional()`: a 404/501 means "not shipped yet" and the
// UI simply hides what depends on them.
import { ApiError, getBoundApiCall } from '@/lib/api/client';
import * as eventsApi from '@/lib/api/events';
import type { ApiTicketType } from '@/lib/api/types';
import { getOrganizerById, getOrganizerReviews } from '@/lib/supabase/organizers';

import { categoriesOfText, type MapPlace } from './model';

const isMissing = (e: unknown): boolean =>
  e instanceof ApiError && (e.status === 404 || e.status === 501 || e.code === 'not_found' || e.code === 'not_implemented');

async function optional<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

/** Phase 3 `PublicVenue` and Phase 4 `Venue` (route 128) — every field optional. */
type ApiVenue = Readonly<{
  id: string;
  name?: string | null;
  venueType?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  location?: Readonly<{ lat?: number | null; lng?: number | null }> | null;
  coverImageUrl?: string | null;
  openingHoursNote?: string | null;
}>;

type ApiList<T> = ReadonlyArray<T> | Readonly<{ items?: ReadonlyArray<T> | null }>;

const listOf = <T,>(x: ApiList<T> | null | undefined): ReadonlyArray<T> =>
  !x ? [] : Array.isArray(x) ? (x as ReadonlyArray<T>) : ((x as { items?: ReadonlyArray<T> | null }).items ?? []);

function venueToPlace(v: ApiVenue): MapPlace | null {
  const lat = v.location?.lat ?? v.lat;
  const lng = v.location?.lng ?? v.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !v.name) return null;
  const kind = v.venueType ?? 'bar';
  return {
    id: `venue-${v.id}`,
    venueId: String(v.id),
    name: v.name,
    source: 'goswing',
    kind,
    lat,
    lng,
    address: [v.addressLine1, v.city].filter(Boolean).join(', ') || null,
    openingHours: v.openingHoursNote ?? null,
    coverImageUrl: v.coverImageUrl ?? null,
    categories: categoriesOfText([kind]),
  };
}

/**
 * GoSwing venues around a point. Uses Phase 4 route 128 (`/v1/venues`, pin
 * view) when available, else the public Phase 3 list for the city.
 */
export async function fetchMapVenues(params: Readonly<{ lat: number; lng: number; city?: string | null }>): Promise<ReadonlyArray<MapPlace>> {
  const call = getBoundApiCall();
  const p4 = await optional(() =>
    call<ApiList<ApiVenue>>('/v1/venues', {
      query: { lat: params.lat, lng: params.lng, radiusKm: 10, view: 'pin', limit: 300 },
    }),
  ).catch(() => null);
  let raw = listOf(p4);
  if (!p4) {
    const city = params.city?.replace(/\s+\d+(e|er)?$/i, '').trim();
    const pub = await optional(() =>
      call<ApiList<ApiVenue>>('/v1/public/venues', { query: { city: city || undefined } }),
    ).catch(() => null);
    raw = listOf(pub);
  }
  return raw.map(venueToPlace).filter((p): p is MapPlace => p != null);
}

/** Phase 4 route 129 fields the place pop-up uses. */
export type VenueDetails = Readonly<{
  id: string;
  priceLevel?: 1 | 2 | 3 | null;
  openNow?: boolean | null;
  closesAt?: string | null;
  rating?: Readonly<{ average: number; count: number }> | null;
  /** Google rating attached by our Places proxy (companion doc). */
  googleRating?: Readonly<{ average: number; count: number }> | null;
  followerCount?: number | null;
  isFollowing?: boolean | null;
  coverImageUrl?: string | null;
}>;

/** GET /v1/venues/:id — null until Phase 4 ships. */
export async function fetchVenueDetails(venueId: string): Promise<VenueDetails | null> {
  const call = getBoundApiCall();
  return optional(() => call<VenueDetails>(`/v1/venues/${encodeURIComponent(venueId)}`)).catch(() => null);
}

/** Phase 4 route 132 item (photos & videos of a venue). */
export type VenueMedia = Readonly<{ id?: string; mediaType?: 'image' | 'video'; url: string; thumbnailUrl?: string | null }>;

export async function fetchVenueMedia(venueId: string): Promise<ReadonlyArray<VenueMedia>> {
  const call = getBoundApiCall();
  const res = await optional(() => call<ApiList<VenueMedia>>(`/v1/venues/${encodeURIComponent(venueId)}/media`, { query: { limit: 10 } })).catch(
    () => null,
  );
  return listOf(res).filter((m) => typeof m.url === 'string' && m.url.length > 0);
}

// ---------------------------------------------------------------------------
// Ticket offers
// ---------------------------------------------------------------------------

/** Ticket type with the Phase 4 (C.3) fields, all optional. */
export type TicketOffer = ApiTicketType &
  Readonly<{
    description?: string | null;
    salePriceCents?: number | null;
    isOnSale?: boolean | null;
  }>;

export async function fetchTicketOffers(eventId: string): Promise<ReadonlyArray<TicketOffer>> {
  const raw = (await eventsApi.getTicketTypes(eventId)) as ReadonlyArray<TicketOffer>;
  return [...raw].sort((a, b) => effectiveCents(a) - effectiveCents(b));
}

export function effectiveCents(o: TicketOffer): number {
  if (o.isFree) return 0;
  const base = o.priceCents ?? 0;
  return typeof o.salePriceCents === 'number' && o.salePriceCents < base ? o.salePriceCents : base;
}

// ---------------------------------------------------------------------------
// Organizer card
// ---------------------------------------------------------------------------

export type OrganizerCard = Readonly<{
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  verified: boolean;
  followers: number | null;
  events: number | null;
  rating: number | null;
  reviewCount: number | null;
  isFollowing: boolean;
  review: Readonly<{ name: string; rating: number; text: string }> | null;
}>;

export async function fetchOrganizerCard(organizerId: string): Promise<OrganizerCard | null> {
  const org = await getOrganizerById(organizerId).catch(() => null);
  if (!org) return null;
  const reviews = await getOrganizerReviews(organizerId).catch(() => []);
  const top = reviews.find((r) => (r.comment ?? '').trim().length > 0) ?? null;
  return {
    id: org.id,
    name: org.name,
    logoUrl: org.logoUrl,
    city: org.city,
    verified: org.isVerified,
    followers: org.stats.followerCount ?? null,
    events: org.stats.eventCount ?? null,
    rating: org.stats.reviewCount > 0 ? org.stats.avgRating : null,
    reviewCount: org.stats.reviewCount ?? null,
    isFollowing: org.isFollowing,
    review: top ? { name: top.userName ?? '—', rating: top.rating, text: (top.comment ?? '').trim() } : null,
  };
}

/** Phase 4 routes 133/134 — only offered when the venue route returned `isFollowing`. */
export async function setVenueFollow(venueId: string, follow: boolean): Promise<void> {
  const call = getBoundApiCall();
  await call(`/v1/me/followed-venues/${encodeURIComponent(venueId)}`, { method: follow ? 'PUT' : 'DELETE' });
}
