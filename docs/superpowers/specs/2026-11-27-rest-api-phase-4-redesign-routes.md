# GoSwing — REST API Phase 4 Route Specs (Mobile Redesign)

**Date:** 2026-11-27
**Status:** Draft — ready to hand to OPTIDEEP
**Apps:** `goswing` (mobile) and `goswing-admin` (partner dashboard)
**Complements:** `2026-05-21-rest-api-phase-2-routes.md` (routes 1–59) and `rest-api-phase-3-admin-routes.md` (routes 60–127)
**Companion (our side, not for OPTIDEEP):** `2026-11-27-redesign-our-side-work.md`

This document specifies **every backend change the redesigned mobile app needs** for its four rebuilt areas — **Map, Discover, Bookings, Profile** — and everything reachable from them (event page, place page, organizer page, artist page, checkout, tickets, reviews, saved items, settings). It also specifies the **admin-side routes and fields** partners need to *produce* that data (opening hours, sale/door prices, line-ups, music voting, door check-in, payment collection).

Out of scope for Phase 4: the Social tab (user-to-user follows, posts, stories feed, groups, chat, highlights), the partner workspaces inside the mobile app, the "Become an artist" request flow, the wallet (balance, top-up, auto-reload), Tripadvisor ratings and Google "popular times".

Routes are numbered from **128** so the catalog stays contiguous: 1–7 Phase 1, 8–59 Phase 2, 60–127 Phase 3, 128+ Phase 4. Changes to existing routes are marked **EXT** with the original route number.

---

## Contents

- A. Conventions (deltas only)
- B. Prerequisites — bugs and data fixes to ship first
- C. Events & ticket types (extensions)
- D. Venues for the mobile app
- E. Discover rankings
- F. Artists & line-ups
- G. Checkout: reservation holds, payments, pay at venue
- H. Bookings (extensions)
- I. Reviews (venues, organizers, eligibility, helpful votes)
- J. Music: suggestions, live voting, saved songs
- K. Profile & account
- L. Admin routes & fields
- M. Background jobs
- N. Open questions
- O. Implementation order
- P. Mapping to the redesign screens

---

## A. Conventions (deltas only)

All Phase 2 § A and Phase 3 § A conventions apply unchanged (camelCase, ISO-8601 UTC with ms, money in integer cents + `currency`, explicit `null`, `[]` for empty, the same error envelope, `Idempotency-Key` on POSTs). Phase 4 adds:

### A.1 Public routes accept a user JWT

The mobile app will call several `/v1/public/*` routes (venues, event gallery, similar items). Those routes must **also accept** a request carrying `Authorization: Bearer <clerk_jwt>`; when present, user-specific fields (`isFollowing`, `isSaved`) are filled, otherwise they are `false`. No other behavior changes.

### A.2 Geo parameters

Every route that takes `lat` + `lng` also takes `radiusKm` (float, default 10, max 50). When `lat`/`lng` are given, each returned item carries `distanceKm` (float, 1 decimal, great-circle distance from the given point). Without them, `distanceKm` is `null`.

### A.3 Time windows

The app sends explicit windows instead of named ones ("tonight", "this weekend"), so the server never has to guess the user's timezone:

- `from` / `to` (ISO-8601) — keep events whose `[startsAt, endsAt)` **overlaps** `[from, to)`.
- `liveAt` (ISO-8601) — keep events where `startsAt <= liveAt < endsAt` ("happening now"). Usually the current time.

### A.4 Cursor pagination

New list routes use the Phase 2 § A.6 cursor model: `limit` (default 20, max 100) + opaque `cursor`; response `{ "items": [...], "nextCursor": "string | null", "hasMore": bool }`.

### A.5 Near-real-time data

Live voting (§ J) is **polled**: the app re-fetches every 5 s while the screen is open. Responses must be cheap and must carry `ETag` so unchanged polls return `304`. SSE/WebSocket can come later (§ N.4).

### A.6 New error codes

| Code                    | HTTP | When |
| ----------------------- | ---- | ---- |
| `hold_expired`          | 410  | A reservation hold or unpaid reservation passed its expiry |
| `payment_required`      | 402  | Action needs the tickets to be paid first |
| `payment_failed`        | 422  | Provider declined; `details.providerCode` carries the provider's code |
| `pay_at_venue_disabled` | 422  | `paymentMode: "payAtVenue"` on an event that does not allow it |
| `max_per_order`         | 422  | More than the event's `maxTicketsPerOrder` |
| `review_not_eligible`   | 403  | (existing) reused for venue and organizer reviews |
| `voting_locked`         | 403  | User has neither a ticket nor a venue unlock (§ J) |
| `voting_closed`         | 409  | The vote list is not open |
| `suggestion_limit`      | 422  | Per-user suggestion limit reached |
| `username_taken`        | 409  | Username already in use |
| `already_checked_in`    | 409  | Door scan of a ticket that is already used |
| `wrong_event`           | 422  | Door scan of a ticket for another event |

---

## B. Prerequisites — bugs and data fixes to ship first

These are already open and block the redesign regardless of new routes.

| # | Item | Impact |
| - | ---- | ------ |
| B.1 | **Bug B1** — `POST/PATCH /v1/admin/events` (routes 78–79) reject ISO `startsAt` with 400 and return 500 on Odoo-format dates (`docs/specs-backend-B1-B7-fr.md`). | Partners cannot create events, so the app has nothing to show. |
| B.2 | **Bug B7** — `GET /v1/admin/tags` (route 73) returns 503 intermittently. | Empty tag pickers when creating events. |
| B.3 | **Seed tags.** `GET /v1/tags?type=interest` returns `[]` (`noticed_api_issues.txt`). Seed interest tags, and confirm the canonical tag types (Phase 2 § S.7 vs Phase 3 `party_type / music_style / extra_service` — open question T2). Phase 4 filters use `music_style` tags as "music genres". | Onboarding interests and the Discover genre filter. |
| B.4 | **Access values.** Events return `access[]` values such as `"tous-publics"`; the app filters on `free` / `free_ladies`. Return canonical slugs `free`, `free_ladies`, `paid` (derived from `isFree` / `freeForLadies` on tiers and venue). | Discover "Access" filter. |
| B.5 | **Clerk instance.** The API must trust the same Clerk instance the apps use (guide § 2.1). | Every authenticated call. |

---

## C. Events & ticket types (extensions)

### C.1 EXT route 1 — GET `/v1/events` (server-side search, filters, paging)

Today route 1 returns every published event with no parameters; the app filters on the device. The redesign keeps working that way for a small catalog, but needs these parameters to scale. All are optional and combine with AND.

