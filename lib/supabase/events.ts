// lib/supabase/events.ts
// Phase 1 REST API migration — read-side only.
// All exports keep their original signatures so import sites stay unchanged.
// Bodies now call the Gooswing REST API via lib/api/events.ts.
// See docs/superpowers/specs/2026-05-20-rest-api-read-side-migration.md.

import type { Event } from '@/types/domain';
import * as eventsApi from '@/lib/api/events';
import {
  mapApiAttendeeToUiAttendee,
  mapApiEventToUiEvent,
  mapApiMiniEventToUiMini,
  mapApiMiniEventWithVenue,
  mapApiTicketTypeToUiTicketType,
  type UiEventAttendee,
  type UiMiniEventRow,
  type UiMiniEventWithVenue,
  type UiTicketType,
} from '@/lib/api/mapping';

export type TicketType = UiTicketType;
export type MiniEventRow = UiMiniEventRow;
export type EventAttendee = UiEventAttendee;

export async function getPublishedEvents(): Promise<ReadonlyArray<Event>> {
  const raw = await eventsApi.getPublishedEvents();
  return raw.map(mapApiEventToUiEvent);
}

export async function getEventDetailsById(eventUiId: string): Promise<Event> {
  const raw = await eventsApi.getEventById(eventUiId);
  return mapApiEventToUiEvent(raw);
}

export async function getTicketTypesForEvent(
  eventUiId: string,
): Promise<ReadonlyArray<TicketType>> {
  const raw = await eventsApi.getTicketTypes(eventUiId);
  return raw.map(mapApiTicketTypeToUiTicketType);
}

export async function getEventsByOrganizer(
  organizerId: string,
  excludeEventId?: string,
  limit = 5,
): Promise<ReadonlyArray<MiniEventRow>> {
  const raw = await eventsApi.getOrganizerEvents(organizerId, {
    limit,
    exclude: excludeEventId,
  });
  return raw.map(mapApiMiniEventToUiMini);
}

export async function getSimilarEvents(
  eventId: string,
  _category: string | null | undefined,
  limit = 5,
): Promise<ReadonlyArray<MiniEventRow>> {
  // The API encapsulates category-first / tag-fallback logic — we forward eventId only.
  const raw = await eventsApi.getSimilarEvents(eventId, { limit });
  return raw.map(mapApiMiniEventToUiMini);
}

export async function getUpcomingEventsByVenueOrOrganizer(
  venueId: string | undefined,
  organizerId: string | undefined,
  excludeEventId?: string,
  limit = 20,
): Promise<ReadonlyArray<UiMiniEventWithVenue>> {
  if (!venueId && !organizerId) return [];
  const raw = await eventsApi.getUpcomingByVenueOrOrganizer({
    venueId,
    organizerId,
    exclude: excludeEventId,
    limit,
  });
  return raw.map(mapApiMiniEventWithVenue);
}

export async function getEventAttendees(
  eventId: string,
  limit = 20,
): Promise<{ attendees: EventAttendee[]; totalCount: number }> {
  const raw = await eventsApi.getEventAttendees(eventId, { limit });
  return {
    attendees: raw.attendees.map(mapApiAttendeeToUiAttendee),
    totalCount: typeof raw.totalCount === 'number' ? raw.totalCount : 0,
  };
}
