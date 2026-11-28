// screens/discover/lib/filtering.ts
// Client-side search and filters for the Discover tab. Everything runs over
// useEvents().events and the venues list; server-side filters (Phase 4 § C.1)
// can replace this later without changing the UI.
import type { Event } from '@/types/domain';
import type { Venue } from '@/lib/api/venues';
import type { DiscoverArtist } from '@/lib/api/artists';
import { distanceKm, eventDistanceKm, eventEnd, eventStart, isLiveNow, isPast, type LatLngInput } from '@/lib/format';

export type WhenKey = 'any' | 'now' | 'tonight' | 'weekend' | 'week' | 'nextweek' | 'nextweekend' | 'month';
export type PriceKey = 'any' | 'free' | 'u15' | 'u30';
export type AccessKey = 'free' | 'free_ladies';
export type DistanceKey = 'any' | 'u1' | 'u3';

export type DiscoverFilters = Readonly<{
  when: WhenKey;
  price: PriceKey;
  access: ReadonlyArray<AccessKey>;
  distance: DistanceKey;
  venueTypes: ReadonlyArray<string>;
  genres: ReadonlyArray<string>;
}>;

export const DEFAULT_FILTERS: DiscoverFilters = {
  when: 'any',
  price: 'any',
  access: [],
  distance: 'any',
  venueTypes: [],
  genres: [],
};

export const WHEN_KEYS: ReadonlyArray<WhenKey> = ['any', 'now', 'tonight', 'weekend', 'week', 'nextweek', 'nextweekend', 'month'];
export const PRICE_KEYS: ReadonlyArray<PriceKey> = ['any', 'free', 'u15', 'u30'];
export const ACCESS_KEYS: ReadonlyArray<AccessKey> = ['free', 'free_ladies'];
export const DISTANCE_KEYS: ReadonlyArray<DistanceKey> = ['any', 'u1', 'u3'];

/** Venue type chips of the filter sheet (Phase 4 § D.1 slugs + labels in i18n). */
export const VENUE_TYPES: ReadonlyArray<string> = [
  'club',
  'bar',
  'pub',
  'rooftop',
  'restaurant',
  'live_music',
  'jazz_club',
  'open_air',
  'warehouse',
  'event_hall',
];

/** Music genre chips; labels are the genre names themselves. */
export const MUSIC_GENRES: ReadonlyArray<string> = [
  'House',
  'Deep house',
  'Techno',
  'Afro house',
  'Amapiano',
  'Hip-hop',
  'R&B',
  'Reggaeton',
  'Jazz',
  'Disco',
  'Pop',
  'Rock / Indie',
];

/** Type chips under the search field: event kinds then place kinds. */
export type TypeChip = Readonly<{ key: string; kind: 'event' | 'place' }>;
export const TYPE_CHIPS: ReadonlyArray<TypeChip> = [
  { key: 'clubbing', kind: 'event' },
  { key: 'concert', kind: 'event' },
  { key: 'festival', kind: 'event' },
  { key: 'student', kind: 'event' },
  { key: 'afterwork', kind: 'event' },
  { key: 'restaurant', kind: 'place' },
  { key: 'bar', kind: 'place' },
  { key: 'pub', kind: 'place' },
  { key: 'club', kind: 'place' },
  { key: 'rooftop', kind: 'place' },
];

export function activeFilterCount(f: DiscoverFilters): number {
  return (
    (f.when !== 'any' ? 1 : 0) +
    (f.price !== 'any' ? 1 : 0) +
    f.access.length +
    (f.distance !== 'any' ? 1 : 0) +
    f.venueTypes.length +
    f.genres.length
  );
}

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

