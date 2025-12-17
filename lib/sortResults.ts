// src/utils/sortResults.ts
import type { SearchResultItem } from '@/components/ui/SearchResultCard';

export type SortBy = 'best' | 'date' | 'price';

function parsePriceFromLabel(label?: string | null): number | null {
  if (!label) return null;
  const m = label.replace(',', '.').match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export function sortResults(
  rows: ReadonlyArray<SearchResultItem>,
  q: string,
  sortBy: SortBy
): SearchResultItem[] {
  const next = [...rows];

  if (sortBy === 'date') {
    next.sort((a, b) => +new Date(a.startsAtIso ?? '') - +new Date(b.startsAtIso ?? ''));
    return next;
  }

  if (sortBy === 'price') {
    next.sort((a, b) => {
      const pa = parsePriceFromLabel(a.priceLabel);
      const pb = parsePriceFromLabel(b.priceLabel);
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1;
      if (pb == null) return -1;
      return pa - pb;
    });
    return next;
  }

  const ql = q.trim().toLowerCase();
  if (!ql) return next;

  const score = (r: SearchResultItem) => {
    let s = 0;
    if (r.title?.toLowerCase().includes(ql)) s += 3;
    if (r.organizer?.toLowerCase().includes(ql)) s += 2;
    if (r.venue && r.venue.toLowerCase().includes(ql)) s += 1;
    if (r.city && r.city.toLowerCase().includes(ql)) s += 1;
    return -s;
  };

  next.sort((a, b) => score(a) - score(b));
  return next;
}
