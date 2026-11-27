// screens/discover/lib/places.ts — display helpers for venues and artists.
import { Linking, Platform, Share } from 'react-native';
import type { TFunction } from 'i18next';
import type { Event } from '@/types/domain';
import type { PlaceSeed } from '@/navigation/routes';
import type { Venue, VenueOpeningHours } from '@/lib/api/venues';
import { hhmm } from '@/lib/format';
import { VENUE_TYPES, venueTypeMatches } from './filtering';

export const priceLevelLabel = (lvl: Venue['priceLevel']): string | null => (lvl ? '€'.repeat(lvl) : null);

/** "Club", "Jazz club"… from a raw venueType; falls back to the raw string. */
export function venueTypeLabel(venueType: string | null | undefined, t: TFunction): string | null {
  if (!venueType) return null;
  const slug = VENUE_TYPES.find((s) => venueTypeMatches(venueType, s));
  if (slug) return t(`discover.venueType.${slug}`);
  const v = venueType.replace(/_/g, ' ');
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/** Today's weekday in the Phase 4 convention (0 = Monday). */
export const todayIndex = (d: Date = new Date()): number => (d.getDay() + 6) % 7;

export function hoursForDay(hours: ReadonlyArray<VenueOpeningHours> | undefined, day: number): ReadonlyArray<VenueOpeningHours> {
  return (hours ?? []).filter((h) => h.day === day);
}

/**
 * Open status line, only when the server sends `openNow`:
 * "Open now · closes 02:00", "Closing soon · 00:00", "Closed".
 */
export function openStatus(v: Venue, t: TFunction, now: Date = new Date()): { label: string; tone: 'green' | 'orange' | 'muted' } | null {
  if (v.openNow == null) return null;
  if (!v.openNow) return { label: t('discover.place.closed'), tone: 'muted' };
  const closes = v.closesAt ? new Date(v.closesAt) : null;
  if (closes && !Number.isNaN(closes.getTime())) {
    const mins = (closes.getTime() - now.getTime()) / 60000;
    if (mins < 60) return { label: t('discover.place.closingSoon', { time: hhmm(closes) }), tone: 'orange' };
    return { label: t('discover.place.openCloses', { time: hhmm(closes) }), tone: 'green' };
  }
  return { label: t('discover.place.openNow'), tone: 'green' };
}

export function placeSeedFromVenue(v: Venue): PlaceSeed {
  return {
    id: v.id,
    venueId: v.id,
    name: v.name,
    source: 'goswing',
    category: v.venueType,
    address: [v.addressLine1, v.city].filter(Boolean).join(', ') || null,
    lat: v.lat,
    lng: v.lng,
  };
}

/** A place seed from an event's venue fields (event page → place page). */
export function placeSeedFromEvent(ev: Event, address?: string | null): PlaceSeed {
  return {
    id: ev.venueId ?? `event-venue-${String(ev.id)}`,
    venueId: ev.venueId ?? null,
    name: ev.venue,
    source: 'goswing',
    category: ev.venueType ?? null,
    address: address ?? ev.city ?? null,
    lat: ev.location?.lat ?? null,
    lng: ev.location?.lng ?? null,
  };
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function openDirections(p: { lat?: number | null; lng?: number | null; label: string; address?: string | null }): void {
  const label = encodeURIComponent(p.label);
  let url: string;
  if (p.lat != null && p.lng != null) {
    url =
      Platform.select({
        ios: `maps:0,0?q=${label}@${p.lat},${p.lng}`,
        android: `geo:${p.lat},${p.lng}?q=${p.lat},${p.lng}(${label})`,
        default: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`,
      }) ?? '';
  } else {
    const q = encodeURIComponent([p.label, p.address].filter(Boolean).join(', '));
    url = Platform.select({ ios: `maps:0,0?q=${q}`, default: `https://www.google.com/maps/search/?api=1&query=${q}` }) ?? '';
  }
  Linking.openURL(url).catch(() => {});
}

/**
 * System share sheet (copy, messages…). There is no public web page for
 * events/places yet, so the shared text carries the details; add the link here
 * once public pages exist.
 */
export async function shareText(title: string, lines: ReadonlyArray<string | null | undefined>): Promise<void> {
  const message = [title, ...lines].filter(Boolean).join('\n');
  try {
    await Share.share({ message, title });
  } catch {
    // cancelled
  }
}

/** Plain text from the HTML descriptions the API returns. */
export function plainText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
