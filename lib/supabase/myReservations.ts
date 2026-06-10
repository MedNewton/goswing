// lib/supabase/myReservations.ts
// My reservations — backed by GET /v1/me/reservations?include=qr (route L.2).
// The server already splits active/past; labels are formatted client-side
// exactly as before.

import { buildTicketQr } from '@/lib/qr/ticketQr';
import * as reservationsApi from '@/lib/api/reservations';
import type { ApiMyReservation } from '@/lib/api/types';

export type MyReservationTicket = Readonly<{
  id: string;
  holder: string;
  qrLabel: string;
  qrValue: string;
  qrCaption?: string | null;
}>;

export type MyReservationGroup = Readonly<{
  id: string;
  title: string;
  subtitle: string;
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
  startsAtIso?: string | null;
  endsAtIso?: string | null;
}>;

export type MyReservationsResult = Readonly<{
  active: ReadonlyArray<MyReservation>;
  past: ReadonlyArray<MyReservation>;
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

function holderFullName(holder: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  const full = [safeTrim(holder?.firstName), safeTrim(holder?.lastName)]
    .filter(Boolean)
    .join(' ')
    .trim();
  return full || 'Ticket holder';
}

function mapReservation(r: ApiMyReservation): MyReservation {
  const reservationId = String(r.id);

  const currency = safeTrim(r.currency).toUpperCase() || 'USD';
  const totalCents = clampInt(r.totalAmountCents, 0, Number.MAX_SAFE_INTEGER);
  const savingsCents = clampInt(r.savingsCents, 0, Number.MAX_SAFE_INTEGER);

  const startsAtIso = r.startsAtIso ?? null;
  const endsAtIso = r.endsAtIso ?? null;
  const { dateLabel, timeLabel } = formatDateTime(startsAtIso);

  const items = r.items ?? [];
  const tickets = r.tickets ?? [];

  const totalTickets =
    clampInt(r.totalTickets, 0, 999999) ||
    (tickets.length > 0
      ? tickets.length
      : items.reduce((acc, it) => acc + clampInt(it.quantity, 0, 999), 0));

  const groups: MyReservationGroup[] = items.map((it) => {
    const groupTickets = tickets
      .filter((t) => String(t.reservationItemId ?? '') === String(it.id))
      .slice()
      .sort((a, b) => clampInt(a.ticketNo, 0, 999999) - clampInt(b.ticketNo, 0, 999999))
      .map<MyReservationTicket>((t) => {
        const ticketNo = clampInt(t.ticketNo, 1, 999999);
        // Prefer the server-built QR payload; fall back to the local builder.
        const fallback = buildTicketQr({
          reservationId,
          ticketId: String(t.id),
          ticketNo,
          ticketCode: t.ticketCode ?? null,
        });

        return {
          id: String(t.id),
          holder: holderFullName(t.holder),
          qrLabel: `#${ticketNo}`,
          qrValue: safeTrim(t.qrValue) || fallback.qrValue,
          qrCaption: t.qrCaption ?? fallback.qrCaption,
        };
      });

    return {
      id: String(it.id),
      title: safeTrim(it.ticketTypeName) || 'Ticket',
      subtitle: groupSubtitle(
        clampInt(it.quantity, 0, 999),
        clampInt(it.unitPriceCents, 0, Number.MAX_SAFE_INTEGER),
        currency,
      ),
      tickets: groupTickets,
    };
  });

  const savedBadge = savingsCents > 0 ? `Saved ${formatMoneyCents(savingsCents, currency)}` : null;

  return {
    id: reservationId,
    title: safeTrim(r.title) || 'Event',
    ticketsBadge: `${totalTickets} ${pluralize(totalTickets, 'ticket')}`,
    dateLabel,
    timeLabel,
    venueLabel: buildVenueLabel(safeTrim(r.venueName), r.venueCity),
    totalAmount: formatMoneyCents(totalCents, currency),
    groups,
    savedBadge,
    startsAtIso,
    endsAtIso,
  };
}

export async function getMyReservations(): Promise<MyReservationsResult> {
  const res = await reservationsApi.getMyReservations({ includeQr: true, limit: 50 });
  return {
    active: (res.active ?? []).map(mapReservation),
    past: (res.past ?? []).map(mapReservation),
  };
}
