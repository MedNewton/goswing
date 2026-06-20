// src/lib/supabase/myReservations.ts
import { supabase } from '@/lib/supabase';
import { buildTicketQr } from '@/lib/qr/ticketQr';

export type MyReservationTicket = Readonly<{
  id: string;
  holder: string;
  qrLabel: string; // e.g. "#1"

  // NEW: stable QR payload
  qrValue: string;
  qrCaption?: string | null;
}>;

export type MyReservationGroup = Readonly<{
  id: string;
  title: string; // ticket type name
  subtitle: string; // e.g. "2 tickets • $60 each"
  tickets: ReadonlyArray<MyReservationTicket>;
}>;

export type MyReservation = Readonly<{
  id: string;

  title: string;
  ticketsBadge: string;

  dateLabel: string;
  timeLabel: string;
  venueLabel: string;

  totalAmount: string;

  groups: ReadonlyArray<MyReservationGroup>;
  savedBadge: string | null;

  // For internal sorting / tab split
  startsAtIso?: string | null;
  endsAtIso?: string | null;
}>;

export type MyReservationsResult = Readonly<{
  active: ReadonlyArray<MyReservation>;
  past: ReadonlyArray<MyReservation>;
}>;

type DbVenue = Readonly<{
  name: string | null;
  city: string | null;
}>;

type DbEvent = Readonly<{
  id: string;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venues: DbVenue | null;
}>;

type DbReservationItem = Readonly<{
  id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  ticket_type_name_snapshot: string;
}>;

type DbTicket = Readonly<{
  id: string;
  reservation_item_id: string;
  ticket_no: number;
  ticket_code: string | null;
  ticket_type_name_snapshot: string;
}>;

type DbTicketHolder = Readonly<{
  id: string;
  ticket_id: string;
  first_name: string;
  last_name: string;
}>;

type DbReservationRow = Readonly<{
  id: string;

  status: string;
  ordered_at: string;
  currency: string;

  total_amount_cents: number;
  savings_cents: number;

  event: DbEvent | null;
  items: DbReservationItem[] | null;
  tickets: DbTicket[] | null;
  holders: DbTicketHolder[] | null;
}>;

function safeTrim(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function clampInt(n: unknown, min: number, max: number): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

function formatMoneyCents(cents: number, currency: string): string {
  const cur = safeTrim(currency).toUpperCase() || 'USD';
  const amount = cents / 100;

  if (cur === 'EUR') return `€${Math.round(amount)}`;
  if (cur === 'USD') return `$${Math.round(amount)}`;
  return `${Math.round(amount)} ${cur}`;
}

function formatDateTime(iso?: string | null): { dateLabel: string; timeLabel: string } {
  const d = iso ? new Date(iso) : new Date(NaN);
  if (!Number.isFinite(d.getTime())) return { dateLabel: '-', timeLabel: '-' };

  const dateLabel = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return { dateLabel, timeLabel };
}

function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return n === 1 ? singular : plural;
}

function buildTicketsBadge(totalTickets: number): string {
  return `${totalTickets} ${pluralize(totalTickets, 'ticket')}`;
}

function buildVenueLabel(venueName: string, city?: string | null): string {
  const v = safeTrim(venueName);
  const c = safeTrim(city);
  if (v && c) return `${v}, ${c}`;
  return v || c || '-';
}

function groupSubtitle(quantity: number, unitPriceCents: number, currency: string): string {
  const qty = Math.max(0, quantity);
  const unit = formatMoneyCents(unitPriceCents, currency);
  return `${qty} ${pluralize(qty, 'ticket')} • ${unit} each`;
}

/**
 * Fetches reservations for the currently-authenticated user (RLS expected).
 * Splits into:
 * - Active: upcoming OR ongoing
 * - Past: started AND ended (requires ends_at)
 */
