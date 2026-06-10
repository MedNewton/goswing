# GoSwing REST API — Full Specification & Integration Guide

**Audience:** developers (and AI coding agents) migrating a GoSwing client app — specifically the **Next.js admin panel** — from Supabase to the GoSwing REST API (Odoo-backed).
**Status:** This API is live on staging and is what the GoSwing **mobile app** (React Native/Expo, this repo) uses for 100% of its data access as of June 2026. Supabase has been fully removed from the mobile app.
**Sources of truth:** `gooswing-staging.postman_collection2.json` (route catalog), `docs/superpowers/specs/2026-05-21-rest-api-phase-2-routes.md` (payload contracts), `lib/api/*` (reference client implementation).

---

## 1. Overview

The API replaces direct Supabase (PostgREST) table access. Key differences from the Supabase model:

| Supabase model | REST API model |
| -------------- | -------------- |
| Client queries tables directly (`.from('events').select(...)`) | Client calls purpose-built routes (`GET /v1/events`) |
| Row Level Security enforces ownership via JWT claims | The server derives the acting user from the JWT `sub` claim; `/v1/me/*` routes are implicitly scoped |
| Client computes joins, prices, labels | Server returns denormalized, ready-to-render payloads (e.g. reservations come with event title, venue, totals, even QR payloads) |
| Client writes multiple rows transactionally (e.g. checkout) | One route per use case; the server owns the transaction (e.g. `POST /v1/reservations`) |
| Supabase Storage buckets (`story-photos`) | Multipart upload routes; the server owns storage |

There are **58 routes**: 7 read-only event-discovery routes (Phase 1) + 51 user-scoped routes (Phase 2).

> ⚠️ **Important for the admin panel:** every route in this API is **end-user scoped**. There are currently **no admin/management routes**. See § 8 for the explicit list of admin operations that have no API route yet — do not assume or invent routes beyond this catalog.

---

## 2. Fundamentals

### 2.1 Base URL & auth

- Base URL: `https://web.gooswing.com` (staging). Make it configurable: the mobile app uses `EXPO_PUBLIC_API_BASE_URL`; use e.g. `NEXT_PUBLIC_GOOSWING_API_BASE_URL` / `GOOSWING_API_BASE_URL` in the admin app.
- **Every route** requires `Authorization: Bearer <clerk_jwt>` — a session token from Clerk (the **default** session token, *not* a `supabase`-template token). Even catalog routes require a valid JWT.
- The JWT `sub` claim is the canonical user id (`user_…`). The API **never trusts a `userId` in a request body** — don't send one.
- ⚠️ **Clerk instance:** the API validates JWTs against a specific Clerk instance. At the time of the mobile migration the API trusted `easy-snapper-18.clerk.accounts.dev` while the mobile app used `accurate-magpie-7.clerk.accounts.dev`. If every request returns `401 unauthenticated` with a seemingly valid token, this mismatch is the first thing to check with the backend team.
- Clerk session tokens are short-lived (~60s). **Fetch a fresh token per request** — do not cache tokens.

### 2.2 JSON conventions

- All keys are `camelCase`.
- Timestamps: ISO 8601 UTC with milliseconds — `"2026-06-15T19:00:00.000Z"`.
- Money: integer **cents** (`priceCents: 4500`) + `currency` (ISO 4217 uppercase: `"USD"`, `"EUR"`, `"MAD"`).
- IDs: UUID v4 strings, except Clerk user ids (`user_…`) and event slugs (`externalId`). Any `:eventId` path param accepts **UUID or slug**.
- Optional "no value" fields are explicit `null`; empty arrays are `[]`, never `null`.

### 2.3 Error envelope

Every non-2xx response has this body:

```json
{ "error": { "code": "string", "message": "string", "details": null } }
```

