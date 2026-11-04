// utils/filters.ts
import type { Event } from '@/types/domain';
import type { FiltersPayload } from '@/components/filters/FiltersDrawer';

function safeLower(s: unknown): string {
  return typeof s === 'string' ? s.toLowerCase() : '';
}

function safeDate(iso: unknown): Date | null {
  if (typeof iso !== 'string' || !iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function applyFiltersToEvents(
  events: ReadonlyArray<Event>,
  query: string,
  activeCategories: ReadonlyArray<string>,
  filters?: Partial<FiltersPayload>
): ReadonlyArray<Event> {
  const q = query.trim().toLowerCase();
  let rows = [...events];

  if (q) {
    rows = rows.filter((e) => {
      const inTitle = safeLower(e.title).includes(q);
      const inOrg = safeLower(e.organizer).includes(q);
      const inVenue = safeLower(e.venue).includes(q);
      const inCity = safeLower(e.city ?? '').includes(q);
      return inTitle || inOrg || inVenue || inCity;
    });
  }

  if (activeCategories.length > 0) {
    rows = rows.filter((e) => (e.categories ?? []).some((c) => activeCategories.includes(c)));
  }

  if (filters) {
    const { dateQuick, venueTypes, musicStyles, partyTypes, access, sortBy } = filters;

    if (dateQuick && dateQuick !== 'any') {
      const now = new Date();

      rows = rows.filter((e) => {
        const d = safeDate(e.startsAtIso);
        if (!d) return false;

        switch (dateQuick) {
          case 'today':
            return sameDay(d, now);

          case 'tonight':
            return sameDay(d, now) && d >= now;

          case 'tomorrow': {
            const t = new Date(now);
            t.setDate(now.getDate() + 1);
            return sameDay(d, t);
          }

          case 'this_week': {
            const start = startOfWeek(now);
            const end = endOfWeek(now);
            return d >= start && d <= end;
          }

          case 'this_weekend': {
            const { sat, sunEnd } = weekendRange(now);
            return d >= sat && d <= sunEnd;
          }

          case 'next_week': {
            const nextWeekDay = new Date(now);
            nextWeekDay.setDate(now.getDate() + 7);
            return d >= startOfWeek(nextWeekDay) && d <= endOfWeek(nextWeekDay);
          }

          case 'next_weekend': {
            const nextWeekDay = new Date(now);
            nextWeekDay.setDate(now.getDate() + 7);
            const { sat, sunEnd } = weekendRange(nextWeekDay);
            return d >= sat && d <= sunEnd;
          }

          case 'this_month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            return d >= start && d <= end;
          }

          case 'pick':
          default:
            return true;
        }
      });
    }

    if (venueTypes && venueTypes.length > 0) {
      rows = rows.filter((e) => Boolean(e.venueType) && venueTypes.includes(String(e.venueType)));
    }

    if (musicStyles && musicStyles.length > 0) {
      rows = rows.filter((e) => {
        const ms = e.musicStyles ?? [];
        return ms.some((m) => musicStyles.includes(m));
      });
    }

    if (partyTypes && partyTypes.length > 0) {
      rows = rows.filter((e) => {
        const pt = e.partyTypes ?? [];
        return pt.some((p) => partyTypes.includes(p));
      });
    }

    if (access && access.length > 0) {
      rows = rows.filter((e) => {
        const acc = e.access ?? [];
        // OR semantics: match if event contains ANY selected access
        return access.some((a) => acc.includes(a));
      });
    }

    if (sortBy) {
      rows = [...sortResults(rows, sortBy)];
    }
  }

  return rows;
}

export function sortResults(
  rows: ReadonlyArray<Event>,
  sortBy: FiltersPayload['sortBy']
): ReadonlyArray<Event> {
  const out = [...rows];

  switch (sortBy) {
    case 'date':
      out.sort((a, b) => {
        const da = safeDate(a.startsAtIso)?.getTime() ?? Infinity;
        const db = safeDate(b.startsAtIso)?.getTime() ?? Infinity;
        return da - db;
      });
      break;

    case 'price':
      out.sort((a, b) => (a.basePrice ?? Infinity) - (b.basePrice ?? Infinity));
      break;

    case 'best':
    default:
      out.sort((a, b) => {
        const favDelta = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite));
        if (favDelta !== 0) return favDelta;

        const da = safeDate(a.startsAtIso)?.getTime() ?? Infinity;
        const db = safeDate(b.startsAtIso)?.getTime() ?? Infinity;
        return da - db;
      });
      break;
  }

  return out;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day + 6) % 7; // Monday-start week
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - diff);
  return x;
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function weekendRange(d: Date): { sat: Date; sunEnd: Date } {
  const s = startOfWeek(d);
  const sat = new Date(s);
  sat.setDate(s.getDate() + 5);
  sat.setHours(0, 0, 0, 0);

  const sunEnd = new Date(sat);
  sunEnd.setDate(sat.getDate() + 1);
  sunEnd.setHours(23, 59, 59, 999);

  return { sat, sunEnd };
}
