// lib/supabase/reservationDetails.ts
// Phase 1 stub — reservation detail data isn't available on the new REST API.
// Since myReservations returns an empty list, this code path is unreachable
// from normal navigation. It throws an explicit ApiError if someone deep-links
// to a reservation that no longer resolves.
// See docs/superpowers/specs/2026-05-20-rest-api-read-side-migration.md § 6.3.

import { ApiError } from '@/lib/api/client';

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

export async function getReservationDetails(_params: {
  reservationId: string;
}): Promise<ReservationDetails> {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[STUB] lib/supabase/reservationDetails.getReservationDetails()');
  }
  throw new ApiError(
    'reservations_disabled',
    'Reservation details are temporarily unavailable while we migrate the booking flow.',
    null,
    503,
  );
}