| Code | HTTP | When |
| ---- | ---- | ---- |
| `unauthenticated` | 401 | Missing / invalid / expired JWT |
| `forbidden` | 403 | Authenticated but not allowed (incl. `account_deactivated`, `account_deleted`, `review_not_eligible`) |
| `not_found` | 404 | Resource doesn't exist or isn't visible |
| `validation_failed` | 400 | Bad body/query — `details` carries `{ "field": "…" }` |
| `conflict` | 409 | Duplicate / state violation (already reviewed, idempotency-key reuse with different payload) |
| `unprocessable` | 422 | Well-formed but inapplicable (`details.reason: "sold_out" \| "outside_sales_window"`) |
| `rate_limited` | 429 | Too many requests |
| `upstream_unavailable` | 502 | Odoo unreachable |
| `internal_error` | 500 | Unhandled server error |

### 2.4 Pagination

Unbounded listings are **cursor-paginated**:

- Request: `?limit=20&cursor=<opaque>`
- Response: `{ "items": [...], "nextCursor": "string | null", "hasMore": boolean }`
- Max `limit` is 100 unless noted (200 for stories, 50 for organizer events).
- Bounded listings (Phase 1 event routes, ticket types) return a **plain array**.

### 2.5 Idempotency & status codes

- Creating `POST` routes accept an optional `Idempotency-Key` header (UUID). Replays within 24h return the original response. **Always send one on `POST /v1/reservations`.**
- `GET`/`PATCH`/`PUT`/action-`POST` → 200; create-`POST` → 201; `DELETE` → 204 (no body) unless the route documents an echo body.

### 2.6 Soft-deleted users

- `accountStatus = "deactivated"` → reads succeed, writes return `403` `account_deactivated`.
- `accountStatus = "deleted"` → every route returns `403` `account_deleted`.

---

## 3. Client implementation pattern (reference: mobile app `lib/api/client.ts`)

The mobile app's wrapper is the proven reference. For Next.js, the equivalent is:

