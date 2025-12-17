// utils/filters.ts
import type { Event } from '@/types/domain';
import type { FiltersPayload } from '@/components/filters/FiltersDrawer';

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
      const inTitle = e.title.toLowerCase().includes(q);
      const inOrg = e.organizer.toLowerCase().includes(q);
      const inVenue = e.venue.toLowerCase().includes(q);
      const inCity = (e.city ?? '').toLowerCase().includes(q);
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
        const d = new Date(e.startsAtIso);
        switch (dateQuick) {
          case 'today':
            return sameDay(d, now);
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
          case 'this_month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            return d >= start && d <= end;
          }
          case 'pick':
            return true;
          default:
            return true;
        }
      });
    }

    if (venueTypes && venueTypes.length > 0) {
      rows = rows.filter((e) => e.venueType && venueTypes.includes(e.venueType));
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
        return access.every((a) => acc.includes(a));
      });
    }

    if (sortBy) {
      rows = [...sortResults(rows, sortBy)];
    }
  }

  return rows;
}

export function sortResults(rows: ReadonlyArray<Event>, sortBy: FiltersPayload['sortBy']): ReadonlyArray<Event> {
  const out = [...rows];
  switch (sortBy) {
    case 'date':
      out.sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime());
      break;
    case 'price':
      out.sort((a, b) => (a.basePrice ?? Infinity) - (b.basePrice ?? Infinity));
      break;
    case 'best':
    default:
      // naive: favorite first, then sooner date
      out.sort((a, b) => {
        const favDelta = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite));
        if (favDelta !== 0) return favDelta;
        return new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime();
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
  const diff = (day + 6) % 7;
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
