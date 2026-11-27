// preview/fixtures/profile.ts — fake API responses for the profile area (web preview only).
//
// Phase 4 routes (username, bio, saved songs, review eligibility, payments
// history, data export, avatar upload) answer here so the gated UI can be
// checked. Open the preview with `?noPhase4` to see the app as it is against
// today's backend (those routes then 404 like the real server).
import type { MockHandler, MockResult } from '../api/router';
import { PROFILE } from './core';
import { at, inHours } from './time';

const PHASE4 = !(typeof location !== 'undefined' && /noPhase4/.test(location.search));
const notFound = (): MockResult => ({ status: 404, json: { error: { code: 'not_found', message: 'Not found' } } });
const p4 = (fn: () => MockResult): (() => MockResult) => (PHASE4 ? fn : notFound);

const daysAgo = (d: number): string => new Date(Date.now() - d * 86400_000).toISOString();

// ── Profile (mutable so edits show up) ──
let profile: Record<string, unknown> = {
  ...PROFILE,
  stats: { attendedCount: 18, savedCount: 4, reviewsCount: 4 },
  ...(PHASE4 ? { username: 'mehdi.lj', bio: 'Deep house, live jazz and good rooftops. Always up for a new spot.', dateOfBirth: '1996-04-12', emailVerified: true } : {}),
};

// ── Interests ──
const TAGS = [
  ['t1', 'Jazz'], ['t2', 'Rooftops'], ['t3', 'Clubbing'], ['t4', 'Deep house'], ['t5', 'Techno'], ['t6', 'Afrobeats'],
  ['t7', 'Hip-hop'], ['t8', 'Live concerts'], ['t9', 'Festivals'], ['t10', 'Cocktail bars'], ['t11', 'Student nights'],
].map(([id, label]) => ({ id, label, slug: label.toLowerCase().replace(/\s+/g, '-'), type: 'interest' }));
let myInterests = new Set(['t1', 't2', 't3', 't4']);
const interestsPage = () => ({
  items: TAGS.filter((t) => myInterests.has(t.id)).map((t) => ({ userId: 'user_preview', tagId: t.id, tagLabel: t.label, tagSlug: t.slug })),
});

// ── Saved ──
let favorites = [
  { id: 'e3', title: 'Afro Night on the Roof', organizer: 'Toit Rouge', venue: 'Toit Rouge', city: 'Paris', startsAtIso: at(1, 19), imageUrl: null, priceLabel: '15 €' },
  { id: 'e4', title: 'Winter Open Air Fest', organizer: 'Open Air Collective', venue: 'Les Berges Est', city: 'Paris', startsAtIso: at(3, 16), imageUrl: null, priceLabel: '39 €' },
  { id: 'e7', title: 'Indie Live: The Pale Hours', organizer: 'Le Caveau Bleu', venue: 'Le Trabendo', city: 'Paris', startsAtIso: at(5, 20), imageUrl: null, priceLabel: '22 €' },
  { id: 'ep1', title: 'Soirée Jazz Live', organizer: 'Le Caveau Bleu', venue: 'Le Caveau Bleu', city: 'Paris', startsAtIso: at(-5, 21), imageUrl: null, priceLabel: '10 €' },
];
let followed = [
  { id: 'org-nb', name: 'Nuit Blanche Collective', logoUrl: null, followedAt: daysAgo(120) },
  { id: 'org-cb', name: 'Le Caveau Bleu', logoUrl: null, followedAt: daysAgo(40) },
];
let songs = [
  { id: 's1', provider: 'deezer', providerTrackId: '1', title: 'Innerbloom', artistName: 'RÜFÜS DU SOL', artworkUrl: null, durationSec: 578, fromEvent: { id: 'e1', title: 'Deep House Session' }, savedAt: daysAgo(3) },
  { id: 's2', provider: 'deezer', providerTrackId: '2', title: 'Love Nwantiti', artistName: 'CKay', artworkUrl: null, durationSec: 188, fromEvent: { id: 'e3', title: 'Afro Night on the Roof' }, savedAt: daysAgo(9) },
  { id: 's3', provider: 'deezer', providerTrackId: '3', title: 'So What', artistName: 'Miles Davis', artworkUrl: null, durationSec: 562, fromEvent: null, savedAt: daysAgo(20) },
];

