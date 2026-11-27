// preview/fixtures/discover.ts — fake API responses for the discover area (web preview only).
// Includes Phase 4-shaped data (venue hours/rating, artists, line-ups, review
// eligibility, sale prices) so the UI that waits for those routes can be checked.
import type { MockHandler } from '../api/router';
import { EVENTS } from './core';
import { at, inHours } from './time';

type V = Record<string, unknown> & { id: string; name: string };

const H = (opens: string, closes: string, days: number[] = [0, 1, 2, 3, 4, 5, 6]) => days.map((day) => ({ day, opens, closes }));

const VENUES: V[] = [
  {
    id: 'v-studio', name: 'Studio Neuf', venueType: 'club', addressLine1: '9 rue Oberkampf', city: 'Paris', lat: 48.8655, lng: 2.3757,
    description: 'Basement club with a Funktion-One system, deep house and minimal four nights a week.', coverImageUrl: null, capacity: 450,
    freeAccess: false, freeForLadies: false, organizerId: 'org-nb', area: 'Oberkampf', priceLevel: 2, phone: '+33 1 43 55 21 09',
    websiteUrl: 'https://studioneuf.paris', amenities: ['cloakroom', 'smoking_area', 'card_payment', 'accessible'],
    openingHours: [...H('20:00', '02:00', [0, 1]), ...H('22:00', '05:00', [2, 3]), ...H('23:00', '06:00', [4, 5])],
    openNow: true, closesAt: inHours(4), rating: { average: 4.6, count: 820 }, followerCount: 6800, eventsThisMonth: 9,
    musicStyles: ['House', 'Deep house', 'Techno'], isFollowing: false,
  },
  {
    id: 'v-caveau', name: 'Le Caveau Bleu', venueType: 'bar', addressLine1: '14 rue de la Roquette', city: 'Paris', lat: 48.8606, lng: 2.3702,
    description: 'A vaulted 17th-century cellar with live jazz every night and an open jam after midnight.', coverImageUrl: null, capacity: 120,
    freeAccess: false, freeForLadies: false, organizerId: 'org-cb', area: 'Bastille', priceLevel: 2, phone: '+33 1 47 00 12 88',
    websiteUrl: 'https://caveaubleu.fr', amenities: ['live_music', 'card_payment', 'cocktails', 'seating'],
    openingHours: H('18:00', '02:00'), openNow: true, closesAt: inHours(3), rating: { average: 4.8, count: 412 }, followerCount: 3100,
    eventsThisMonth: 14, musicStyles: ['Jazz'], isFollowing: true, notifyNewEvents: true,
  },
  {
    id: 'v-toit', name: 'Toit Rouge', venueType: 'rooftop', addressLine1: '3 boulevard Voltaire', city: 'Paris', lat: 48.8589, lng: 2.3801,
    description: 'Seventh-floor rooftop with a sunset terrace, spritz bar and DJs on weekends.', coverImageUrl: null, capacity: 300,
    freeAccess: true, freeForLadies: false, organizerId: 'org-tr', area: 'Voltaire', priceLevel: 3, openingHours: H('17:00', '01:00'),
    openNow: true, closesAt: inHours(0.6), rating: { average: 4.5, count: 268 }, musicStyles: ['Afro house', 'Amapiano'], isFollowing: false,
  },
  {
    id: 'v-comptoir', name: 'Le Comptoir 11', venueType: 'pub', addressLine1: '41 rue Jean-Pierre Timbaud', city: 'Paris', lat: 48.8668, lng: 2.3735,
    description: 'Neighbourhood pub with twelve draught beers and match screenings.', coverImageUrl: null, capacity: 90,
    freeAccess: true, freeForLadies: false, organizerId: null, priceLevel: 1, openNow: false, rating: { average: 4.3, count: 530 },
  },
  // Today's public venue shape only (no Phase 4 fields).
  { id: 'v-berges', name: 'Les Berges Est', venueType: 'open_air', addressLine1: 'Quai de la Rapée', city: 'Paris', lat: 48.8536, lng: 2.3707, description: null, coverImageUrl: null, capacity: 3000, freeAccess: false, freeForLadies: false, organizerId: 'org-be' },
  { id: 'v-cave11', name: 'La Cave 11', venueType: 'club', addressLine1: '11 rue Saint-Maur', city: 'Paris', lat: 48.8662, lng: 2.3812, description: null, coverImageUrl: null, capacity: 200, freeAccess: false, freeForLadies: true, organizerId: 'org-nb' },
];

