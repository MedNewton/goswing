# GoSwing — REST API Read-Side Migration (Phase 1)

**Date:** 2026-05-20
**Status:** Draft — awaiting approval
**Branch:** `claude/review-new-api-docs-2Lhjr`
**Supersedes / complements:** `2026-04-28-odoo-migration-design.md` (BFF strategy). This spec captures a smaller, pragmatic first migration that uses an already-live REST API for the read-side only.

---

## 1. Context

OPTIDEEP (Odoo integrator) delivered a working REST API on staging that exposes the public event-discovery surface of the product:

- Base URL: `https://web.gooswing.com`
- Auth: Clerk JWT (instance `easy-snapper-18.clerk.accounts.dev`)
- 7 routes, all read-only, returning camelCase JSON

The API was verified end-to-end on 2026-05-20 against the staging instance — all 7 routes plus error cases respond exactly as specified (200/400/401/404). See § 5 for the verified contract.

The GoSwing app currently uses Supabase for everything: events, ticket types, organizers, reservations, favorites, reviews, stories, song suggestions, profile, settings, payment methods, login history. The full Odoo migration (BFF on Cloudflare Workers, R2 storage, custom Odoo addon — see the 2026-04-28 spec) remains the long-term plan, but it's a multi-week build that requires Odoo access we don't yet have.

This phase replaces only what the new API covers — the read-only event-discovery layer — and **deliberately stubs everything else to safe no-ops** so the app keeps building, navigating, and rendering without crashes. Users will see events; reservations, favorites, stories, etc. will be visibly empty and non-functional.

## 2. Goals & non-goals

### Goals
- Replace every Supabase event/organizer read call with a call to the new REST API.
- Keep the UI **byte-for-byte identical** at the component layer: every page renders, every navigation works, no crashes.
- Authenticate every API call with a fresh Clerk JWT obtained via the existing `@clerk/clerk-expo` SDK.
- Make stubs so obvious in their no-op behavior that we won't accidentally ship them to production.
- Stay shippable on every commit — typecheck green, app boots, home screen lists events from the new API.

