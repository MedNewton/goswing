// preview/fixtures/core.ts — shared fake data: events, organizers, profile, settings.
import type { MockHandler } from '../api/router';
import { at, inHours } from './time';

type Ev = Record<string, unknown> & { id: string; title: string };

const ORGS = {
  nb: { id: 'org-nb', name: 'Nuit Blanche Collective' },
  cb: { id: 'org-cb', name: 'Le Caveau Bleu' },
  tr: { id: 'org-tr', name: 'Toit Rouge' },
  be: { id: 'org-be', name: 'Les Berges Est' },
} as const;

function ev(
  id: string,
  title: string,
  org: { id: string; name: string },
  venue: string,
  venueType: string,
  lat: number,
  lng: number,
  startsAt: string,
  endsAt: string,
  basePrice: number | null,
  extra: Record<string, unknown> = {},
): Ev {
  return {
    id,
    externalId: id,
    title,
    description: `<p>${title} at ${venue}. Great sound, a warm crowd and a late finish.</p>`,
    organizer: org.name,
    organizerId: org.id,
    imageUrl: null,
    startsAtIso: startsAt,
    endsAtIso: endsAt,
    venue,
    venueId: `venue-${id}`,
    venueType,
    city: 'Paris',
    countryCode: 'FR',
    category: venueType,
    categories: [venueType],
    musicStyles: ['Deep house'],
    partyTypes: ['Clubbing'],
    access: [],
    basePrice,
    priceLabel: basePrice == null ? null : basePrice === 0 ? 'Free' : `${basePrice} €`,
    attendees: [],
    attendeesExtraCount: 0,
    attendeeCount: 120,
    waitlistEnabled: false,
    approvalMode: 'auto',
    sharingEnabled: true,
    policies: [],
    location: { lat, lng },
    ...extra,
  };
}

export const EVENTS: Ev[] = [
  ev('e1', 'Deep House Session', ORGS.nb, 'Studio Neuf', 'Clubs', 48.8655, 2.3757, inHours(-1), inHours(4), 13, { attendeeCount: 512 }),
  ev('e2', 'Soirée Jazz Live', ORGS.cb, 'Le Caveau Bleu', 'Bars', 48.8606, 2.3702, inHours(-0.5), inHours(2), 10, { attendeeCount: 86, musicStyles: ['Jazz'], partyTypes: ['Concert'] }),
  ev('e3', 'Afro Night on the Roof', ORGS.tr, 'Toit Rouge', 'Rooftops', 48.8589, 2.3801, at(1, 19), at(2, 1), 15, { attendeeCount: 240, musicStyles: ['Afro house', 'Amapiano'] }),
  ev('e4', 'Winter Open Air Fest', ORGS.be, 'Les Berges Est', 'Festivals', 48.8536, 2.3707, at(3, 16), at(3, 23, 59), 39, { attendeeCount: 1800, partyTypes: ['Festival'] }),
  ev('e5', 'Techno Basement', ORGS.nb, 'La Cave 11', 'Clubs', 48.8662, 2.3812, at(0, 23, 30), at(1, 6), 18, { attendeeCount: 330, musicStyles: ['Techno'] }),
  ev('e6', 'Afterwork Spritz', ORGS.cb, 'Bar des Oiseaux', 'Bars', 48.8624, 2.3668, at(2, 18), at(2, 22), 0, { attendeeCount: 64, partyTypes: ['Afterwork'] }),
  ev('e7', 'Indie Live: The Pale Hours', ORGS.cb, 'Le Trabendo', 'Concerts', 48.8676, 2.3730, at(5, 20), at(5, 23), 22, { attendeeCount: 410, musicStyles: ['Indie rock'], partyTypes: ['Concert'] }),
  ev('e8', 'Student Night', ORGS.nb, 'Studio Neuf', 'Clubs', 48.8655, 2.3757, at(6, 23), at(7, 5), 8, { attendeeCount: 690, partyTypes: ['Student'] }),
];

const ORGANIZER = (id: string, name: string) => ({
  id,
  name,
  tagline: 'Nights that people talk about',
  about: `${name} runs club nights and concerts across Paris.`,
  logoUrl: null,
  coverUrl: null,
  city: 'Paris',
  isVerified: true,
  isFollowing: false,
  stats: { avgRating: 4.7, reviewCount: 128, eventCount: 42, followerCount: 6800, totalAttendees: 52000, successRate: 98 },
  socials: {},
  specialties: ['Deep house', 'Techno'],
  policies: [],
});

