// lib/supabase/myReservations.ts
// Phase 1 stub — the REST API does not yet expose reservations.
// See docs/superpowers/specs/2026-05-20-rest-api-read-side-migration.md § 6.3.

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

const EMPTY: MyReservationsResult = { active: [], past: [] };

export async function getMyReservations(): Promise<MyReservationsResult> {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[STUB] lib/supabase/myReservations.getMyReservations()');
  }
  return EMPTY;
}