| Param | Type | Notes |
| ----- | ---- | ----- |
| `q` | string | Case-insensitive match on title, venue name, organizer name, line-up artist names |
| `city` | string | Venue city, case-insensitive |
| `lat`, `lng`, `radiusKm` | float | § A.2 |
| `from`, `to` | ISO | § A.3 overlap window |
| `liveAt` | ISO | § A.3 |
| `venueTypes[]` | string (repeat) | Venue type slugs (§ D.1 list) |
| `musicGenres[]` | string (repeat) | `music_style` tag slugs |
| `partyTypes[]` | string (repeat) | `party_type` tag slugs |
| `maxPriceCents` | int | Keep events whose `fromPriceCents <= value` |
| `isFree` | bool | Free events only |
| `access[]` | string (repeat) | `free`, `free_ladies` (§ B.4) |
| `artistId` | uuid | Events where the artist is on the line-up |
| `sort` | enum | `startsAt` (default, asc) · `popular` (attendeeCount desc, then startsAt) · `distance` (needs lat/lng) |
| `limit`, `cursor` | | § A.4. If absent, keep today's behavior (full list) for backward compatibility |

Also return `X-Total-Count` (or a `totalCount` field) so the filter sheet can show "Show 24 results".

### C.2 EXT — event shape (routes 1, 2, 4, 5, 6, 116–118)

Add these fields to the event object everywhere it is returned:

```json
{
  "status": "published",
  "doorsOpenAt": "2026-11-18T21:45:00.000Z",
  "lastEntryAt": "2026-11-19T01:00:00.000Z",
  "minAge": 18,
  "fromPriceCents": 1300,
  "fromRegularPriceCents": 1500,
  "currency": "EUR",
  "isFree": false,
  "payAtVenueEnabled": true,
  "maxTicketsPerOrder": 10,
  "venue": {
    "id": "uuid",
    "name": "Studio Neuf",
    "addressLine1": "9 rue Oberkampf",
    "city": "Paris",
    "venueType": "club",
    "location": { "lat": 48.8649, "lng": 2.3770 }
  },
  "lineupPreview": [ { "artistId": "uuid", "name": "Lina K.", "avatarUrl": "string | null", "isHeadliner": true } ],
  "musicMode": "both",
  "isSaved": false,
  "distanceKm": 1.2
}
```

- `status` ∈ `published | live | completed | cancelled`. The app computes "Live now" from `startsAt`/`endsAt`, but `cancelled` must be visible so it can show a banner.
- `doorsOpenAt`, `lastEntryAt` nullable. `lastEntryAt` also drives the pay-at-venue release (§ G.6).
- `minAge` nullable int (`null` = all ages).
- `fromPriceCents` = lowest **effective** price across tiers currently on sale (sale price if set, else price). `fromRegularPriceCents` = that tier's regular price **only when it is discounted**, else `null` (lets the card show ~~15 €~~ 13 €). Replaces the string `priceLabel` for new UI (keep `priceLabel` for old builds).
- `venue` object replaces the loose `venue` / `venueId` / `location` fields for new builds (keep the old ones too).
- `lineupPreview` = up to 3 artists, headliners first (§ F).
- `musicMode` from the event's music settings (§ J.1).
- `isSaved` reflects favorites server-side (today `favorite` is always `false` and the app overlays `/favorites/ids`).

### C.3 EXT route 3 — GET `/v1/events/:id/ticket-types` (and ticket tiers in route 118)

```json
{
  "id": "uuid",
  "name": "Early entry",
  "description": "Entry before 00:30",
  "priceCents": 1500,
  "salePriceCents": 1300,
  "doorPriceCents": 2000,
  "currency": "EUR",
  "isFree": false,
  "freeForLadies": false,
  "benefits": ["Welcome drink"],
  "seatsMax": 200,
  "seatsAvailable": 14,
  "salesStartAt": "2026-11-01T00:00:00.000Z",
  "salesEndAt": "2026-11-19T01:00:00.000Z",
  "isOnSale": true
}
```

- `salePriceCents` nullable; when set it must be `< priceCents`, and it is the price charged. The app shows the discount as `round((price − sale) / price × 100)` %.
- `doorPriceCents` nullable: what the same entry costs at the door without GoSwing. Drives the "13 € · 20 € at the door without GoSwing" line and the savings figure (§ H.2).
- `seatsAvailable` must account for active holds (§ G.1), so "Only N left" is accurate.
- `isOnSale` = now within the sales window and `seatsAvailable > 0`.

### C.4 Event gallery for mobile

Reuse route 119 (`GET /v1/public/events/:id/gallery`) under § A.1. Each item needs `mediaType` (`image | video`), `url`, `thumbnailUrl` (required for video), `durationSec` (video, nullable).

### C.5 EXT routes 5 & 6 — similar / upcoming-by-venue

Accept `lat`, `lng` and return `distanceKm` (the "Similar events nearby" row). Route 6 also needs `from` so the event page can show "More at {venue}" from today only.

---

## D. Venues for the mobile app

The mobile app has no venue routes today (it shows nearby places from OpenStreetMap). The redesign shows GoSwing venues on the map, on Discover, and on a full place page. Venues **not** on GoSwing are fetched from Google by our own proxy (companion doc) and are not Odoo's concern.

### D.1 Shared shape — `Venue` (extends Phase 3 `PublicVenue`)

```json
{
  "id": "uuid",
  "name": "Studio Neuf",
  "venueType": "club",
  "addressLine1": "9 rue Oberkampf",
  "area": "Oberkampf",
  "city": "Paris",
  "postalCode": "75011",
  "countryCode": "FR",
  "location": { "lat": 48.8649, "lng": 2.3770 },
  "timezone": "Europe/Paris",
  "description": "string | null",
  "coverImageUrl": "string | null",
  "logoUrl": "string | null",
  "priceLevel": 2,
  "phone": "+33 1 23 45 67 89",
  "websiteUrl": "https://studioneuf.fr",
  "instagramHandle": "studioneuf",
  "amenities": ["cloakroom", "terrace", "accessible", "card_payment"],
  "openingHours": [
    { "day": 4, "opens": "23:00", "closes": "05:00" },
    { "day": 5, "opens": "23:00", "closes": "06:00" }
  ],
  "openingHoursNote": "string | null",
  "openNow": true,
  "closesAt": "2026-11-19T05:00:00.000Z",
  "rating": { "average": 4.6, "count": 312 },
  "followerCount": 6800,
  "eventsThisMonth": 9,
  "hasEventNow": true,
  "partyTypes": ["Clubbing"],
  "musicStyles": ["Deep house", "Techno"],
  "organizerId": "uuid | null",
  "googlePlaceId": "ChIJ… | null",
  "isFollowing": false,
  "distanceKm": 1.2
}
```

- `venueType` ∈ `club | bar | pub | restaurant | rooftop | concert_hall | festival_ground | lounge | cafe | other` (align with `src/lib/venueTypes.ts` in the admin app; the map chips are Clubs, Bars, Pubs, Restaurants, Concerts, Festivals, Rooftops).
- `priceLevel` ∈ `1 | 2 | 3 | null` (€, €€, €€€).
- `amenities[]` from a fixed list (§ N.9).
- `openingHours`: `day` 0 = Monday … 6 = Sunday, `HH:MM` in the venue's timezone; `closes < opens` means after midnight. Multiple entries per day allowed (split hours). Empty array = unknown.
- `openNow` / `closesAt` computed server-side in the venue timezone (`closesAt` null when closed or unknown). The app shows "Open · closes 05:00" / "Closing soon" (< 60 min).
- `rating` = GoSwing venue reviews only (§ I). `null` when there are no reviews.
- `hasEventNow` = an event at this venue with `startsAt <= now < endsAt` (pins get a "live" flame).
- `googlePlaceId` nullable; lets our proxy attach the Google rating, and lets us avoid showing a Google duplicate of a GoSwing venue on the map.

