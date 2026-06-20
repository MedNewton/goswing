// src/lib/supabase/reservationDetails.ts
import { supabase } from '@/lib/supabase';
import { buildTicketQr } from '@/lib/qr/ticketQr';

export type ReservationTicketDetails = Readonly<{
  id: string;

  ticketLabel: string; // "Ticket #1"
  ticketTypeLabel: string; // "Early Bird"
  priceLabel: string; // "$60"

  holderName: string;
  holderEmail: string;

  qrValue: string; // raw value encoded in QR
  qrCaption?: string | null; // shown under QR

  included?: ReadonlyArray<string>;
}>;

export type ReservationDetails = Readonly<{
  id: string;

  statusLabel: string; // "Confirmed"
  ticketsCountLabel: string; // "3 tickets"

  eventTitle: string;
  dateLabel: string;
  timeLabel: string;
  venueLabel: string;
  eventStartsAt: string | null; // ISO date string for calendar functionality

  orderDateLabel: string;
  totalTicketsNumber: number;
  totalAmountLabel: string;

  tickets: ReadonlyArray<ReservationTicketDetails>;
}>;

/* ---------------------------------------------
   DB row types (PostgREST nested)
---------------------------------------------- */

type DbVenue = Readonly<{
  name: string | null;
  city: string | null;
}>;

type DbEvent = Readonly<{
  id: string;
  title: string | null;
  starts_at: string | null;
  venues: DbVenue | null;
}>;

type DbTicketType = Readonly<{
  id: string;
  name: string | null;
  benefits: unknown; // json or text
}>;

type DbReservationItem = Readonly<{
  id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price_cents: number;
  ticket_type_name_snapshot: string | null;

  // join
  ticket_type: DbTicketType | null;
}>;

type DbTicket = Readonly<{
  id: string;
  reservation_item_id: string;
  ticket_no: number;
  ticket_code: string | null;
  ticket_type_name_snapshot: string | null;
}>;

type DbTicketHolder = Readonly<{
  id: string;
  ticket_id: string;
  first_name: string | null;
  last_name: string | null;

  // optional — if your table doesn’t have it, it will be undefined at runtime
  email?: string | null;
}>;

type DbReservationRow = Readonly<{
  id: string;

  status: string | null;
  ordered_at: string | null;
  currency: string | null;

  total_amount_cents: number | null;

  event: DbEvent | null;
  items: DbReservationItem[] | null;
  tickets: DbTicket[] | null;
  holders: DbTicketHolder[] | null;
}>;

/* ---------------------------------------------
   Helpers
---------------------------------------------- */

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

function formatDateLabel(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '-';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTimeLabel(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '-';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return n === 1 ? singular : plural;
}

function normalizeStatusLabel(status: string | null): string {
  const s = safeTrim(status).toLowerCase();
  if (!s) return 'Confirmed';

  if (s === 'confirmed' || s === 'paid') return 'Confirmed';
  if (s === 'pending') return 'Pending';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  if (s === 'refunded') return 'Refunded';

  // fallback: Title Case
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseBenefits(v: unknown): ReadonlyArray<string> {
  if (Array.isArray(v)) return v.map(String).map((x) => x.trim()).filter(Boolean);

  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed.map(String).map((x) => x.trim()).filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean);
    return [s];
  }

  if (v && typeof v === 'object') {
    // sometimes jsonb can be returned as object; treat as empty
    return [];
  }

  return [];
}

/* ---------------------------------------------
   Public API
---------------------------------------------- */

/**
 * Fetch a single reservation with event + items + tickets + holders.
 * Assumes RLS/JWT already scopes to current user. If you don't use RLS yet,
 * this still works but you must ensure your client is allowed to read it.
 */