// ── Reviews ──
let reviews: Array<Record<string, unknown>> = [
  {
    id: 'r1', eventId: 'e5', eventTitle: 'Techno Marathon', eventStartsAtIso: daysAgo(20), organizerName: 'Nuit Blanche Collective',
    rating: 5, comment: 'Eight hours and the sound never dropped. Queue moved fast with the GoSwing code.', createdAt: daysAgo(19),
    helpfulCount: PHASE4 ? 12 : 0, isDraft: false, adminReply: null,
    ...(PHASE4 ? { targetType: 'event', target: { id: 'e5', name: 'Techno Marathon', imageUrl: null } } : {}),
  },
  ...(PHASE4
    ? [
        {
          id: 'r2', eventId: null, rating: 5, comment: 'Intimate cellar, great musicians and friendly staff.', createdAt: daysAgo(25), helpfulCount: 8,
          isDraft: false, adminReply: 'Thank you Mehdi, see you at the next jam!', targetType: 'venue', target: { id: 'venue-e2', name: 'Le Caveau Bleu', imageUrl: null },
        },
        {
          id: 'r3', eventId: null, rating: 4, comment: 'Always solid line-ups. Wish they announced set times earlier.', createdAt: daysAgo(33), helpfulCount: 5,
          isDraft: false, adminReply: null, targetType: 'organizer', target: { id: 'org-nb', name: 'Nuit Blanche Collective', imageUrl: null },
        },
      ]
    : [
        {
          id: 'r2', eventId: 'e2', eventTitle: 'Soirée Jazz Live', eventStartsAtIso: daysAgo(26), organizerName: 'Le Caveau Bleu', rating: 4,
          comment: 'Great musicians, a bit crowded near the bar.', createdAt: daysAgo(25), helpfulCount: 0, isDraft: false,
          adminReply: 'Thanks! We are adding a second bar next month.',
        },
      ]),
];

// ── Payments ──
let cards = [
  { id: 'pm1', userId: 'user_preview', provider: 'stripe', providerPaymentMethodId: 'pm_1', cardBrand: 'visa', cardLastFour: '4242', cardExpMonth: 8, cardExpYear: 2028, isDefault: true },
  { id: 'pm2', userId: 'user_preview', provider: 'stripe', providerPaymentMethodId: 'pm_2', cardBrand: 'mastercard', cardLastFour: '8812', cardExpMonth: 2, cardExpYear: 2027, isDefault: false },
];

let prefs: Record<string, unknown> = {
  userId: 'user_preview',
  pushEnabled: true,
  pushEventReminders: true,
  pushEventUpdates: true,
  pushNewFollowers: true,
  pushEventRecommendations: false,
  emailEnabled: true,
  emailWeeklyDigest: true,
  quietHoursEnabled: true,
  quietHoursStart: '23:00',
  quietHoursEnd: '08:00',
};

