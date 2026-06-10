// lib/api/reservations.ts
// Typed wrappers for reservations, checkout, and per-event access state.
// Raw shapes only — mapping to UI types lives in lib/supabase/*.

import { getBoundApiCall, type BoundApiCall } from './client';
import type {
  ApiCreateReservationResult,
  ApiEventAccess,
  ApiMyReservationsResponse,
  ApiReservationDetail,
} from './types';

function call(): BoundApiCall {
  return getBoundApiCall();
}

export type CreateReservationBody = Readonly<{
  eventId: string;
  quantities: Readonly<Record<string, number>>;
  attendees: ReadonlyArray<{
    ticketTypeId: string;
    index: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | null;
    dietaryRestrictions?: string | null;
    emergencyContact?: string | null;
  }>;
  billing: Readonly<{ email: string; firstName: string; lastName: string }>;
  status?: 'draft' | 'pending' | 'confirmed';
}>;

export function createReservation(
  body: CreateReservationBody,
  idempotencyKey: string,
): Promise<ApiCreateReservationResult> {
  return call()<ApiCreateReservationResult>('/v1/reservations', {
    method: 'POST',
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export function getMyReservations(params?: {
  includeQr?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<ApiMyReservationsResponse> {
  return call()<ApiMyReservationsResponse>('/v1/me/reservations', {
    query: {
      include: params?.includeQr ? 'qr' : undefined,
      limit: params?.limit,
      cursor: params?.cursor,
    },
  });
}

export function getReservation(
  reservationId: string,
): Promise<ApiReservationDetail> {
  return call()<ApiReservationDetail>(
    `/v1/reservations/${encodeURIComponent(reservationId)}`,
  );
}

export function getEventAccess(eventIdOrSlug: string): Promise<ApiEventAccess> {
  return call()<ApiEventAccess>(
    `/v1/events/${encodeURIComponent(eventIdOrSlug)}/my-access`,
  );
}