export async function getReservationDetails(params: {
  reservationId: string;
}): Promise<ReservationDetails> {
  const { reservationId } = params;

  const { data, error } = await supabase
    .from('reservations')
    .select(
      `
      id,
      status,
      ordered_at,
      currency,
      total_amount_cents,

      event:events (
        id,
        title,
        starts_at,
        venues:venue_id ( name, city )
      ),

      items:reservation_items (
        id,
        ticket_type_id,
        quantity,
        unit_price_cents,
        ticket_type_name_snapshot,
        ticket_type:ticket_types ( id, name, benefits )
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
        last_name,
        email
      )
    `,
    )
    .eq('id', reservationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Reservation not found.');

  const row = data as unknown as DbReservationRow;

  const currency = safeTrim(row.currency).toUpperCase() || 'USD';
  const totalCents = clampInt(row.total_amount_cents, 0, Number.MAX_SAFE_INTEGER);

  const event = row.event ?? null;
  const venue = event?.venues ?? null;

  const startsAt = event?.starts_at ?? null;

  const eventTitle = safeTrim(event?.title) || 'Event';
  const dateLabel = formatDateLabel(startsAt);
  const timeLabel = formatTimeLabel(startsAt);
  const venueLabel = [safeTrim(venue?.name), safeTrim(venue?.city)].filter(Boolean).join(', ') || '-';

  const orderedAt = row.ordered_at ?? null;
  const orderDateLabel = formatDateLabel(orderedAt);

  const tickets = (row.tickets ?? []).map((t) => ({
    id: String(t.id),
    reservationItemId: String(t.reservation_item_id),
    ticketNo: clampInt(t.ticket_no, 1, 999999),
    ticketCode: t.ticket_code ? String(t.ticket_code) : null,
    ticketTypeNameSnapshot: safeTrim(t.ticket_type_name_snapshot) || '',
  }));

  const items = (row.items ?? []).map((it) => ({
    id: String(it.id),
    ticketTypeId: String(it.ticket_type_id),
    quantity: clampInt(it.quantity, 0, 999),
    unitPriceCents: clampInt(it.unit_price_cents, 0, Number.MAX_SAFE_INTEGER),
    ticketTypeNameSnapshot: safeTrim(it.ticket_type_name_snapshot) || '',
    benefits: parseBenefits(it.ticket_type?.benefits),
    ticketTypeName: safeTrim(it.ticket_type?.name) || '',
  }));

  // holder map by ticket_id (IMPORTANT: holders.ticket_id refers to tickets.id)
  const holderByTicketId = new Map<string, { name: string; email: string }>();
  for (const h of row.holders ?? []) {
    const first = safeTrim(h.first_name);
    const last = safeTrim(h.last_name);
    const full = [first, last].filter(Boolean).join(' ').trim() || 'Ticket holder';
    const email = safeTrim((h as any)?.email) || '—';
    holderByTicketId.set(String(h.ticket_id), { name: full, email });
  }

  // Map benefits by reservation_item_id
  const benefitsByItemId = new Map<string, ReadonlyArray<string>>();
  for (const it of items) benefitsByItemId.set(it.id, it.benefits);

  // Helper: find item for ticket
  const itemById = new Map<string, (typeof items)[number]>();
  for (const it of items) itemById.set(it.id, it);

  // Build ticket cards (sorted by ticket_no)
  const ticketCards: ReservationTicketDetails[] = tickets
    .slice()
    .sort((a, b) => a.ticketNo - b.ticketNo)
    .map((t) => {
      const item = itemById.get(t.reservationItemId) ?? null;

      const typeLabel =
        safeTrim(t.ticketTypeNameSnapshot) ||
        safeTrim(item?.ticketTypeNameSnapshot) ||
        safeTrim(item?.ticketTypeName) ||
        'Ticket';

      const unitPriceCents = item?.unitPriceCents ?? 0;
      const priceLabel = formatMoneyCents(unitPriceCents, currency);

      const holder = holderByTicketId.get(t.id) ?? { name: 'Ticket holder', email: '—' };

      const { qrValue, qrCaption } = buildTicketQr({
        reservationId: String(row.id),
        ticketId: String(t.id),
        ticketNo: t.ticketNo,
        ticketCode: t.ticketCode,
      });

      const included = benefitsByItemId.get(t.reservationItemId) ?? [];

      return {
        id: t.id,
        ticketLabel: `Ticket #${t.ticketNo}`,
        ticketTypeLabel: typeLabel,
        priceLabel,
        holderName: holder.name,
        holderEmail: holder.email,
        qrValue,
        qrCaption,
        included,
      };
    });

  const totalTicketsNumber =
    ticketCards.length > 0
      ? ticketCards.length
      : items.reduce((acc, it) => acc + clampInt(it.quantity, 0, 999), 0);

  return {
    id: String(row.id),

    statusLabel: normalizeStatusLabel(row.status),
    ticketsCountLabel: `${totalTicketsNumber} ${pluralize(totalTicketsNumber, 'ticket')}`,

    eventTitle,
    dateLabel,
    timeLabel,
    venueLabel,
    eventStartsAt: startsAt,

    orderDateLabel,
    totalTicketsNumber,
    totalAmountLabel: formatMoneyCents(totalCents, currency),

    tickets: ticketCards,
  };
}