export const PROFILE = {
  id: 'user_preview',
  displayName: 'Mehdi Louijab',
  avatarUrl: null,
  email: 'mehdi@example.com',
  phone: '+33 6 12 34 56 78',
  phoneVerified: true,
  city: 'Paris 11e',
  countryCode: 'FR',
  occupation: null,
  profileVisibility: 'public',
  accountStatus: 'active',
  interests: [
    { tagId: 't1', tagLabel: 'Jazz', tagSlug: 'jazz' },
    { tagId: 't2', tagLabel: 'Rooftops', tagSlug: 'rooftops' },
    { tagId: 't3', tagLabel: 'Clubbing', tagSlug: 'clubbing' },
  ],
  stats: { attendedCount: 18, savedCount: 7, reviewsCount: 4 },
  createdAt: '2025-01-10T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

const SETTINGS = {
  userId: 'user_preview',
  pushNotificationsEnabled: true,
  locationServicesEnabled: true,
  loginNotificationsEnabled: true,
  savePaymentInfo: true,
  autoReloadWallet: false,
  emailReceipts: true,
};

const TICKET_TYPES = (eventId: string) => [
  { id: `${eventId}-tt1`, name: 'Early entry', priceCents: 1300, currency: 'EUR', isFree: false, freeForLadies: false, benefits: ['Entry before 00:30'], seatsMax: 200, seatsAvailable: 14 },
  { id: `${eventId}-tt2`, name: 'Standard', priceCents: 1800, currency: 'EUR', isFree: false, freeForLadies: false, benefits: [], seatsMax: 400, seatsAvailable: 230 },
];

const find = (id: string): Ev | undefined => EVENTS.find((e) => e.id === id || e.externalId === id);

export const coreHandlers: MockHandler[] = [
  { method: 'GET', path: /^\/v1\/events$/, handle: () => EVENTS },
  { method: 'GET', path: /^\/v1\/events\/([^/]+)$/, handle: (r) => find(r.params[0]) ?? { status: 404, json: { error: { code: 'not_found', message: 'Event not found' } } } },
  { method: 'GET', path: /^\/v1\/events\/([^/]+)\/ticket-types$/, handle: (r) => TICKET_TYPES(r.params[0]) },
  { method: 'GET', path: /^\/v1\/events\/([^/]+)\/similar$/, handle: (r) => EVENTS.filter((e) => e.id !== r.params[0]).slice(0, 4) },
  { method: 'GET', path: /^\/v1\/events\/upcoming-by-venue-or-organizer$/, handle: () => EVENTS.slice(2, 6) },
  { method: 'GET', path: /^\/v1\/events\/([^/]+)\/attendees$/, handle: () => ({ attendees: [], totalCount: 0 }) },
  { method: 'GET', path: /^\/v1\/events\/([^/]+)\/stories\/count$/, handle: () => ({ count: 0 }) },
  { method: 'GET', path: /^\/v1\/events\/([^/]+)\/stories$/, handle: () => ({ items: [] }) },
  { method: 'GET', path: /^\/v1\/events\/([^/]+)\/my-access$/, handle: (r) => ({ eventId: r.params[0], hasReservation: false }) },
  { method: 'GET', path: /^\/v1\/events\/([^/]+)\/reviews\/mine$/, handle: () => ({ status: 404, json: { error: { code: 'not_found', message: 'none' } } }) },
  { method: 'GET', path: /^\/v1\/organizers\/([^/]+)$/, handle: (r) => {
      const o = Object.values(ORGS).find((x) => x.id === r.params[0]) ?? ORGS.nb;
      return ORGANIZER(o.id, o.name);
    } },
  { method: 'GET', path: /^\/v1\/organizers\/([^/]+)\/summary$/, handle: (r) => ({ id: r.params[0], avgRating: 4.7, reviewCount: 128 }) },
  { method: 'GET', path: /^\/v1\/organizers\/([^/]+)\/events$/, handle: (r) => EVENTS.filter((e) => e.organizerId === r.params[0]) },
  { method: 'GET', path: /^\/v1\/organizers\/([^/]+)\/gallery$/, handle: () => ({ items: [] }) },
  { method: 'GET', path: /^\/v1\/organizers\/([^/]+)\/reviews$/, handle: () => ({ items: [], nextCursor: null, hasMore: false }) },
  { method: 'GET', path: /^\/v1\/me\/favorites\/ids$/, handle: () => ({ eventIds: ['e3', 'e7'] }) },
  { method: 'PUT', path: /^\/v1\/me\/favorites\/([^/]+)$/, handle: (r) => ({ eventId: r.params[0], favorite: true }) },
  { method: 'DELETE', path: /^\/v1\/me\/favorites\/([^/]+)$/, handle: (r) => ({ eventId: r.params[0], favorite: false }) },
  { method: 'GET', path: /^\/v1\/me\/profile$/, handle: () => PROFILE },
  { method: 'PATCH', path: /^\/v1\/me\/profile$/, handle: (r) => ({ ...PROFILE, ...(r.body as object) }) },
  { method: 'POST', path: /^\/v1\/me\/profile\/init$/, handle: () => PROFILE },
  { method: 'GET', path: /^\/v1\/me\/settings$/, handle: () => SETTINGS },
  { method: 'PATCH', path: /^\/v1\/me\/settings$/, handle: (r) => ({ ...SETTINGS, ...(r.body as object) }) },
  { method: 'GET', path: /^\/v1\/tags$/, handle: () => ({ items: [] }) },
  {
    method: 'POST',
    path: /^\/v1\/me\/payment-methods$/,
    handle: (r) => ({
      id: `pm-${Date.now()}`,
      userId: 'user_preview',
      ...(r.body as object),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  },
];
