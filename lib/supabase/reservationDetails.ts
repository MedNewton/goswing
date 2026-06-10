// lib/supabase/reservationDetails.ts
// Single reservation detail — backed by GET /v1/reservations/:id (route L.3).
// Labels are formatted client-side exactly as before.

import { buildTicketQr } from '@/lib/qr/ticketQr';
import * as reservationsApi from '@/lib/api/reservations';

export type ReservationTicketDetails = Readonly<{
  id: string;
  ticketLabel: string;
  ticketTypeLabel: string;
  priceLabel: string;
  holderName: string;
  holderEmail: string;
  qrValue: string;
  qrCaption?: string | null;
  included?: ReadonlyArray<string>;
}>;

export type ReservationDetails = Readonly<{
  id: string;
  statusLabel: string;
  ticketsCountLabel: string;
  eventTitle: string;
  dateLabel: string;
  timeLabel: string;
  venueLabel: string;
  eventStartsAt: string | null;
  orderDateLabel: string;
  totalTicketsNumber: number;
  totalAmountLabel: string;
  tickets: ReadonlyArray<ReservationTicketDetails>;
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

function normalizeStatusLabel(status: string | null | undefined): string {
  const s = safeTrim(status).toLowerCase();
  if (!s) return 'Confirmed';

  if (s === 'confirmed' || s === 'paid') return 'Confirmed';
  if (s === 'pending') return 'Pending';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  if (s === 'refunded') return 'Refunded';

  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function getReservationDetails(params: {
  reservationId: string;
}): Promise<ReservationDetails> {
  const row = await reservationsApi.getReservation(params.reservationId);

  const currency = safeTrim(row.currency).toUpperCase() || 'USD';
  const totalCents = clampInt(row.totalAmountCents, 0, Number.MAX_SAFE_INTEGER);

  const event = row.event ?? null;
  const startsAt = event?.startsAtIso ?? null;

  const eventTitle = safeTrim(event?.title) || 'Event';
  const venueLabel =
    [safeTrim(event?.venueName), safeTrim(event?.venueCity)].filter(Boolean).join(', ') || '-';

  const items = row.items ?? [];
  const tickets = row.tickets ?? [];

  const itemById = new Map(items.map((it) => [String(it.id), it]));

  const ticketCards: ReservationTicketDetails[] = tickets
    .slice()
    .sort((a, b) => clampInt(a.ticketNo, 0, 999999) - clampInt(b.ticketNo, 0, 999999))
    .map((t) => {
      const ticketNo = clampInt(t.ticketNo, 1, 999999);
      const item = itemById.get(String(t.reservationItemId ?? '')) ?? null;

      const typeLabel =
        safeTrim(t.ticketTypeName) || safeTrim(item?.ticketTypeName) || 'Ticket';

      const unitPriceCents = clampInt(
        t.unitPriceCents ?? item?.unitPriceCents,
        0,
        Number.MAX_SAFE_INTEGER,
      );

      const holderName =
        [safeTrim(t.holder?.firstName), safeTrim(t.holder?.lastName)]
          .filter(Boolean)
          .join(' ')
          .trim() || 'Ticket holder';
      const holderEmail = safeTrim(t.holder?.email) || '—';

      // Prefer the server-built QR payload; fall back to the local builder.
      const fallback = buildTicketQr({
        reservationId: String(row.id),
        ticketId: String(t.id),
        ticketNo,
        ticketCode: t.ticketCode ?? null,
      });

      return {
        id: String(t.id),
        ticketLabel: `Ticket #${ticketNo}`,
        ticketTypeLabel: typeLabel,
        priceLabel: formatMoneyCents(unitPriceCents, currency),
        holderName,
        holderEmail,
        qrValue: safeTrim(t.qrValue) || fallback.qrValue,
        qrCaption: t.qrCaption ?? fallback.qrCaption,
        included: (item?.benefits ?? []).map(String).map((x) => x.trim()).filter(Boolean),
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
    dateLabel: formatDateLabel(startsAt),
    timeLabel: formatTimeLabel(startsAt),
    venueLabel,
    eventStartsAt: startsAt,

    orderDateLabel: formatDateLabel(row.orderedAt ?? null),
    totalTicketsNumber,
    totalAmountLabel: formatMoneyCents(totalCents, currency),

    tickets: ticketCards,
  };
}
