// preview/fixtures/map.ts — fake API responses for the map area (web preview only).
//
// - GoSwing venues near Paris 11e (Phase 3 public list) so registered place
//   pins show; Phase 4 `/v1/venues` (list) is left unmocked (404) so the app's
//   fallback path is exercised.
// - Phase 4 venue details (route 129) for those venues only, so the ratings /
//   open-now / follow parts of the place pop-up can be checked.
// - OVERPASS_ELEMENTS: fake OpenStreetMap places, served by preview/api/mockFetch.ts.
import type { MockHandler } from '../api/router';
import { inHours } from './time';

const VENUES = [
  {
    id: 'gsv-maison',
    name: 'Maison Sauvage',
    addressLine1: '22 rue Saint-Maur',
    city: 'Paris',
    lat: 48.8669,
    lng: 2.3689,
    venueType: 'restaurant',
    capacity: 80,
    description: 'Seafood bistro with a natural wine list.',
    freeAccess: false,
    freeForLadies: false,
    coverImageUrl: null,
    organizerId: null,
  },
  {
    id: 'gsv-comptoir',
    name: 'Le Comptoir 11',
    addressLine1: '41 rue Jean-Pierre Timbaud',
    city: 'Paris',
    lat: 48.8682,
    lng: 2.3748,
    venueType: 'pub',
    capacity: 120,
    description: 'Neighbourhood pub with live football.',
    freeAccess: true,
    freeForLadies: false,
    coverImageUrl: null,
    organizerId: null,
  },
];

const DETAILS: Record<string, unknown> = {
  'gsv-maison': {
    id: 'gsv-maison',
    priceLevel: 3,
    openNow: true,
    closesAt: inHours(3),
    rating: { average: 4.5, count: 268 },
    googleRating: { average: 4.4, count: 980 },
    followerCount: 1200,
    isFollowing: false,
  },
  'gsv-comptoir': {
    id: 'gsv-comptoir',
    priceLevel: 1,
    openNow: true,
    closesAt: inHours(5),
    rating: { average: 4.3, count: 530 },
    googleRating: { average: 4.2, count: 1600 },
    followerCount: 860,
    isFollowing: false,
  },
};

/** Overpass `elements` around Paris 11e (OSM ids are made up). */
export const OVERPASS_ELEMENTS = [
  { id: 9001, lat: 48.8671, lon: 2.3691, tags: { amenity: 'restaurant', name: 'Maison Sauvage', cuisine: 'seafood', 'addr:housenumber': '22', 'addr:street': 'Rue Saint-Maur', opening_hours: 'Tu-Sa 19:00-23:30' } },
  { id: 9002, lat: 48.8683, lon: 2.3746, tags: { amenity: 'pub', name: 'Le Comptoir 11', 'addr:housenumber': '41', 'addr:street': 'Rue Jean-Pierre Timbaud', opening_hours: 'Mo-Su 16:00-02:00' } },
  { id: 9003, lat: 48.8641, lon: 2.3812, tags: { amenity: 'bar', name: 'Le Mary Céleste', description: 'cocktail bar', 'addr:housenumber': '1', 'addr:street': 'Rue Commines', opening_hours: 'Mo-Su 18:00-02:00' } },
  { id: 9004, lat: 48.8617, lon: 2.3779, tags: { amenity: 'bar', name: 'Café Charbon', 'addr:housenumber': '109', 'addr:street': 'Rue Oberkampf', opening_hours: 'Mo-Th 09:00-02:00; Fr-Sa 09:00-04:00; Su 09:00-02:00' } },
  { id: 9005, lat: 48.8598, lon: 2.3662, tags: { amenity: 'restaurant', name: 'Chez Aline', 'addr:housenumber': '85', 'addr:street': 'Rue de la Roquette', opening_hours: 'Mo-Fr 12:00-15:00' } },
  { id: 9006, lat: 48.8697, lon: 2.3788, tags: { amenity: 'nightclub', name: 'Gibus Club', 'addr:housenumber': '18', 'addr:street': 'Rue du Faubourg du Temple', opening_hours: 'We-Sa 23:30-06:00 open "events only"' } },
  { id: 9007, lat: 48.8572, lon: 2.3731, tags: { amenity: 'pub', name: 'The Frog Bastille', 'addr:housenumber': '4', 'addr:street': 'Rue de Lappe' } },
];

export const mapHandlers: MockHandler[] = [
  { method: 'GET', path: /^\/v1\/public\/venues$/, handle: () => VENUES },
  {
    method: 'GET',
    path: /^\/v1\/venues\/(gsv-[^/]+)$/,
    handle: (r) => DETAILS[r.params[0]] ?? { status: 404, json: { error: { code: 'not_found', message: 'Venue not found' } } },
  },
];
