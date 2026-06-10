// lib/api/mapping.ts
// Single source of truth for adapting raw Gooswing API JSON into the UI types
// declared by types/domain.ts and the shapes consumed by existing components.

import type { Attendee, Event, ID, LatLng } from '@/types/domain';
import type {
  ApiAttendee,
  ApiAttendeePreview,
  ApiEvent,
  ApiMiniEvent,
  ApiTicketType,
} from './types';

const KNOWN_ACCESS = new Set<'free' | 'free_ladies'>(['free', 'free_ladies']);

function asString(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (v == null) return fallback;
  return String(v);
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asArray<T>(v: ReadonlyArray<T> | null | undefined): ReadonlyArray<T> {
  return Array.isArray(v) ? v : [];
}

function toLatLng(v: ApiEvent['location'] | ApiMiniEvent['location']): LatLng | undefined {
  if (!v) return undefined;
  const lat = asNumber((v as { lat?: unknown }).lat, NaN);
  const lng = asNumber((v as { lng?: unknown }).lng, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}

function toIsoOrPassthrough(v: string | null | undefined, fallback?: string): string {
  if (typeof v === 'string' && v.length) {
    const d = new Date(v);
    if (Number.isFinite(d.getTime())) return d.toISOString();
    return v;
  }
  return fallback ?? new Date().toISOString();
}

function buildInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || '·'
  );
}

function mapAttendeePreview(p: ApiAttendeePreview, idx: number): Attendee {
  const displayName = asString(p.displayName);
  const explicitInitials = asString(p.initials).trim();
  const initials = explicitInitials || buildInitials(displayName);
  const id = asString(p.userId) || `preview-${idx}`;
  return { id: id as ID, initials };
}

function mapAccessList(
  v: ReadonlyArray<string> | null | undefined,
): ReadonlyArray<'free' | 'free_ladies'> {
  return asArray(v)
    .map((s) => asString(s))
    .filter((s): s is 'free' | 'free_ladies' =>
      KNOWN_ACCESS.has(s as 'free' | 'free_ladies'),
    );
}

export function mapApiEventToUiEvent(e: ApiEvent): Event {
  return {
    id: asString(e.id) as ID,
    externalId: e.externalId == null ? undefined : asString(e.externalId),
    title: asString(e.title),
    description: e.description == null ? null : asString(e.description),
    organizer: asString(e.organizer),
    organizerId: e.organizerId == null ? undefined : asString(e.organizerId),
    imageUrl: asString(e.imageUrl),
    startsAtIso: toIsoOrPassthrough(e.startsAtIso),
    venue: asString(e.venue),
    venueId: e.venueId == null ? undefined : asString(e.venueId),
    city: e.city == null ? undefined : asString(e.city),
    countryCode: e.countryCode == null ? undefined : asString(e.countryCode),
    category: e.category == null ? null : asString(e.category),
    categories: asArray(e.categories).map((s) => asString(s)),
    access: mapAccessList(e.access),
    musicStyles: asArray(e.musicStyles).map((s) => asString(s)),
    partyTypes: asArray(e.partyTypes).map((s) => asString(s)),
    basePrice: asNumber(e.basePrice, 0),
    priceLabel: e.priceLabel == null ? undefined : asString(e.priceLabel),
    favorite: false,
    attendees: asArray(e.attendees).map(mapAttendeePreview),
    attendeesExtraCount: asNumber(e.attendeesExtraCount, 0),
    attendeeCount: asNumber(e.attendeeCount, 0),
    waitlistEnabled: Boolean(e.waitlistEnabled),
    approvalMode: e.approvalMode == null ? undefined : asString(e.approvalMode),
    sharingEnabled: e.sharingEnabled == null ? true : Boolean(e.sharingEnabled),
    policies: asArray(e.policies),
    location: toLatLng(e.location),
    venueType: e.venueType == null ? undefined : asString(e.venueType),
    endsAtIso: e.endsAtIso == null ? null : asString(e.endsAtIso),
  } satisfies Event;
}

export type UiMiniEventRow = Readonly<{
  id: string;
  title: string;
  imageUrl: string | null;
  startsAtIso: string | null;
  priceLabel: string | null;
}>;

export function mapApiMiniEventToUiMini(m: ApiMiniEvent): UiMiniEventRow {
  return {
    id: asString(m.id),
    title: asString(m.title),
    imageUrl: m.imageUrl == null ? null : asString(m.imageUrl),
    startsAtIso:
      m.startsAtIso == null ? null : toIsoOrPassthrough(m.startsAtIso, ''),
    priceLabel: m.priceLabel == null ? null : asString(m.priceLabel),
  };
}

export type UiMiniEventWithVenue = UiMiniEventRow &
  Readonly<{ venue?: string | null }>;

export function mapApiMiniEventWithVenue(m: ApiMiniEvent): UiMiniEventWithVenue {
  return {
    ...mapApiMiniEventToUiMini(m),
    venue: m.venue == null ? null : asString(m.venue),
  };
}

export type UiTicketType = Readonly<{
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  inventory?: number | null;
  benefits?: ReadonlyArray<string> | null;
  isFree?: boolean;
  freeForLadies?: boolean;
}>;

export function mapApiTicketTypeToUiTicketType(t: ApiTicketType): UiTicketType {
  return {
    id: asString(t.id),
    name: asString(t.name) || 'Ticket',
    description: null,
    priceCents: asNumber(t.priceCents, 0),
    currency: (asString(t.currency) || 'USD').toUpperCase(),
    inventory: t.seatsMax == null ? null : asNumber(t.seatsMax, 0),
    benefits: asArray(t.benefits).map((s) => asString(s)),
    isFree: Boolean(t.isFree),
    freeForLadies: Boolean(t.freeForLadies),
  };
}

export type UiEventAttendee = Readonly<{
  userId: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
}>;

export function mapApiAttendeeToUiAttendee(a: ApiAttendee): UiEventAttendee {
  const displayName = asString(a.displayName).trim() || 'Attendee';
  const initials = asString(a.initials).trim() || buildInitials(displayName);
  return {
    userId: asString(a.userId),
    displayName,
    initials,
    avatarUrl: a.avatarUrl ?? null,
  };
}
