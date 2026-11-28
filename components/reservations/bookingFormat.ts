// components/reservations/bookingFormat.ts — labels shared by the bookings UI.
import type { TFunction } from 'i18next';
import type { Event } from '@/types/domain';
import type { Booking } from '@/lib/api/bookings';
import { eventWhenLabel, formatCents, hhmm, shortDate } from '@/lib/format';

const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** English dates read "Thu 19 Nov" (day before month), as in the design. */
const dateLocale = (locale: string): string => (locale.startsWith('en') ? 'en-GB' : locale);

/** "Tonight · 23:00", "Thu 19 Nov · 19:00", "Live now · until 04:00". */
export function bookingWhen(b: Pick<Booking, 'startsAtIso' | 'endsAtIso'>, t: TFunction, locale: string): string {
  if (!b.startsAtIso) return '';
  return eventWhenLabel({ startsAtIso: b.startsAtIso, endsAtIso: b.endsAtIso } as unknown as Event, t, dateLocale(locale));
}

/** "Wed 18 Nov". */
export function bookingDate(iso: string | null | undefined, locale: string): string {
  const d = parse(iso);
  return d ? shortDate(d, dateLocale(locale)) : '—';
}

/** "19:00 – 01:00". */
export function bookingTimeRange(b: Pick<Booking, 'startsAtIso' | 'endsAtIso'>): string {
  const s = parse(b.startsAtIso);
  const e = parse(b.endsAtIso);
  if (!s) return '—';
  return e ? `${hhmm(s)} – ${hhmm(e)}` : hhmm(s);
}

export function money(cents: number, currency: string, locale: string): string {
  return formatCents(cents, currency, locale);
}

export function placeLine(b: Pick<Booking, 'venueName' | 'venueCity'>): string {
  return [b.venueName, b.venueCity].filter(Boolean).join(', ');
}

export { parse as parseIso, dateLocale };