export function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[_\-/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Singular-ish stem so "Clubs" matches "club" and "Bars" matches "bar". */
const stem = (s: string): string => norm(s).replace(/s$/, '');

const VENUE_TYPE_SYNONYMS: Readonly<Record<string, ReadonlyArray<string>>> = {
  club: ['club', 'nightclub', 'discotheque', 'boite'],
  bar: ['bar', 'cocktail', 'lounge', 'wine'],
  pub: ['pub', 'brasserie', 'tavern'],
  rooftop: ['rooftop', 'terrace', 'terrasse'],
  restaurant: ['restaurant', 'bistro', 'cafe', 'brasserie'],
  live_music: ['live', 'concert', 'music venue', 'salle'],
  jazz_club: ['jazz'],
  open_air: ['open air', 'outdoor', 'festival', 'plein air', 'park'],
  warehouse: ['warehouse', 'hangar', 'entrepot'],
  event_hall: ['event hall', 'hall', 'concert hall', 'salle'],
};

/** Does a venueType string (e.g. "Clubs", "club", "jazz_club") match a slug? */
export function venueTypeMatches(venueType: string | null | undefined, slug: string): boolean {
  const v = stem(venueType ?? '');
  if (!v) return false;
  if (v === stem(slug)) return true;
  return (VENUE_TYPE_SYNONYMS[slug] ?? [slug]).some((syn) => v.includes(stem(syn)));
}

/** "Rock / Indie" matches "Indie rock"; "Deep house" matches "deep_house". */
export function genreMatches(styles: ReadonlyArray<string> | null | undefined, genre: string): boolean {
  const list = (styles ?? []).map(norm);
  const g = norm(genre);
  if (list.includes(g)) return true;
  const parts = genre.split('/').map(norm).filter(Boolean);
  if (parts.length > 1) return list.some((s) => parts.some((p) => s.includes(p)));
  // "House" alone should not match "Deep house"; whole-word equality only.
  return list.some((s) => s === g || s.replace(/ /g, '') === g.replace(/ /g, ''));
}

const EVENT_TYPE_WORDS: Readonly<Record<string, ReadonlyArray<string>>> = {
  clubbing: ['clubbing', 'club', 'party', 'soiree'],
  concert: ['concert', 'live', 'gig'],
  festival: ['festival', 'open air'],
  student: ['student', 'etudiant'],
  afterwork: ['afterwork', 'after work'],
};

export function eventMatchesTypeChip(ev: Event, chip: TypeChip): boolean {
  if (chip.kind === 'place') return venueTypeMatches(ev.venueType, chip.key);
  const words = EVENT_TYPE_WORDS[chip.key] ?? [chip.key];
  const tags = [...(ev.partyTypes ?? []), ...(ev.categories ?? []), ev.category ?? ''].map(norm).filter(Boolean);
  return tags.some((tag) => words.some((w) => tag.includes(w)));
}

/** First party type / category to show on cards ("Clubbing"). */
export function eventTypeLabel(ev: Event): string | null {
  return ev.partyTypes?.[0] ?? ev.categories?.[0] ?? ev.category ?? null;
}

// ---------------------------------------------------------------------------
// Time windows (local time)
// ---------------------------------------------------------------------------

type Range = Readonly<{ from: Date; to: Date }>;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
/** Monday 00:00 of the week containing d. */
function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  return addDays(s, -((s.getDay() + 6) % 7));
}
function at(d: Date, h: number, m = 0): Date {
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x;
}

export function whenRange(key: WhenKey, now: Date = new Date()): Range | null {
  const mon = startOfWeek(now);
  const sunEnd = at(addDays(mon, 6), 23, 59);
  switch (key) {
    case 'now':
      return { from: now, to: new Date(now.getTime() + 1) };
    case 'tonight':
      // From now until 06:00 tomorrow.
      return { from: now, to: at(addDays(startOfDay(now), 1), 6) };
    case 'weekend':
      // Friday 18:00 → Sunday 23:59 of this week.
      return { from: new Date(Math.max(now.getTime(), at(addDays(mon, 4), 18).getTime())), to: sunEnd };
    case 'week':
      return { from: now, to: sunEnd };
    case 'nextweek':
      return { from: addDays(mon, 7), to: at(addDays(mon, 13), 23, 59) };
    case 'nextweekend':
      return { from: at(addDays(mon, 11), 18), to: at(addDays(mon, 13), 23, 59) };
    case 'month':
      return { from: now, to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59) };
    default:
      return null;
  }
}

/** [start, end) overlaps the range. */
export function eventOverlaps(ev: Event, r: Range): boolean {
  const s = eventStart(ev);
  const e = eventEnd(ev);
  if (!s || !e) return false;
  return s < r.to && e > r.from;
}

/** Today's events: live now, or starting before 06:00 tomorrow. */
export function isTodayEvent(ev: Event, now: Date = new Date()): boolean {
  if (isPast(ev, now)) return false;
  if (isLiveNow(ev, now)) return true;
  const s = eventStart(ev);
  return !!s && s < at(addDays(startOfDay(now), 1), 6);
}

/** Next 7 days. */
export function isThisWeekEvent(ev: Event, now: Date = new Date()): boolean {
  if (isPast(ev, now)) return false;
  const s = eventStart(ev);
  return !!s && s < addDays(now, 7);
}

