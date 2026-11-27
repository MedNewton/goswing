// lib/format.ts
// Shared formatting for the redesign: prices, distances, event timing labels.
import type { TFunction } from 'i18next';
import type { Event } from '@/types/domain';

export type LatLngInput = Readonly<{ latitude: number; longitude: number }>;

/** Great-circle distance in km. */
export function distanceKm(a: LatLngInput, b: LatLngInput): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "800 m" under 1 km, else "1.2 km". */
export function formatDistance(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function eventDistanceKm(ev: Event, origin: LatLngInput | null): number | null {
  if (!origin || !ev.location) return null;
  return distanceKm(origin, { latitude: ev.location.lat, longitude: ev.location.lng });
}

const CURRENCY_SYMBOL: Readonly<Record<string, string>> = { EUR: '€', USD: '$', GBP: '£', MAD: 'MAD' };

/** Whole amounts without decimals: "13 €", "45 MAD", "$12". */
export function formatMoney(amount: number, currency = 'EUR', locale = 'fr'): string {
  const symbol = CURRENCY_SYMBOL[currency.toUpperCase()] ?? currency.toUpperCase();
  const n = Number.isInteger(amount)
    ? String(amount)
    : amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (symbol === '$' || symbol === '£') return `${symbol}${n}`;
  return `${n} ${symbol}`;
}

export function formatCents(cents: number, currency = 'EUR', locale = 'fr'): string {
  return formatMoney(cents / 100, currency, locale);
}

/**
 * Lowest price of an event as a short label ("13 €", "Free"), or null.
 * The events API exposes `basePrice` (major units) and a legacy `priceLabel`.
 */
export function eventPriceLabel(ev: Event, t: TFunction): string | null {
  if (typeof ev.basePrice === 'number') {
    if (ev.basePrice <= 0) return t('gs.free');
    return formatMoney(ev.basePrice);
  }
  const label = ev.priceLabel?.trim();
  if (!label) return null;
  if (/^(free|gratuit|0)$/i.test(label)) return t('gs.free');
  return label;
}

export function eventStart(ev: Event): Date | null {
  const d = ev.startsAtIso ? new Date(ev.startsAtIso) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

/** End time; events without one are treated as lasting 4 hours. */
export function eventEnd(ev: Event): Date | null {
  const end = ev.endsAtIso ? new Date(ev.endsAtIso) : null;
  if (end && !Number.isNaN(end.getTime())) return end;
  const start = eventStart(ev);
  return start ? new Date(start.getTime() + 4 * 3600_000) : null;
}

export function isLiveNow(ev: Event, now: Date = new Date()): boolean {
  const s = eventStart(ev);
  const e = eventEnd(ev);
  return !!s && !!e && s <= now && now < e;
}

export function isPast(ev: Event, now: Date = new Date()): boolean {
  const e = eventEnd(ev);
  return !!e && e <= now;
}

const pad = (n: number): string => String(n).padStart(2, '0');
export const hhmm = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Thu 19 Nov" in the current language. */
export function shortDate(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
}

/**
 * Timing line used on cards and pins:
 * "Live now · until 04:00", "Tonight · 23:00", "Tomorrow · 19:00", "Thu 19 Nov · 19:00".
 */
export function eventWhenLabel(ev: Event, t: TFunction, locale: string, now: Date = new Date()): string {
  const s = eventStart(ev);
  if (!s) return '';
  if (isLiveNow(ev, now)) {
    const e = eventEnd(ev);
    return e ? t('gs.when.liveUntil', { time: hhmm(e) }) : t('gs.when.liveNow');
  }
  if (sameDay(s, now)) return t(s.getHours() >= 18 ? 'gs.when.tonight' : 'gs.when.today', { time: hhmm(s) });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(s, tomorrow)) return t('gs.when.tomorrow', { time: hhmm(s) });
  return `${shortDate(s, locale)} · ${hhmm(s)}`;
}

/** Compact counts: 512, 2.4k, 22k. */
export function compactCount(n: number | null | undefined): string {
  if (n == null) return '0';
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${Math.round(n / 1000)}k`;
}