export async function getMyReservations(): Promise<MyReservationsResult> {
  const { data, error } = await supabase
    .from('reservations')
    .select(
      `
      id,
      status,
      ordered_at,
      currency,
      total_amount_cents,
      savings_cents,

      event:events (
        id,
        title,
        starts_at,
        ends_at,
        venues:venue_id ( name, city )
      ),

      items:reservation_items (
        id,
        ticket_type_id,
        quantity,
        unit_price_cents,
        line_total_cents,
        ticket_type_name_snapshot
      ),

      tickets:tickets (
        id,
        reservation_item_id,
        ticket_no,
        ticket_code,
        ticket_type_name_snapshot
      ),

      holders:ticket_holders (
        id,
        ticket_id,
        first_name,
        last_name
      )
    `
    )
    .order('ordered_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as DbReservationRow[];

  const now = Date.now();

  const mapped: MyReservation[] = rows.map((r) => {
    const reservationId = String(r.id);

    const event = r.event ?? null;
    const venue = event?.venues ?? null;

    const currency = safeTrim(r.currency).toUpperCase() || 'USD';
    const totalCents = clampInt(r.total_amount_cents, 0, Number.MAX_SAFE_INTEGER);
    const savingsCents = clampInt(r.savings_cents, 0, Number.MAX_SAFE_INTEGER);

    const startsAtIso = event?.starts_at ?? null;
    const endsAtIso = event?.ends_at ?? null;

    const { dateLabel, timeLabel } = formatDateTime(startsAtIso);

    const items = (r.items ?? []).map((it) => ({
      id: String(it.id),
      ticketTypeId: String(it.ticket_type_id),
      quantity: clampInt(it.quantity, 0, 999),
      unitPriceCents: clampInt(it.unit_price_cents, 0, Number.MAX_SAFE_INTEGER),
      lineTotalCents: clampInt(it.line_total_cents, 0, Number.MAX_SAFE_INTEGER),
      name: safeTrim(it.ticket_type_name_snapshot) || 'Ticket',
    }));

    const tickets = (r.tickets ?? []).map((t) => ({
      id: String(t.id),
      reservationItemId: String(t.reservation_item_id),
      ticketNo: clampInt(t.ticket_no, 1, 999999),
      ticketCode: t.ticket_code ? String(t.ticket_code) : null,
      ticketTypeNameSnapshot: safeTrim(t.ticket_type_name_snapshot) || 'Ticket',
    }));

    const holderByTicketId = new Map<string, string>();
    for (const h of r.holders ?? []) {
      const first = safeTrim(h.first_name);
      const last = safeTrim(h.last_name);
      const full = [first, last].filter(Boolean).join(' ').trim();
      holderByTicketId.set(String(h.ticket_id), full || 'Ticket holder');
    }

    const totalTickets =
      tickets.length > 0
        ? tickets.length
        : items.reduce((acc, it) => acc + clampInt(it.quantity, 0, 999), 0);

    const groups: MyReservationGroup[] =
      items.length > 0
        ? items.map((it) => {
            const groupTickets = tickets
              .filter((t) => t.reservationItemId === it.id)
              .sort((a, b) => a.ticketNo - b.ticketNo)
              .map<MyReservationTicket>((t) => {
                const { qrValue, qrCaption } = buildTicketQr({
                  reservationId,
                  ticketId: String(t.id),
                  ticketNo: t.ticketNo,
                  ticketCode: t.ticketCode,
                });

                return {
                  id: t.id,
                  holder: holderByTicketId.get(t.id) ?? 'Ticket holder',
                  qrLabel: `#${t.ticketNo}`,
                  qrValue,
                  qrCaption,
                };
              });

            return {
              id: it.id,
              title: it.name,
              subtitle: groupSubtitle(it.quantity, it.unitPriceCents, currency),
              tickets: groupTickets,
            };
          })
        : [];

    const savedBadge = savingsCents > 0 ? `Saved ${formatMoneyCents(savingsCents, currency)}` : null;

    return {
      id: reservationId,
      title: safeTrim(event?.title) || 'Event',
      ticketsBadge: buildTicketsBadge(totalTickets),
      dateLabel,
      timeLabel,
      venueLabel: buildVenueLabel(safeTrim(venue?.name), venue?.city),
      totalAmount: formatMoneyCents(totalCents, currency),
      groups,
      savedBadge,
      startsAtIso,
      endsAtIso,
    };
  });

  const active: MyReservation[] = [];
  const past: MyReservation[] = [];

  for (const r of mapped) {
    const startIso = r.startsAtIso;
    const endIso = r.endsAtIso;

    const startMs = startIso ? new Date(startIso).getTime() : NaN;
    const endMs = endIso ? new Date(endIso).getTime() : NaN;

    if (!Number.isFinite(startMs)) {
      active.push(r);
      continue;
    }

    if (now < startMs) {
      active.push(r);
      continue;
    }

    if (Number.isFinite(endMs)) {
      if (endMs <= now) past.push(r);
      else active.push(r);
      continue;
    }

    active.push(r);
  }

  active.sort((a, b) => {
    const am = a.startsAtIso ? new Date(a.startsAtIso).getTime() : Number.POSITIVE_INFINITY;
    const bm = b.startsAtIso ? new Date(b.startsAtIso).getTime() : Number.POSITIVE_INFINITY;
    return am - bm;
  });

  past.sort((a, b) => {
    const am = a.startsAtIso ? new Date(a.startsAtIso).getTime() : 0;
    const bm = b.startsAtIso ? new Date(b.startsAtIso).getTime() : 0;
    return bm - am;
  });

  return { active, past };
}
