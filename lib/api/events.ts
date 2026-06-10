// lib/api/events.ts
// Typed wrappers around the 7 Gooswing REST event routes.
// Each function returns the RAW API shape. Mapping to UI types lives in ./mapping.

import { getBoundApiCall, type BoundApiCall } from './client';
import type {
  ApiAttendeesResponse,
  ApiEvent,
  ApiMiniEvent,
  ApiTicketType,
} from './types';

type Opts = { signal?: AbortSignal };

function call(): BoundApiCall {
  return getBoundApiCall();
}

export function getPublishedEvents(opts?: Opts): Promise<ReadonlyArray<ApiEvent>> {
  return call()<ReadonlyArray<ApiEvent>>('/v1/events', { signal: opts?.signal });
}

export function getEventById(idOrSlug: string, opts?: Opts): Promise<ApiEvent> {
  return call()<ApiEvent>(`/v1/events/${encodeURIComponent(idOrSlug)}`, {
    signal: opts?.signal,
  });
}

export function getTicketTypes(
  idOrSlug: string,
  opts?: Opts,
): Promise<ReadonlyArray<ApiTicketType>> {
  return call()<ReadonlyArray<ApiTicketType>>(
    `/v1/events/${encodeURIComponent(idOrSlug)}/ticket-types`,
    { signal: opts?.signal },
  );
}

export function getOrganizerEvents(
  organizerId: string,
  params?: { limit?: number; exclude?: string },
  opts?: Opts,
): Promise<ReadonlyArray<ApiMiniEvent>> {
  return call()<ReadonlyArray<ApiMiniEvent>>(
    `/v1/organizers/${encodeURIComponent(organizerId)}/events`,
    {
      query: { limit: params?.limit, exclude: params?.exclude },
      signal: opts?.signal,
    },
  );
}

export function getSimilarEvents(
  idOrSlug: string,
  params?: { limit?: number },
  opts?: Opts,
): Promise<ReadonlyArray<ApiMiniEvent>> {
  return call()<ReadonlyArray<ApiMiniEvent>>(
    `/v1/events/${encodeURIComponent(idOrSlug)}/similar`,
    {
      query: { limit: params?.limit },
      signal: opts?.signal,
    },
  );
}

export function getUpcomingByVenueOrOrganizer(
  params: { venueId?: string; organizerId?: string; exclude?: string; limit?: number },
  opts?: Opts,
): Promise<ReadonlyArray<ApiMiniEvent>> {
  return call()<ReadonlyArray<ApiMiniEvent>>(
    '/v1/events/upcoming-by-venue-or-organizer',
    {
      query: {
        venueId: params.venueId,
        organizerId: params.organizerId,
        exclude: params.exclude,
        limit: params.limit,
      },
      signal: opts?.signal,
    },
  );
}

export function getEventAttendees(
  eventId: string,
  params?: { limit?: number },
  opts?: Opts,
): Promise<ApiAttendeesResponse> {
  return call()<ApiAttendeesResponse>(
    `/v1/events/${encodeURIComponent(eventId)}/attendees`,
    {
      query: { limit: params?.limit },
      signal: opts?.signal,
    },
  );
}
