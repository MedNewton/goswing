// lib/supabase/checkout.ts
// Checkout — ticket types are read via the REST API; createReservation posts
// to /v1/reservations, where the server recomputes prices and totals and
// creates the reservation + items + tickets + holders in one transaction.
// Pure helpers (computeTotals, summarizeSelection, buildAttendeeSlots,
// hasAnyTickets, formatCheckoutTotals) keep their existing behavior.

import * as eventsApi from '@/lib/api/events';
import * as reservationsApi from '@/lib/api/reservations';

export type CurrencyCode = string;

export type TicketType = Readonly<{
  id: string;
  eventId: string;
  name: string;
  priceCents: number;
  currency: CurrencyCode;

  // Snapshots
  benefits: unknown; // jsonb in DB; treat as unknown at runtime

  // app-side fields
  isActive: boolean;
  sortOrder: number;

  // from ticket_types.capacity / seatsMax
  inventory: number | null;
}>;

export type TicketQuantities = Readonly<Record<string, number>>;

export type CheckoutTotals = Readonly<{
  totalTickets: number;
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
  currency: CurrencyCode;
}>;

export type AttendeeInput = Readonly<{
  ticketTypeId: string;
  index: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  dietaryRestrictions?: string | null;
  emergencyContact?: string | null;
}>;

export type BillingInput = Readonly<{
  email: string;
  firstName: string;
  lastName: string;
}>;

export type CreateReservationArgs = Readonly<{
  eventId: string;
  userId: string;
  quantities: TicketQuantities;
  attendees: ReadonlyArray<AttendeeInput>;
  billing: BillingInput;
  status?: 'draft' | 'pending' | 'confirmed';
}>;

export type CreateReservationResult = Readonly<{
  reservationId: string;
  totals: CheckoutTotals;
}>;

const SERVICE_FEE_CENTS_PER_TICKET = 500;

function clampInt(n: unknown, min: number, max: number): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

function normalizeCurrency(v: unknown): string {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : 'USD';
  return s.length ? s : 'USD';
}

