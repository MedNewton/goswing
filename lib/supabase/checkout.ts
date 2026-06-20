// src/lib/supabase/checkout.ts
import { supabase } from '@/lib/supabase';

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

  // from ticket_types.capacity
  inventory: number | null;
}>;

export type TicketQuantities = Readonly<Record<string, number>>; // ticketTypeId -> qty

export type CheckoutTotals = Readonly<{
  totalTickets: number;
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
  currency: CurrencyCode;
}>;

export type AttendeeInput = Readonly<{
  ticketTypeId: string;
  index: number; // 1-based within type
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
  eventId: string; // uuid OR external_id like "evt_005"
  userId: string; // Clerk user id (kept for validation/UI, but NOT inserted)
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

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function clampInt(n: unknown, min: number, max: number): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

function toCents(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }
  return 0;
}

function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(0)}`;
}

function normalizeCurrency(v: unknown): string {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : 'USD';
  return s.length ? s : 'USD';
}

function makeTicketCode(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TKT-${rand}-${Date.now()}`;
}

async function resolveEventPk(eventIdOrExternalId: string): Promise<string> {
  const key = String(eventIdOrExternalId);

  if (isUuid(key)) {
    const { data, error } = await supabase.from('events').select('id').eq('id', key).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.id) throw new Error(`[checkout] Event not found for id "${key}"`);
    return String(data.id);
  }

  const { data, error } = await supabase.from('events').select('id').eq('external_id', key).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error(`[checkout] Could not resolve event id for "${key}"`);
  return String(data.id);
}

function normalizeBenefits(v: unknown): unknown {
  // DB column is jsonb NOT NULL with default []::jsonb
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return v;
  return [];
}

function mapTicketTypeRow(row: any, idx: number): TicketType {
  const priceCents = toCents(row?.price_cents) || 0;

  return {
    id: String(row?.id),
    eventId: String(row?.event_id),
    name: String(row?.name ?? 'Ticket'),
    priceCents,
    currency: normalizeCurrency(row?.currency),
    benefits: normalizeBenefits(row?.benefits),

    isActive: true,
    sortOrder: idx,
    inventory: row?.capacity == null ? null : clampInt(row.capacity, 0, Number.MAX_SAFE_INTEGER),
  };
}

function isWithinSalesWindow(row: any): boolean {
  const now = Date.now();
  const startOk = row?.sales_start_at ? new Date(row.sales_start_at).getTime() <= now : true;
  const endOk = row?.sales_end_at ? new Date(row.sales_end_at).getTime() >= now : true;
  return startOk && endOk;
}

async function getTicketTypesForEventPk(eventPk: string): Promise<ReadonlyArray<TicketType>> {
  const { data, error } = await supabase
    .from('ticket_types')
    .select('id,event_id,name,price_cents,currency,capacity,benefits,created_at,sales_start_at,sales_end_at')
    .eq('event_id', eventPk)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as any[];
  return rows.filter(isWithinSalesWindow).map((r, idx) => mapTicketTypeRow(r, idx));
}

export async function getTicketTypesForEvent(eventIdOrExternalId: string): Promise<ReadonlyArray<TicketType>> {
  const eventPk = await resolveEventPk(eventIdOrExternalId);
  return getTicketTypesForEventPk(eventPk);
}