```ts
// lib/api/client.ts (Next.js sketch)
import { auth } from '@clerk/nextjs/server'; // server-side; use useAuth().getToken() client-side

const BASE_URL = process.env.GOOSWING_API_BASE_URL ?? 'https://web.gooswing.com';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details: unknown = null,
    public status = 0,
  ) { super(message); this.name = 'ApiError'; }
}

export async function apiCall<T>(path: string, opts: {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;                     // plain object → JSON; FormData → multipart
  headers?: Record<string, string>;   // e.g. { 'Idempotency-Key': uuid }
} = {}): Promise<T> {
  const { getToken } = await auth();
  const token = await getToken();     // fresh token per request — do not cache
  if (!token) throw new ApiError('unauthenticated', 'No Clerk session', null, 401);

  const qs = opts.query
    ? '?' + Object.entries(opts.query)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';

  const isFormData = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}${qs}`, {
    method: opts.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body === undefined ? undefined
      : isFormData ? (opts.body as FormData)
      : JSON.stringify(opts.body),
    cache: 'no-store', // user-scoped data; do not let Next.js cache it
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const e = body?.error ?? {};
    throw new ApiError(e.code ?? `http_${res.status}`, e.message ?? res.statusText, e.details ?? null, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

Notes:

- For **FormData** bodies (story upload), do **not** set `Content-Type` yourself — fetch sets the multipart boundary.
- In the mobile repo, typed per-domain wrappers live in `lib/api/{events,me,organizers,reservations,engagement}.ts` and raw response types in `lib/api/types.ts` — copy these shapes rather than re-deriving them.

---

## 4. Complete route catalog

Shapes below are the full contracts. `?` means the field may be `null`.

### 4.1 Events — discovery (Phase 1, routes 1–7)

| # | Method & path | Returns |
| - | ------------- | ------- |
| 1 | `GET /v1/events` | `Event[]` — all published events |
| 2 | `GET /v1/events/:id` | `Event` — `:id` is UUID or slug |
| 3 | `GET /v1/events/:id/ticket-types` | `TicketType[]` |
| 4 | `GET /v1/organizers/:organizerId/events?limit&exclude` | `MiniEvent[]` |
| 5 | `GET /v1/events/:id/similar?limit` | `MiniEvent[]` |
| 6 | `GET /v1/events/upcoming-by-venue-or-organizer?venueId&organizerId&exclude&limit` | `MiniEvent[]` (with `venueId`, `venue`, `location`) |
| 7 | `GET /v1/events/:id/attendees?limit` | `{ attendees: Attendee[], totalCount: number }` |

```ts
type Event = {
  id: string; externalId?: string; title: string; description?: string;
  organizer?: string; organizerId?: string;
  imageUrl?: string; startsAtIso?: string; endsAtIso?: string;
  venue?: string; venueId?: string; venueType?: string; city?: string; countryCode?: string;
  category?: string; categories?: string[];
  access?: string[]; musicStyles?: string[]; partyTypes?: string[];
  basePrice?: number; priceLabel?: string;
  favorite?: boolean; attendees?: { userId?: string; displayName?: string; initials?: string; avatarUrl?: string }[];
  attendeesExtraCount?: number; attendeeCount?: number;
  waitlistEnabled?: boolean; approvalMode?: string; sharingEnabled?: boolean;
  policies?: unknown[]; location?: { lat: number; lng: number };
};

type MiniEvent = { id: string; title: string; imageUrl?: string; startsAtIso?: string; priceLabel?: string; attendeeCount?: number };

type TicketType = {
  id: string; name?: string; priceCents?: number; currency?: string;
  isFree?: boolean; freeForLadies?: boolean; benefits?: string[];
  seatsMax?: number; seatsAvailable?: number;
};
```

Route 4 extended (Phase 2 § I.5): adds `?when=upcoming|past|all` and `?expand=details`. With `expand=details` items also carry `externalId`, `endsAtIso`, `venue`, `city`.

### 4.2 Profile — `/v1/me/profile` (routes 8–13)

| Method & path | Body | Returns |
| ------------- | ---- | ------- |
| `GET /v1/me/profile` | — | `Profile` |
| `POST /v1/me/profile/init` | `{ displayName?, email?, avatarUrl?, phone?, location? }` (idempotent upsert; never overwrites existing values; also seeds settings + notification prefs) | `Profile` |
| `PATCH /v1/me/profile` | any subset of `{ displayName, avatarUrl, email, phone, phoneVerified, city, countryCode, occupation, profileVisibility }` | `Profile` |
| `POST /v1/me/profile/onboarding-complete` | `{ phone?, location?, pushNotificationsEnabled?, locationServicesEnabled? }` | `{ profile, settings }` |
| `POST /v1/me/profile/deactivate` | — | `{ accountStatus: "deactivated", deactivatedAt }` (409 if already) |
| `POST /v1/me/profile/delete` | optional `{ reason? }` — server cancels future reservations, anonymizes content, wipes payment methods | `{ accountStatus: "deleted", deletedAt }` |

```ts
type Profile = {
  id: string;                       // Clerk user id (JWT sub)
  displayName?: string; avatarUrl?: string; email?: string;
  phone?: string; phoneVerified?: boolean;
  city?: string; countryCode?: string; occupation?: string;
  profileVisibility: 'public' | 'private';
  accountStatus: 'active' | 'deactivated' | 'deleted';
  interests: { tagId: string; tagLabel: string; tagSlug: string }[];
  stats: { attendedCount: number; savedCount: number; reviewsCount: number }; // server-computed
  createdAt: string; updatedAt: string; deactivatedAt?: string; deletedAt?: string;
};
```

### 4.3 Settings — `/v1/me/settings` (routes 14–15)

`GET` and `PATCH` (any subset of the booleans):

```ts
type UserSettings = {
  userId: string;
  pushNotificationsEnabled: boolean; locationServicesEnabled: boolean;
  loginNotificationsEnabled: boolean;
  savePaymentInfo: boolean; autoReloadWallet: boolean; emailReceipts: boolean;
  createdAt?: string; updatedAt?: string;
};
```

`GET` returns defaults (still 200) if the row doesn't exist yet.

### 4.4 Notification preferences — `/v1/me/notification-preferences` (routes 16–17)

`GET` and `PATCH` (any subset):

```ts
type NotificationPreferences = {
  userId: string;
  pushEnabled: boolean; pushEventReminders: boolean; pushEventUpdates: boolean;
  pushNewFollowers: boolean; pushEventRecommendations: boolean;
  emailEnabled: boolean; emailWeeklyDigest: boolean; emailEventInvites: boolean;
  emailPromotions: boolean; emailNewsletter: boolean;
  smsEnabled: boolean; smsUrgentUpdates: boolean; smsEventCancellations: boolean;
  personalizedAds: boolean; locationBasedSuggestions: boolean;
  quietHoursEnabled: boolean; quietHoursStart?: string; quietHoursEnd?: string; // "HH:MM" 24h
  createdAt?: string; updatedAt?: string;
};
```

Validation: quiet-hours times match `^([01]\d|2[0-3]):[0-5]\d$`; if `quietHoursEnabled` is true, both must be non-null.

### 4.5 Payment methods — `/v1/me/payment-methods` (routes 18–21)

| Method & path | Notes |
| ------------- | ----- |
| `GET /v1/me/payment-methods` | `{ items: PaymentMethod[] }`, sorted `isDefault desc, createdAt desc` |
| `POST /v1/me/payment-methods` | 201 `PaymentMethod`; `isDefault: true` unsets all others; 409 on duplicate `providerPaymentMethodId` |
| `POST /v1/me/payment-methods/:id/default` | 200 `PaymentMethod` — promotes to single default |
| `DELETE /v1/me/payment-methods/:id` | 204; deleting the default promotes the newest remaining card |

```ts
type PaymentMethod = {
  id: string; userId: string;
  provider: 'stripe' | 'other'; providerPaymentMethodId: string; // display info only — PCI data lives at the provider
  cardBrand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  cardLastFour: string; cardExpMonth: number; cardExpYear: number;
  cardholderName?: string; isDefault: boolean;
  createdAt: string; updatedAt: string;
};
```

### 4.6 Login history — route 22

`GET /v1/me/login-history?limit&cursor` → `{ items: LoginHistoryEntry[], nextCursor, hasMore }`

```ts
type LoginHistoryEntry = {
  id: string; userId: string; loggedInAt: string;
  ipAddress?: string; userAgent?: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  location?: string; sessionId?: string;
  wasSuccessful: boolean; failureReason?: string;
};
```

### 4.7 Interests + tag catalog (routes 23–27)

| Method & path | Returns |
| ------------- | ------- |
| `GET /v1/me/interests` | `{ items: UserInterest[] }` sorted by `tagLabel` asc |
| `PUT /v1/me/interests` body `{ tagIds: string[] }` — replaces the full set | `{ items: UserInterest[] }` |
| `POST /v1/me/interests/:tagId` (idempotent add) | `{ items: UserInterest[] }` |
| `DELETE /v1/me/interests/:tagId` | 204 |
| `GET /v1/tags?type=interest\|category\|music\|party\|access` (type optional) | `{ items: Tag[] }` sorted by `label` asc |

```ts
type UserInterest = { userId: string; tagId: string; tagLabel: string; tagSlug: string; createdAt?: string };
type Tag = { id: string; slug: string; label: string; type?: string; emoji?: string };
```

### 4.8 Organizers (routes 28–33)

| Method & path | Returns |
| ------------- | ------- |
| `GET /v1/organizers/:id` | `Organizer` (full profile + stats + `isFollowing`) |
| `GET /v1/organizers/:id/summary` | `OrganizerSummary` (compact) |
| `GET /v1/organizers/:id/gallery?limit&cursor` | `{ items: GalleryItem[] }` |
| `GET /v1/organizers/:id/reviews?limit&cursor` | `{ items: OrganizerReview[], nextCursor, hasMore }` — cross-event aggregate, `createdAt desc`, drafts excluded |
| `GET /v1/organizers/:id/events?when&expand&limit&exclude` | see § 4.1 route 4 extended |
| `GET /v1/organizers/:id/similar?limit` | ⚠️ **specced but NOT implemented** — the mobile app derives this client-side (similar events → their organizers → hydrate via `GET /v1/organizers/:id`). Do the same or hide the feature. |

```ts
type Organizer = {
  id: string; name: string; tagline?: string; about?: string;
  logoUrl?: string; coverImageUrl?: string; establishedYear?: number; isVerified: boolean;
  city?: string; countryCode?: string; phone?: string; email?: string; websiteUrl?: string;
  instagramHandle?: string; facebookHandle?: string; tiktokHandle?: string; youtubeHandle?: string;
  twitterHandle?: string; pinterestHandle?: string; snapchatHandle?: string; googleBusinessUrl?: string;
  specialties: string[]; cancellationPolicy?: string; refundPolicy?: string;
  responseTimeHours?: number; customPolicies: { title: string; body: string }[] | unknown[];
  stats: { avgRating: number; reviewCount: number; eventCount: number;
           followerCount: number; totalAttendees: number; successRate: number };
  isFollowing: boolean; createdAt: string; updatedAt: string;
};

type OrganizerSummary = {
  organizerId: string; logoUrl?: string; followerCount: number; avgRating: number;
  isFollowing: boolean; cancellationPolicy?: string; refundPolicy?: string;
};

type GalleryItem = { id: string; imageUrl: string; caption?: string; createdAt: string; mediaType: 'image' | 'video' };

type OrganizerReview = {
  id: string; userId: string; userName?: string; userAvatarUrl?: string;
  rating: number; comment?: string; eventId: string; eventTitle?: string; createdAt: string;
};
```

### 4.9 Organizer follows (routes 34–36)

| Method & path | Returns |
| ------------- | ------- |
| `PUT /v1/me/followed-organizers/:organizerId` (idempotent) | `{ organizerId, isFollowing: true, followedAt, followerCount }` |
| `DELETE /v1/me/followed-organizers/:organizerId` (idempotent) | `{ organizerId, isFollowing: false, followerCount }` |
| `GET /v1/me/followed-organizers?limit&cursor` | `{ items: { id, name, logoUrl?, followedAt }[], nextCursor, hasMore }` sorted `followedAt desc` |

### 4.10 Event favorites (routes 37–40)

| Method & path | Returns |
| ------------- | ------- |
| `GET /v1/me/favorites?limit&cursor` | `{ items: FavoriteEvent[], nextCursor, hasMore }` — denormalized for card rendering, sorted by favorited-at desc |
| `GET /v1/me/favorites/ids` | `{ eventIds: string[] }` — compact, for hydrating heart icons |
| `PUT /v1/me/favorites/:eventId` (idempotent; UUID or slug) | `{ eventId, favorite: true, favoritedAt }` |
| `DELETE /v1/me/favorites/:eventId` (idempotent) | `{ eventId, favorite: false }` |

```ts
type FavoriteEvent = {
  id: string; title: string; organizer: string; venue: string; city?: string;
  startsAtIso: string; imageUrl?: string; priceLabel?: string; favorite: true;
};
```

### 4.11 Reservations & checkout (routes 41–44) — most critical surface

#### `POST /v1/reservations` (route 41) — 201

**The server is the source of truth for pricing and availability** — it re-resolves current ticket-type prices, verifies seats, computes totals, and inserts reservation + items + tickets + holders in one transaction. Never send prices.

Send `Idempotency-Key: <uuid>` header. Replays return the same response; same key with a *different* payload → 409.

Request:

```json
{
  "eventId": "uuid-or-slug",
  "quantities": { "<ticketTypeId>": 2, "<ticketTypeId2>": 1 },
  "attendees": [
    { "ticketTypeId": "…", "index": 1, "firstName": "Alice", "lastName": "Doe",
      "email": "alice@example.com", "phoneNumber": null,
      "dietaryRestrictions": null, "emergencyContact": null }
  ],
  "billing": { "email": "alice@example.com", "firstName": "Alice", "lastName": "Doe" },
  "status": "pending"
}
```

Validation: `attendees.length === sum(quantities)` and per-`ticketTypeId` counts match; `firstName`/`lastName`/`email` required per attendee; `status` optional ∈ `draft|pending|confirmed` (server may downgrade per the event's `approvalMode`).

Response 201:

```json
{ "reservationId": "uuid", "status": "pending",
  "totals": { "totalTickets": 3, "subtotalCents": 9000, "serviceFeeCents": 1500,
              "totalCents": 10500, "currency": "USD" } }
```

Errors: 422 `unprocessable` with `details.reason: "sold_out" | "outside_sales_window"` (+ `details.ticketTypeId`).

#### `GET /v1/me/reservations?include=qr&limit&cursor` (route 42)

Server splits into `{ active: [...], past: [...], nextCursor, hasMore }` (rule: `now < startsAtIso` → active; `now >= endsAtIso` or cancelled → past; cursor paginates `past`). `include=qr` adds `qrValue`/`qrCaption` to each ticket.

```ts
type MyReservation = {
  id: string; eventId: string; eventExternalId?: string; status: string;
  title: string; startsAtIso?: string; endsAtIso?: string;
  venueName?: string; venueCity?: string;
  currency: string; totalAmountCents: number; savingsCents: number;
  orderedAt: string; totalTickets: number;
  items: { id: string; ticketTypeId: string; ticketTypeName: string;
           quantity: number; unitPriceCents: number; lineTotalCents: number }[];
  tickets: { id: string; reservationItemId: string; ticketNo: number; ticketCode: string;
             ticketTypeName: string;
             holder: { firstName: string; lastName: string; email: string };
             qrValue?: string; qrCaption?: string }[];
};
```

#### `GET /v1/reservations/:id` (route 43)

Full detail, **owner-only** (403 otherwise). Same shape as above plus `subtotalCents`, `serviceFeeCents`, an `event` object (`{ id, externalId, title, startsAtIso, endsAtIso, venueName, venueCity, imageUrl }`), `items[].benefits` (purchase-time snapshot), and per-ticket `qrValue`, `qrCaption`, `unitPriceCents`, `currency`, `holder.phoneNumber`, `checkedInAt` (non-null once scanned at the door).

`qrValue` is server-built and should be rendered as-is into the QR code.

#### `POST /v1/reservations/:id/cancel` (route 44) — ⚠️ specced as optional, **not implemented**. No client currently uses it.

### 4.12 Event access (route 45)

`GET /v1/events/:id/my-access` — powers ticket-purchase progress UI and gates review/story/song actions.

```json
{ "eventId": "uuid", "hasReservation": true, "reservationId": "uuid",
  "statusRaw": "confirmed", "status": "confirmed",
  "steps": { "ticketsPurchased": true, "reservationConfirmed": true, "checkedIn": false },
  "canUseCheckedInActions": false }
```

`status` ∈ `none | pending | confirmed | checkedIn | cancelled | refunded | unknown`. The server picks the user's *best* reservation (checkedIn > confirmed > pending > cancelled). With no reservation: same shape, `hasReservation: false`, `status: "none"`.

### 4.13 Event reviews (routes 46–50)

One review per user per event (409 on duplicate). Creating requires a confirmed/completed reservation (else 403 `review_not_eligible`).

| Method & path | Body / notes | Returns |
| ------------- | ------------ | ------- |
| `POST /v1/events/:id/reviews` | `{ rating: 1-5, comment?, reservationId? }`, comment ≤ 2000 chars | 201 `Review` |
| `GET /v1/events/:id/reviews/mine` | — | `{ review: Review \| null }` |
| `GET /v1/me/reviews?limit&cursor` | — | `{ items: MyReview[], totals: { publishedCount, draftCount, averageRating }, nextCursor, hasMore }` |
| `PATCH /v1/reviews/:id` | `{ rating?, comment? }`, author-only | `Review` |
| `DELETE /v1/reviews/:id` | author-only | 204 |

```ts
type Review = { id: string; eventId: string; userId: string; rating: number;
                comment?: string; createdAt: string; updatedAt?: string };

type MyReview = Review & {
  eventTitle: string; eventImageUrl?: string; eventStartsAtIso?: string; organizerName?: string;
  images: string[];        // [] until attachments ship
  helpfulCount: number;    // 0 until that feature ships
  isDraft: boolean;        // true when comment is blank/whitespace
  adminLiked: boolean; adminReply?: string; adminReplyAt?: string; // organizer/admin moderation (read-only here)
};
```

### 4.14 Song suggestions (routes 51–53)

Same eligibility as reviews. One suggestion per `(eventId, userId, deezerTrackId)` — 409 on duplicate.

| Method & path | Returns |
| ------------- | ------- |
| `POST /v1/events/:id/song-suggestions` body `{ deezerTrackId, trackTitle, artistName, deezerArtistId?, deezerAlbumId?, albumTitle?, artworkUrl?, deezerLink?, reservationId? }` (first three required) | 201 `SongSuggestion` |
| `GET /v1/events/:id/song-suggestions/mine` | `{ items: SongSuggestion[] }` sorted `createdAt desc` |
| `DELETE /v1/song-suggestions/:id` (author-only) | 204 |

### 4.15 Event stories (routes 54–58)

24h-expiring photo posts. Replaces the Supabase `story-photos` bucket — the **server** owns storage.

| Method & path | Notes |
| ------------- | ----- |
| `POST /v1/events/:id/stories` | **multipart/form-data**: part `photo` (JPEG/PNG file, ≤ 8 MB, ≤ 4096×4096) + part `meta` (JSON string: `{ "caption": string\|null, "reservationId": string\|null }`). Same eligibility as reviews. Returns 201 `Story`. |
| `GET /v1/events/:id/stories?limit&cursor` | `{ items: StoryWithUser[], nextCursor, hasMore }` — active (non-expired) only, `createdAt desc`; `userName`/`userAvatarUrl` denormalized from the author profile |
| `GET /v1/events/:id/stories/mine` | `{ story: Story \| null }` — one active story per user per event |
| `GET /v1/events/:id/stories/count` | `{ count: number }` — for map-pin badges |
| `DELETE /v1/stories/:id` | author-only; deletes row + file; 204 |

```ts
type Story = { id: string; userId: string; eventId: string; photoUrl: string;
               caption?: string; createdAt: string; expiresAt: string };
type StoryWithUser = Story & { userName?: string; userAvatarUrl?: string };
```

---

## 5. Supabase → API mapping

If the admin panel queries these Supabase tables, here is what replaces each:

| Supabase table / storage | API replacement | Notes |
| ------------------------ | --------------- | ----- |
| `events` (+ `venues`, `organizers` joins) | `GET /v1/events`, `GET /v1/events/:id` | denormalized (venue/organizer names embedded) |
| `ticket_types` | `GET /v1/events/:id/ticket-types` | |
| `event_tags`, `tags` | `GET /v1/tags`; event payloads carry `categories`/`musicStyles`/`partyTypes`/`access` | |
| `reservations`, `reservation_items`, `tickets`, `ticket_holders` | `POST /v1/reservations`, `GET /v1/me/reservations`, `GET /v1/reservations/:id` | ⚠️ **current-user only** — see § 8 |
| `event_favorites` | `/v1/me/favorites*` (4 routes) | current-user only |
| `profiles` | `/v1/me/profile*` (6 routes) | current-user only |
| `user_settings` | `/v1/me/settings` | current-user only |
| `notification_preferences` | `/v1/me/notification-preferences` | current-user only |
| `user_interests` | `/v1/me/interests*` | current-user only |
| `user_payment_methods` | `/v1/me/payment-methods*` | current-user only |
| `login_history` | `GET /v1/me/login-history` | current-user only |
| `event_reviews` | `POST /v1/events/:id/reviews`, `GET /v1/me/reviews`, `PATCH/DELETE /v1/reviews/:id`, `GET /v1/organizers/:id/reviews` | author-scoped writes; organizer route is the only cross-user read |
| `event_stories` + `story-photos` bucket | `/v1/events/:id/stories*`, `DELETE /v1/stories/:id` | multipart upload; server owns storage |
| `event_song_suggestions` | `/v1/events/:id/song-suggestions*`, `DELETE /v1/song-suggestions/:id` | current-user reads |
| `organizers` (profile reads) | `GET /v1/organizers/:id` + `/summary` + `/gallery` | |
| `organizer_follows` | `/v1/me/followed-organizers*` | current-user only |
| `organizer_gallery` | `GET /v1/organizers/:id/gallery` | |
| RPC `debug_auth_context` | delete it — no equivalent, none needed | |

---

## 6. Integration lessons from the mobile migration

1. **Keep module boundaries, swap internals.** The mobile app kept every existing function signature (`getMyReservations()`, `listFavoriteEvents()`, …) and swapped Supabase query bodies for API calls — zero changes in consuming components. Recommended for the admin app too.
2. **Fresh Clerk token per request** via `getToken()`; tokens expire in ~60s.
3. **Idempotency key on checkout** — generate a UUID per checkout attempt (not per retry).
4. **QR codes:** prefer the server's `qrValue`/`qrCaption`; the mobile app keeps a deterministic local fallback (`gs:v1:<ticketCode>`) only for resilience.
5. **404 handling:** Supabase returned empty arrays where the API returns `404 not_found` — catch `ApiError` with `status === 404` and map to `null`/empty where the UI expects "nothing".
6. **Drafts:** a review with a blank comment is a "draft" (`isDraft`) — there is no separate drafts table anymore.
7. **Defaults:** `GET /v1/me/settings` and `/v1/me/notification-preferences` return defaults rather than 404 when no row exists yet.

---

## 7. Environment & config

```env
# Replace these…
NEXT_PUBLIC_SUPABASE_URL=…            # ❌ remove
NEXT_PUBLIC_SUPABASE_ANON_KEY=…       # ❌ remove

# …with:
GOOSWING_API_BASE_URL=https://web.gooswing.com
# Clerk stays — same publishable/secret keys pattern, but verify the instance (§ 2.1)
```

Remove `@supabase/supabase-js` (and any `@supabase/ssr`/auth-helpers) from `package.json` once no imports remain.

---

## 8. ⚠️ Admin-panel gap analysis — routes that do NOT exist

This API was designed for the **end-user mobile app**. Everything is scoped to the authenticated user (`/v1/me/*`) or is public-catalog reading. If the admin panel needs any of the following, **there is no route for it today** — these must be requested from the backend team (OPTIDEEP) before the admin app can drop Supabase for those screens:

| Admin capability (typical) | Status |
| -------------------------- | ------ |
| Create / update / publish / cancel **events** | ❌ no route (API is read-only for events) |
| Create / update **ticket types**, pricing, inventory | ❌ no route |
| Create / update **organizers**, gallery uploads | ❌ no route (reads only) |
| List **all reservations for an event** / all orders | ❌ no route (`/v1/me/reservations` is self-only; `GET /v1/events/:id/attendees` returns only display previews) |
| **Check-in / scan tickets** at the door | ❌ no route (the `checkedInAt` field exists, so a scanner API exists server-side, but it is not in this catalog) |
| Cancel / refund a reservation | ❌ `POST /v1/reservations/:id/cancel` was specced but not implemented |
| **Moderate reviews** (admin reply, like, hide) | ❌ no route (`adminReply`/`adminLiked` are read-only fields populated by some other system) |
| Moderate / delete **other users'** stories or song suggestions | ❌ delete routes are author-only |
| Browse / manage **users** (list, search, ban) | ❌ no route |
| View **all** song suggestions for an event (DJ view) | ❌ only `/mine` exists |
| Analytics / aggregates beyond `organizer.stats` | ❌ no route |
| Similar organizers | ❌ specced (`GET /v1/organizers/:id/similar`) but not implemented — derive client-side (§ 4.8) |

**Practical consequence:** the admin panel migration can move all *read/display* surfaces and any *acting-as-the-logged-in-user* features to this API now, but admin-write features must either (a) stay on Supabase temporarily, or (b) wait for an admin API surface. Decide this split explicitly before starting the migration, and do not invent `/v1/admin/*` routes — they don't exist.

---

## 9. Reference files in the mobile repo (MedNewton/goswing)

| File | What it shows |
| ---- | ------------- |
| `lib/api/client.ts` | Fetch wrapper: auth, errors, query building, FormData, custom headers |
| `lib/api/types.ts` | Raw response types for every route |
| `lib/api/events.ts`, `me.ts`, `organizers.ts`, `reservations.ts`, `engagement.ts` | Typed per-domain route wrappers |
| `lib/supabase/*.ts` | Feature modules showing API→UI mapping (kept directory name for import stability) |
| `hooks/profile/*.ts`, `hooks/useEventFavorites.ts` | React hook patterns over the API |
| `gooswing-staging.postman_collection2.json` | Runnable Postman catalog of all 58 routes |
| `docs/superpowers/specs/2026-05-21-rest-api-phase-2-routes.md` | Original full contract spec (authoritative for payloads) |
