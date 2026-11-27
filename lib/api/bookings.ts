// lib/api/bookings.ts
// Bookings & checkout for the redesign.
//
// Today's API: GET /v1/me/reservations?include=qr, GET /v1/reservations/:id,
// POST /v1/reservations (no charge). The Phase 4 additions (spec § G–H:
// reservation holds 145–147, payments 148, per-ticket payment status, booking
// summary, bookingRef…) are declared here as OPTIONAL fields and called through
// helpers that treat 404/405/501 as "not available yet", so the UI lights up
// by itself when the backend ships.
import { ApiError, getBoundApiCall } from './client';
import type {
  ApiMyReservation,
  ApiMyReservationsResponse,
  ApiReservationDetail,
  ApiReservationTicket,
  ApiTicketType,
} from './types';
import { buildTicketQr } from '@/lib/qr/ticketQr';

// ───────────────────────── Phase 4 raw shapes (optional) ─────────────────────────

export type P4PaymentStatus = 'paid' | 'partlyPaid' | 'unpaid' | 'free' | 'refunded';
export type P4TicketPaymentStatus = 'paid' | 'unpaid' | 'free' | 'released' | 'refunded';
export type P4PaymentMode = 'payNow' | 'payAtVenue';

type P4Ticket = ApiReservationTicket &
  Readonly<{
    paymentStatus?: P4TicketPaymentStatus | null;
    paidAt?: string | null;
    chargedPriceCents?: number | null;
  }>;

type P4Event = Readonly<{
  id?: string | null;
  externalId?: string | null;
  title?: string | null;
  startsAtIso?: string | null;
  endsAtIso?: string | null;
  venueName?: string | null;
  venueCity?: string | null;
  imageUrl?: string | null;
  addressLine1?: string | null;
}>;

type P4ReservationFields = Readonly<{
  bookingRef?: string | null;
  paymentMode?: P4PaymentMode | null;
  paymentStatus?: P4PaymentStatus | null;
  paidCents?: number | null;
  dueCents?: number | null;
  releaseAt?: string | null;
  savingsCents?: number | null;
  showOnProfile?: boolean | null;
  event?: P4Event | null;
  tickets?: ReadonlyArray<P4Ticket> | null;
}>;

type P4MyReservation = Omit<ApiMyReservation, 'tickets'> & P4ReservationFields;
type P4ReservationDetail = Omit<ApiReservationDetail, 'tickets' | 'event'> &
  P4ReservationFields &
  Readonly<{ eventId?: string | null; venueName?: string | null; venueCity?: string | null; title?: string | null; startsAtIso?: string | null; endsAtIso?: string | null; savingsCents?: number | null }>;

export type BookingsSummary = Readonly<{
  totalSavingsCents: number;
  currency: string;
  bookingsCount: number;
  ticketsCount: number;
  activeCount: number;
}>;

type P4MyReservationsResponse = Omit<ApiMyReservationsResponse, 'active' | 'past'> &
  Readonly<{
    active: ReadonlyArray<P4MyReservation>;
    past: ReadonlyArray<P4MyReservation>;
    summary?: Partial<BookingsSummary> | null;
  }>;

/** Ticket type with the Phase 4 pricing fields (spec § C.3). */
export type P4TicketType = ApiTicketType &
  Readonly<{
    description?: string | null;
    salePriceCents?: number | null;
    doorPriceCents?: number | null;
    isOnSale?: boolean | null;
  }>;

/** Event fields the checkout reads when present (spec § C.2). */
export type P4EventCheckoutFields = Readonly<{
  payAtVenueEnabled?: boolean | null;
  maxTicketsPerOrder?: number | null;
  venue?: Readonly<{ name?: string | null; addressLine1?: string | null; city?: string | null }> | string | null;
  addressLine1?: string | null;
}>;

// ───────────────────────── App model ─────────────────────────

