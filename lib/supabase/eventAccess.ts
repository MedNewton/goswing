// lib/supabase/eventAccess.ts
// Per-event reservation state — backed by GET /v1/events/:id/my-access
// (route M.1). The server picks the user's best reservation and computes
// the step flags.

import { ApiError } from '@/lib/api/client';
import * as reservationsApi from '@/lib/api/reservations';

export type ReservationStepKey =
  | 'ticketsPurchased'
  | 'reservationConfirmed'
  | 'checkedIn';

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
  hasReservation: boolean;
  reservationId: string | null;
  statusRaw: string | null;
  status: NormalizedReservationStatus;
  steps: ReservationSteps;
  canUseCheckedInActions: boolean;
}>;

const EMPTY_STEPS: ReservationSteps = {
  ticketsPurchased: false,
  reservationConfirmed: false,
  checkedIn: false,
};

const KNOWN_STATUSES: ReadonlySet<NormalizedReservationStatus> = new Set([
  'none',
  'pending',
  'confirmed',
  'checkedIn',
  'cancelled',
  'refunded',
  'unknown',
]);

function normalizeStatus(v: unknown): NormalizedReservationStatus {
  const s = typeof v === 'string' ? v : '';
  return KNOWN_STATUSES.has(s as NormalizedReservationStatus)
    ? (s as NormalizedReservationStatus)
    : 'unknown';
}

function noAccess(eventId: string): EventAccess {
  return {
    eventId,
    hasReservation: false,
    reservationId: null,
    statusRaw: null,
    status: 'none',
    steps: EMPTY_STEPS,
    canUseCheckedInActions: false,
  };
}

export async function getEventAccess(params: {
  eventId: string;
}): Promise<EventAccess> {
  const eventId = typeof params.eventId === 'string' ? params.eventId.trim() : '';
  if (!eventId) return noAccess('');

  let raw;
  try {
    raw = await reservationsApi.getEventAccess(eventId);
  } catch (e) {
    // Unknown event (or transient failure) renders the pre-purchase state
    // rather than blocking the event page.
    if (e instanceof ApiError && (e.status === 404 || e.code === 'not_found')) {
      return noAccess(eventId);
    }
    throw e;
  }

  if (!raw.hasReservation) return noAccess(String(raw.eventId ?? eventId));

  return {
    eventId: String(raw.eventId ?? eventId),
    hasReservation: true,
    reservationId: raw.reservationId == null ? null : String(raw.reservationId),
    statusRaw: raw.statusRaw ?? null,
    status: normalizeStatus(raw.status),
    steps: {
      ticketsPurchased: Boolean(raw.steps?.ticketsPurchased),
      reservationConfirmed: Boolean(raw.steps?.reservationConfirmed),
      checkedIn: Boolean(raw.steps?.checkedIn),
    },
    canUseCheckedInActions: Boolean(raw.canUseCheckedInActions),
  };
}
