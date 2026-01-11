// src/lib/supabase/eventAccess.ts
import { supabase } from '@/lib/supabase';

export type ReservationStepKey = 'ticketsPurchased' | 'reservationConfirmed' | 'checkedIn';

export type ReservationSteps = Readonly<{
  ticketsPurchased: boolean;
  reservationConfirmed: boolean;
  checkedIn: boolean;
}>;

export type NormalizedReservationStatus =
  | 'none'
  | 'pending'
  | 'confirmed'
  | 'checkedIn'
  | 'cancelled'
  | 'refunded'
  | 'unknown';

export type EventAccess = Readonly<{
  eventId: string;

  // Reservation existence (any status counts)
  hasReservation: boolean;

  // "Best" reservation for this event (if user has multiple)
  reservationId: string | null;
  statusRaw: string | null;
  status: NormalizedReservationStatus;

  // For your progress card
  steps: ReservationSteps;

  // For gating action buttons (Suggest Songs / Take Story / Give Review)
  canUseCheckedInActions: boolean;
}>;

type DbReservationRow = Readonly<{
  id: string;
  status: string | null;
  ordered_at?: string | null;
}>;

function safeTrim(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function normalizeStatus(raw: string | null | undefined): NormalizedReservationStatus {
  const s = safeTrim(raw).toLowerCase();
  if (!s) return 'unknown';

  // Map your common variants to one of the states you care about
  if (s === 'checkedin' || s === 'checked_in' || s === 'checked-in') return 'checkedIn';
  if (s === 'confirmed' || s === 'paid') return 'confirmed';
  if (s === 'pending' || s === 'created' || s === 'processing') return 'pending';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'refunded') return 'refunded';

  return 'unknown';
}

function statusScore(s: NormalizedReservationStatus): number {
  // Higher = more progressed
  if (s === 'checkedIn') return 3;
  if (s === 'confirmed') return 2;
  if (s === 'pending') return 1;

  // reservation exists but not usable for progress
  if (s === 'cancelled' || s === 'refunded') return 0;

  // unknown still means “reservation exists” (we’ll treat it like purchased only)
  if (s === 'unknown') return 1;

  return 0;
}

function buildSteps(hasReservation: boolean, status: NormalizedReservationStatus): ReservationSteps {
  if (!hasReservation) {
    return { ticketsPurchased: false, reservationConfirmed: false, checkedIn: false };
  }

  // Any reservation (even pending/unknown) => Tickets Purchased true
  const purchased = true;
  const confirmed = status === 'confirmed' || status === 'checkedIn';
  const checkedIn = status === 'checkedIn';

  return { ticketsPurchased: purchased, reservationConfirmed: confirmed, checkedIn };
}

/**
 * Fetch access + progress for the current user on a given event.
 *
 * Assumptions:
 * - RLS/JWT limits `reservations` to current user (recommended).
 * - `reservations` has columns: `event_id`, `status`, and ideally `ordered_at`.
 *
 * If your column is not `event_id`, we’ll adjust the query next.
 */
export async function getEventAccess(params: {
  eventId: string;
}): Promise<EventAccess> {
  const eventId = safeTrim(params.eventId);
  if (!eventId) {
    return {
      eventId: '',
      hasReservation: false,
      reservationId: null,
      statusRaw: null,
      status: 'none',
      steps: { ticketsPurchased: false, reservationConfirmed: false, checkedIn: false },
      canUseCheckedInActions: false,
    };
  }

  // Pull a small set (in case user has multiple reservations for same event)
  const { data, error } = await supabase
    .from('reservations')
    .select('id, status, ordered_at')
    .eq('event_id', eventId)
    .order('ordered_at', { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as DbReservationRow[];

  if (rows.length === 0) {
    return {
      eventId,
      hasReservation: false,
      reservationId: null,
      statusRaw: null,
      status: 'none',
      steps: { ticketsPurchased: false, reservationConfirmed: false, checkedIn: false },
      canUseCheckedInActions: false,
    };
  }

  // Choose the "best" reservation by status progress.
  // Tie-breaker: newest ordered_at (we already ordered desc, but we still score first).
  let best = rows[0];
  let bestStatus = normalizeStatus(best.status);
  let bestScore = statusScore(bestStatus);

  for (const r of rows) {
    const st = normalizeStatus(r.status);
    const sc = statusScore(st);

    if (sc > bestScore) {
      best = r;
      bestStatus = st;
      bestScore = sc;
    }
  }

  const hasReservation = true;
  const steps = buildSteps(hasReservation, bestStatus);

  return {
    eventId,
    hasReservation,
    reservationId: String(best.id),
    statusRaw: best.status ?? null,
    status: bestStatus,
    steps,
    canUseCheckedInActions: bestStatus === 'checkedIn',
  };
}
