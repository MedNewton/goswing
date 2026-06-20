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
  description: string | null;
  postal_code: string | null;
  capacity: number | null;
  free_access: boolean | null;
  free_for_ladies: boolean | null;
};

type DbOrganizer = {
  id: string | null;
  name: string | null;
};

type DbEventRow = {
  id: string;
  external_id: string | null;
  organizer_id: string | null;
  venue_id: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  hero_image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string | null;

  is_free: boolean | null;
  min_price_cents: number | null;
  attendee_count: number | null;
  waitlist_enabled: boolean | null;
  approval_mode: string | null;
  sharing_enabled: boolean | null;
  policies: unknown;

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
    description: row.description ?? null,
    organizer: String(row.organizers?.name ?? ''),
    organizerId: row.organizer_id ?? row.organizers?.id ?? undefined,
    imageUrl: String(row.hero_image_url ?? ''),
    startsAtIso: row.starts_at ? new Date(row.starts_at).toISOString() : new Date().toISOString(),

    venue: String(venue?.name ?? ''),
    venueId: row.venue_id ?? undefined,
    category: row.category ?? null,
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
    attendeesExtraCount: row.attendee_count ?? 0,

    endsAtIso: row.ends_at ?? null,
    attendeeCount: row.attendee_count ?? 0,
    waitlistEnabled: Boolean(row.waitlist_enabled),
    approvalMode: row.approval_mode ?? undefined,
    sharingEnabled: row.sharing_enabled == null ? true : Boolean(row.sharing_enabled),
    policies: Array.isArray(row.policies) ? (row.policies as unknown[]) : [],
  } satisfies Event;
}