### D.2 Route 128 — GET `/v1/venues`

Map pins, Discover "All places", map search.

| Param | Notes |
| ----- | ----- |
| `lat`, `lng`, `radiusKm` | § A.2 |
| `bbox` | `minLng,minLat,maxLng,maxLat` — alternative to radius for the map viewport |
| `city`, `q` | `q` matches name, area, music styles |
| `venueTypes[]` | § D.1 values |
| `musicGenres[]` | `music_style` slugs |
| `openAt` | ISO — keep venues open at that time |
| `hasEventNow` | bool |
| `sort` | `distance` (needs lat/lng) · `rating` · `name` |
| `view` | `pin` → only `id, name, venueType, location, hasEventNow, priceLevel` (lightweight map payload) |
| `limit`, `cursor` | § A.4; `view=pin` allows `limit` up to 500 |

**Response 200:** `{ "items": [ Venue ], "nextCursor": …, "hasMore": … }`

### D.3 Route 129 — GET `/v1/venues/:id`

**Response 200:** one `Venue`.

**Errors:** `404 not_found`.

### D.4 Route 130 — GET `/v1/venues/:id/events`

Upcoming tab of the place page. Params `from` (default now), `when=upcoming|past`, `limit`, `cursor`. Items use the § C.2 event shape. (Same data as public route 123 with § A.1 behavior; either path is fine.)

### D.5 Route 131 — GET `/v1/venues/:id/similar`

"Similar places nearby". Params `limit` (default 6), `lat`, `lng`. Same venue type or music styles, nearest first. Items: `Venue` (`view=pin` fields + `coverImageUrl`, `rating`, `priceLevel`, `openNow`, `distanceKm` are enough).

### D.6 Route 132 — GET `/v1/venues/:id/media`

Photos & videos on the place pop-up and page. Same item shape as § C.4. Source: the venue's organizer gallery (routes 68–70) plus gallery items of past events at the venue, newest first. Cursor-paginated.

### D.7 Routes 133–135 — venue follows

- **133** PUT `/v1/me/followed-venues/:venueId` → `{ "venueId", "isFollowing": true, "followerCount", "notifyNewEvents": true }`. Body optional `{ "notifyNewEvents": bool }` (the bell icon on the place page).
- **134** DELETE `/v1/me/followed-venues/:venueId` → `{ "venueId", "isFollowing": false, "followerCount" }`.
- **135** GET `/v1/me/followed-venues` → cursor list of `Venue` (pin fields + `coverImageUrl`).

Idempotent like the organizer follow routes (J.1–J.3). If OPTIDEEP prefers to implement a venue follow as a follow of its organizer, the contract above still holds (§ N.6).

Also **EXT** organizer follow (route J.1): accept `{ "notifyNewEvents": bool }` and return it.

---

## E. Discover rankings

The Discover tab shows ranked rows. "Top events this week" uses route 1 with `sort=popular` + a week window, so no new route. Places and artists need a server-side score.

### E.1 Route 136 — GET `/v1/discover/places`

