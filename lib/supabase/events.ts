// src/lib/supabase/events.ts
import type { Event, ID } from '@/types/domain';
import { supabase } from '@/lib/supabase';

type TagType = 'category' | 'access' | 'music' | 'party';

type DbTag = {
  type: TagType | string | null;
  slug: string | null;
};

type DbEventTagRow = {
  tags: DbTag | null;
};

type DbVenue = {
  name: string | null;
  city: string | null;
  country_code: string | null;
  lat: number | string | null;
  lng: number | string | null;
  venue_type: string | null;
};

type DbOrganizer = {
  name: string | null;
};

type DbEventRow = {
  id: string;
  external_id: string | null;
  title: string | null;
  hero_image_url: string | null;
  starts_at: string | null;
  status: string | null;

  is_free: boolean | null;
  min_price_cents: number | null;

  organizers: DbOrganizer | null;
  venues: DbVenue | null;
  event_tags: DbEventTagRow[] | null;
};

function computePriceLabel(isFree: boolean, minPriceCents: number | null): string {
  if (isFree || (minPriceCents ?? 0) === 0) return 'Free';
  const dollars = (minPriceCents ?? 0) / 100;
  return `From $${Math.round(dollars)}`;
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function mapRowToEvent(row: DbEventRow): Event {
  const venue = row.venues ?? null;

  const tags: DbTag[] = (row.event_tags ?? [])
    .map((et) => et?.tags ?? null)
    .filter((t): t is DbTag => Boolean(t));

  const categoriesFromTags = tags
    .filter((t) => t.type === 'category' && t.slug)
    .map((t) => String(t.slug));

  const accessFromTags = tags
    .filter((t) => t.type === 'access' && t.slug)
    .map((t) => String(t.slug)) as Array<'free' | 'free_ladies'>;

  const musicFromTags = tags
    .filter((t) => t.type === 'music' && t.slug)
    .map((t) => String(t.slug));

  const partyFromTags = tags
    .filter((t) => t.type === 'party' && t.slug)
    .map((t) => String(t.slug));

  const lat = toNumberOrNull(venue?.lat);
  const lng = toNumberOrNull(venue?.lng);

  const minPriceCents = (row.min_price_cents as number | null) ?? 0;

  return {
    // IMPORTANT: UI id is external_id if present (e.g. "evt_005"), otherwise uuid
    // IMPORTANT: Use DB UUID for all relational writes/reads (favorites, reservations, etc.)
    id: String(row.id) as ID,
    externalId: row.external_id ?? undefined,

    title: String(row.title ?? ''),
    organizer: String(row.organizers?.name ?? ''),
    imageUrl: String(row.hero_image_url ?? ''),
    startsAtIso: row.starts_at ? new Date(row.starts_at).toISOString() : new Date().toISOString(),

    venue: String(venue?.name ?? ''),
    city: venue?.city ?? undefined,
    countryCode: venue?.country_code ?? undefined,
    location: lat != null && lng != null ? { lat, lng } : undefined,

    venueType: venue?.venue_type ?? undefined,
    categories: categoriesFromTags,
    access: accessFromTags,
    musicStyles: musicFromTags,
    partyTypes: partyFromTags,

    basePrice: minPriceCents / 100,
    priceLabel: computePriceLabel(Boolean(row.is_free), minPriceCents),

    favorite: false,
    attendees: [],
    attendeesExtraCount: 0,
  } satisfies Event;
}

export async function getPublishedEvents(): Promise<ReadonlyArray<Event>> {
  const { data, error } = await supabase
    .from('events')
    .select(
      `
      id,
      external_id,
      title,
      hero_image_url,
      starts_at,
      status,
      is_free,
      min_price_cents,
      organizers:organizer_id ( name ),
      venues:venue_id ( name, city, country_code, lat, lng, venue_type ),
      event_tags ( tags:tag_id ( type, slug ) )
    `
    )
    .eq('status', 'published')
    .order('starts_at', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as DbEventRow[];
  return rows.map(mapRowToEvent);
}

/* ---------------------------------------------
   Ticket types (Reservations UI)
---------------------------------------------- */

export type TicketType = Readonly<{
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  inventory?: number | null; // we use capacity as inventory
  benefits?: ReadonlyArray<string> | null;
}>;

type DbTicketTypeRow = {
  id: string;
  event_id: string | null;
  name: string | null;
  description: string | null;
  price_cents: number | null;
  currency: string | null;
  benefits: unknown;
  capacity: number | null;
  sales_start_at: string | null;
  sales_end_at: string | null;
  created_at: string | null;
};

async function resolveEventDbId(eventUiId: string): Promise<string | null> {
  const key = String(eventUiId);

  if (isUuid(key)) return key;


  const { data, error } = await supabase
    .from('events')
    .select('id')
    .eq('external_id', key)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

function parseBenefits(v: unknown): ReadonlyArray<string> | null {
  if (Array.isArray(v)) return v.map(String);

  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;

    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed.map(String) : null;
      } catch {
        return null;
      }
    }

    if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean);
  }

  return null;
}

function isWithinSalesWindow(row: DbTicketTypeRow): boolean {
  const now = Date.now();
  const startOk = row.sales_start_at ? new Date(row.sales_start_at).getTime() <= now : true;
  const endOk = row.sales_end_at ? new Date(row.sales_end_at).getTime() >= now : true;
  return startOk && endOk;
}

export async function getTicketTypesForEvent(eventUiId: string): Promise<ReadonlyArray<TicketType>> {
  const eventDbId = await resolveEventDbId(eventUiId);
  if (!eventDbId) return [];

  const { data, error } = await supabase
    .from('ticket_types')
    .select('id,event_id,name,description,price_cents,currency,benefits,capacity,sales_start_at,sales_end_at,created_at')
    .eq('event_id', eventDbId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as DbTicketTypeRow[];

  return rows
    .filter(isWithinSalesWindow)
    .map((r) => {
      const currency = String(r.currency ?? 'USD').toUpperCase();
      return {
        id: String(r.id),
        name: String(r.name ?? 'Ticket'),
        description: r.description ?? null,
        priceCents: typeof r.price_cents === 'number' && Number.isFinite(r.price_cents) ? r.price_cents : 0,
        currency,
        inventory: r.capacity == null ? null : r.capacity,
        benefits: parseBenefits(r.benefits),
      } satisfies TicketType;
    });
}