export type BookingTicket = Readonly<{
  id: string;
  no: number;
  holderName: string;
  holderEmail: string | null;
  typeName: string;
  priceCents: number;
  benefits: ReadonlyArray<string>;
  qrValue: string;
  /** Human code printed under the QR. */
  code: string;
  checkedInAt: string | null;
  /** Phase 4 only. */
  paymentStatus: P4TicketPaymentStatus | null;
}>;

export type Booking = Readonly<{
  id: string;
  eventId: string | null;
  title: string;
  imageUrl: string | null;
  startsAtIso: string | null;
  endsAtIso: string | null;
  venueName: string | null;
  venueCity: string | null;
  addressLine1: string | null;
  currency: string;
  totalCents: number;
  savingsCents: number;
  ticketsCount: number;
  /** Phase 4 `bookingRef`, else a short id. */
  bookingRef: string;
  /** Raw reservation status (confirmed, pending, cancelled…). */
  status: string;
  /** Phase 4 only. */
  paymentStatus: P4PaymentStatus | null;
  paymentMode: P4PaymentMode | null;
  dueCents: number | null;
  releaseAt: string | null;
  isPast: boolean;
  tickets: ReadonlyArray<BookingTicket>;
}>;

export type BookingsData = Readonly<{
  active: ReadonlyArray<Booking>;
  past: ReadonlyArray<Booking>;
  /** Phase 4 summary when the server sends it. */
  summary: Partial<BookingsSummary> | null;
}>;

// ───────────────────────── helpers ─────────────────────────

function call() {
  return getBoundApiCall();
}

const trim = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