export async function getPublishedEvents(): Promise<ReadonlyArray<Event>> {
  const { data, error } = await supabase
    .from('events')
    .select(
      `
      id,
      external_id,
      organizer_id,
      venue_id,
      title,
      description,
      category,
      hero_image_url,
      starts_at,
      ends_at,
      status,
      is_free,
      min_price_cents,
      attendee_count,
      waitlist_enabled,
      approval_mode,
      sharing_enabled,
      policies,
      organizers:organizer_id ( id, name ),
      venues:venue_id ( name, city, country_code, lat, lng, venue_type, description, postal_code, capacity, free_access, free_for_ladies ),
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
  isFree?: boolean;
  freeForLadies?: boolean;
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
  is_free: boolean | null;
  free_for_ladies: boolean | null;
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
    .select('id,event_id,name,description,price_cents,currency,benefits,capacity,sales_start_at,sales_end_at,created_at,is_free,free_for_ladies')
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
        isFree: Boolean(r.is_free),
        freeForLadies: Boolean(r.free_for_ladies),
      } satisfies TicketType;
    });
}

/* ---------------------------------------------
   Single event detail (enables pickDetailsFetcher)
---------------------------------------------- */

const EVENT_DETAIL_SELECT = `
  id,
  external_id,
  organizer_id,
  venue_id,
  title,
  description,
  category,
  hero_image_url,
  starts_at,
  ends_at,
  status,
  is_free,
  min_price_cents,
  attendee_count,
  waitlist_enabled,
  approval_mode,
  sharing_enabled,
  policies,
  organizers:organizer_id ( id, name ),
  venues:venue_id ( name, city, country_code, lat, lng, venue_type, description, postal_code, capacity, free_access, free_for_ladies ),
  event_tags ( tags:tag_id ( type, slug ) )
`;

export async function getEventDetailsById(eventUiId: string): Promise<Event> {
  const dbId = await resolveEventDbId(eventUiId);
  if (!dbId) throw new Error('Event not found');

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_DETAIL_SELECT)
    .eq('id', dbId)
    .single();

  if (error) throw new Error(error.message);
  return mapRowToEvent(data as unknown as DbEventRow);
}

/* ---------------------------------------------
   Events by same organizer (for "More from ...")
---------------------------------------------- */

export type MiniEventRow = Readonly<{
  id: string;
  title: string;
  imageUrl: string | null;
  startsAtIso: string | null;
  priceLabel: string | null;
}>;

export async function getEventsByOrganizer(
  organizerId: string,
  excludeEventId?: string,
  limit = 5,
): Promise<ReadonlyArray<MiniEventRow>> {
  let query = supabase
    .from('events')
    .select('id, title, hero_image_url, starts_at, is_free, min_price_cents')
    .eq('organizer_id', organizerId)
    .eq('status', 'published')
    .order('starts_at', { ascending: true })
    .limit(limit + 1);

  if (excludeEventId) {
    query = query.neq('id', excludeEventId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).slice(0, limit).map((r: any) => ({
    id: String(r.id),
    title: String(r.title ?? ''),
    imageUrl: r.hero_image_url ?? null,
    startsAtIso: r.starts_at ? new Date(r.starts_at).toISOString() : null,
    priceLabel: computePriceLabel(Boolean(r.is_free), r.min_price_cents ?? 0),
  }));
}

/* ---------------------------------------------
   Similar events (same category or shared tags)
---------------------------------------------- */

export async function getSimilarEvents(
  eventId: string,
  category: string | null | undefined,
  limit = 5,
): Promise<ReadonlyArray<MiniEventRow>> {
  // Try category match first
  if (category) {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, hero_image_url, starts_at, is_free, min_price_cents')
      .eq('status', 'published')
      .eq('category', category)
      .neq('id', eventId)
      .order('starts_at', { ascending: true })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data.map((r: any) => ({
        id: String(r.id),
        title: String(r.title ?? ''),
        imageUrl: r.hero_image_url ?? null,
        startsAtIso: r.starts_at ? new Date(r.starts_at).toISOString() : null,
        priceLabel: computePriceLabel(Boolean(r.is_free), r.min_price_cents ?? 0),
      }));
    }
  }

  // Fallback: find events sharing the same tags
  const { data: tagRows } = await supabase
    .from('event_tags')
    .select('tag_id')
    .eq('event_id', eventId);

  const tagIds = (tagRows ?? []).map((r: any) => r.tag_id);
  if (tagIds.length === 0) return [];

  const { data: matchingEventTags } = await supabase
    .from('event_tags')
    .select('event_id')
    .in('tag_id', tagIds)
    .neq('event_id', eventId);

  const eventIds = [...new Set((matchingEventTags ?? []).map((r: any) => r.event_id))];
  if (eventIds.length === 0) return [];

  const { data, error } = await supabase
    .from('events')
    .select('id, title, hero_image_url, starts_at, is_free, min_price_cents')
    .eq('status', 'published')
    .in('id', eventIds.slice(0, limit))
    .order('starts_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    title: String(r.title ?? ''),
    imageUrl: r.hero_image_url ?? null,
    startsAtIso: r.starts_at ? new Date(r.starts_at).toISOString() : null,
    priceLabel: computePriceLabel(Boolean(r.is_free), r.min_price_cents ?? 0),
  }));
}

/* ---------------------------------------------
   Upcoming events from same venue or organizer
---------------------------------------------- */

export async function getUpcomingEventsByVenueOrOrganizer(
  venueId: string | undefined,
  organizerId: string | undefined,
  excludeEventId?: string,
  limit = 20,
): Promise<ReadonlyArray<MiniEventRow & { venue?: string | null }>> {
  const now = new Date().toISOString();

  // Fetch from venue and organizer in parallel, then merge
  const promises: Array<Promise<any[]>> = [];

  if (venueId) {
    let q = supabase
      .from('events')
      .select('id, title, hero_image_url, starts_at, is_free, min_price_cents, venues:venue_id ( name )')
      .eq('status', 'published')
      .eq('venue_id', venueId)
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(limit);

    if (excludeEventId) q = q.neq('id', excludeEventId);
    promises.push(q.then(({ data }) => data ?? []));
  }

  if (organizerId) {
    let q = supabase
      .from('events')
      .select('id, title, hero_image_url, starts_at, is_free, min_price_cents, venues:venue_id ( name )')
      .eq('status', 'published')
      .eq('organizer_id', organizerId)
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(limit);

    if (excludeEventId) q = q.neq('id', excludeEventId);
    promises.push(q.then(({ data }) => data ?? []));
  }

  const results = await Promise.all(promises);
  const allRows = results.flat();

  // Deduplicate by id, keep earliest starts_at
  const seen = new Map<string, any>();
  for (const r of allRows) {
    if (!seen.has(r.id)) seen.set(r.id, r);
  }

  const deduped = [...seen.values()]
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, limit);

  return deduped.map((r: any) => ({
    id: String(r.id),
    title: String(r.title ?? ''),
    imageUrl: r.hero_image_url ?? null,
    startsAtIso: r.starts_at ? new Date(r.starts_at).toISOString() : null,
    priceLabel: computePriceLabel(Boolean(r.is_free), r.min_price_cents ?? 0),
    venue: (r.venues as any)?.name ?? null,
  }));
}

/* ── Event attendees (users with confirmed reservations) ── */

export type EventAttendee = Readonly<{
  userId: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
}>;

export async function getEventAttendees(
  eventId: string,
  limit = 20,
): Promise<{ attendees: EventAttendee[]; totalCount: number }> {
  // Get distinct user_ids with confirmed reservations for this event
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      user_id,
      profiles!inner ( display_name, initials, avatar_url )
    `)
    .eq('event_id', eventId)
    .in('status', ['confirmed', 'completed'])
    .limit(limit);

  if (error) throw new Error(error.message);

  // Count total
  const { count } = await supabase
    .from('reservations')
    .select('user_id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .in('status', ['confirmed', 'completed']);

  // Deduplicate by user_id
  const seen = new Set<string>();
  const attendees: EventAttendee[] = [];

  for (const row of data ?? []) {
    const uid = String((row as any).user_id);
    if (seen.has(uid)) continue;
    seen.add(uid);

    const p = (row as any).profiles;
    const displayName = String(p?.display_name ?? '').trim() || 'Attendee';
    const initials = String(p?.initials ?? '').trim() ||
      displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    attendees.push({
      userId: uid,
      displayName,
      initials,
      avatarUrl: p?.avatar_url ?? null,
    });
  }

  return { attendees, totalCount: count ?? attendees.length };
}
