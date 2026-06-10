// lib/supabase/checkout.ts
// Phase 1 — write paths are disabled. Pure helpers (computeTotals, summarizeSelection,
// buildAttendeeSlots, hasAnyTickets, formatCheckoutTotals) keep their existing
// behavior. createReservation throws a clearly-labelled ApiError so the checkout
// CTA surfaces an explicit error instead of silently succeeding.
// getTicketTypesForEvent is rewired to the new REST API for read-only display.

import { ApiError } from '@/lib/api/client';
import * as eventsApi from '@/lib/api/events';

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
// WRITE — disabled until Phase 2
// ============================================

export async function createReservation(
  _args: CreateReservationArgs,
): Promise<CreateReservationResult> {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[STUB] lib/supabase/checkout.createReservation()');
  }
  throw new ApiError(
    'checkout_disabled',
    'Reservations are temporarily disabled while the booking flow is rewired to the new API.',
    null,
    503,
  );
}