const ARTISTS = [
  { id: 'a-lina', slug: 'lina-k', name: 'Lina K.', kind: 'dj', avatarUrl: null, genres: ['Deep house', 'Minimal'], city: 'Paris', followerCount: 22000, isVerified: true, isFollowing: true },
  { id: 'a-awa', slug: 'awa', name: 'Awa', kind: 'dj', avatarUrl: null, genres: ['Afro house', 'Amapiano'], city: 'Paris', followerCount: 15000, isVerified: true, isFollowing: false },
  { id: 'a-moreau', slug: 'moreau', name: 'Moreau', kind: 'dj', avatarUrl: null, genres: ['Minimal', 'Micro-house'], city: 'Paris', followerCount: 9400, isVerified: true, isFollowing: false },
  { id: 'a-quartet', slug: 'quartet-bleu', name: 'Le Quartet Bleu', kind: 'band', avatarUrl: null, genres: ['Jazz'], city: 'Paris', followerCount: 2100, isVerified: false, isFollowing: false },
];

const gig = (eventId: string, setStart: string | null, setEnd: string | null, headliner: boolean) => {
  const e = EVENTS.find((x) => x.id === eventId)!;
  return { eventId, eventTitle: e.title, venueName: e.venue, startsAt: e.startsAtIso, setStartsAt: setStart, setEndsAt: setEnd, isHeadliner: headliner };
};

const GIGS: Record<string, ReturnType<typeof gig>[]> = {
  'a-lina': [gig('e1', inHours(1), inHours(3), true), gig('e3', at(1, 23), at(2, 1), false), gig('e4', at(3, 20), at(3, 22), false)],
  'a-awa': [gig('e3', at(1, 19), at(1, 21), true), gig('e4', at(3, 18), at(3, 20), false)],
  'a-moreau': [gig('e1', inHours(-1), inHours(1), false), gig('e5', at(0, 23, 30), at(1, 2), true)],
  'a-quartet': [gig('e2', inHours(-0.5), inHours(2), true)],
};

const venueNotFound = { status: 404, json: { error: { code: 'not_found', message: 'Venue not found' } } };
const findVenue = (id: string): V | undefined => VENUES.find((v) => v.id === id);