export const profileHandlers: MockHandler[] = [
  // Profile
  { method: 'GET', path: /^\/v1\/me\/profile$/, handle: () => profile },
  {
    method: 'PATCH',
    path: /^\/v1\/me\/profile$/,
    handle: (r) => {
      const body = (r.body ?? {}) as Record<string, unknown>;
      if (body.username === 'taken') return { status: 409, json: { error: { code: 'username_taken', message: 'Username already in use' } } };
      profile = { ...profile, ...body };
      return profile;
    },
  },
  {
    method: 'GET',
    path: /^\/v1\/usernames\/([^/]+)\/availability$/,
    handle: (r) => {
      if (!PHASE4) return notFound();
      const u = decodeURIComponent(r.params[0]);
      const reason = u === 'taken' ? 'taken' : u === 'admin' || u === 'goswing' ? 'reserved' : null;
      return { username: u, available: reason === null, reason };
    },
  },
  { method: 'POST', path: /^\/v1\/me\/avatar$/, handle: p4(() => ({ status: 201, json: { avatarUrl: 'https://picsum.photos/seed/goswing/512' } })) },
  { method: 'DELETE', path: /^\/v1\/me\/avatar$/, handle: p4(() => ({ status: 204, json: undefined })) },
  { method: 'POST', path: /^\/v1\/me\/data-export$/, handle: p4(() => ({ status: 202, json: { requestId: 'x1', estimatedReadyAt: inHours(48) } })) },

  // Interests
  { method: 'GET', path: /^\/v1\/tags$/, handle: () => ({ items: TAGS }) },
  { method: 'GET', path: /^\/v1\/me\/interests$/, handle: interestsPage },
  { method: 'POST', path: /^\/v1\/me\/interests\/([^/]+)$/, handle: (r) => ((myInterests = new Set([...myInterests, r.params[0]])), interestsPage()) },
  { method: 'DELETE', path: /^\/v1\/me\/interests\/([^/]+)$/, handle: (r) => (myInterests.delete(r.params[0]), { status: 204, json: undefined }) },

  // Saved
  { method: 'GET', path: /^\/v1\/me\/favorites\/ids$/, handle: () => ({ eventIds: favorites.map((f) => f.id) }) },
  { method: 'GET', path: /^\/v1\/me\/favorites$/, handle: () => ({ items: favorites.map((f) => ({ ...f, favorite: true })), hasMore: false }) },
  { method: 'DELETE', path: /^\/v1\/me\/favorites\/([^/]+)$/, handle: (r) => ((favorites = favorites.filter((f) => f.id !== r.params[0])), { eventId: r.params[0], favorite: false }) },
  { method: 'GET', path: /^\/v1\/me\/followed-organizers$/, handle: () => ({ items: followed, hasMore: false }) },
  { method: 'DELETE', path: /^\/v1\/me\/followed-organizers\/([^/]+)$/, handle: (r) => ((followed = followed.filter((o) => o.id !== r.params[0])), { organizerId: r.params[0], isFollowing: false }) },
  { method: 'GET', path: /^\/v1\/me\/saved-songs$/, handle: p4(() => ({ items: songs, nextCursor: null, hasMore: false })) },
  { method: 'DELETE', path: /^\/v1\/me\/saved-songs\/([^/]+)$/, handle: (r) => ((songs = songs.filter((s) => s.id !== r.params[0])), { status: 204, json: undefined }) },

  // Reviews
  {
    method: 'GET',
    path: /^\/v1\/me\/reviews$/,
    handle: () => ({
      items: reviews,
      totals: { publishedCount: reviews.length, draftCount: 0 },
      ...(PHASE4 ? { stats: { count: reviews.length, averageGiven: 4.7, helpfulReceived: 25 } } : {}),
      hasMore: false,
    }),
  },
  {
    method: 'GET',
    path: /^\/v1\/me\/review-eligibility$/,
    handle: p4(() => ({
      items: [
        { targetType: 'event', targetId: 'e2', targetName: 'Soirée Jazz Live', imageUrl: null, reservationId: 'res-9', visitDate: daysAgo(5), eventTitle: 'Soirée Jazz Live', reviewed: false },
        { targetType: 'venue', targetId: 'venue-e1', targetName: 'Studio Neuf', imageUrl: null, reservationId: 'res-8', visitDate: daysAgo(12), eventTitle: 'Deep House Session', reviewed: false },
      ],
    })),
  },
  {
    method: 'PATCH',
    path: /^\/v1\/reviews\/([^/]+)$/,
    handle: (r) => {
      reviews = reviews.map((x) => (x.id === r.params[0] ? { ...x, ...(r.body as object) } : x));
      return reviews.find((x) => x.id === r.params[0]) ?? {};
    },
  },
  { method: 'DELETE', path: /^\/v1\/reviews\/([^/]+)$/, handle: (r) => ((reviews = reviews.filter((x) => x.id !== r.params[0])), { status: 204, json: undefined }) },

  // Payment methods
  { method: 'GET', path: /^\/v1\/me\/payment-methods$/, handle: () => ({ items: cards }) },
  {
    method: 'POST',
    path: /^\/v1\/me\/payment-methods\/([^/]+)\/default$/,
    handle: (r) => ((cards = cards.map((c) => ({ ...c, isDefault: c.id === r.params[0] }))), cards.find((c) => c.id === r.params[0])),
  },
  { method: 'DELETE', path: /^\/v1\/me\/payment-methods\/([^/]+)$/, handle: (r) => ((cards = cards.filter((c) => c.id !== r.params[0])), { status: 204, json: undefined }) },
  {
    method: 'GET',
    path: /^\/v1\/me\/payments$/,
    handle: p4(() => ({
      items: [
        { paymentId: 'p1', label: 'Deep House Session · 1 ticket', method: 'card', cardLastFour: '4242', amountCents: 1300, currency: 'EUR', kind: 'payment', status: 'succeeded', createdAt: daysAgo(2) },
        { paymentId: 'p2', label: 'Indie Live Showcase', method: 'card', cardLastFour: '4242', amountCents: 1200, currency: 'EUR', kind: 'refund', status: 'succeeded', createdAt: daysAgo(8) },
        { paymentId: 'p3', label: 'Winter Open Air Fest × 2', method: 'apple_pay', cardLastFour: null, amountCents: 7800, currency: 'EUR', kind: 'payment', status: 'succeeded', createdAt: daysAgo(11) },
      ],
      hasMore: false,
    })),
  },

  // Login history & notification preferences
  {
    method: 'GET',
    path: /^\/v1\/me\/login-history$/,
    handle: () => ({
      items: [
        { id: 'l1', userId: 'user_preview', loggedInAt: inHours(-3), deviceType: 'mobile', location: 'Paris, FR', wasSuccessful: true },
        { id: 'l2', userId: 'user_preview', loggedInAt: daysAgo(2), deviceType: 'desktop', location: 'Lyon, FR', wasSuccessful: true },
        { id: 'l3', userId: 'user_preview', loggedInAt: daysAgo(6), deviceType: 'desktop', location: 'Casablanca, MA', wasSuccessful: false },
      ],
    }),
  },
  { method: 'GET', path: /^\/v1\/me\/notification-preferences$/, handle: () => prefs },
  { method: 'PATCH', path: /^\/v1\/me\/notification-preferences$/, handle: (r) => ((prefs = { ...prefs, ...(r.body as object) }), prefs) },
];