### Non-goals
- Replacing Clerk. Clerk stays.
- Removing Supabase from `package.json`, deleting tables, or shutting down the Supabase project. We leave it dormant until Phase 2.
- Implementing write paths (reservations, favorites, reviews, stories, follows, song suggestions). All stubbed.
- Building the BFF (that's Phase 2 / the 2026-04-28 spec).
- Changing any UI component, screen layout, copy, theme, or routing.
- Modernizing the `lib/supabase/events.ts` `mapRowToEvent` shape: we keep the **current Event TS type** as the canonical UI contract and adapt the API payload to it.

## 3. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Where the swap lives | Replace the **bodies** of functions inside `lib/supabase/events.ts` and the read-side of `lib/supabase/organizers.ts` | Zero-churn for the 5 importing UI pages. They keep importing the same names from the same paths. |
| API client location | New `lib/api/` directory | Clean separation; easy to delete later when we move to the BFF. |
| Auth glue | New `useGooswingApi()` hook + a non-hook `apiCall(getToken, …)` core, both in `lib/api/client.ts` | Hook for components; non-hook variant for the `lib/supabase/*` functions that aren't React components. Clerk's `getToken()` is the source of the JWT. |
| Where to get the token outside React | Re-export `Clerk` from `clerkConfig.ts` and call `Clerk.session?.getToken()` | Same pattern `lib/SupabaseClerkBridge.tsx` uses today. |
| Base URL config | `EXPO_PUBLIC_API_BASE_URL` env var, default `https://web.gooswing.com` | Matches the API doc; lets us point at a local proxy later. |
| Shape mapping | A single `mapApiEventToUiEvent()` helper that produces the existing `Event` type from `types/domain.ts` | One place to fix mismatches; the rest of the codebase keeps consuming the type it already knows. |
| Stubs strategy | Replace function bodies with safe defaults (`[]`, `null`, resolved promises). Keep all current exports. Add a `STUB:` log line in `__DEV__` only. | Zero import-site changes; obvious in dev logs that the call is fake. |
| Error envelope | API returns `{ error: { code, message, details } }`. We surface `code` + `message` in a thrown `ApiError` and let existing UI error states render. | Matches the documented contract. Doesn't require new error-handling UI. |
| Network policy | Add `web.gooswing.com` to the allowed-domains list of the dev environment (already done 2026-05-20). | Required for the sandbox to reach the API at all. |
| What to delete | **Nothing.** All Supabase files stay on disk, just with new bodies. Imports stay valid. | Easy rollback; smaller diff to review. |

## 4. Architecture

```
┌─────────────────────────────┐
│   React Native (Expo)       │
│   pages/* and components/*  │  ← UNCHANGED
└──────────────┬──────────────┘
               │ imports (unchanged paths)
               ▼
┌─────────────────────────────┐
│   lib/supabase/events.ts    │  ← bodies rewritten
│   lib/supabase/organizers.ts│
│                             │
│   Other lib/supabase/*.ts   │  ← bodies stubbed to no-ops
│   hooks/profile/*           │
│   hooks/useEventFavorites.ts│
└──────────────┬──────────────┘
               │ uses
               ▼
┌─────────────────────────────┐         ┌─────────────────────────┐
│   lib/api/client.ts         │ Bearer  │  https://web.gooswing.com│
│   lib/api/events.ts         │ ──────► │  Clerk JWT validated     │
│   lib/api/mapping.ts        │  HTTPS  │  against easy-snapper-18 │
│   lib/api/types.ts          │  JSON   │                          │
└──────────────┬──────────────┘         └──────────────────────────┘
               │
               │ getToken()
               ▼
┌─────────────────────────────┐
│   @clerk/clerk-expo         │
│   Clerk.session.getToken()  │  ← unchanged
└─────────────────────────────┘
```

The Supabase client itself (`lib/supabase/client.ts`, `lib/SupabaseClerkBridge.tsx`) stays untouched — it's still constructed but no code calls it after this phase. Removing it is a Phase 2 cleanup task.

## 5. API contract (verified 2026-05-20)

All 7 routes were hit against staging. Status codes and shapes below are what the live API actually returns — not the doc, which was misleading on the list wrapper.

### Auth

`Authorization: Bearer <clerk_jwt>` required on every call. Missing token → `401 unauthenticated`. The JWT must be issued by `easy-snapper-18.clerk.accounts.dev` and have a valid signature, exp, etc.

### Error envelope (all non-2xx)

```json
{ "error": { "code": "string", "message": "string", "details": null | object } }
```

Observed codes: `unauthenticated`, `not_found`, `validation_failed`.

### Route 1 — list published events

`GET /v1/events`

Response: **plain JSON array** of full event objects (not wrapped). Returns all 10 published events in staging. No pagination params.

Event object keys (verified):

```
id, title, description (HTML string), organizer, organizerId, imageUrl,
startsAtIso, endsAtIso, venue, venueId, venueType, city, countryCode,
category, categories[], access[], musicStyles[], partyTypes[],
basePrice (number), priceLabel (string),
favorite (bool — always false from server),
attendees[] (likely a preview slice; shape TBC, see § 9 risk #1),
attendeesExtraCount (number), attendeeCount (number),
waitlistEnabled (bool), approvalMode (string), sharingEnabled (bool),
policies[], externalId (slug), location { lat, lng }
```

### Route 2 — event detail by UUID or slug

`GET /v1/events/:id`

`:id` accepts either the UUID or the `externalId` slug. Response: single event object, same shape as Route 1's array items. `404 not_found` with `{ details: { event_id: "<input>" } }` when missing.

### Route 3 — ticket types

`GET /v1/events/:id/ticket-types`

Response: **plain array** of ticket types in the active sales window.

```
{ id, name, priceCents (int), currency, isFree, freeForLadies,
  benefits[] (string[]; empty array when none),
  seatsMax (int), seatsAvailable (int) }
```

Note: API uses `seatsMax`/`seatsAvailable`, the existing UI type uses `inventory`. Mapped in § 7.

### Route 4 — events by organizer

`GET /v1/organizers/:organizerId/events`

Query: `?limit=1..50` (default 5), `?exclude=<uuid>` (single UUID).

Response: **plain array** of mini-event rows.

```
{ id, title, imageUrl, startsAtIso, priceLabel, attendeeCount }
```

`limit` out of range → `400 validation_failed` with `details: { field: "limit" }`. Unknown organizer → `404`.

### Route 5 — similar events

`GET /v1/events/:id/similar`

Query: `?limit=1..50` (default 5). Same response shape as Route 4. Algorithm: same category first, fallback to overlapping tags. Unknown event → `404`.

### Route 6 — upcoming by venue or organizer

`GET /v1/events/upcoming-by-venue-or-organizer`

Query: at least one of `?venueId` or `?organizerId` is **required**. Also accepts `?exclude`, `?limit=1..100` (default 20). Both venue+org allowed (union + dedup).

Response: **plain array** of mini-event rows, extended with venue info:

```
{ id, title, imageUrl, startsAtIso, priceLabel, attendeeCount,
  venueId, venue, location { lat, lng } }
```

No params → `400 validation_failed { field: "venueId|organizerId" }`.

### Route 7 — attendees

`GET /v1/events/:id/attendees`

Response: **wrapped object** (not an array):

```
{ "attendees": Attendee[], "totalCount": number }
```

In staging: `{ "attendees": [], "totalCount": 0 }`. Shape of populated attendee items is **not yet verified** — assumed to match the existing `EventAttendee` UI type (`{ userId, displayName, initials, avatarUrl }`) per the doc's narrative ("distinct users with confirmed/completed reservations"). Flagged as risk #1.

Unknown event → `404 not_found { details: { event_id } }`.

## 6. File-by-file plan

### 6.1 New files

| File | Purpose | Approx LOC |
|---|---|---|
| `lib/api/client.ts` | `apiCall<T>(path, opts)` — fetch wrapper that injects `Authorization: Bearer <Clerk JWT>`, parses the error envelope, throws `ApiError`. Exports `useGooswingApi()` hook (returns `apiCall` bound to the current user's token via `useAuth`). | ~90 |
| `lib/api/types.ts` | TS types that mirror the raw API JSON shapes (`ApiEvent`, `ApiMiniEvent`, `ApiTicketType`, `ApiAttendee`, `ApiAttendeesResponse`, `ApiErrorBody`). | ~70 |
| `lib/api/events.ts` | One typed wrapper per route — `getPublishedEvents`, `getEventById`, `getTicketTypes`, `getOrganizerEvents`, `getSimilarEvents`, `getUpcomingByVenueOrOrganizer`, `getEventAttendees`. Each returns the raw API shape. | ~80 |
| `lib/api/mapping.ts` | `mapApiEventToUiEvent`, `mapApiMiniEventToUiMini`, `mapApiTicketTypeToUiTicketType`. Bridges raw API JSON → existing `Event` / `MiniEventRow` / `TicketType` types from `types/domain.ts`. Single source of truth for shape adaptation. | ~100 |
| `lib/api/index.ts` | Barrel: `export * from './events'`. | ~5 |
| `docs/superpowers/specs/2026-05-20-rest-api-read-side-migration.md` | This document. | — |

### 6.2 Modified files (bodies swapped, exports preserved)

| File | What changes |
|---|---|
| `lib/supabase/events.ts` | All 7 exported functions (`getPublishedEvents`, `getEventDetailsById`, `getTicketTypesForEvent`, `getEventsByOrganizer`, `getSimilarEvents`, `getUpcomingEventsByVenueOrOrganizer`, `getEventAttendees`) rewritten to call `lib/api/events.ts` + map via `lib/api/mapping.ts`. Signatures and return types **unchanged**. `mapRowToEvent` and its row-shape helpers stay in the file but become dead code (kept for diff size; deleted in Phase 2). |
| `lib/supabase/organizers.ts` | `followOrganizer`, `unfollowOrganizer` → stubbed to resolved promise. `getOrganizerById`, `getOrganizerSummaryForEvent`, `getOrganizerReviews`, `getSimilarOrganizers`, `listFollowedOrganizers` → stubbed (see § 6.3). **Not** powered by the API: the 7 endpoints don't expose organizer profile data. Organizer detail page will show empty stats / no logo / no reviews / no events lists fed from `getEventsByOrganizer` (which IS API-backed). |
| `.env` (local only; not committed) | Set `EXPO_PUBLIC_API_BASE_URL=https://web.gooswing.com`. |
| `app.json` | If `extra` carries API base URL, add it there too. (Inspect during implementation; likely no change needed since we use `EXPO_PUBLIC_*`.) |

### 6.3 Stubbed files (bodies become no-ops; exports preserved)

For each, the function signatures stay, the body becomes the safe default in the table. All stubs log `[STUB] <name>` in `__DEV__` only.

| File | Function | Stub return |
|---|---|---|
| `lib/supabase/checkout.ts` | (types-only file — `TicketType`, `CheckoutTotals`, `AttendeeInput`, `BillingInput`, `CreateReservationArgs`, `CreateReservationResult`) | Unchanged. If any `createReservation()` function exists, → throws `ApiError('checkout_disabled', 'Reservations are temporarily disabled')` so the checkout button surfaces an error toast instead of silently appearing to succeed. |
| `lib/supabase/myReservations.ts` | `getMyReservations()` | `{ active: [], past: [] }` |
| `lib/supabase/reservationDetails.ts` | `getReservationDetails(id)` | `null` |
| `lib/supabase/eventAccess.ts` | `getEventAccess(params)` | `{ eventId, hasReservation: false, reservationId: null, statusRaw: null, status: 'none', steps: { ticketsPurchased: false, reservationConfirmed: false, checkedIn: false }, canUseCheckedInActions: false }` |
| `lib/supabase/profile.ts` | `initializeUserProfile`, `updateProfileFromOnboarding` | `Promise.resolve()` |
| `lib/supabase/saved.ts` | `addFavorite`, `removeFavorite`, `listFavoriteEventIds`, `listFavoriteEvents` | writes → `Promise.resolve()`; reads → `[]` / `new Set()` |
| `lib/supabase/reviews.ts` | `createEventReview`, `getMyReviewForEvent`, `getMyReviews`, `updateReview`, `deleteReview` | reads → `null` / `[]`; writes → `Promise.resolve()` |
| `lib/supabase/songSuggestions.ts` | `createDeezerSongSuggestion`, `getMySongSuggestionsForEvent`, `deleteMySongSuggestionById` | reads → `[]`; writes → `Promise.resolve()` |
| `lib/supabase/stories.ts` | `createEventStory`, `getStoriesForEvent`, `getMyStoryForEvent`, `getStoriesWithUserInfo`, `deleteStory` | reads → `[]` / `null`; writes → `Promise.resolve()` |
| `hooks/useEventFavorites.ts` | `useEventFavorites(params)` | `{ favoriteIds: new Set(), loading: false, refresh: async () => {}, isFavorite: () => false, toggle: async () => {} }` |
| `hooks/profile/useProfile.ts` | `useProfile()` | `{ profile: null, isLoading: false, error: null, refetch: async () => {}, updateProfile: async () => {}, deactivateAccount: async () => {}, deleteAccount: async () => {} }` |
| `hooks/profile/useNotificationPreferences.ts` | `useNotificationPreferences()` | sane defaults; mutations → `Promise.resolve()` |
| `hooks/profile/useSettings.ts` | `useSettings()` | sane defaults; mutations → `Promise.resolve()` |
| `hooks/profile/useUserInterests.ts` | `useUserInterests()` | `{ interests: [], allTags: [], isLoading: false, save: async () => {} }` |
| `hooks/profile/usePaymentMethods.ts` | `usePaymentMethods()` | `{ methods: [], isLoading: false, add: async () => {}, remove: async () => {}, setDefault: async () => {} }` |
| `hooks/profile/useLoginHistory.ts` | `useLoginHistory()` | `{ history: [], isLoading: false }` |

### 6.4 Files we do NOT touch

- `lib/supabase/client.ts` — Supabase JS client still constructed at startup but never used. Kept so any lingering import doesn't break.
- `lib/SupabaseClerkBridge.tsx` — Same reason; left as dormant code.
- `providers/AuthProvider.tsx` — Unchanged; already uses Clerk correctly.
- `clerkConfig.ts` — Unchanged.
- `types/domain.ts` — **Critical**: this stays the canonical contract the UI consumes. We adapt to it, not vice versa.
- Any file under `pages/`, `components/`, `style/`, `theme/`, `assets/`.

## 7. Shape mapping (Supabase shape → API shape)

The UI consumes `types/domain.ts`. We keep that contract.

### 7.1 Event (the canonical type)

| `Event` field (UI contract) | API source | Notes |
|---|---|---|
| `id` | `event.id` (UUID) | The API's `id` IS the UUID — same as Supabase. |
| `externalId` | `event.externalId` (slug) | Direct passthrough. |
| `title` | `event.title` | — |
| `description` | `event.description` | HTML string. UI already renders HTML for descriptions. |
| `organizer` | `event.organizer` | Display name. |
| `organizerId` | `event.organizerId` | — |
| `imageUrl` | `event.imageUrl` | — |
| `startsAtIso` | `event.startsAtIso` | — |
| `endsAtIso` | `event.endsAtIso` | — |
| `venue` | `event.venue` | Display name. |
| `venueId` | `event.venueId` | — |
| `venueType` | `event.venueType` | — |
| `city` | `event.city` | — |
| `countryCode` | `event.countryCode` | — |
| `category` | `event.category` | Display label, e.g. "Music night". |
| `categories` | `event.categories` | String slugs. Default to `[]` if API ever returns null (defensive). |
| `access` | `event.access` | UI type narrows to `'free' \| 'free_ladies'`. **Mismatch:** API returns labels like `"tous-publics"`, `"public"`. The UI's filter logic uses these for free/free-ladies detection. Plan: map any unknown values to `[]`; only forward exact matches. May render fewer access badges than before. |
| `musicStyles` | `event.musicStyles` | Default `[]`. |
| `partyTypes` | `event.partyTypes` | Default `[]`. |
| `basePrice` | `event.basePrice` | — |
| `priceLabel` | `event.priceLabel` | Pre-formatted. |
| `favorite` | `false` always | API returns `false` for all users; favorites are stubbed in this phase. |
| `attendees` | `event.attendees` (preview from event payload) | See risk #1 — shape unverified. |
| `attendeesExtraCount` | `event.attendeesExtraCount` | — |
| `attendeeCount` | `event.attendeeCount` | — |
| `waitlistEnabled` | `event.waitlistEnabled` | — |
| `approvalMode` | `event.approvalMode` | — |
| `sharingEnabled` | `event.sharingEnabled` | — |
| `policies` | `event.policies` | API returns `[]` in staging; type is `unknown[]` in UI. |
| `location` | `event.location` | `{lat, lng}`. Defensive: default to `undefined` if missing rather than partial. |

### 7.2 MiniEventRow

API returns: `{ id, title, imageUrl, startsAtIso, priceLabel, attendeeCount }` (+ optional `venueId`, `venue`, `location` on Route 6).

UI type: `{ id, title, imageUrl, startsAtIso, priceLabel, venue? }`.

Mapping: passthrough; `attendeeCount` is silently dropped (UI doesn't use it on mini rows today; can be re-exposed in Phase 2).

### 7.3 TicketType — **mismatch**

| UI `TicketType` field | API field | Mapping |
|---|---|---|
| `id` | `id` | — |
| `name` | `name` | — |
| `description?` | (not returned) | `undefined` |
| `priceCents` | `priceCents` | — |
| `currency` | `currency` | — |
| `inventory?` | `seatsMax` | Map `seatsMax` → `inventory`. `seatsAvailable` dropped for now (UI doesn't use it directly; "sold out" detection happens via a separate count not in this scope). |
| `benefits?` | `benefits` | Direct passthrough; ensure `[]` not null. |
| `isFree` | `isFree` | — |
| `freeForLadies` | `freeForLadies` | — |

### 7.4 EventAttendee (from Route 7)

UI type: `{ userId, displayName, initials, avatarUrl }`.

API shape: **unverified** (staging has no seeded attendees). We mirror the doc's description and ship the mapping under risk #1. If the populated shape is different (e.g. `name` instead of `displayName`), we adjust in `mapping.ts` only — no UI changes.

### 7.5 Organizer detail / reviews / similar / followed — **NOT mapped**

The new API doesn't expose any of these. They are stubbed (see § 6.3), so the Organizer Profile page renders the empty/default state: no logo, default name from event payload, zero followers, zero reviews. The "events by organizer" section IS populated because Route 4 covers it.

## 8. Auth flow

```
Component
  └─ useGooswingApi()
       └─ useAuth() from @clerk/clerk-expo
            └─ getToken()  ── awaits a fresh, cached JWT ──┐
       returns:  call<T>(path, opts) ─────────────────────▶│
                                                            │
       call:                                                │
         token = await getToken()                          ─┘
         fetch(BASE_URL + path,
               { headers: { Authorization: Bearer ${token} } })
         if !res.ok:
            body = await res.json()  // { error: { code, message, details } }
            throw new ApiError(body.error.code, body.error.message, body.error.details, res.status)
         return res.json()
```

For non-component callers (anything inside `lib/supabase/*.ts`), we use `Clerk.session?.getToken()` from `clerkConfig.ts` — the same source `SupabaseClerkBridge` reads today. If `Clerk.session` is `null`, the call throws `ApiError('unauthenticated', 'no_session', null, 401)` immediately without hitting the network — UI then renders its existing unauthenticated state.

## 9. Risks & open questions

### 🟠 Risk #1 — Attendees populated shape is unverified

Staging has zero seeded attendees, so we don't know what the API returns when there ARE attendees. The doc implies `{ userId, displayName, initials, avatarUrl }` (matching the existing UI type) but says nothing concrete. **Mitigation:** seed an attendee on staging via OPTIDEEP, OR ship with the assumed shape and inspect first production response. The mapping helper isolates the fix to one file.

### 🟠 Risk #2 — `event.access` semantics

The UI's `access` filter expects literal `'free' | 'free_ladies'`. The API returns labels like `"tous-publics"` and `"public"` which don't map to either. The filter row will simply not match anything in the "Free" or "Free for ladies" pills until OPTIDEEP standardizes the values or we introduce a heuristic (e.g. `isFree` flag on ticket types). **Mitigation:** document the gap; talk to OPTIDEEP to either expose `accessIsFree` on the event or align the strings.

### 🟠 Risk #3 — Organizer Profile page looks empty

`OrganizerProfilePage` reads logoUrl, coverImageUrl, about, social handles, stats, reviews, similar organizers — none of which the new API exposes. The page renders but most sections are empty. **Mitigation:** acceptable for Phase 1 ("non-functional, not broken"). Add a one-time `Alert.alert` in `__DEV__` to make the limitation obvious. **OR** wire a fallback that constructs a minimal `Organizer` from the first event by that organizer (we have name, indirectly).

### 🟠 Risk #4 — SavedPage relies on `listFollowedOrganizers`

Returning `[]` makes the saved tab look empty even for users who had follows. **Mitigation:** acceptable; matches the "non-functional, not broken" contract.

### 🟠 Risk #5 — `getEventDetailsById` 404 → empty UI

Today Supabase throws on `.single()` if missing; the UI catches and shows an error. The API returns `404` with the error envelope. Our `ApiError` will throw with the same semantics, but message text differs. **Mitigation:** map `not_found` to the same user-facing copy in the catch sites if they hardcode strings.

### 🟠 Risk #6 — Token refresh

Clerk auto-refreshes JWTs; expiry observed in our test was 60s. Each `apiCall` invokes `getToken()` which returns the cached or refreshed token. We never cache the token ourselves. **Mitigation:** none needed — verified working.

### 🟠 Risk #7 — Empty arrays vs null

Several UI filter functions (`filters.ts`) call `.some()` on arrays. If the API ever returns `null` for `categories`/`musicStyles`/`partyTypes`, those crash. **Mitigation:** the mapper coerces null/undefined to `[]` defensively.

### Open questions for OPTIDEEP

1. Confirm the **`EventAttendee` object shape** when populated (`userId, displayName, initials, avatarUrl`?).
2. Can `event.access` values be normalized to a documented enum?
3. Are there future plans for an organizer-profile endpoint? (logo, bio, social handles, follower count.)
4. JWT expiry window — confirmed at ~60s in staging; intended?

## 10. Validation checklist

After implementation, before marking done:

- [ ] `npx tsc --noEmit` — clean.
- [ ] App boots in Expo Go on a fresh install. Home screen lists events from the new API (verified by network inspection).
- [ ] Event detail page shows title, image, description, organizer name, venue, dates, location pin, ticket types.
- [ ] "Similar events" section populates.
- [ ] "More from organizer" section populates.
- [ ] Tapping the heart icon does nothing (no crash; toast or silent).
- [ ] Saved tab shows empty state.
- [ ] My reservations tab shows empty state.
- [ ] Organizer profile page renders with empty stats but doesn't crash.
- [ ] Reviews, stories, song-suggestion submission flows render and either fail gracefully or silently no-op.
- [ ] No Supabase REST or auth requests fire (confirmed via Charles/Flipper).
- [ ] All seven API routes hit at least once during a manual smoke walk.
- [ ] On forced offline / bad token, error banner renders without crash.
- [ ] No new console warnings beyond `[STUB]` lines in dev.

## 11. Rollback

Single git revert. Every change in this phase lives on `claude/review-new-api-docs-2Lhjr` and is additive (new `lib/api/`) + body-swaps in existing files. Reverting the merge commit restores Supabase reads and unstubs the rest.

No data migrations. No schema changes. No deletions.

## 12. Out of scope (Phase 2 / future)

- Removing `@supabase/supabase-js` from `package.json`.
- Deleting `lib/supabase/client.ts`, `lib/SupabaseClerkBridge.tsx`, dead `mapRowToEvent`, dead profile hooks.
- BFF on Cloudflare Workers (see 2026-04-28 spec).
- Write paths (reservations, favorites, reviews, stories, follows, song suggestions, profile).
- Storage migration (story-photos bucket → R2 or equivalent).
- Realtime / push improvements.

---

## Review checklist (for the user)

- [ ] You agree the scope is "read-side only + stubs", not the full BFF migration.
- [ ] You're OK with Organizer Profile page looking mostly empty (no logo/about/social/reviews) until the API exposes more.
- [ ] You're OK with `access` filter pills being less accurate until OPTIDEEP normalizes values.
- [ ] You confirm the rotation of `sk_test_zfR4tEFdCOLyHy6FASO7oPZOn84xtjKRXMvMJC1Pck` (leaked in chat 2026-05-20) before any production use of this branch.
- [ ] You accept that the populated `attendees` shape is best-effort until verified with real data.
- [ ] After approval, I'll implement on this branch, run typecheck, push, and report.
