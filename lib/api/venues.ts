// lib/api/venues.ts
// GoSwing venues ("places") for the Discover tab and the place page.
//
// Available today: the public venue routes (Phase 3) —
//   GET /v1/public/venues?city&venueType&search
//   GET /v1/public/venues/:id
//   GET /v1/public/venues/:id/events
//   GET /v1/public/venues/:id/similar
// They ignore the user's JWT for now (Phase 4 § A.1 makes them fill
// `isFollowing`). Every Phase 4 field (rating, price level, hours, open status,
// amenities…) is OPTIONAL here: the UI shows it only when the server sends it.
//
// Phase 4 routes (not live yet; 404/501 → "not available"):
//   GET  /v1/venues/:id/reviews           (route 157)
//   POST /v1/venues/:id/reviews           (route 155)
//   PUT/DELETE /v1/me/followed-venues/:id (routes 133–134)
import { ApiError, getBoundApiCall } from './client';

/** Phase 4 § D.1 opening hours entry: day 0 = Monday … 6 = Sunday. */
export type VenueOpeningHours = Readonly<{ day: number; opens: string; closes: string }>;

export type VenueRating = Readonly<{ average: number; count: number }>;

export type Venue = Readonly<{
  id: string;
  name: string;
  venueType: string | null;
  addressLine1: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  coverImageUrl: string | null;
  capacity: number | null;
  freeAccess: boolean;
  freeForLadies: boolean;
  organizerId: string | null;

  // Phase 4 § D.1 — optional until the backend ships them.
  area?: string | null;
  postalCode?: string | null;
  logoUrl?: string | null;
  priceLevel?: 1 | 2 | 3 | null;
  phone?: string | null;
  websiteUrl?: string | null;
  instagramHandle?: string | null;
  amenities?: ReadonlyArray<string>;
  openingHours?: ReadonlyArray<VenueOpeningHours>;
  openingHoursNote?: string | null;
  openNow?: boolean | null;
  closesAt?: string | null;
  rating?: VenueRating | null;
  followerCount?: number | null;
  eventsThisMonth?: number | null;
  hasEventNow?: boolean | null;
  musicStyles?: ReadonlyArray<string>;
  partyTypes?: ReadonlyArray<string>;
  /** Present (boolean) only once venue follows exist (§ D.7). */
  isFollowing?: boolean;
  notifyNewEvents?: boolean;
  distanceKm?: number | null;
}>;

/** Event row as returned by the venue events route (subset we use). */
export type VenueEvent = Readonly<{
  id: string;
  title: string;
  imageUrl: string | null;
  startsAtIso: string | null;
  endsAtIso: string | null;
  priceLabel: string | null;
  basePrice: number | null;
  venue: string | null;
}>;

export type VenueReview = Readonly<{
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  adminReply: string | null;
  helpfulCount: number;
}>;

export type VenueReviews = Readonly<{
  summary: Readonly<{ average: number; count: number; breakdown: Readonly<Record<string, number>> }> | null;
  items: ReadonlyArray<VenueReview>;
}>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : typeof v === 'number' ? String(v) : null);
const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const strList = (v: unknown): ReadonlyArray<string> | undefined =>
  Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : str((x as Raw)?.label) ?? str((x as Raw)?.name) ?? '')).filter(Boolean) : undefined;

/** Lists come back as a bare array, `{ items }` or `{ data }`. */
export function listOf(v: unknown): ReadonlyArray<Raw> {
  if (Array.isArray(v)) return v as Raw[];
  if (v && typeof v === 'object') {
    const o = v as Raw;
    for (const k of ['items', 'data', 'venues', 'events', 'results']) {
      if (Array.isArray(o[k])) return o[k] as Raw[];
    }
  }
  return [];
}

/** Phase 4 routes not deployed yet answer 404 (unknown route) or 501. */
export function isUnavailable(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 404 || e.status === 405 || e.status === 501);
}

export function mapVenue(r: Raw): Venue {
  const loc = (r.location ?? null) as Raw | null;
  const rating = r.rating as Raw | null | undefined;
  const avg = rating && typeof rating === 'object' ? num(rating.average) : num(r.rating);
  const count = rating && typeof rating === 'object' ? num(rating.count) : num(r.reviewCount);
  const pl = num(r.priceLevel);
  return {
    id: String(r.id ?? ''),
    name: str(r.name) ?? '',
    venueType: str(r.venueType),
    addressLine1: str(r.addressLine1) ?? str(r.address),
    city: str(r.city),
    lat: num(r.lat) ?? num(loc?.lat),
    lng: num(r.lng) ?? num(loc?.lng),
    description: str(r.description),
    coverImageUrl: str(r.coverImageUrl) ?? str(r.imageUrl),
    capacity: num(r.capacity),
    freeAccess: Boolean(r.freeAccess),
    freeForLadies: Boolean(r.freeForLadies),
    organizerId: str(r.organizerId),

    area: str(r.area),
    postalCode: str(r.postalCode),
    logoUrl: str(r.logoUrl),
    priceLevel: pl === 1 || pl === 2 || pl === 3 ? pl : null,
    phone: str(r.phone),
    websiteUrl: str(r.websiteUrl),
    instagramHandle: str(r.instagramHandle),
    amenities: strList(r.amenities),
    openingHours: Array.isArray(r.openingHours)
      ? (r.openingHours as Raw[])
          .map((h) => ({ day: num(h.day) ?? -1, opens: str(h.opens) ?? '', closes: str(h.closes) ?? '' }))
          .filter((h) => h.day >= 0 && h.day <= 6 && h.opens && h.closes)
      : undefined,
    openingHoursNote: str(r.openingHoursNote),
    openNow: typeof r.openNow === 'boolean' ? r.openNow : null,
    closesAt: str(r.closesAt),
    rating: avg != null && avg > 0 ? { average: avg, count: count ?? 0 } : null,
    followerCount: num(r.followerCount),
    eventsThisMonth: num(r.eventsThisMonth),
    hasEventNow: typeof r.hasEventNow === 'boolean' ? r.hasEventNow : null,
    musicStyles: strList(r.musicStyles),
    partyTypes: strList(r.partyTypes),
    isFollowing: typeof r.isFollowing === 'boolean' ? r.isFollowing : undefined,
    notifyNewEvents: typeof r.notifyNewEvents === 'boolean' ? r.notifyNewEvents : undefined,
    distanceKm: num(r.distanceKm),
  };
}