/** Next 31 days. */
export function isThisMonthEvent(ev: Event, now: Date = new Date()): boolean {
  if (isPast(ev, now)) return false;
  const s = eventStart(ev);
  return !!s && s < addDays(now, 31);
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export type MatchContext = Readonly<{
  query: string;
  filters: DiscoverFilters;
  chip: TypeChip | null;
  origin: LatLngInput | null;
  now?: Date;
}>;

const maxKm = (d: DistanceKey): number | null => (d === 'u1' ? 1 : d === 'u3' ? 3 : null);

export function eventMatches(ev: Event, ctx: MatchContext): boolean {
  const now = ctx.now ?? new Date();
  if (isPast(ev, now)) return false;
  const q = norm(ctx.query);
  if (q) {
    const hay = norm([ev.title, ev.venue, ev.organizer, ev.city, ...(ev.musicStyles ?? []), ...(ev.partyTypes ?? [])].join(' '));
    if (!q.split(' ').every((w) => hay.includes(w))) return false;
  }
  if (ctx.chip && !eventMatchesTypeChip(ev, ctx.chip)) return false;

  const f = ctx.filters;
  if (f.when !== 'any') {
    if (f.when === 'now') {
      if (!isLiveNow(ev, now)) return false;
    } else {
      const r = whenRange(f.when, now);
      if (r && !eventOverlaps(ev, r)) return false;
    }
  }
  if (f.price !== 'any') {
    const p = typeof ev.basePrice === 'number' ? ev.basePrice : null;
    const free = (p != null && p <= 0) || (ev.access ?? []).includes('free');
    if (f.price === 'free' && !free) return false;
    if (f.price === 'u15' && !(free || (p != null && p < 15))) return false;
    if (f.price === 'u30' && !(free || (p != null && p < 30))) return false;
  }
  if (f.access.length > 0 && !f.access.some((a) => (ev.access ?? []).includes(a))) return false;
  const km = maxKm(f.distance);
  if (km != null) {
    const d = eventDistanceKm(ev, ctx.origin);
    if (d == null || d > km) return false;
  }
  if (f.venueTypes.length > 0 && !f.venueTypes.some((slug) => venueTypeMatches(ev.venueType, slug))) return false;
  if (f.genres.length > 0 && !f.genres.some((g) => genreMatches(ev.musicStyles, g))) return false;
  return true;
}

export function venueDistanceKm(v: Venue, origin: LatLngInput | null): number | null {
  if (v.distanceKm != null) return v.distanceKm;
  if (!origin || v.lat == null || v.lng == null) return null;
  return distanceKm(origin, { latitude: v.lat, longitude: v.lng });
}

export function venueMatches(v: Venue, ctx: MatchContext): boolean {
  const q = norm(ctx.query);
  if (q) {
    const hay = norm([v.name, v.venueType, v.area, v.city, v.addressLine1, ...(v.musicStyles ?? [])].join(' '));
    if (!q.split(' ').every((w) => hay.includes(w))) return false;
  }
  if (ctx.chip) {
    if (ctx.chip.kind === 'event') return false; // "Concert" etc. are event kinds.
    if (!venueTypeMatches(v.venueType, ctx.chip.key)) return false;
  }
  const f = ctx.filters;
  const km = maxKm(f.distance);
  if (km != null) {
    const d = venueDistanceKm(v, ctx.origin);
    if (d == null || d > km) return false;
  }
  if (f.venueTypes.length > 0 && !f.venueTypes.some((slug) => venueTypeMatches(v.venueType, slug))) return false;
  if (f.genres.length > 0 && v.musicStyles && !f.genres.some((g) => genreMatches(v.musicStyles, g))) return false;
  if (f.access.includes('free') && !v.freeAccess) return false;
  if (f.access.includes('free_ladies') && !f.access.includes('free') && !v.freeForLadies) return false;
  return true;
}

export function artistMatches(a: DiscoverArtist, ctx: MatchContext): boolean {
  const q = norm(ctx.query);
  if (q) {
    const hay = norm([a.artist.name, a.artist.kind, ...a.artist.genres, a.nextGig?.venueName].join(' '));
    if (!q.split(' ').every((w) => hay.includes(w))) return false;
  }
  if (ctx.chip?.kind === 'place') return false;
  if (ctx.filters.genres.length > 0 && !ctx.filters.genres.some((g) => genreMatches(a.artist.genres, g))) return false;
  return true;
}