export function computeTotals(ticketTypes: ReadonlyArray<TicketType>, quantities: TicketQuantities): CheckoutTotals {
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

export function buildAttendeeSlots(ticketTypes: ReadonlyArray<TicketType>, quantities: TicketQuantities): ReadonlyArray<AttendeeSlot> {
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
  quantities: TicketQuantities
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

function validateBilling(billing: BillingInput): void {
  if (!isNonEmptyString(billing.email)) throw new Error('[checkout] Billing email is required');
  if (!isNonEmptyString(billing.firstName)) throw new Error('[checkout] Billing first name is required');
  if (!isNonEmptyString(billing.lastName)) throw new Error('[checkout] Billing last name is required');
}

function validateAttendees(attendees: ReadonlyArray<AttendeeInput>): void {
  for (const a of attendees) {
    if (!isNonEmptyString(a.ticketTypeId)) throw new Error('[checkout] Invalid attendee (missing ticketTypeId)');
    if (!Number.isFinite(a.index) || a.index < 1) throw new Error('[checkout] Invalid attendee index');
    if (!isNonEmptyString(a.firstName)) throw new Error('[checkout] Attendee first name is required');
    if (!isNonEmptyString(a.lastName)) throw new Error('[checkout] Attendee last name is required');
    if (!isNonEmptyString(a.email)) throw new Error('[checkout] Attendee email is required');
  }
}

function expectedAttendeeCountFromQuantities(quantities: TicketQuantities): number {
  let n = 0;
  for (const v of Object.values(quantities ?? {})) n += clampInt(v, 0, 999);
  return n;
}

export async function createReservation(args: CreateReservationArgs): Promise<CreateReservationResult> {
  // Keep validating userId so the caller doesn't pass garbage,
  // but DO NOT insert it (DB default + RLS should own user_id).
  if (!isNonEmptyString(args.userId)) throw new Error('[checkout] userId is required');
  if (!isNonEmptyString(args.eventId)) throw new Error('[checkout] eventId is required');

  validateBilling(args.billing);

  const eventPk = await resolveEventPk(args.eventId);

  // Fetch approval_mode so we know whether to auto-confirm the reservation
  const { data: eventRow, error: eventErr } = await supabase
    .from('events')
    .select('approval_mode')
    .eq('id', eventPk)
    .maybeSingle();
  if (eventErr) throw new Error(`[checkout] Failed to fetch event approval_mode: ${eventErr.message}`);
  const approvalMode = String((eventRow as any)?.approval_mode ?? 'auto').toLowerCase();

  const ticketTypes = await getTicketTypesForEventPk(eventPk);

  const totals = computeTotals(ticketTypes, args.quantities);
  if (totals.totalTickets <= 0) throw new Error('[checkout] Please select at least one ticket');

  const expectedAttendees = expectedAttendeeCountFromQuantities(args.quantities);
  if (args.attendees.length !== expectedAttendees) {
    throw new Error(`[checkout] Attendees mismatch: expected ${expectedAttendees}, got ${args.attendees.length}`);
  }
  validateAttendees(args.attendees);

  // If caller didn't pin a status explicitly, derive it from the event's approval_mode:
  //   approval_mode === 'auto' → reservation is auto-confirmed
  //   anything else            → reservation starts as 'pending' awaiting organizer approval
  const status = args.status ?? (approvalMode === 'auto' ? 'confirmed' : 'pending');

  // Preflight: ensure THIS request is authenticated (token attached)
  const { data: dbg, error: dbgErr } = await supabase.rpc('debug_auth_context');
  console.log('checkout preflight auth:', { dbg, dbgErr });

  if (dbgErr) throw new Error(`[checkout] debug_auth_context failed: ${dbgErr.message ?? String(dbgErr)}`);
  if (!dbg?.requesting_user_id || dbg?.role !== 'authenticated') {
    throw new Error('[checkout] Not authenticated (Clerk token not attached to Supabase client).');
  }

  // Helpful lookup map
  const ttById = new Map<string, TicketType>();
  for (const tt of ticketTypes) ttById.set(tt.id, tt);

  // Insert reservation (user_id is set by DB default requesting_user_id())
  const reservationInsert = {
    event_id: eventPk,
    status,
    currency: normalizeCurrency(totals.currency),
    subtotal_cents: totals.subtotalCents,
    service_fees_cents: totals.serviceFeeCents,
    total_amount_cents: totals.totalCents,
    billing_email: args.billing.email,
    billing_first_name: args.billing.firstName,
    billing_last_name: args.billing.lastName,
    // metadata has a DB default; leave it out to avoid storing PII here
  };

  const { data: reservationRow, error: reservationErr } = await supabase
    .from('reservations')
    .insert(reservationInsert)
    .select('id')
    .single();

  if (reservationErr) {
    console.log('reservations insert error:', reservationErr);
    throw new Error(reservationErr.message);
  }

  const reservationId = String((reservationRow as any)?.id);
  if (!reservationId) throw new Error('[checkout] Reservation insert failed (missing id)');

  // Rollback helper (best-effort, FK-safe ordering)
  async function rollbackReservationTree(): Promise<void> {
    try {
      await supabase.from('ticket_holders').delete().eq('reservation_id', reservationId);
    } catch {}
    try {
      await supabase.from('tickets').delete().eq('reservation_id', reservationId);
    } catch {}
    try {
      await supabase.from('reservation_items').delete().eq('reservation_id', reservationId);
    } catch {}
    try {
      await supabase.from('reservations').delete().eq('id', reservationId);
    } catch {}
  }

  try {
    const items = summarizeSelection(ticketTypes, args.quantities);
    if (items.length <= 0) throw new Error('[checkout] No ticket items to insert');

    // reservation_items requires ticket_type_name_snapshot (NOT NULL)
    const reservationItemsInsert = items.map((it) => {
      const tt = ttById.get(it.ticketTypeId);
      if (!tt) throw new Error(`[checkout] Unknown ticket type: ${it.ticketTypeId}`);

      return {
        reservation_id: reservationId,
        ticket_type_id: it.ticketTypeId,
        quantity: it.quantity,
        unit_price_cents: it.unitPriceCents,
        line_total_cents: it.lineTotalCents,
        currency: normalizeCurrency(totals.currency),

        // REQUIRED by schema
        ticket_type_name_snapshot: tt.name,
        benefits_snapshot: normalizeBenefits(tt.benefits),
      };
    });

    const { data: insertedItems, error: itemsErr } = await supabase
      .from('reservation_items')
      .insert(reservationItemsInsert)
      .select('id,ticket_type_id');

    if (itemsErr) {
      console.log('reservation_items insert error:', itemsErr);
      throw new Error(itemsErr.message);
    }

    const rows = (insertedItems ?? []) as Array<{ id: string; ticket_type_id: string }>;
    if (rows.length !== reservationItemsInsert.length) {
      throw new Error('[checkout] reservation_items insert returned unexpected row count');
    }

    // ticketTypeId -> reservation_item_id
    const reservationItemIdByTicketTypeId = new Map<string, string>();
    for (const r of rows) {
      reservationItemIdByTicketTypeId.set(String(r.ticket_type_id), String(r.id));
    }

    // Insert tickets + ticket_holders per attendee (ensures correct ticket_id linkage)
    let ticketNo = 1;
    const nowIso = new Date().toISOString();

    for (const a of args.attendees) {
      const tt = ttById.get(a.ticketTypeId);
      if (!tt) throw new Error(`[checkout] Unknown ticketTypeId for attendee: ${a.ticketTypeId}`);

      const reservationItemId = reservationItemIdByTicketTypeId.get(a.ticketTypeId);
      if (!reservationItemId) throw new Error(`[checkout] Missing reservation_item_id for ticketTypeId: ${a.ticketTypeId}`);

      const ticketInsert = {
        reservation_id: reservationId,
        reservation_item_id: reservationItemId,
        event_id: eventPk,
        ticket_type_id: tt.id,

        // REQUIRED by tickets schema
        ticket_no: ticketNo,
        status: 'issued',
        issued_at: nowIso,
        price_cents: tt.priceCents,
        currency: normalizeCurrency(tt.currency),
        ticket_type_name_snapshot: tt.name,
        benefits_snapshot: normalizeBenefits(tt.benefits),

        // Optional
        ticket_code: makeTicketCode(),
      };

      const { data: ticketRow, error: ticketErr } = await supabase
        .from('tickets')
        .insert(ticketInsert)
        .select('id')
        .single();

      if (ticketErr) {
        console.log('tickets insert error:', ticketErr);
        throw new Error(ticketErr.message);
      }

      const ticketId = String((ticketRow as any)?.id);
      if (!ticketId) throw new Error('[checkout] Ticket insert failed (missing id)');

      const holderInsert = {
        reservation_id: reservationId,
        ticket_id: ticketId,
        first_name: a.firstName,
        last_name: a.lastName,
        email: a.email,
        phone_number: a.phoneNumber ?? null,
        dietary_restrictions: a.dietaryRestrictions ?? null,
        emergency_contact: a.emergencyContact ?? null,
      };

      const { error: holderErr } = await supabase.from('ticket_holders').insert(holderInsert);
      if (holderErr) {
        console.log('ticket_holders insert error:', holderErr);
        throw new Error(holderErr.message);
      }

      ticketNo += 1;
    }

    return { reservationId, totals };
  } catch (e: any) {
    await rollbackReservationTree();
    throw new Error(String(e?.message ?? e));
  }
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
    totalTicketsLabel: `${totals.totalTickets} ${totals.totalTickets === 1 ? 'ticket' : 'tickets'}`,
  };
}