function int(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

/** 404 / 405 / 501 (or a "not implemented" code) = route not shipped yet. */
export function isUnavailable(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  return e.status === 404 || e.status === 405 || e.status === 501 || e.code === 'not_implemented';
}

export function isNetworkError(e: unknown): boolean {
  return e instanceof ApiError && e.code === 'network_error';
}

export function shortRef(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `GS-${clean.slice(-6) || clean}`;
}

function holderName(h: ApiReservationTicket['holder']): string {
  return [trim(h?.firstName), trim(h?.lastName)].filter(Boolean).join(' ');
}

function mapTickets(
  reservationId: string,
  ref: string,
  raw: ReadonlyArray<P4Ticket>,
  items: ApiMyReservation['items'],
): BookingTicket[] {
  const itemById = new Map((items ?? []).map((it) => [String(it.id), it]));
  const sorted = raw.slice().sort((a, b) => int(a.ticketNo) - int(b.ticketNo));
  const many = sorted.length > 1;
  return sorted.map((t, i) => {
    const no = int(t.ticketNo) || i + 1;
    const item = itemById.get(String(t.reservationItemId ?? '')) ?? null;
    const fallback = buildTicketQr({ reservationId, ticketId: String(t.id), ticketNo: no, ticketCode: t.ticketCode ?? null });
    const caption = trim(t.qrCaption) || trim(t.ticketCode);
    return {
      id: String(t.id),
      no,
      holderName: holderName(t.holder),
      holderEmail: trim(t.holder?.email) || null,
      typeName: trim(t.ticketTypeName) || trim(item?.ticketTypeName) || '',
      priceCents: int(t.chargedPriceCents ?? t.unitPriceCents ?? item?.unitPriceCents),
      benefits: (item?.benefits ?? []).map((b) => String(b).trim()).filter(Boolean),
      qrValue: trim(t.qrValue) || fallback.qrValue,
      code: caption && !caption.startsWith('#') ? caption : many ? `${ref}-${no}` : ref,
      checkedInAt: t.checkedInAt ?? null,
      paymentStatus: t.paymentStatus ?? null,
    };
  });
}

function isEnded(endsAtIso: string | null, startsAtIso: string | null, now = Date.now()): boolean {
  const end = endsAtIso ? Date.parse(endsAtIso) : startsAtIso ? Date.parse(startsAtIso) + 4 * 3600_000 : NaN;
  return Number.isFinite(end) && end <= now;
}

function mapListReservation(r: P4MyReservation, past: boolean): Booking {
  const id = String(r.id);
  const ref = trim(r.bookingRef) || shortRef(id);
  const tickets = mapTickets(id, ref, r.tickets ?? [], r.items);
  const ticketsCount =
    int(r.totalTickets) || tickets.length || (r.items ?? []).reduce((acc, it) => acc + int(it.quantity), 0);
  const startsAtIso = r.startsAtIso ?? r.event?.startsAtIso ?? null;
  const endsAtIso = r.endsAtIso ?? r.event?.endsAtIso ?? null;
  return {
    id,
    eventId: trim(r.eventId) || trim(r.event?.id) || trim(r.eventExternalId) || null,
    title: trim(r.title) || trim(r.event?.title) || '',
    imageUrl: trim(r.event?.imageUrl) || null,
    startsAtIso,
    endsAtIso,
    venueName: trim(r.venueName) || trim(r.event?.venueName) || null,
    venueCity: trim(r.venueCity) || trim(r.event?.venueCity) || null,
    addressLine1: trim(r.event?.addressLine1) || null,
    currency: trim(r.currency).toUpperCase() || 'EUR',
    totalCents: int(r.totalAmountCents),
    savingsCents: int(r.savingsCents),
    ticketsCount,
    bookingRef: ref,
    status: trim(r.status).toLowerCase() || 'confirmed',
    paymentStatus: r.paymentStatus ?? null,
    paymentMode: r.paymentMode ?? null,
    dueCents: r.dueCents == null ? null : int(r.dueCents),
    releaseAt: r.releaseAt ?? null,
    isPast: past,
    tickets,
  };
}

function mapDetail(r: P4ReservationDetail): Booking {
  const ev = r.event ?? null;
  const startsAtIso = ev?.startsAtIso ?? r.startsAtIso ?? null;
  const endsAtIso = ev?.endsAtIso ?? r.endsAtIso ?? null;
  const base = mapListReservation(
    {
      ...(r as unknown as P4MyReservation),
      eventId: trim(ev?.id) || trim(r.eventId) || null,
      eventExternalId: ev?.externalId ?? null,
      title: trim(ev?.title) || trim(r.title) || null,
      startsAtIso,
      endsAtIso,
      venueName: trim(ev?.venueName) || trim(r.venueName) || null,
      venueCity: trim(ev?.venueCity) || trim(r.venueCity) || null,
    },
    isEnded(endsAtIso, startsAtIso),
  );
  return base;
}

function bySoonest(a: Booking, b: Booking): number {
  return (Date.parse(a.startsAtIso ?? '') || 0) - (Date.parse(b.startsAtIso ?? '') || 0);
}

// ───────────────────────── reads ─────────────────────────

export async function fetchMyBookings(): Promise<BookingsData> {
  const res = await call()<P4MyReservationsResponse>('/v1/me/reservations', {
    query: { include: 'qr', limit: 50 },
  });
  const active = (res.active ?? []).map((r) => mapListReservation(r, false)).sort(bySoonest);
  const past = (res.past ?? []).map((r) => mapListReservation(r, true)).sort((a, b) => bySoonest(b, a));
  return { active, past, summary: res.summary ?? null };
}

export async function fetchBooking(reservationId: string): Promise<Booking> {
  const res = await call()<P4ReservationDetail>(`/v1/reservations/${encodeURIComponent(reservationId)}`, {
    query: { include: 'qr' },
  });
  return mapDetail(res);
}

/** Raw ticket types with the Phase 4 pricing fields when present. */
export async function fetchTicketTypesRaw(eventId: string): Promise<ReadonlyArray<P4TicketType>> {
  return call()<ReadonlyArray<P4TicketType>>(`/v1/events/${encodeURIComponent(eventId)}/ticket-types`);
}

/** Raw event (to read Phase 4 checkout fields such as payAtVenueEnabled). */
export async function fetchEventCheckoutFields(eventId: string): Promise<P4EventCheckoutFields | null> {
  try {
    return await call()<P4EventCheckoutFields>(`/v1/events/${encodeURIComponent(eventId)}`);
  } catch {
    return null;
  }
}

// ───────────────────────── Phase 4: holds (routes 145–147) ─────────────────────────

export type HoldPricing = Readonly<{
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
  savingsCents: number;
  currency: string;
}>;

export type ReservationHold = Readonly<{
  holdId: string;
  expiresAt: string | null;
  pricing: HoldPricing | null;
}>;

type RawHold = Readonly<{
  holdId: string;
  expiresAt?: string | null;
  pricing?: Partial<HoldPricing> | null;
}>;

function mapHold(h: RawHold): ReservationHold {
  const p = h.pricing;
  return {
    holdId: String(h.holdId),
    expiresAt: h.expiresAt ?? null,
    pricing: p
      ? {
          subtotalCents: int(p.subtotalCents),
          serviceFeeCents: int(p.serviceFeeCents),
          totalCents: int(p.totalCents),
          savingsCents: int(p.savingsCents),
          currency: trim(p.currency).toUpperCase() || 'EUR',
        }
      : null,
  };
}

/** Route 145. Returns null when holds are not available yet (or on any error: holds are best effort). */
export async function createHold(eventId: string, quantities: Readonly<Record<string, number>>): Promise<ReservationHold | null> {
  try {
    const res = await call()<RawHold>('/v1/reservation-holds', {
      method: 'POST',
      body: { eventId, quantities },
      headers: { 'Idempotency-Key': idempotencyKey() },
    });
    return res?.holdId ? mapHold(res) : null;
  } catch {
    return null;
  }
}

/** Route 146. Null when the hold expired or the route is unavailable. */
export async function updateHold(holdId: string, quantities: Readonly<Record<string, number>>): Promise<ReservationHold | null> {
  try {
    const res = await call()<RawHold>(`/v1/reservation-holds/${encodeURIComponent(holdId)}`, {
      method: 'PATCH',
      body: { quantities },
    });
    return res?.holdId ? mapHold(res) : null;
  } catch {
    return null;
  }
}

/** Route 147. Fire and forget. */
export function releaseHold(holdId: string): void {
  void call()<void>(`/v1/reservation-holds/${encodeURIComponent(holdId)}`, { method: 'DELETE' }).catch(() => undefined);
}

// ───────────────────────── create (L.1 + Phase 4 fields) ─────────────────────────

export function idempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type CreateBookingInput = Readonly<{
  eventId: string;
  quantities: Readonly<Record<string, number>>;
  attendees: ReadonlyArray<{ ticketTypeId: string; index: number; firstName: string; lastName: string; email: string }>;
  billing: Readonly<{ email: string; firstName: string; lastName: string }>;
  /** Phase 4 fields: only sent when the Phase 4 checkout is live (a hold exists). */
  phase4?: Readonly<{ holdId: string; paymentMode: P4PaymentMode }> | null;
}>;

export type CreateBookingResult = Readonly<{
  reservationId: string;
  status: string | null;
  totalCents: number | null;
  currency: string | null;
  paymentStatus: P4PaymentStatus | null;
}>;

export async function createBooking(input: CreateBookingInput, key: string): Promise<CreateBookingResult> {
  const quantities: Record<string, number> = {};
  for (const [k, v] of Object.entries(input.quantities)) if (int(v) > 0) quantities[k] = int(v);
  const res = await call()<{
    reservationId: string;
    status?: string | null;
    totals?: { totalCents?: number | null; currency?: string | null } | null;
    paymentStatus?: P4PaymentStatus | null;
  }>('/v1/reservations', {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: {
      eventId: input.eventId,
      quantities,
      attendees: input.attendees,
      billing: input.billing,
      status: 'pending',
      ...(input.phase4 ? { holdId: input.phase4.holdId, paymentMode: input.phase4.paymentMode } : {}),
    },
  });
  return {
    reservationId: String(res.reservationId),
    status: res.status ?? null,
    totalCents: res.totals?.totalCents ?? null,
    currency: res.totals?.currency ?? null,
    paymentStatus: res.paymentStatus ?? null,
  };
}

// ───────────────────────── Phase 4: payments (route 148) ─────────────────────────

export type PaymentMethodKind = 'apple_pay' | 'google_pay' | 'card' | 'saved_card';

export type StartPaymentResult =
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'started'; paymentId: string; status: string; clientSecret: string | null; amountCents: number; currency: string }>;