function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(0)}`;
}

function normalizeBenefits(v: unknown): unknown {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return v;
  return [];
}

// ============================================
// READ — ticket types via the new REST API
// ============================================

export async function getTicketTypesForEvent(
  eventIdOrExternalId: string,
): Promise<ReadonlyArray<TicketType>> {
  const raw = await eventsApi.getTicketTypes(eventIdOrExternalId);
  return raw.map((r, idx) => ({
    id: String(r.id),
    eventId: String(eventIdOrExternalId),
    name: String(r.name ?? 'Ticket'),
    priceCents: typeof r.priceCents === 'number' ? r.priceCents : 0,
    currency: normalizeCurrency(r.currency),
    benefits: normalizeBenefits(r.benefits),
    isActive: true,
    sortOrder: idx,
    inventory: r.seatsMax == null ? null : clampInt(r.seatsMax, 0, Number.MAX_SAFE_INTEGER),
  }));
}

// ============================================
// PURE HELPERS (no network) — unchanged
// ============================================

export function computeTotals(
  ticketTypes: ReadonlyArray<TicketType>,
  quantities: TicketQuantities,
): CheckoutTotals {
  const qtyById: Record<string, number> = {};
  for (const [k, v] of Object.entries(quantities ?? {})) qtyById[k] = clampInt(v, 0, 999);

  let totalTickets = 0;
  let subtotalCents = 0;
  let currency: CurrencyCode = ticketTypes[0]?.currency ?? 'USD';

  for (const tt of ticketTypes) {
    currency = tt.currency || currency;
    const q = qtyById[tt.id] ?? 0;
    if (q <= 0) continue;
    totalTickets += q;
    subtotalCents += tt.priceCents * q;
  }

  const serviceFeeCents = totalTickets * SERVICE_FEE_CENTS_PER_TICKET;
  const totalCents = subtotalCents + serviceFeeCents;

  return { totalTickets, subtotalCents, serviceFeeCents, totalCents, currency };
}

export type AttendeeSlot = Readonly<{
  key: string;
  ticketTypeId: string;
  ticketTypeName: string;
  index: number;
  priceCents: number;
}>;

export function buildAttendeeSlots(
  ticketTypes: ReadonlyArray<TicketType>,
  quantities: TicketQuantities,
): ReadonlyArray<AttendeeSlot> {
  const qtyById: Record<string, number> = {};
  for (const [k, v] of Object.entries(quantities ?? {})) qtyById[k] = clampInt(v, 0, 999);

  const out: AttendeeSlot[] = [];
  for (const tt of ticketTypes) {
    const q = qtyById[tt.id] ?? 0;
    for (let i = 1; i <= q; i += 1) {
      out.push({
        key: `${tt.id}::${i}`,
        ticketTypeId: tt.id,
        ticketTypeName: tt.name,
        index: i,
        priceCents: tt.priceCents,
      });
    }
  }
  return out;
}

export function hasAnyTickets(quantities: TicketQuantities): boolean {
  for (const v of Object.values(quantities ?? {})) {
    if (clampInt(v, 0, 999) > 0) return true;
  }
  return false;
}

export function summarizeSelection(
  ticketTypes: ReadonlyArray<TicketType>,
  quantities: TicketQuantities,
): ReadonlyArray<{
  ticketTypeId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}> {
  const qtyById: Record<string, number> = {};
  for (const [k, v] of Object.entries(quantities ?? {})) qtyById[k] = clampInt(v, 0, 999);

  return ticketTypes
    .map((tt) => {
      const quantity = qtyById[tt.id] ?? 0;
      return {
        ticketTypeId: tt.id,
        name: tt.name,
        unitPriceCents: tt.priceCents,
        quantity,
        lineTotalCents: tt.priceCents * quantity,
      };
    })
    .filter((x) => x.quantity > 0);
}

export function formatCheckoutTotals(totals: CheckoutTotals): Readonly<{
  subtotalLabel: string;
  serviceFeeLabel: string;
  totalLabel: string;
  totalTicketsLabel: string;
}> {
  return {
    subtotalLabel: formatMoney(totals.subtotalCents),
    serviceFeeLabel: formatMoney(totals.serviceFeeCents),
    totalLabel: formatMoney(totals.totalCents),
    totalTicketsLabel: `${totals.totalTickets} ${
      totals.totalTickets === 1 ? 'ticket' : 'tickets'
    }`,
  };
}

// ============================================
// WRITE — POST /v1/reservations
// ============================================

function makeIdempotencyKey(): string {
  // RFC-4122-shaped v4 key; uniqueness (not cryptographic strength) is what
  // the Idempotency-Key header needs.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function createReservation(
  args: CreateReservationArgs,
): Promise<CreateReservationResult> {
  const quantities: Record<string, number> = {};
  for (const [k, v] of Object.entries(args.quantities ?? {})) {
    const q = clampInt(v, 0, 999);
    if (q > 0) quantities[k] = q;
  }

  const result = await reservationsApi.createReservation(
    {
      eventId: args.eventId,
      quantities,
      attendees: args.attendees.map((a) => ({
        ticketTypeId: a.ticketTypeId,
        index: a.index,
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        phoneNumber: a.phoneNumber ?? null,
        dietaryRestrictions: a.dietaryRestrictions ?? null,
        emergencyContact: a.emergencyContact ?? null,
      })),
      billing: args.billing,
      status: args.status ?? 'pending',
    },
    makeIdempotencyKey(),
  );

  const totals = result.totals ?? null;
  return {
    reservationId: String(result.reservationId),
    totals: {
      totalTickets: clampInt(totals?.totalTickets, 0, Number.MAX_SAFE_INTEGER),
      subtotalCents: clampInt(totals?.subtotalCents, 0, Number.MAX_SAFE_INTEGER),
      serviceFeeCents: clampInt(totals?.serviceFeeCents, 0, Number.MAX_SAFE_INTEGER),
      totalCents: clampInt(totals?.totalCents, 0, Number.MAX_SAFE_INTEGER),
      currency: normalizeCurrency(totals?.currency),
    },
  };
}