"Best places this week" (ranked #1, #2 …).

| Param | Notes |
| ----- | ----- |
| `city` or `lat`/`lng`/`radiusKm` | Required (one of) |
| `period` | `week` (default) · `month` |
| `venueTypes[]` | optional |
| `limit` | default 10, max 30 |

**Response 200:** `{ "items": [ { "rank": 1, "score": 0.93, "venue": Venue } ], "period": { "from": ISO, "to": ISO } }`

Score proposal (tune freely, document it): bookings in the period at the venue's events + new follows + review count × average rating, normalised per city.

### E.2 Route 137 — GET `/v1/discover/artists`

"Best artists this month" and "All artists this month".

| Param | Notes |
| ----- | ----- |
| `city` or `lat`/`lng`/`radiusKm` | Required |
| `period` | `month` (default) · `week` |
| `musicGenres[]` | optional |
| `sort` | `rank` (default) · `name` |
| `limit`, `cursor` | § A.4 |

**Response 200:** `{ "items": [ { "rank": 1, "artist": ArtistCard, "gigsInPeriod": 6, "nextGig": GigSummary | null } ], "nextCursor", "hasMore" }` (shapes in § F).

Only artists with at least one published gig in the period and area are returned.

---

## F. Artists & line-ups

New entity. An artist is a performer (DJ, band, live act) that organizers attach to events. In Phase 4 artists are **created by organizers** from the admin app (get-or-create, like tags, § L.4); a self-service "claim your artist profile" flow comes later (§ N.3).

### F.1 Shared shapes

**`ArtistCard`**

```json
{
  "id": "uuid",
  "slug": "lina-k",
  "name": "Lina K.",
  "kind": "dj",
  "avatarUrl": "string | null",
  "genres": ["Deep house", "Minimal"],
  "city": "Paris",
  "followerCount": 22000,
  "isVerified": true,
  "isFollowing": false
}
```

`kind` ∈ `dj | band | live_act | singer | other`. `genres` are `music_style` tag labels (max 5).

**`Artist`** = `ArtistCard` plus:

```json
{
  "bio": "string | null",
  "coverImageUrl": "string | null",
  "gigsThisMonth": 6,
  "links": {
    "spotifyUrl": "string | null",
    "appleMusicUrl": "string | null",
    "soundcloudUrl": "string | null",
    "youtubeUrl": "string | null",
    "instagramHandle": "string | null",
    "websiteUrl": "string | null"
  },
  "spotifyArtistId": "string | null",
  "playsWith": [
    { "type": "venue", "id": "uuid", "name": "Studio Neuf" },
    { "type": "organizer", "id": "uuid", "name": "Nuit Blanche Collective" }
  ]
}
```

- `playsWith` = distinct venues/organizers from the artist's gigs in the last 12 months, max 6.
- Top tracks and releases (Music tab) are **not** stored in Odoo: our side fetches them from Spotify using `spotifyArtistId` (companion doc). Odoo only stores the id and links.

**`GigSummary`**

```json
{
  "eventId": "uuid",
  "eventTitle": "Deep House Session",
  "venueName": "Studio Neuf",
  "startsAt": "2026-11-18T23:00:00.000Z",
  "setStartsAt": "2026-11-19T02:00:00.000Z",
  "setEndsAt": "2026-11-19T04:00:00.000Z",
  "isHeadliner": true
}
```

### F.2 Route 138 — GET `/v1/artists`

Search for Discover's search box and the Artists tab. Params `q`, `city`, `musicGenres[]`, `limit`, `cursor`. Items: `ArtistCard`.

### F.3 Route 139 — GET `/v1/artists/:id`

Accepts uuid or `slug`. **Response 200:** `Artist`. **Errors:** `404`.

### F.4 Route 140 — GET `/v1/artists/:id/gigs`

Gigs tab. Params `when=upcoming|past` (default upcoming), `limit`, `cursor`. Items: `GigSummary`.

### F.5 Route 141 — GET `/v1/events/:id/lineup`

Line-up section of the event page.

```json
{
  "items": [
    {
      "artist": "ArtistCard",
      "role": "Closing set",
      "setStartsAt": "2026-11-19T02:00:00.000Z",
      "setEndsAt": "2026-11-19T04:00:00.000Z",
      "isHeadliner": true,
      "sortOrder": 0
    }
  ]
}
```

Sorted by `sortOrder`, then `setStartsAt`. `role`, set times nullable.

### F.6 Routes 142–144 — artist follows

- **142** PUT `/v1/me/followed-artists/:artistId` — body optional `{ "notifyGigs": bool }` (the "gig alerts" bell) → `{ "artistId", "isFollowing": true, "followerCount", "notifyGigs" }`.
- **143** DELETE `/v1/me/followed-artists/:artistId` → `{ "artistId", "isFollowing": false, "followerCount" }`.
- **144** GET `/v1/me/followed-artists` → cursor list of `ArtistCard`.

---

## G. Checkout: reservation holds, payments, pay at venue

Today `POST /v1/reservations` creates a reservation and **nothing is charged**. The redesign needs real payments, with two modes per booking:

- **Pay now** — pay in the app (Apple Pay, Google Pay, saved card, new card, 3-D Secure). Tickets are valid immediately.
- **Pay at the venue** — tickets are reserved now and paid at the door. Unpaid tickets are **released at `lastEntryAt`** (or event start + 2 h when `lastEntryAt` is null). The user can also pay any unpaid ticket later from the app ("Pay X now"), which is how a booking becomes **partly paid**.

Payment status therefore lives **on each ticket**, and the reservation's status is derived from its tickets.

### G.1 Route 145 — POST `/v1/reservation-holds`

Called when the checkout sheet opens and whenever the quantity changes. Holds seats for **10 minutes** so they cannot sell out under the user.

**Request**

```json
{ "eventId": "uuid-or-slug", "quantities": { "ticket-type-uuid": 2 } }
```

**Response 201**

```json
{
  "holdId": "uuid",
  "expiresAt": "2026-11-18T20:10:00.000Z",
  "quantities": { "ticket-type-uuid": 2 },
  "pricing": {
    "lines": [
      { "ticketTypeId": "uuid", "quantity": 2, "unitPriceCents": 1300, "regularUnitPriceCents": 1500, "doorUnitPriceCents": 2000, "lineTotalCents": 2600 }
    ],
    "subtotalCents": 2600,
    "serviceFeeCents": 0,
    "totalCents": 2600,
    "savingsCents": 1400,
    "currency": "EUR"
  }
}
```

- `savingsCents` = Σ (door price, or regular price when no door price, − charged price) × quantity. Shown as "You save".
- **Errors:** `422 unprocessable` (`sold_out`, `outside_sales_window`), `422 max_per_order`, `404`.

### G.2 Route 146 — PATCH `/v1/reservation-holds/:holdId`

Body `{ "quantities": {…} }`. Re-prices and **extends** `expiresAt` to now + 10 min. Same response as § G.1. **Errors:** `410 hold_expired`, `422 sold_out`.

### G.3 Route 147 — DELETE `/v1/reservation-holds/:holdId`

User closed the sheet. **204.** Idempotent.

### G.4 EXT route L.1 — POST `/v1/reservations`

New request fields:

```json
{
  "holdId": "uuid",
  "paymentMode": "payNow",
  "showOnProfile": false,
  "eventId": "…", "quantities": { … }, "attendees": [ … ], "billing": { … }
}
```

- `holdId` optional but expected from new builds; the reservation consumes the held seats. Expired hold → `410 hold_expired`.
- `paymentMode` ∈ `payNow | payAtVenue` (default `payNow`). `payAtVenue` on an event with `payAtVenueEnabled = false` → `422 pay_at_venue_disabled`. Free tickets ignore the mode.
- `showOnProfile` stored for the future Social profile; no behavior in Phase 4.
- `attendees[0]` is the buyer ("You"). Each guest's email receives its own ticket QR once that ticket is valid (paid, free, or pay-at-venue reserved) — email delivery is Odoo's.
- Max tickets per order = `maxTicketsPerOrder` (default 10).

**Resulting state**

| Mode | Reservation `status` | Tickets `paymentStatus` | Seats |
| ---- | -------------------- | ----------------------- | ----- |
| `payNow` (paid tiers) | `awaitingPayment` | `unpaid` | held until `paymentDueAt` = now + 10 min; then `expired` and released |
| `payAtVenue` | `confirmed` (or `pending` with manual approval) | `unpaid` | held until the release time (§ G.6) |
| all tickets free | `confirmed` / `pending` | `free` | taken |

**Response 201** adds `paymentMode`, `paymentStatus`, `paymentDueAt` (nullable) and `savingsCents` to the Phase 2 response.

**Reservation status** values become: `awaitingPayment | pending | confirmed | checkedIn | expired | cancelled | refunded`.

### G.5 Route 148 — POST `/v1/reservations/:id/payments`

Starts a payment for some or all unpaid tickets of a reservation (checkout "Pay now", and "Pay X now" on a pay-at-venue booking).

**Request**

```json
{
  "ticketIds": ["uuid", "uuid"],
  "method": "apple_pay",
  "paymentMethodId": "uuid | null",
  "savePaymentMethod": false,
  "returnUrl": "goswing://payments/return"
}
```

- `ticketIds` omitted = all unpaid tickets. They must belong to the caller's reservation and be `unpaid`.
- `method` ∈ `apple_pay | google_pay | card | saved_card`. `saved_card` requires `paymentMethodId` (Phase 2 § F id).
- Amount = Σ the tickets' charged prices (computed server-side from the reservation snapshot, never from the client).

**Response 201**

```json
{
  "paymentId": "uuid",
  "status": "requires_confirmation",
  "provider": "stripe",
  "clientSecret": "pi_…_secret_…",
  "amountCents": 2600,
  "currency": "EUR",
  "providerCustomerId": "cus_… | null",
  "ephemeralKey": "ek_… | null"
}
```

The app hands `clientSecret` to the provider SDK, which runs Apple/Google Pay or the card sheet and 3-D Secure. Odoo does **not** treat the payment as successful from the app's word — only from the provider webhook (§ G.7).

`status` ∈ `requires_confirmation | processing | succeeded | failed | cancelled`.

**Errors:** `404`, `403`, `409 conflict` (a ticket is not `unpaid`), `410 hold_expired` (pay-now reservation expired).

### G.6 Pay-at-venue release rule

At the release time (`lastEntryAt`, else event start + 2 h — § N.2), every ticket still `unpaid` on a `payAtVenue` reservation becomes `released` and its seat returns to stock. Ticket holders get a notification 2 h and 30 min before the release (delivery is the existing notification worker's job, Phase 2 § S.4). Door payment (§ L.9) marks tickets paid before that.

### G.7 Route 149 — GET `/v1/payments/:paymentId`

The app polls this after the SDK returns, until `succeeded` or `failed` (webhook latency). **Response 200:** `{ "paymentId", "status", "amountCents", "currency", "reservationId", "ticketIds", "failureMessage": "string | null" }`.

### G.8 Route 150 — POST `/v1/webhooks/payments/:provider` (provider → Odoo)

Not called by our apps. On a verified success event Odoo, in one transaction: marks the payment `succeeded`, sets those tickets `paymentStatus = paid` + `paidAt`, moves an `awaitingPayment` reservation to `confirmed` (or `pending` under manual approval), and sends the ticket emails. Failure/expiry events mark the payment `failed`. Must be idempotent on the provider event id.

### G.9 Route 151 — POST `/v1/me/payment-methods/setup`

"Add a new card" in Profile → Payment methods (today it shows an alert). Returns a provider setup secret; the app collects the card with the provider SDK; the provider webhook (or the app calling Phase 2 F.2 with the resulting `providerPaymentMethodId`) stores the card.

**Response 201:** `{ "provider": "stripe", "setupClientSecret": "seti_…", "providerCustomerId": "cus_…", "ephemeralKey": "ek_…" }`

### G.10 Route 152 — GET `/v1/me/payments`

"Recent transactions" on the Payment methods screen (wallet is out of scope; this is payment history only). Cursor list:

```json
{ "items": [ {
  "paymentId": "uuid",
  "label": "Deep House Session · 2 tickets",
  "reservationId": "uuid",
  "method": "apple_pay",
  "cardLastFour": "4242 | null",
  "amountCents": 2600,
  "currency": "EUR",
  "kind": "payment",
  "status": "succeeded",
  "createdAt": "ISO"
} ], "nextCursor": null, "hasMore": false }
```

`kind` ∈ `payment | refund`; refunds have negative semantics in the UI.

---

## H. Bookings (extensions)

### H.1 EXT routes L.2 / L.3 — reservation shapes

Add to each reservation (list and detail):

```json
{
  "bookingRef": "GS-AFR4X9",
  "paymentMode": "payAtVenue",
  "paymentStatus": "partlyPaid",
  "paidCents": 1300,
  "dueCents": 1300,
  "releaseAt": "2026-11-19T01:00:00.000Z",
  "savingsCents": 1400,
  "showOnProfile": false,
  "event": { "…": "existing fields", "imageUrl": "string | null", "addressLine1": "string | null", "location": { "lat": 0, "lng": 0 } }
}
```

and to each ticket:

```json
{
  "paymentStatus": "paid",
  "paidAt": "ISO | null",
  "chargedPriceCents": 1300,
  "qrValue": "GSV1:…",
  "checkedInAt": "ISO | null"
}
```

- `bookingRef` short human code shown on tickets.
- Reservation `paymentStatus` ∈ `paid | partlyPaid | unpaid | free | refunded`, derived from tickets.
- Ticket `paymentStatus` ∈ `paid | unpaid | free | released | refunded`.
- `releaseAt` set only when there are unpaid pay-at-venue tickets.
- The app shows **Used** when every ticket has `checkedInAt`, **Ended** for past events; no field needed.
- QR codes are returned for unpaid pay-at-venue tickets too (the door collects payment on scan).

### H.2 EXT route L.2 — summary for the Bookings header

```json
"summary": { "totalSavingsCents": 7700, "currency": "EUR", "bookingsCount": 5, "ticketsCount": 11, "activeCount": 3 }
```

Computed over **all** the user's reservations (not just the current page). Multiple currencies: return the user's most-used currency and convert nothing — sum only that currency (§ N.8).

### H.3 EXT route L.4 — cancel

Phase 2 L.4 (`POST /v1/reservations/:id/cancel`) is still unbuilt. Phase 4 needs it **only for pay-at-venue bookings with no paid tickets** (the user frees seats they won't use). Paid tickets stay non-refundable per the event policy. **Errors:** `409 conflict` otherwise.

### H.4 Route 153 — PATCH `/v1/reservations/:id`

`{ "showOnProfile": bool }`. Stored only (future Social). **200** with the reservation.

---

## I. Reviews (venues, organizers, eligibility, helpful votes)

Today users can review **events** only; venue reviews exist for admins (reply/like) but users cannot write them, and nothing tells the app what the user may review.

### I.1 Route 154 — GET `/v1/me/review-eligibility`

Feeds "Waiting for your review" in My reviews and the "Write a review" button state.

**Query:** `targetType` (`event | venue | organizer`, optional), `targetId` (optional).

```json
{ "items": [ {
  "targetType": "venue",
  "targetId": "uuid",
  "targetName": "Studio Neuf",
  "imageUrl": "string | null",
  "reservationId": "uuid",
  "visitDate": "2026-11-14T22:00:00.000Z",
  "eventTitle": "Deep House Session",
  "reviewed": false
} ] }
```

Rule: a user may review an event, its venue and its organizer **once per past reservation** that has at least one ticket checked in (or, until door scanning is in use, a `confirmed` reservation whose event has ended — § N.7). With `targetId`, an empty list means "Only guests who booked can review"; a list where every item is `reviewed: true` means "You've reviewed all your visits".

### I.2 Route 155 — POST `/v1/venues/:id/reviews`

```json
{ "reservationId": "uuid", "rating": 5, "comment": "string | null" }
```

`rating` 1..5, `comment` ≤ 500 chars. One review per (user, venue, reservation). **201** with the review. **Errors:** `403 review_not_eligible`, `409 conflict`.

### I.3 Route 156 — POST `/v1/organizers/:id/reviews`

Same contract as § I.2 for organizers (organizer reviews are already readable via Phase 2 I.4).

### I.4 Route 157 — GET `/v1/venues/:id/reviews`

Reviews tab of the place page.

```json
{
  "summary": { "average": 4.6, "count": 312, "breakdown": { "5": 210, "4": 70, "3": 20, "2": 8, "1": 4 } },
  "items": [ { "id": "uuid", "rating": 5, "comment": "…", "createdAt": "ISO", "author": { "displayName": "Inès R.", "avatarUrl": null }, "helpfulCount": 4, "isHelpfulByMe": false, "adminReply": "string | null" } ],
  "nextCursor": null, "hasMore": false
}
```

Also **EXT** Phase 2 I.4 (organizer reviews) to include the same `summary` block, and add `GET /v1/events/:id/reviews` (**route 158**) with the same shape for the event page.

### I.5 Route 159 — PUT / DELETE `/v1/reviews/:id/helpful`

Toggle "Helpful" on any review (event, venue, organizer). Response `{ "helpfulCount", "isHelpfulByMe" }`. Users cannot mark their own review.

### I.6 EXT Phase 2 N.3 / N.4 — my reviews

- `GET /v1/me/reviews` accepts `type=event|venue|organizer` and returns a `targetType` + `target { id, name, imageUrl }` on each item, plus `stats { count, averageGiven, helpfulReceived }`. `helpfulCount` must be real (always 0 today).
- `PATCH /v1/reviews/:id` and `DELETE /v1/reviews/:id` must work for venue and organizer reviews too.

---

## J. Music: suggestions, live voting, saved songs

Two stages per event, configured by the organizer (§ L.6):

- **Before the event — suggest:** ticket holders suggest songs until a cutoff, up to a per-user limit (exists today as Phase 2 § O, Deezer tracks).
- **During the event — vote:** the DJ/organizer opens a **vote list** (tracks picked from suggestions or added directly); attendees vote in near real time. Voting is unlocked by holding a ticket **or** by scanning the venue's QR code at the venue, which only works once the event has started.

### J.1 Event music settings (stored on the event, written in § L.6)

```json
{
  "musicMode": "both",
  "suggestionsCloseAt": "2026-11-18T22:00:00.000Z",
  "suggestionsPerUser": 3,
  "votingRequiresTicket": false
}
```

`musicMode` ∈ `both | suggest | vote | none`. `votingRequiresTicket: false` allows venue-QR unlock for walk-ins.

### J.2 Route 160 — GET `/v1/events/:id/music`

One call that tells the event page what to show.

```json
{
  "musicMode": "both",
  "phase": "before",
  "suggestions": { "open": true, "closesAt": "ISO", "perUserLimit": 3, "mineCount": 1, "canSuggest": true, "reason": null },
  "voting": { "open": false, "activeVoteListId": null, "canVote": false, "unlockedBy": null, "reason": "not_started" }
}
```

- `phase` ∈ `before | live | ended` (from event times).
- `reason` codes when not allowed: `no_ticket`, `closed`, `limit_reached`, `not_started`, `locked`, `mode_disabled`.
- `unlockedBy` ∈ `ticket | venue_code | null`.

### J.3 EXT Phase 2 O.1 — POST `/v1/events/:id/song-suggestions`

Enforce `suggestionsCloseAt` (`409 conflict`, `details.reason: "suggestions_closed"`), `musicMode` (`422 unprocessable`, `details.reason: "mode_disabled"`) and `suggestionsPerUser` (`422 suggestion_limit`). Keep the Deezer payload; additionally accept an optional `previewUrl` (30 s preview) and `durationSec`. See § N.5 on Spotify/Apple Music.

### J.4 Route 161 — POST `/v1/events/:id/music/unlock`

The user scanned the venue QR.

```json
{ "venueCode": "GSVENUE:evt=uuid;c=7Q2K9X" }
```

Valid only while `startsAt <= now < endsAt` and the code matches the event's current rotating code (§ L.8). Unlock is stored per (user, event). **200** `{ "unlocked": true }`. **Errors:** `422 unprocessable` (`details.reason`: `invalid_code | not_started | ended`).

### J.5 Route 162 — GET `/v1/events/:id/vote-list`

The open vote list (polled every 5 s with `ETag`, § A.5).

```json
{
  "voteListId": "uuid",
  "title": "Next up",
  "open": true,
  "closesAt": "ISO | null",
  "votesPerUser": 3,
  "myVotesLeft": 2,
  "items": [
    { "trackId": "uuid", "title": "Velvet Hours", "artistName": "Lina K.", "artworkUrl": "…", "previewUrl": "… | null", "durationSec": 402, "voteCount": 128, "votedByMe": true }
  ]
}
```

Sorted by `voteCount` desc. `404` when no list is open.

### J.6 Routes 163–164 — vote

- **163** PUT `/v1/vote-lists/:voteListId/tracks/:trackId/vote` → `{ "voteCount", "votedByMe": true, "myVotesLeft" }`
- **164** DELETE same path → `{ "voteCount", "votedByMe": false, "myVotesLeft" }`

**Errors:** `403 voting_locked`, `409 voting_closed`, `422 unprocessable` (`details.reason: "no_votes_left"`).

### J.7 Routes 165–167 — saved songs

"Save song" from a vote list or suggestions; shown in Profile → Saved → Songs.

- **165** GET `/v1/me/saved-songs` → cursor list `{ id, provider: "deezer", providerTrackId, title, artistName, artworkUrl, durationSec, previewUrl, externalUrl, fromEvent { id, title } | null, savedAt }`
- **166** PUT `/v1/me/saved-songs` body `{ provider, providerTrackId, title, artistName, artworkUrl, durationSec, previewUrl, externalUrl, eventId }` → **201**; idempotent on (user, provider, providerTrackId).
- **167** DELETE `/v1/me/saved-songs/:id` → **204**.

---

## K. Profile & account

Social parts of the profile (posts, followers, highlights) are deferred. The Profile tab shows an account header: avatar, name, @username, city, and the existing stats (events attended / saved / reviews).

### K.1 EXT Phase 2 C.1 / C.3 — profile fields

Add to `GET`/`PATCH /v1/me/profile`:

```json
{
  "username": "mehdi.lj",
  "bio": "string | null",
  "dateOfBirth": "1996-04-12",
  "emailVerified": true
}
```

- `username`: 3–24 chars, `^[a-z0-9._]+$`, no leading/trailing dot, unique case-insensitively, reserved words blocked (`admin`, `goswing`, `support`…). `409 username_taken` on conflict. Nullable for existing users; new users get a generated one on init (§ C.2) that they can change.
- `bio` ≤ 150 chars. `dateOfBirth` ISO date, user must be ≥ 16 (§ N.10).
- Email and phone stay owned by Clerk (changes + verification happen in Clerk). The API keeps syncing them from Clerk as today.

### K.2 Route 168 — GET `/v1/usernames/:username/availability`

Live check while typing in Edit profile. **200** `{ "username": "mehdi.lj", "available": true, "reason": null }` with `reason` ∈ `taken | reserved | invalid | null`. Rate-limit per user (e.g. 30/min). The caller's own current username returns `available: true`.

### K.3 Route 169 — POST `/v1/me/avatar` (multipart)

Today Edit profile PATCHes the phone's local file path as `avatarUrl` (a bug). Field `file` (JPEG/PNG/HEIC/WebP, ≤ 10 MB). Server stores it, resizes (e.g. 512 px), and updates the profile. **201** `{ "avatarUrl": "https://…" }`. `DELETE /v1/me/avatar` → **204** (remove photo).

### K.4 EXT Phase 2 C.6 — delete with a 30-day grace period

`POST /v1/me/profile/delete` sets `accountStatus = "pendingDeletion"` and `scheduledDeletionAt = now + 30 days` instead of deleting immediately; future pay-at-venue tickets are released and unpaid holds dropped at once. Add **route 170** `POST /v1/me/profile/cancel-deletion` → back to `active`. A job performs the Phase 2 C.6 deletion when the date passes (§ M).

### K.5 Route 171 — POST `/v1/me/data-export`

"Download my data". **202** `{ "requestId": "uuid", "estimatedReadyAt": "ISO" }`. Odoo emails a download link within 48 h (profile, reservations, tickets, payments, reviews, suggestions, saved items, follows). One open request at a time (`409 conflict`).

### K.6 Saved items

Saved events (Phase 2 § K), followed organizers (J), followed venues (§ D.7), followed artists (§ F.6) and saved songs (§ J.7) together cover the Saved screen. No other route needed. Saved **posts** are Social (deferred).

### K.7 Settings already covered

Settings (D), notification preferences (E — quiet hours already exist), payment methods (F + § G.9), login history (G), interests (H). The new "Language EN/FR" quick setting uses the existing `language` field of `/v1/me/settings`; confirm it exists (§ N.11).

---

## L. Admin routes & fields

What partners need in `goswing-admin` to produce the data above. All `/v1/admin/*` rules from Phase 3 apply (organizer scoping, roles).

### L.1 EXT routes 78–79 — event create / update

New body fields:

```json
{
  "doorsOpenAt": "ISO | null",
  "lastEntryAt": "ISO | null",
  "minAge": 18,
  "payAtVenueEnabled": true,
  "maxTicketsPerOrder": 10,
  "musicSettings": { "musicMode": "both", "suggestionsCloseAt": "ISO | null", "suggestionsPerUser": 3, "votingRequiresTicket": false },
  "lineup": [ { "artistId": "uuid", "role": "string | null", "setStartsAt": "ISO | null", "setEndsAt": "ISO | null", "isHeadliner": true } ],
  "ticketTiers": [ {
    "name": "Early entry", "description": "string | null",
    "priceCents": 1500, "salePriceCents": 1300, "doorPriceCents": 2000,
    "currency": "EUR", "capacity": 200, "isFree": false, "freeForLadies": false,
    "benefits": ["Welcome drink"],
    "salesStartAt": "ISO | null", "salesEndAt": "ISO | null"
  } ]
}
```

- Validation: `doorsOpenAt <= startsAt`; `startsAt <= lastEntryAt <= endsAt`; `salePriceCents < priceCents`; `maxTicketsPerOrder` 1..20; `suggestionsPerUser` 1..10.
- `benefits` and sales windows were already missing from the Phase 3 tier write input — add them.
- The same fields appear in route 76 (event detail) responses.

### L.2 EXT routes 82 / 84 / 81 / 83 — venue create / update / read

Add `area`, `priceLevel`, `phone`, `websiteUrl`, `instagramHandle`, `amenities[]`, `openingHours[]`, `openingHoursNote`, `googlePlaceId`, `logoUrl` (§ D.1 definitions). Validate `openingHours` entries (`day` 0..6, `HH:MM`).

### L.3 Venue media

Reuse the organizer gallery (routes 68–70) as the venue's photos & videos; add `mediaType: "video"` support with `thumbnailUrl` (route 115 upload needs `kind: "organizerVideo"`, max 100 MB, mp4/mov).

### L.4 Routes 172–174 — artists (admin)

- **172** GET `/v1/admin/artists?q=` — search all artists (global, not organizer-scoped) for the line-up picker. Items: `ArtistCard` + `createdByOrganizerId`.
- **173** POST `/v1/admin/artists` — get-or-create by normalised name: `{ "name", "kind", "genres": [tagId], "city", "avatarUrl", "links": { … }, "spotifyArtistId" }` → **201** `{ "artistId", "created": true }` (or 200 with `created: false` on match).
- **174** PATCH `/v1/admin/artists/:id` — only the creating organizer may edit, and only while the artist is unclaimed (§ N.3). **403** otherwise.

### L.5 Route 175 — PUT `/v1/admin/events/:id/lineup`

Replace the whole line-up (same array as § L.1 `lineup`). **200** with the § F.5 response. Lets the line-up be edited without re-sending the event.

### L.6 Music settings

Part of § L.1. Role `dj` must be allowed to PATCH `musicSettings` and the line-up of the organizer's events (and nothing else on the event).

### L.7 Routes 176–179 — vote lists (roles `admin`, `dj`)

- **176** GET `/v1/admin/events/:id/vote-lists` → `{ "items": [ { "voteListId", "title", "status": "draft|open|closed", "opensAt", "closesAt", "votesPerUser", "items": [ { "trackId", "title", "artistName", "artworkUrl", "voteCount", "fromSuggestionId": "uuid | null" } ] } ] }`
- **177** POST `/v1/admin/events/:id/vote-lists` — `{ "title", "votesPerUser": 3, "trackIds"?: [], "fromSuggestionIds"?: [], "tracks"?: [ Deezer payload ], "opensAt"?: ISO, "closesAt"?: ISO }` → **201**.
- **178** PATCH `/v1/admin/vote-lists/:id` — edit title/limits/tracks, or `{ "status": "open" | "closed" }`. At most **one open** list per event (`409 conflict`).
- **179** DELETE `/v1/admin/vote-lists/:id` — draft only. **204**.

Also **EXT** route 108 (song suggestions) to return `suggestionCount` per track (how many users suggested it) so DJs can pick.

### L.8 Route 180 — GET `/v1/admin/events/:id/venue-code`

The QR the venue displays to unlock live voting (§ J.4). **200** `{ "venueCode": "GSVENUE:evt=uuid;c=7Q2K9X", "rotatesAt": "ISO" }`. The code rotates every 24 h (or on demand with `POST …/venue-code/rotate`, **route 181**), so a photo of last week's code is useless.

### L.9 Routes 182–185 — door check-in & payment (roles `admin`, `entrance_manager`)

No scan endpoint exists today (only route 92 sets a whole order to `checkedIn`). Pay at venue needs one.

- **182** POST `/v1/admin/checkins` — `{ "eventId", "qrValue" }` or `{ "eventId", "ticketCode" }` (manual entry). Validates, and if the ticket is paid/free marks it checked in. **200**:

```json
{
  "result": "checked_in",
  "ticket": { "id", "ticketCode", "ticketTypeName", "holderName", "paymentStatus": "paid", "chargedPriceCents": 1300, "checkedInAt": "ISO" },
  "reservation": { "id", "bookingRef", "ticketsTotal": 4, "ticketsCheckedIn": 2 },
  "checkinId": "uuid"
}
```

`result` ∈ `checked_in | payment_due`. `payment_due` = unpaid pay-at-venue ticket: not checked in yet; the door collects payment (route 184) then scans again (or passes `"checkInAfterPayment": true` on 184). **Errors:** `409 already_checked_in` (with the earlier `checkedInAt`), `422 wrong_event` (with that ticket's event title), `404` unknown code, `410` released ticket.

- **183** DELETE `/v1/admin/checkins/:checkinId` — undo a mistaken scan. **204**.
- **184** POST `/v1/admin/tickets/:ticketId/collect-payment` — `{ "method": "cash | card_terminal", "amountCents", "checkInAfterPayment": true }` → ticket `paid` (`paidVia: "door"`), recorded as a door transaction in finance. **200** with the § L.9 ticket shape.
- **185** GET `/v1/admin/events/:id/guests?q=&status=` — guest list search at the door: holder name, ticketCode, ticket type, `paymentStatus`, `checkedInAt`. Cursor list.

Use the existing `ticket_checkins` table for check-in records so `checkedInAt` is a real scan time (Phase 3 T7/T8).

### L.10 EXT routes 90–94, 95 — orders, attendees, finance

- Orders and attendees gain `paymentMode`, `paymentStatus`, `paidCents`, `dueCents`, and per-ticket `paymentStatus`. Filter `paymentStatus=`.
- Finance transactions include door payments (`provider: "door"`, `method: cash | card_terminal`) and in-app payments with the real provider.
- Check-in summary (route 94) gains `unpaidCount` and `releasedCount`.

---

## M. Background jobs

| Job | Schedule | Effect |
| --- | -------- | ------ |
| Hold expiry | every minute | Expired holds (§ G.1) and `awaitingPayment` reservations past `paymentDueAt` → seats released, reservation `expired` |
| Pay-at-venue release | every minute | § G.6 |
| Release reminders | every 5 min | Notify holders 2 h and 30 min before release |
| Event status | every minute | `published → live → completed` from event times |
| Venue `openNow` | on read or every 5 min | § D.1 |
| Rankings | hourly | § E scores per city and period |
| Rating aggregates | on review write | Venue / organizer `rating`, review `summary` |
| Account deletion | daily | § K.4 |
| Data export | queued | § K.5 |
| Venue code rotation | every 24 h | § L.8 |

---

## N. Open questions for OPTIDEEP

1. **Payment provider.** The spec assumes Stripe (Phase 2 F already stores `provider: "stripe"`), using Odoo's payment provider module if it fits. Staging data is in **MAD** (Tangier) while the design is in **EUR** (Paris): Stripe does not onboard Moroccan merchants. Which provider(s) per country — Stripe for EUR, CMI (or other) for MAD? The routes in § G are provider-agnostic (`provider` + `clientSecret`); tell us what the SDK needs.
2. **Release time** when `lastEntryAt` is null: we propose event start + 2 h. Confirm or propose another default.
3. **Artist ownership.** Phase 4 artists are created by organizers. Later, artists claim their profile (the "Become an artist" flow). Who merges duplicates, and do you want a `claimedByUserId` field now?
4. **Realtime voting.** Polling every 5 s with ETag is acceptable for v1? If Odoo can serve SSE (`GET /v1/events/:id/vote-list/stream`) cheaply, say so.
5. **Music provider.** Suggestions use Deezer today (free search + 30 s previews). We plan to keep Deezer for suggestions and voting in v1 and use Spotify only for artist pages (our side). Confirm the suggestion model stays provider-tagged (`provider: "deezer"`) so Spotify/Apple Music can be added later.
6. **Venue follows vs organizer follows.** Venues have a unique `organizer_id`; is a separate `venue_follows` table OK, or do you prefer to map venue follows onto organizer follows?
7. **Review eligibility** before door scanning is used everywhere: accept `confirmed` reservations whose event has ended?
8. **Multi-currency savings** (§ H.2): OK to sum only the dominant currency?
9. **Amenities list** (§ D.1): proposed `cloakroom, terrace, smoking_area, accessible, card_payment, parking, vip_area, dance_floor, live_music, food, wifi`. Add or rename as you like; it is a closed list.
10. **Minimum age** for accounts (we propose 16) and whether `minAge` on events must be enforced at checkout (requires `dateOfBirth`).
11. **Language.** Confirm `/v1/me/settings` has a `language` field (`en | fr`) and that emails (tickets, receipts) use it.
12. **Map payload size.** Is `GET /v1/venues?view=pin&bbox=` with up to 500 items fast enough, or should we add server-side clustering?

---

## O. Implementation order (recommended)

| Slice | Content | Unblocks |
| ----- | ------- | -------- |
| **P4-0** | § B prerequisites | Everything (partners can create events again) |
| **P4-A** | § C.2–C.3 event and ticket fields + § L.1 tier/event write fields | Event page, cards, sale and door prices, "Only N left" |
| **P4-B** | § D venues + § L.2–L.3 venue fields | Map venue pins, place pop-up, place page |
| **P4-C** | § G holds + payments + pay at venue, § H booking fields, § L.9–L.10 door check-in | Real checkout, Bookings statuses, door operations. **Largest slice; start the provider decision (§ N.1) now.** |
| **P4-D** | § K profile (username, avatar upload, delete grace, export) | Edit profile, account settings |
| **P4-E** | § I reviews | Place/organizer reviews, My reviews |
| **P4-F** | § F artists + § L.4–L.5 + § E.2 | Artists tab, artist page, line-ups |
| **P4-G** | § J music voting + saved songs + § L.6–L.8 | Live voting, Saved → Songs |
| **P4-H** | § C.1 server filters, § E.1 rankings, § D.2 `bbox` | Scale: Discover and Map on large catalogs |

The mobile app can ship Map/Discover/Bookings visuals on today's data while P4-A…C land; features light up as each slice ships.

---

## P. Mapping to the redesign screens

| Screen | Uses |
| ------ | ---- |
| **Map** — event pins, price chips, live flame, carousel | Route 1 (+ § C.1/C.2) |
| Map — venue pins, category chips, search | 128 (`view=pin`, `bbox`, `q`) |
| Map — event pop-up | 2, 3, organizer routes (Phase 2 I) |
| Map — place pop-up | 129, 131, 132, 133/134, 157 (+ Google rating from our proxy) |
| **Discover** — events rows, filters, search | 1 (+ § C.1) |
| Discover — places rows | 136, 128 |
| Discover — artists rows | 137, 138, 142/143 |
| **Event page** | 2, 3, 119 (gallery), 141 (line-up), 158 (reviews), 5, 6, 160–167 (music), Phase 2 K (save) |
| **Place page** | 129–135, 157, 155 |
| **Organizer page** | Phase 2 I.1–I.5 (+ review summary), 156 |
| **Artist page** | 139, 140, 142–144 |
| **Checkout** | 145–148, 149, Phase 2 L.1 (+ § G.4), Phase 2 F (saved cards) |
| **Bookings** list + tickets | Phase 2 L.2/L.3 (+ § H), 148 ("Pay X now"), 153, L.4 cancel |
| **Profile** header + overview | Phase 2 C.1 (+ § K.1) |
| Edit profile | C.3, 168, 169 |
| Account settings | Clerk (our side) + 170, 171, Phase 2 G |
| Payment methods | Phase 2 F, 151, 152 |
| Notifications | Phase 2 E |
| Saved | Phase 2 K, J.3, 135, 144, 165–167 |
| My reviews | Phase 2 N.3 (+ § I.6), 154, 155, 156, 159 |
| **Admin** — event form | 78/79 (+ § L.1), 172–175 |
| Admin — venue form | 82/84 (+ § L.2) |
| Admin — music | 108 (+ ext), 176–181 |
| Admin — door / attendees / orders / finance | 182–185, 90–95 (+ § L.10) |

---

## Review checklist (for the API team)

- [ ] § B prerequisites scheduled first
- [ ] Every new field has a storage location in the Odoo models (venue, event, ticket type, ticket, reservation, payment, artist, line-up, vote list, saved song, venue follow, artist follow, venue/organizer review, helpful vote)
- [ ] Payment provider chosen per currency (§ N.1) and webhook endpoint reachable from the provider
- [ ] Seat availability accounts for holds, pay-now pending and pay-at-venue reservations
- [ ] Release and expiry jobs are idempotent
- [ ] Public routes accept an optional JWT (§ A.1)
- [ ] Open questions § N answered in writing