/**
 * Starts a payment for unpaid tickets (route 148). Returns `unavailable` while
 * online payments are not live. The provider SDK step (Apple/Google Pay sheet,
 * card sheet, 3-D Secure with `clientSecret`) is not wired yet — see TODO below.
 */
export async function startPayment(
  reservationId: string,
  args: Readonly<{ ticketIds?: ReadonlyArray<string>; method: PaymentMethodKind; paymentMethodId?: string | null }>,
): Promise<StartPaymentResult> {
  try {
    const res = await call()<{ paymentId: string; status?: string; clientSecret?: string | null; amountCents?: number; currency?: string }>(
      `/v1/reservations/${encodeURIComponent(reservationId)}/payments`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey() },
        body: {
          ticketIds: args.ticketIds,
          method: args.method,
          paymentMethodId: args.paymentMethodId ?? null,
          savePaymentMethod: false,
          returnUrl: 'goswing://payments/return',
        },
      },
    );
    // TODO(payments): hand `clientSecret` to the provider SDK (Stripe
    // initPaymentSheet / confirmPlatformPayPayment), then poll route 149.
    return {
      kind: 'started',
      paymentId: String(res.paymentId),
      status: res.status ?? 'requires_confirmation',
      clientSecret: res.clientSecret ?? null,
      amountCents: int(res.amountCents),
      currency: trim(res.currency).toUpperCase() || 'EUR',
    };
  } catch (e) {
    if (isUnavailable(e)) return { kind: 'unavailable' };
    throw e;
  }
}

