// navigation/routes.ts
// Screens pushed on top of the tabs. Each screen file is owned by one feature
// area; the shell (pages/HomePage.tsx) only maps a route to its screen.
import type { Event } from '@/types/domain';
import type { TicketQuantities, TicketType } from '@/components/blocks/TicketQuantitySheet';

export type TabKey = 'map' | 'discover' | 'bookings' | 'social' | 'profile';

/** Where a place's data comes from. Unregistered places are not on GoSwing. */
export type PlaceSource = 'goswing' | 'osm' | 'google';

/** Minimal data to open a place page before (or without) a venue API. */
export type PlaceSeed = Readonly<{
  id: string;
  name: string;
  source: PlaceSource;
  category?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  openingHours?: string | null;
  venueId?: string | null;
}>;

export type EventTab = 'about' | 'offers' | 'upcoming';

export type Route =
  // Discover area owns these screens.
  | { name: 'eventDetails'; event: Event; initialTab?: EventTab }
  | { name: 'organizerProfile'; organizerId: string; organizerName?: string }
  | { name: 'place'; place: PlaceSeed }
  | { name: 'artist'; artistId: string; artistName?: string }
  // Bookings area owns these screens.
  | {
      name: 'checkout';
      event: Event;
      eventId: string;
      ticketTypes: ReadonlyArray<TicketType>;
      quantities: TicketQuantities;
      eventSnapshot?: Readonly<{
        title: string;
        imageUrl?: string | null;
        startsAtIso?: string | null;
        venue?: string | null;
        city?: string | null;
      }>;
    }
  | { name: 'reservationDetails'; reservationId: string }
  // Profile area owns these screens.
  | { name: 'saved' }
  | { name: 'notifications' };

export type RouteName = Route['name'];
