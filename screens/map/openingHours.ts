// screens/map/openingHours.ts — "open now / closes 02:00" from an OSM
// `opening_hours` string. Handles the common forms ("Mo-Sa 18:00-02:00;
// Su off", "24/7", "Tu-Th 12:00-14:30,19:00-23:00"); anything else is
// reported as unknown and the raw text is shown instead.

export type OpenState = Readonly<{
  state: 'open' | 'closed' | 'unknown';
  /** "02:00" when open. */
  closes?: string;
  /** True when it closes within the hour. */
  closingSoon?: boolean;
}>;

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

type Span = readonly [number, number]; // minutes from 00:00; end may exceed 1440

function parseDays(spec: string): ReadonlySet<number> | null {
  const out = new Set<number>();
  for (const part of spec.split(',')) {
    const m = part.trim().match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/);
    if (!m) return null;
    const a = DAYS.indexOf(m[1] as (typeof DAYS)[number]);
    const b = m[2] ? DAYS.indexOf(m[2] as (typeof DAYS)[number]) : a;
    for (let i = a; ; i = (i + 1) % 7) {
      out.add(i);
      if (i === b) break;
    }
  }
  return out;
}

function parseSpans(spec: string): ReadonlyArray<Span> | null {
  const out: Span[] = [];
  for (const part of spec.split(',')) {
    const m = part.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\+?$/);
    if (!m) return null;
    const a = Number(m[1]) * 60 + Number(m[2]);
    let b = Number(m[3]) * 60 + Number(m[4]);
    if (b <= a) b += 1440;
    out.push([a, b]);
  }
  return out;
}

/** Day index 0 = Monday … 6 = Sunday → its spans, or null when unparseable. */
function weekTable(raw: string): ReadonlyArray<ReadonlyArray<Span>> | null {
  const table: Span[][] = [[], [], [], [], [], [], []];
  const text = raw.trim();
  if (text === '24/7') return table.map(() => [[0, 1440]]);
  for (const ruleRaw of text.split(';')) {
    const rule = ruleRaw.trim();
    // Public / school holiday rules don't change a normal week.
    if (!rule || /^(PH|SH)\b/.test(rule)) continue;
    const m = rule.match(/^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?,?)+)?\s*(.*)$/);
    if (!m) return null;
    const days = m[1] ? parseDays(m[1].replace(/,$/, '')) : new Set([0, 1, 2, 3, 4, 5, 6]);
    if (!days) return null;
    const rest = (m[2] ?? '').trim();
    if (/^(off|closed)$/i.test(rest)) {
      days.forEach((d) => (table[d] = []));
      continue;
    }
    const spans = parseSpans(rest);
    if (!spans) return null;
    days.forEach((d) => (table[d] = [...spans]));
  }
  return table;
}

const fmt = (min: number): string => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export function openStateOf(raw: string | null | undefined, now: Date = new Date()): OpenState {
  if (!raw) return { state: 'unknown' };
  const table = weekTable(raw);
  if (!table) return { state: 'unknown' };
  const today = (now.getDay() + 6) % 7;
  const yesterday = (today + 6) % 7;
  const t = now.getHours() * 60 + now.getMinutes();
  const candidates: Span[] = [
    ...table[today].map(([a, b]) => [a, b] as Span),
    ...table[yesterday].filter(([, b]) => b > 1440).map(([a, b]) => [a - 1440, b - 1440] as Span),
  ];
  for (const [a, b] of candidates) {
    if (a <= t && t < b) {
      const closes = b >= 1440 * 2 - 1 || (a <= 0 && b >= 1440) ? undefined : fmt(b);
      return { state: 'open', closes, closingSoon: b - t <= 60 };
    }
  }
  return { state: 'closed' };
}
