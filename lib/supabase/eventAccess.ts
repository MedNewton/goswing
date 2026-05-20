// lib/supabase/eventAccess.ts
// Phase 1 stub — reservation-based gating is disabled. Every event reports
// "no reservation" so the EventDetailsPage progress card renders the
// pre-purchase state and gated actions stay locked.
// See docs/superpowers/specs/2026-05-20-rest-api-read-side-migration.md § 6.3.

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

export async function getEventAccess(params: {
  eventId: string;
}): Promise<EventAccess> {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[STUB] lib/supabase/eventAccess.getEventAccess()');
  }
  return {
    eventId: typeof params.eventId === 'string' ? params.eventId : '',
    hasReservation: false,
    reservationId: null,
    statusRaw: null,
    status: 'none',
    steps: EMPTY_STEPS,
    canUseCheckedInActions: false,
  };
}
