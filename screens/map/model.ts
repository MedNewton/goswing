// screens/map/model.ts — map categories, place model and small helpers.
//
// The map shows two kinds of pins:
//  - events from GET /v1/events (round cover + price chip);
//  - places: GoSwing venues (GET /v1/public/venues, later Phase 4 /v1/venues)
//    and nearby bars/restaurants/clubs from OpenStreetMap that are not on
//    GoSwing yet.
import type { LucideIcon } from 'lucide-react-native';
import { Beer, Coffee, Martini, Mic, Music, Sparkles, Tent, Utensils, Wine } from 'lucide-react-native';

import type { Event } from '@/types/domain';
import type { PlaceSeed, PlaceSource } from '@/navigation/routes';

export type MapCategory = 'all' | 'clubs' | 'bars' | 'pubs' | 'restaurants' | 'concerts' | 'festivals' | 'rooftops';

export const MAP_CATEGORIES: ReadonlyArray<MapCategory> = [
  'all',
  'clubs',
  'bars',
  'pubs',
  'restaurants',
  'concerts',
  'festivals',
  'rooftops',
];

const strip = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Keyword → chip. Tolerant of API variants ("club", "Clubs", "nightclub", "concert_hall"…). */
const RULES: ReadonlyArray<readonly [RegExp, MapCategory]> = [
  [/club|disco|boite|nightlife|clubbing/, 'clubs'],
  [/rooftop|roof|terrasse/, 'rooftops'],
  [/pub|tavern|brewery|brasserie artisanale/, 'pubs'],
  [/bar|lounge|cocktail|guinguette|wine/, 'bars'],
  [/restau|brasserie|bistro|dinner|diner|food|cafe/, 'restaurants'],
  [/concert|live music|gig|jazz|opera|theat|music hall|concert_hall|salle/, 'concerts'],
  [/festival|open air|open-air/, 'festivals'],
];

export function categoriesOfText(values: ReadonlyArray<string | null | undefined>): ReadonlySet<MapCategory> {
  const out = new Set<MapCategory>();
  for (const v of values) {
    if (!v) continue;
    const s = strip(v);
    for (const [re, cat] of RULES) if (re.test(s)) out.add(cat);
  }
  return out;
}

export function eventCategories(ev: Event): ReadonlySet<MapCategory> {
  return categoriesOfText([ev.venueType, ev.category, ...(ev.categories ?? []), ...(ev.partyTypes ?? [])]);
}

export function matchesCategory(cats: ReadonlySet<MapCategory>, cat: MapCategory): boolean {
  return cat === 'all' || cats.has(cat);
}

/** A place pin: a GoSwing venue or an OpenStreetMap place. */
export type MapPlace = Readonly<{
  id: string;
  name: string;
  source: PlaceSource;
  /** Raw category text ("pub", "club", "Cocktail bar"…). */
  kind: string;
  lat: number;
  lng: number;
  address?: string | null;
  openingHours?: string | null;
  venueId?: string | null;
  coverImageUrl?: string | null;
  categories: ReadonlySet<MapCategory>;
}>;

export function placeSeed(p: MapPlace): PlaceSeed {
  return {
    id: p.venueId ?? p.id,
    name: p.name,
    source: p.source,
    category: p.kind,
    address: p.address ?? null,
    lat: p.lat,
    lng: p.lng,
    openingHours: p.openingHours ?? null,
    venueId: p.venueId ?? null,
  };
}

/** Lucide icon for a place category. */
export function placeIcon(kind: string): LucideIcon {
  const s = strip(kind);
  if (/cabaret/.test(s)) return Sparkles;
  if (/club|disco|boite/.test(s)) return Music;
  if (/pub|tavern|beer/.test(s)) return Beer;
  if (/rooftop|wine|guinguette/.test(s)) return Wine;
  if (/bar|lounge|cocktail/.test(s)) return Martini;
  if (/concert|hall|jazz|live/.test(s)) return Mic;
  if (/festival/.test(s)) return Tent;
  if (/cafe|coffee/.test(s)) return Coffee;
  return Utensils;
}

/** i18n key for a place category label (map.kind.*), or null to show the raw text. */
export function placeKindKey(kind: string): string | null {
  const aliases: Readonly<Record<string, string>> = {
    clubs: 'club',
    nightclub: 'discotheque',
    bars: 'bar',
    pubs: 'pub',
    restaurants: 'restaurant',
    rooftops: 'rooftop',
    concerts: 'concert_hall',
    concert: 'concert_hall',
    festivals: 'festival_ground',
    festival: 'festival_ground',
  };
  const raw = strip(kind);
  const s = aliases[raw] ?? raw;
  const known = [
    'restaurant',
    'brasserie',
    'bistro',
    'bar',
    'pub',
    'lounge',
    'guinguette',
    'taverne',
    'rooftop',
    'discotheque',
    'club',
    'cabaret',
    'concert_hall',
    'festival_ground',
    'cafe',
  ];
  return known.includes(s) ? `map.kind.${s}` : null;
}

const normName = (s: string): string =>
  strip(s)
    .replace(/^(le|la|les|l'|the)\s+/, '')
    .replace(/[^a-z0-9]/g, '');

/** Same place if names match and points are close (OSM vs GoSwing coordinates differ a little). */
export function samePlace(
  a: Readonly<{ name: string; lat: number; lng: number }>,
  b: Readonly<{ name: string; lat: number; lng: number }>,
  maxMeters = 120,
): boolean {
  const na = normName(a.name);
  const nb = normName(b.name);
  if (!na || !nb) return false;
  if (na !== nb && !na.includes(nb) && !nb.includes(na)) return false;
  const dLat = (a.lat - b.lat) * 111_000;
  const dLng = (a.lng - b.lng) * 111_000 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng) <= maxMeters;
}

/** Strip HTML from API descriptions for short previews. */
export function plainText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export type City = Readonly<{ key: string; label: string; latitude: number; longitude: number }>;

/** Cities offered in the location menu, with their map centers. */
export const CITIES: ReadonlyArray<City> = [
  { key: 'paris11', label: 'Paris 11e', latitude: 48.8636, longitude: 2.3735 },
  { key: 'lyon', label: 'Lyon', latitude: 45.764, longitude: 4.8357 },
  { key: 'marseille', label: 'Marseille', latitude: 43.2965, longitude: 5.3698 },
  { key: 'bordeaux', label: 'Bordeaux', latitude: 44.8378, longitude: -0.5792 },
  { key: 'casablanca', label: 'Casablanca', latitude: 33.5731, longitude: -7.5898 },
  { key: 'tangier', label: 'Tangier', latitude: 35.7595, longitude: -5.834 },
];