function mapVenueEvent(r: Raw): VenueEvent {
  const venue = r.venue;
  return {
    id: String(r.id ?? r.externalId ?? ''),
    title: str(r.title) ?? '',
    imageUrl: str(r.imageUrl),
    startsAtIso: str(r.startsAtIso) ?? str(r.startsAt),
    endsAtIso: str(r.endsAtIso) ?? str(r.endsAt),
    priceLabel: str(r.priceLabel),
    basePrice: num(r.basePrice) ?? (num(r.fromPriceCents) != null ? (num(r.fromPriceCents) as number) / 100 : null),
    venue: typeof venue === 'string' ? venue : str((venue as Raw | null)?.name),
  };
}

// ---------------------------------------------------------------------------
// Routes available today
// ---------------------------------------------------------------------------

export async function listVenues(params: { city?: string | null; venueType?: string; search?: string } = {}): Promise<ReadonlyArray<Venue>> {
  const raw = await getBoundApiCall()<unknown>('/v1/public/venues', {
    query: { city: params.city || undefined, venueType: params.venueType, search: params.search },
  });
  return listOf(raw).map(mapVenue).filter((v) => v.id && v.name);
}

export async function getVenue(id: string): Promise<Venue> {
  const raw = await getBoundApiCall()<Raw>(`/v1/public/venues/${encodeURIComponent(id)}`);
  const body = (raw && typeof raw === 'object' && 'venue' in raw ? (raw.venue as Raw) : raw) ?? {};
  return mapVenue(body);
}

export async function getVenueEvents(id: string): Promise<ReadonlyArray<VenueEvent>> {
  const raw = await getBoundApiCall()<unknown>(`/v1/public/venues/${encodeURIComponent(id)}/events`);
  return listOf(raw).map(mapVenueEvent).filter((e) => e.id);
}

export async function getSimilarVenues(id: string, origin?: { lat: number; lng: number } | null): Promise<ReadonlyArray<Venue>> {
  const raw = await getBoundApiCall()<unknown>(`/v1/public/venues/${encodeURIComponent(id)}/similar`, {
    query: { limit: 6, lat: origin?.lat, lng: origin?.lng },
  });
  return listOf(raw).map(mapVenue).filter((v) => v.id && v.id !== id);
}

// ---------------------------------------------------------------------------
// Phase 4 routes — null means "not available yet"
// ---------------------------------------------------------------------------

/** Route 157. null when the route is not deployed. */
export async function getVenueReviews(id: string): Promise<VenueReviews | null> {
  try {
    const raw = await getBoundApiCall()<Raw>(`/v1/venues/${encodeURIComponent(id)}/reviews`);
    const s = (raw?.summary ?? null) as Raw | null;
    return {
      summary:
        s && num(s.count) != null
          ? {
              average: num(s.average) ?? 0,
              count: num(s.count) ?? 0,
              breakdown: (s.breakdown && typeof s.breakdown === 'object' ? s.breakdown : {}) as Record<string, number>,
            }
          : null,
      items: listOf(raw).map((r) => {
        const author = (r.author ?? {}) as Raw;
        return {
          id: String(r.id ?? ''),
          rating: num(r.rating) ?? 0,
          comment: str(r.comment),
          createdAt: str(r.createdAt),
          authorName: str(author.displayName) ?? str(r.userName) ?? '—',
          authorAvatarUrl: str(author.avatarUrl),
          adminReply: str(r.adminReply),
          helpfulCount: num(r.helpfulCount) ?? 0,
        };
      }),
    };
  } catch (e) {
    if (isUnavailable(e)) return null;
    throw e;
  }
}

/** Route 155. */
export async function postVenueReview(
  id: string,
  body: { reservationId: string; rating: number; comment: string | null },
): Promise<void> {
  await getBoundApiCall()<unknown>(`/v1/venues/${encodeURIComponent(id)}/reviews`, { method: 'POST', body });
}

/** Routes 133–134. Returns the new state from the server. */
export async function setVenueFollow(
  id: string,
  follow: boolean,
  notifyNewEvents?: boolean,
): Promise<{ isFollowing: boolean; followerCount: number | null; notifyNewEvents?: boolean }> {
  const raw = await getBoundApiCall()<Raw>(`/v1/me/followed-venues/${encodeURIComponent(id)}`, {
    method: follow ? 'PUT' : 'DELETE',
    body: follow && notifyNewEvents !== undefined ? { notifyNewEvents } : undefined,
  });
  return {
    isFollowing: typeof raw?.isFollowing === 'boolean' ? raw.isFollowing : follow,
    followerCount: num(raw?.followerCount),
    notifyNewEvents: typeof raw?.notifyNewEvents === 'boolean' ? raw.notifyNewEvents : undefined,
  };
}