export const discoverHandlers: MockHandler[] = [
  // Event details with Phase 4 extras.
  {
    method: 'GET',
    path: /^\/v1\/events\/(e1|e2)$/,
    handle: (r) => {
      const e = EVENTS.find((x) => x.id === r.params[0])!;
      const venueId = e.id === 'e1' ? 'v-studio' : 'v-caveau';
      return {
        ...e,
        venueId,
        description:
          e.id === 'e1'
            ? '<p>Deep house and minimal in an intimate basement club with a brand-new sound system. Residents Lina K. and Moreau go back to back all night.</p>'
            : e.description,
        doorsOpenAt: inHours(-1.25),
        lastEntryAt: inHours(2),
        minAge: 18,
        venue: { id: venueId, name: e.venue, addressLine1: e.id === 'e1' ? '9 rue Oberkampf' : '14 rue de la Roquette', city: 'Paris', venueType: 'club' },
        policies: e.id === 'e1' ? ['18+ only, valid photo ID required at the door', 'Dress code: smart casual, no sportswear', 'No re-entry after 02:00', 'Professional cameras are not allowed'] : [],
      };
    },
  },
  {
    method: 'GET',
    path: /^\/v1\/events\/e1\/ticket-types$/,
    handle: () => [
      { id: 'e1-tt1', name: 'GoSwing early entry', priceCents: 1500, salePriceCents: 1300, currency: 'EUR', isFree: false, freeForLadies: false, benefits: ['Entry before 00:30'], seatsMax: 200, seatsAvailable: 14 },
      { id: 'e1-tt2', name: 'Standard entry', priceCents: 2000, currency: 'EUR', isFree: false, freeForLadies: false, benefits: ['Pay in the app or at the door with your code'], seatsMax: 400, seatsAvailable: 230 },
      { id: 'e1-tt3', name: 'Booth for 4 + bottle', priceCents: 18000, currency: 'EUR', isFree: false, freeForLadies: false, benefits: ['Reserved booth, skip the line'], seatsMax: 6, seatsAvailable: 3 },
    ],
  },
  { method: 'GET', path: /^\/v1\/events\/e2\/my-access$/, handle: () => ({ eventId: 'e2', hasReservation: true, reservationId: 'r-1', status: 'confirmed', statusRaw: 'confirmed', steps: { ticketsPurchased: true, reservationConfirmed: true, checkedIn: false }, canUseCheckedInActions: false }) },
  {
    method: 'GET',
    path: /^\/v1\/public\/events\/([^/]+)\/gallery$/,
    handle: (r) =>
      r.params[0] === 'e1'
        ? { items: [1, 2, 3, 4].map((i) => ({ id: `g${i}`, mediaType: i === 2 ? 'video' : 'image', url: `https://example.invalid/g${i}.jpg`, thumbnailUrl: null })) }
        : { items: [] },
  },
  {
    method: 'GET',
    path: /^\/v1\/events\/([^/]+)\/lineup$/,
    handle: (r) => ({
      items: Object.entries(GIGS)
        .filter(([, gigs]) => gigs.some((g) => g.eventId === r.params[0]))
        .map(([aid, gigs], i) => {
          const g = gigs.find((x) => x.eventId === r.params[0])!;
          return { artist: ARTISTS.find((a) => a.id === aid), role: null, setStartsAt: g.setStartsAt, setEndsAt: g.setEndsAt, isHeadliner: g.isHeadliner, sortOrder: i };
        }),
    }),
  },

  // Venues (public routes + Phase 4 extras).
  {
    method: 'GET',
    path: /^\/v1\/public\/venues$/,
    handle: (r) => {
      const city = (r.query.get('city') ?? '').toLowerCase();
      return city && city !== 'paris' ? [] : VENUES;
    },
  },
  { method: 'GET', path: /^\/v1\/public\/venues\/([^/]+)$/, handle: (r) => findVenue(r.params[0]) ?? venueNotFound },
  {
    method: 'GET',
    path: /^\/v1\/public\/venues\/([^/]+)\/events$/,
    handle: (r) => {
      const v = findVenue(r.params[0]);
      return v ? EVENTS.filter((e) => e.venue === v.name) : venueNotFound;
    },
  },
  { method: 'GET', path: /^\/v1\/public\/venues\/([^/]+)\/similar$/, handle: (r) => VENUES.filter((v) => v.id !== r.params[0]).slice(0, 4) },
  {
    method: 'GET',
    path: /^\/v1\/venues\/([^/]+)\/reviews$/,
    handle: (r) =>
      r.params[0] === 'v-caveau'
        ? {
            summary: { average: 4.8, count: 412, breakdown: { 5: 330, 4: 60, 3: 14, 2: 5, 1: 3 } },
            items: [
              { id: 'rv1', rating: 5, comment: 'Best jazz cellar in the 11th. Book early, it fills up fast.', createdAt: at(-3, 22), author: { displayName: 'Inès R.', avatarUrl: null }, helpfulCount: 12, adminReply: null },
              { id: 'rv2', rating: 4, comment: 'Great quartet, cocktails a bit pricey.', createdAt: at(-10, 22), author: { displayName: 'Samir L.', avatarUrl: null }, helpfulCount: 3, adminReply: 'Thanks Samir! Happy hour runs until 21:00.' },
            ],
            nextCursor: null,
            hasMore: false,
          }
        : { summary: { average: 0, count: 0, breakdown: {} }, items: [], nextCursor: null, hasMore: false },
  },
  { method: 'POST', path: /^\/v1\/venues\/([^/]+)\/reviews$/, handle: (r) => ({ status: 201, json: { id: 'rv-new', ...(r.body as object) } }) },
  { method: 'PUT', path: /^\/v1\/me\/followed-venues\/([^/]+)$/, handle: (r) => ({ venueId: r.params[0], isFollowing: true, followerCount: 3101, notifyNewEvents: (r.body as { notifyNewEvents?: boolean } | undefined)?.notifyNewEvents ?? true }) },
  { method: 'DELETE', path: /^\/v1\/me\/followed-venues\/([^/]+)$/, handle: (r) => ({ venueId: r.params[0], isFollowing: false, followerCount: 3099 }) },
  {
    method: 'GET',
    path: /^\/v1\/me\/review-eligibility$/,
    handle: (r) =>
      r.query.get('targetId') === 'v-caveau'
        ? { items: [{ targetType: 'venue', targetId: 'v-caveau', targetName: 'Le Caveau Bleu', imageUrl: null, reservationId: 'r-old', visitDate: at(-13, 21), eventTitle: 'Soirée Jazz Live', reviewed: false }] }
        : { items: [] },
  },

  // Artists (Phase 4).
  {
    method: 'GET',
    path: /^\/v1\/discover\/artists$/,
    handle: () => ({
      items: ARTISTS.map((a, i) => ({ rank: i + 1, artist: a, gigsInPeriod: GIGS[a.id].length + 2, nextGig: GIGS[a.id][0] })),
      nextCursor: null,
      hasMore: false,
    }),
  },
  {
    method: 'GET',
    path: /^\/v1\/artists\/([^/]+)$/,
    handle: (r) => {
      const a = ARTISTS.find((x) => x.id === r.params[0] || x.slug === r.params[0]);
      if (!a) return { status: 404, json: { error: { code: 'not_found', message: 'Artist not found' } } };
      return {
        ...a,
        bio: a.id === 'a-lina' ? 'Paris-based selector known for long, warm deep house sets and late-night closing slots.' : null,
        coverImageUrl: null,
        gigsThisMonth: GIGS[a.id].length + 2,
        links: { spotifyUrl: 'https://open.spotify.com/', appleMusicUrl: null, soundcloudUrl: a.id === 'a-lina' ? 'https://soundcloud.com/' : null, youtubeUrl: 'https://youtube.com/', instagramHandle: 'lina.k.dj', websiteUrl: null },
        playsWith: [
          { type: 'organizer', id: 'org-nb', name: 'Nuit Blanche Collective' },
          { type: 'venue', id: 'v-studio', name: 'Studio Neuf' },
          { type: 'venue', id: 'v-toit', name: 'Toit Rouge' },
        ],
        notifyGigs: false,
      };
    },
  },
  {
    method: 'GET',
    path: /^\/v1\/artists\/([^/]+)\/gigs$/,
    handle: (r) => ({ items: r.query.get('when') === 'past' ? [] : GIGS[r.params[0]] ?? [], nextCursor: null, hasMore: false }),
  },
  { method: 'PUT', path: /^\/v1\/me\/followed-artists\/([^/]+)$/, handle: (r) => ({ artistId: r.params[0], isFollowing: true, followerCount: 22001, notifyGigs: (r.body as { notifyGigs?: boolean } | undefined)?.notifyGigs ?? false }) },
  { method: 'DELETE', path: /^\/v1\/me\/followed-artists\/([^/]+)$/, handle: (r) => ({ artistId: r.params[0], isFollowing: false, followerCount: 21999 }) },

  // Organizer: richer data for the redesigned page.
  {
    method: 'GET',
    path: /^\/v1\/organizers\/([^/]+)\/reviews$/,
    handle: () => ({
      items: [
        { id: 'or1', userId: 'u1', userName: 'Karim L.', userAvatarUrl: null, rating: 5, comment: 'Always a great crowd and on-time doors.', eventId: 'e1', eventTitle: 'Deep House Session', createdAt: at(-4, 12) },
        { id: 'or2', userId: 'u2', userName: 'Julie V.', userAvatarUrl: null, rating: 4, comment: 'Good sound, long queue at the cloakroom.', eventId: 'e8', eventTitle: 'Student Night', createdAt: at(-15, 12) },
      ],
      nextCursor: null,
      hasMore: false,
    }),
  },
];