// ───────────────────────── derived labels ─────────────────────────

export type BookingChip = Readonly<{ key: string; tone: 'green' | 'orange' | 'gray' | 'red' | 'violet' }>;

/** Status chip for a booking card: payment states only when Phase 4 sends them. */
export function bookingChip(b: Booking): BookingChip {
  const s = b.status;
  if (s === 'cancelled' || s === 'canceled' || s === 'expired') return { key: 'cancelled', tone: 'red' };
  if (s === 'refunded' || b.paymentStatus === 'refunded') return { key: 'refunded', tone: 'gray' };
  if (b.isPast) {
    const used = b.tickets.length > 0 && b.tickets.every((t) => !!t.checkedInAt);
    return used ? { key: 'used', tone: 'gray' } : { key: 'ended', tone: 'gray' };
  }
  if (b.paymentStatus === 'paid') return { key: 'paid', tone: 'green' };
  if (b.paymentStatus === 'partlyPaid') return { key: 'partlyPaid', tone: 'orange' };
  if (b.paymentStatus === 'unpaid') return { key: 'unpaid', tone: 'orange' };
  if (b.paymentStatus === 'free') return { key: 'free', tone: 'green' };
  if (s === 'checkedin') return { key: 'used', tone: 'gray' };
  if (s === 'pending' || s === 'awaitingpayment') return { key: 'pending', tone: 'orange' };
  return { key: 'confirmed', tone: 'green' };
}

export function unpaidTickets(b: Booking): ReadonlyArray<BookingTicket> {
  return b.tickets.filter((t) => t.paymentStatus === 'unpaid');
}
