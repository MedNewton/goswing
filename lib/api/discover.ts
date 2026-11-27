// lib/api/discover.ts
// Discover-area reads that complement lib/api/events.ts and lib/api/venues.ts:
//   • event details with the Phase 4 § C.2 extras (doors, last entry, min age…)
//   • ticket types with the Phase 4 § C.3 extras (sale price, seats left…)
//   • the public event gallery (route 119)
//   • Phase 4 rankings: GET /v1/discover/places (route 136)
//   • Phase 4 review eligibility: GET /v1/me/review-eligibility (route 154)
// Phase 4 fields are optional and Phase 4 routes return null when unavailable.
import type { Event } from '@/types/domain';
import { getBoundApiCall } from './client';
import { mapApiEventToUiEvent } from './mapping';
import type { ApiEvent } from './types';
import { isUnavailable, listOf, mapVenue, type Venue } from './venues';

type Raw = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// ---------------------------------------------------------------------------
// Event details + Phase 4 extras
// ---------------------------------------------------------------------------

export type EventExtras = Readonly<{
  status: string | null;
  doorsOpenAt: string | null;
  lastEntryAt: string | null;
  minAge: number | null;
  fromPriceCents: number | null;
  fromRegularPriceCents: number | null;
  currency: string | null;
  venueAddress: string | null;
  venueType: string | null;
}>;

export const NO_EXTRAS: EventExtras = {
  status: null,
  doorsOpenAt: null,
  lastEntryAt: null,
  minAge: null,
  fromPriceCents: null,
  fromRegularPriceCents: null,
  currency: null,
  venueAddress: null,
  venueType: null,
};

export async function getEventWithExtras(id: string): Promise<{ event: Event; extras: EventExtras }> {
  const raw = await getBoundApiCall()<ApiEvent & Raw>(`/v1/events/${encodeURIComponent(id)}`);
  const venue = (raw.venue && typeof raw.venue === 'object' ? raw.venue : {}) as Raw;
  return {
    event: mapApiEventToUiEvent({ ...raw, venue: typeof raw.venue === 'string' ? raw.venue : str(venue.name) ?? '' } as ApiEvent),
    extras: {
      status: str(raw.status),
      doorsOpenAt: str(raw.doorsOpenAt),
      lastEntryAt: str(raw.lastEntryAt),
      minAge: num(raw.minAge),
      fromPriceCents: num(raw.fromPriceCents),
      fromRegularPriceCents: num(raw.fromRegularPriceCents),
      currency: str(raw.currency),
      venueAddress: str(venue.addressLine1) ?? str(raw.venueAddress) ?? str(raw.addressLine1),
      venueType: str(venue.venueType),
    },
  };
}

// ---------------------------------------------------------------------------
// Ticket offers
// ---------------------------------------------------------------------------

export type TicketOffer = Readonly<{
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  /** Phase 4: the discounted price actually charged (< priceCents). */
  salePriceCents: number | null;
  /** Phase 4: what the same entry costs at the door. */
  doorPriceCents: number | null;
  currency: string;
  isFree: boolean;
  freeForLadies: boolean;
  benefits: ReadonlyArray<string>;
  seatsMax: number | null;
  seatsAvailable: number | null;
  isOnSale: boolean;
}>;

export async function getTicketOffers(eventId: string): Promise<ReadonlyArray<TicketOffer>> {
  const raw = await getBoundApiCall()<unknown>(`/v1/events/${encodeURIComponent(eventId)}/ticket-types`);
  return listOf(raw).map((r) => {
    const price = num(r.priceCents) ?? 0;
    const sale = num(r.salePriceCents);
    const seats = num(r.seatsAvailable);
    return {
      id: String(r.id ?? ''),
      name: str(r.name) ?? 'Ticket',
      description: str(r.description),
      priceCents: price,
      salePriceCents: sale != null && sale < price ? sale : null,
      doorPriceCents: num(r.doorPriceCents),
      currency: (str(r.currency) ?? 'EUR').toUpperCase(),
      isFree: Boolean(r.isFree) || price === 0,
      freeForLadies: Boolean(r.freeForLadies),
      benefits: Array.isArray(r.benefits) ? (r.benefits as unknown[]).filter((b): b is string => typeof b === 'string' && b.trim() !== '') : [],
      seatsMax: num(r.seatsMax),
      seatsAvailable: seats,
      isOnSale: typeof r.isOnSale === 'boolean' ? r.isOnSale : seats == null || seats > 0,
    };
  });
}

/** Price actually charged for an offer. */
export const effectivePriceCents = (o: TicketOffer): number => o.salePriceCents ?? o.priceCents;

// ---------------------------------------------------------------------------
// Public event gallery (route 119)
// ---------------------------------------------------------------------------

export type MediaItem = Readonly<{
  id: string;
  mediaType: 'image' | 'video';
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
}>;

export async function getEventGallery(eventId: string): Promise<ReadonlyArray<MediaItem>> {
  try {
    const raw = await getBoundApiCall()<unknown>(`/v1/public/events/${encodeURIComponent(eventId)}/gallery`);
    return listOf(raw)
      .map((r, i) => {
        const url = str(r.url) ?? str(r.imageUrl) ?? str(r.mediaUrl) ?? '';
        const type = str(r.mediaType) === 'video' ? ('video' as const) : ('image' as const);
        return { id: String(r.id ?? i), mediaType: type, url, thumbnailUrl: str(r.thumbnailUrl), caption: str(r.caption) };
      })
      .filter((m) => m.url);
  } catch (e) {
    if (isUnavailable(e)) return [];
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Phase 4 — Discover places ranking (route 136)
// ---------------------------------------------------------------------------

export type RankedVenue = Readonly<{ rank: number; venue: Venue }>;

export async function getDiscoverPlaces(params: { city?: string | null; lat?: number; lng?: number }): Promise<ReadonlyArray<RankedVenue> | null> {
  try {
    const raw = await getBoundApiCall()<unknown>('/v1/discover/places', {
      query: { city: params.city || undefined, lat: params.lat, lng: params.lng, period: 'week', limit: 10 },
    });
    return listOf(raw)
      .map((r, i) => ({ rank: num(r.rank) ?? i + 1, venue: mapVenue((r.venue ?? r) as Raw) }))
      .filter((r) => r.venue.id && r.venue.name);
  } catch (e) {
    if (isUnavailable(e)) return null;
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Phase 4 — review eligibility (route 154)
// ---------------------------------------------------------------------------

export type ReviewVisit = Readonly<{
  reservationId: string;
  visitDate: string | null;
  eventTitle: string | null;
  reviewed: boolean;
}>;

/** null = route not available (the "Write a review" button stays hidden). */
export async function getReviewEligibility(
  targetType: 'event' | 'venue' | 'organizer',
  targetId: string,
): Promise<ReadonlyArray<ReviewVisit> | null> {
  try {
    const raw = await getBoundApiCall()<unknown>('/v1/me/review-eligibility', { query: { targetType, targetId } });
    return listOf(raw).map((r) => ({
      reservationId: String(r.reservationId ?? ''),
      visitDate: str(r.visitDate),
      eventTitle: str(r.eventTitle),
      reviewed: Boolean(r.reviewed),
    }));
  } catch (e) {
    if (isUnavailable(e)) return null;
    throw e;
  }
}

/** Route 156 — organizer review for a past reservation. */
export async function postOrganizerReview(
  organizerId: string,
  body: { reservationId: string; rating: number; comment: string | null },
): Promise<void> {
  await getBoundApiCall()<unknown>(`/v1/organizers/${encodeURIComponent(organizerId)}/reviews`, { method: 'POST', body });
}
