# GoSwing — Supabase → Odoo Migration Design

**Date:** 2026-04-28
**Status:** Draft — awaiting answers to Q1/Q2/Q3 (see § Open Questions) before final approval
**Author:** med.benmoussa.dev@gmail.com (with Claude)

---

## 1. Context

GoSwing is a React Native (Expo) ticketing app currently backed by Supabase (Postgres + RLS + Storage) with Clerk for authentication. The product owner is already paying for Odoo and wants to consolidate onto it — moving **all** data and APIs off Supabase.

The codebase today contains:
- **26 tables** in Supabase (`context/database.sql`).
- **~30 data-access functions** across `lib/supabase/*.ts`.
- **7 React hooks** in `hooks/*` and `hooks/profile/*` consuming those functions.
- **1 Supabase Storage bucket**, `story-photos`, used for 24h-expiring story photos.
- **Clerk-issued JWTs** bridged into Supabase via `lib/SupabaseClerkBridge.tsx`, with RLS policies keying off `requesting_user_id()` / `auth.jwt() ->> 'sub'`.

The schema already includes `odoo_model` / `odoo_id` / `last_synced_at` / `sync_state` columns on several tables, suggesting an Odoo sync was previously considered but never implemented.

## 2. Goals & non-goals

### Goals
- Stop the recurring Supabase invoice. End state: Supabase project disabled, no Supabase dependencies in the codebase.
- Keep the React Native app functional throughout the migration. No big-bang cutover.
- Avoid heavy Python / Odoo addon iteration cycles — keep business logic in TypeScript where iteration is fast.
- Avoid blocking on Odoo access. Build and verify as much as possible before that arrives.

### Non-goals
- Replacing Clerk. Clerk stays as the identity provider.
- Adopting Odoo's stock business modules (Events, Sales, Accounting) for our domain. We define our own `goswing_*` models. Mapping to Odoo's stock modules can be a follow-up if the owner wants it.
- Realtime / push pipelines. The current app does not use Supabase Realtime; push notifications use Expo directly.
- Building organizer-side admin tooling. Out of scope.

## 3. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth | Clerk stays | Owner's cost concern is Supabase only; Clerk JWT continues to identify users. |
| Translation layer | **Standalone TypeScript BFF** on Cloudflare Workers | Lowest-effort path; keeps logic in TS where iteration is fast; no dependency on Odoo access to start; no extra recurring bill at our scale. |
| File storage | **Cloudflare R2** with 1-day lifecycle rule | Free tier covers stories at our scale; R2 binds directly into the Worker; vendor-locked-out (S3-compatible). |
| BFF host | **Cloudflare Workers** | Same vendor as R2 + Cron + Secrets, single bill, free tier. |
| Migration strategy | **Strangler pattern**, ~6 slices | Each slice is independently mergeable; app stays functional; rollback is trivial. |
| Odoo addon style | **Declarative-only** (`_name`, `fields.*` only — no Python business logic) | All logic stays in the BFF (TypeScript). Faster iteration, easier testing. |
| Odoo model naming | Dotted: `goswing.event`, `goswing.event_favorite`, etc. | Standard Odoo convention. The underlying Postgres tables auto-derive to `goswing_event`, `goswing_event_favorite` (Odoo replaces dots with underscores). |
| Authorization model | Enforced in BFF (per-route policies based on Clerk `sub`) | Replaces Supabase RLS. Easier to test and reason about than Odoo record rules. |
| ID space | UUIDs (existing) preserved as `external_id` Char on every Odoo model | RN client never sees Odoo's internal int IDs. Migrated rows keep their UUIDs. |
| Story photo URLs | R2 public read + 1-day lifecycle rule | Saves a BFF round-trip per story view; safe because stories are public-by-design within an event. |
| Type safety | Zod schemas in BFF; types derived via `z.infer<...>`; consumed by RN through a shared workspace package | One source of truth for request/response shapes. |

## 4. Architecture

```
┌──────────────────┐         ┌─────────────────────────┐         ┌──────────────┐
│  React Native    │  HTTPS  │  Cloudflare Workers BFF │  XML-RPC│  Odoo        │
│  (Expo + Clerk)  │ ──────► │  (Hono + jose + odoo-rpc│ ──────► │  (existing)  │
│  lib/api/*       │ Bearer  │   client)               │  service│  goswing.*   │
│                  │  Clerk  │                         │  account│  custom      │
│                  │  JWT    │                         │  API key│  models      │
└──────────────────┘         └─────────────┬───────────┘         └──────────────┘
                                           │
                                  R2 binding│
                                           ▼
                                  ┌─────────────────┐
                                  │ Cloudflare R2   │
                                  │  story-photos   │
                                  │  (1-day         │
                                  │   lifecycle)    │
                                  └─────────────────┘
                                           ▲
                                           │ daily
                                  ┌─────────────────┐
                                  │ Cron Worker     │
                                  │  prunes Odoo    │
                                  │  story rows     │
                                  └─────────────────┘
```

**Trust boundary:** the BFF. The RN app holds only its Clerk JWT; the BFF holds the Odoo service-account API key (in a Worker secret). Per-user authorization is enforced in BFF code using the `sub` claim — this is the replacement for Supabase RLS.

## 5. Components

### 5.1 React Native (existing repo)

| Path | Responsibility | Replaces |
|---|---|---|
| `lib/api/client.ts` | `fetch` wrapper. Attaches `Authorization: Bearer <clerk-jwt>` and base URL. ~40 LoC. | (new) |
| `lib/api/<domain>.ts` (≈10 files) | One file per existing `lib/supabase/<domain>.ts`. **Identical exported function signatures and return types.** | `lib/supabase/<domain>.ts` |
| `lib/ApiClerkBridge.tsx` | `setClerkApiTokenGetter` mirroring the existing Supabase bridge. | `lib/SupabaseClerkBridge.tsx` |
| `hooks/profile/*`, `hooks/useEventFavorites` | **Unchanged code.** Re-bound to new modules via import-alias change. | (unchanged) |

### 5.2 BFF (new repo `goswing-bff`)

| Path | Responsibility |
|---|---|
| `src/index.ts` | Hono app, route registration, error envelope. |
| `src/middleware/auth.ts` | Verifies Clerk JWT against cached JWKS using `jose`. Attaches `clerk_user_id` to context. Rejects with `401 unauthenticated` on failure. |
| `src/middleware/authorize.ts` | Per-route policy helpers (e.g., `requireOwner`, `requireOrganizerMember`). The "RLS in code." |
| `src/odoo/client.ts` | XML-RPC `OdooClient` interface + real implementation. Authenticates once with service account, caches per isolate. |
| `src/odoo/mock.ts` | In-memory implementation of `OdooClient`. Loads `data/events.json` for seed data. ~300 LoC. |
| `src/routes/<domain>.ts` (≈10 files) | One per RN domain module. Validates input, calls Odoo, shapes response to RN-expected schema. |
| `src/storage/r2.ts` | R2 binding wrapper (upload, delete, public-URL formatting). |
| `src/cron/prune-stories.ts` | Daily Cloudflare Cron Trigger. Deletes `goswing.event_story` rows where `expires_at < now()`. R2 lifecycle handles files. |
| `src/schemas/*.ts` | Zod schemas + inferred types. Single source of truth. |

### 5.3 Odoo addon (new module `goswing_api`)

A **declarative-only** Odoo addon — no business logic, no automation.

- One model per Supabase table (~26 models): `goswing.event`, `goswing.organizer`, `goswing.venue`, `goswing.event_favorite`, `goswing.event_story`, `goswing.reservation`, `goswing.ticket`, etc.
- Each user-scoped model has `clerk_user_id = fields.Char(index=True)` — our identity foreign key.
- Each model has `external_id = fields.Char(index=True, copy=False)` storing the originating UUID.
- Field types and constraints mirror the Supabase schema (NOT NULL, CHECK ranges, unique indexes).
- A service-account `res.users` (e.g., `bff@goswing.internal`) with API key, scoped via Odoo access control to read/write `goswing_*` models only. Key stored in Worker secrets.

## 6. Data flow

### Read — `getPublishedEvents()`

1. RN: `lib/api/events.ts:getPublishedEvents()` → `GET /v1/events?status=published` with Clerk JWT.
2. BFF auth middleware: verify JWT, extract `clerk_user_id`. (401 on invalid.)
3. Handler: `odoo.searchRead('goswing.event', [['status','=','published']], [...fields])`.
4. Handler: shape response (snake → camel, joins, `priceLabel`) so it matches **byte-for-byte** what `lib/supabase/events.ts:getPublishedEvents()` returns today.
5. RN: hook receives the same `ReadonlyArray<Event>` it always did.

### Write — `createReservation(args)` (the hardest case)

1. RN: `lib/api/checkout.ts:createReservation({ eventId, quantities, attendees, billing })`. **No `userId` in body** — server derives from JWT.
2. BFF: JWT verified, `clerk_user_id` extracted.
3. Handler: validates input (mirrors `lib/supabase/checkout.ts`), resolves event by UUID/external_id, computes totals server-side (never trusts client prices).
4. Handler: creates `goswing.reservation` → `goswing.reservation_item[]` → `goswing.ticket[]` → `goswing.ticket_holder[]` via Odoo `execute_kw`. The reservation's `clerk_user_id` is forced to the JWT value.
5. Transactional integrity: prefer Odoo's batched `execute_kw` if it covers our case; otherwise mirror the explicit rollback-tree from `lib/supabase/checkout.ts:354`.
6. Returns `{ reservationId, totals }` — same shape as today.

### What's enforced where

| Concern | Where |
|---|---|
| JWT signature validity | BFF auth middleware |
| `user_id` on writes | BFF — forced from JWT, never from request body |
| Per-record ownership | BFF — explicit policy check before Odoo call |
| Field-level constraints | Odoo model + BFF input validation (defense in depth) |
| Uniqueness | Odoo model unique constraints |
| Cross-record consistency (rollback) | BFF (or Odoo transaction batch when supported) |

## 7. Migration plan — strangler slices

Each slice ships as one PR. The app remains fully functional after every slice — Supabase serves anything not yet migrated, the BFF serves what is. Slice 0 is foundational; Slice 5 is decommissioning. Reservations/checkout (Slice 3) is intentionally late so the BFF is mature when the highest-risk flow lands.

| # | Slice | Ships | RN pages verified | Effort |
|---|---|---|---|---|
| **0** | BFF skeleton + mock Odoo + Events read end-to-end | `goswing-bff` repo, Hono app, JWT middleware, mock Odoo, `wrangler dev`, deploy to staging Workers, R2 bucket with 1-day lifecycle rule. Odoo models for `goswing.event`, `goswing.venue`, `goswing.organizer`, `goswing.tag`, `goswing.event_tag`. BFF routes: `/v1/events`, `/v1/events/:id`, `/v1/events/:id/ticket-types`, `/v1/organizers/:id/events`, `/v1/events/similar`. `lib/api/events.ts`. | HomePage, EventDetailsPage, OrganizerPage event lists | ~2 days |
| **1** | Organizers + Favorites + Attendance | Odoo models for `goswing.organizer_follow`, `goswing.organizer_gallery`, `goswing.organizer_member`, `goswing.event_favorite`, `goswing.event_attendance`. BFF routes: organizer-by-id + summary, gallery, follows (read+write), reviews-of-organizer aggregation, favorites add/remove/list. `lib/api/organizers.ts`, `lib/api/saved.ts`. | OrganizerPage, SavedPage, favorite hearts on event cards | ~2 days |
| **2** | Profile bundle | Odoo models for `goswing.profile`, `goswing.user_settings`, `goswing.notification_preferences`, `goswing.user_interest`, `goswing.login_history`. BFF: full CRUD; **includes `initializeUserProfile`** for new sign-ups. `lib/api/profile/*` mirroring `hooks/profile/*`. | ProfilePage, SettingsPage, NotificationsPage, InterestsPage, LoginHistoryPage. New-user onboarding gate. | ~1 day |
| **3** | Reservations + Checkout ⚠️ | Odoo models for `goswing.ticket_type`, `goswing.reservation`, `goswing.reservation_item`, `goswing.ticket`, `goswing.ticket_holder`, `goswing.ticket_attendee`, `goswing.payment`. BFF: `getTicketTypesForEvent`, `createReservation` (transactional w/ rollback), `getMyReservations`, `getReservationDetails`, `getEventAccess`. QR generation unchanged. `lib/api/checkout.ts`, `lib/api/reservations.ts`. | CheckoutPage, MyReservationsPage, ReservationDetailsPage, EventDetailsPage progress card | ~3 days |
| **4** | Stories (R2) + Reviews + Song Suggestions | Odoo models for `goswing.event_story`, `goswing.event_review`, `goswing.venue_review`, `goswing.event_song_suggestion`. BFF: `POST /v1/stories` multipart → R2 upload → Odoo row insert; review CRUD; song-suggestion CRUD; cron worker for expired-story pruning. `lib/api/stories.ts`, `lib/api/reviews.ts`, `lib/api/songSuggestions.ts`. | StoryComposer, StoryViewer, MyReviewsPage, "Give Review" / "Suggest Songs" flows | ~2 days |
| **5** | Decommission Supabase | Delete `lib/supabase/*`, `lib/SupabaseClerkBridge.tsx`, `data/supabaseSmokeTest.ts`. Remove `EXPO_PUBLIC_SUPABASE_*` from env and `app.json`. Disable Supabase project. Verify monthly bill drops. | Full app smoke test on a clean install | ~0.5 day |

**Total: ~10.5 days of focused work** (plus buffer for whatever surprises Odoo throws when access lands).

**Safety properties**
- The hybrid (some-Supabase, some-BFF) state is stable. You can pause indefinitely between slices.
- Any slice can be rolled back by reverting the import-alias change. The matching `lib/supabase/<domain>.ts` stays in tree until Slice 5.

## 8. Error handling

### BFF error envelope

```json
{ "code": "validation_failed", "message": "Email is required", "details": { "field": "email" } }
```

| HTTP | code | Trigger | RN behavior |
|---|---|---|---|
| 400 | `validation_failed` | Bad input | Surface message, don't retry |
| 401 | `unauthenticated` | JWT invalid / expired | Trigger Clerk session refresh; if still failing, sign out |
| 403 | `forbidden` | Auth OK, action not allowed | Surface friendly message, don't retry |
| 404 | `not_found` | Record doesn't exist | Existing pages handle nulls/empty |
| 409 | `conflict` | Duplicate (already favorited / reviewed) | Friendly inline message |
| 429 | `rate_limited` | Throttling | Retry once with jittered backoff |
| 502 | `upstream_unavailable` | BFF up but Odoo unreachable | "Service temporarily unavailable" — retry on next user action |
| 500 | `internal_error` | Anything else | Generic error, log to console + error reporting |

### Retry policy in `lib/api/client.ts`

- Idempotent requests (GETs, DELETEs): retry up to 2 times with jittered exponential backoff (200 ms / 600 ms) on 429 / 502 / 503 / network errors.
- Non-idempotent requests (POSTs that create rows): **never automatically retried.** Avoids accidental double-creates.
- Multipart uploads (story photos): no auto-retry; user retries manually.

### What we explicitly don't do

- No silent data merging on conflict.
- No client-side circuit breakers (Cloudflare's edge already has one).

## 9. Local development & testing without Odoo access

### The mock Odoo

`bff/src/odoo/client.ts` exports an `OdooClient` interface:

```ts
export interface OdooClient {
  searchRead(model: string, domain: any[], fields: string[], opts?: { limit?: number; order?: string }): Promise<any[]>;
  create(model: string, values: Record<string, any>): Promise<number>;
  write(model: string, ids: number[], values: Record<string, any>): Promise<true>;
  unlink(model: string, ids: number[]): Promise<true>;
  callMethod(model: string, method: string, args: any[], kwargs?: any): Promise<any>;
}
```

Two implementations behind it:
- `OdooMockClient` — in-memory, ~300 LoC, supports the domain operators we use (`=`, `!=`, `in`, `gte`, `lt`). Loads `data/events.json` as seed.
- `OdooXmlRpcClient` — real one, built once Odoo access lands. Same interface.

Toggled by env var: `ODOO_BACKEND=mock|real`.

### Test layers

- **BFF unit tests** (vitest + miniflare): each handler tested with mock Odoo client. Covers JWT validation, authorization, input validation, response shape. <2s per run.
- **Contract tests** (RN repo): each `lib/api/<domain>.ts` has a snapshot test asserting the return shape matches what `lib/supabase/<domain>.ts` returned. **This is the safety net for the strangler swap.**
- **Local end-to-end**: `wrangler dev` runs BFF on `localhost:8787` with mock backend. RN points at LAN IP (or `10.0.2.2` for Android emulator).
- **Staging on Cloudflare Workers**: deploys with `ODOO_BACKEND=mock` until Odoo access lands. Owner can hand-test against staging via TestFlight / internal build.
- **Prod cutover**: the only change when Odoo access arrives is `ODOO_BACKEND=real` plus filling in the XML-RPC client. Routes, middleware, R2 — already battle-tested.

## 10. Open questions

### 🔴 Decision-blocking — need answers before implementation begins

**Q1 — Existing Supabase data: migrate or start fresh?**
Are there real production users today with reservations, profiles, favorites etc. that must come over? Or is this still pre-launch / dev-only data we can drop?
- If **migrate:** add a pre-Slice-3 step "Data migration script" — read every Supabase table, write into Odoo via the BFF's `create` endpoints, preserving UUIDs. ~2 days extra.
- If **start fresh:** zero extra work; Odoo starts empty.

**Q2 — Which Odoo plan is the owner on?**
This is make-or-break.
- **Odoo Online** (SaaS at odoo.com): does **not** allow custom Python modules. Plan breaks. Mitigations: (a) use Odoo Studio with `x_*` custom fields (slower, less performant, but no Python deployment), or (b) owner upgrades to Odoo.sh / self-host.
- **Odoo.sh**: custom modules deploy via git push. ✅
- **Odoo Enterprise / Community self-hosted**: custom modules deploy as files. ✅

**Q3 — Are Stripe webhooks live?**
The schema has `payments` and `payouts` but no Edge Function / webhook handler is in the codebase. If payments are live and Stripe currently posts to a Supabase Edge Function, the BFF needs `/v1/webhooks/stripe`. If not yet wired, ignore.

### 🟡 Will be answered once Odoo access lands

- Does Odoo `execute_kw` support real transactional batches for our reservation create-cascade, or do we keep explicit rollback?
- Performance: is `search_read` with related fields fast enough, or do we need a Workers KV cache for hot reads (events list, organizer summaries)?
- Authorization edge cases for organizer-side views (organizers seeing their own event reviews) — needs Odoo's group/permission model inspected.
- Whether `goswing_*` model naming is acceptable, or there's a convention to follow.
- Whether direct Postgres reads (Odoo's underlying DB) become useful for hot paths *as a follow-up optimization only*. Direct INSERTs into Odoo's tables remain off-limits — they bypass the ORM and are officially unsupported.

## 11. Appendix — Supabase → BFF → Odoo mapping

| Supabase module | BFF route prefix | Odoo model(s) |
|---|---|---|
| `lib/supabase/events.ts` | `/v1/events` | `goswing.event`, `goswing.venue`, `goswing.organizer`, `goswing.tag`, `goswing.event_tag`, `goswing.ticket_type` |
| `lib/supabase/organizers.ts` | `/v1/organizers` | `goswing.organizer`, `goswing.organizer_follow`, `goswing.organizer_gallery`, `goswing.organizer_member`, `goswing.organizer_payment_method`, `goswing.organizer_tag` |
| `lib/supabase/profile.ts` | `/v1/profile`, `/v1/onboarding` | `goswing.profile`, `goswing.user_settings`, `goswing.notification_preferences`, `goswing.user_interest`, `goswing.login_history`, `goswing.user_payment_method` |
| `lib/supabase/checkout.ts` | `/v1/checkout`, `/v1/reservations` | `goswing.reservation`, `goswing.reservation_item`, `goswing.ticket`, `goswing.ticket_holder`, `goswing.ticket_attendee`, `goswing.payment`, `goswing.wallet_pass`, `goswing.ticket_checkin` |
| `lib/supabase/myReservations.ts` | `/v1/me/reservations` | (joined reservations + items + tickets + holders) |
| `lib/supabase/reservationDetails.ts` | `/v1/reservations/:id` | (same — single-record fetch with QR data) |
| `lib/supabase/eventAccess.ts` | `/v1/events/:id/access` | (computed from `goswing.reservation` for current user) |
| `lib/supabase/saved.ts` | `/v1/favorites` | `goswing.event_favorite`, `goswing.event_attendance` |
| `lib/supabase/reviews.ts` | `/v1/reviews` | `goswing.event_review`, `goswing.venue_review` |
| `lib/supabase/songSuggestions.ts` | `/v1/song-suggestions` | `goswing.event_song_suggestion` |
| `lib/supabase/stories.ts` | `/v1/stories` | `goswing.event_story` + R2 bucket `story-photos` |
| `lib/SupabaseClerkBridge.tsx` | (replaced by client middleware) | n/a |
| Supabase Storage `story-photos` | (replaced by R2 binding) | n/a |
| Supabase Edge Function `debug_auth_context` (RPC) | `/v1/debug/auth` | n/a |

---

## Review checklist (for the user)

- [ ] § 2 Goals & non-goals — anything missing or wrong?
- [ ] § 3 Decisions — any of these you want to reopen?
- [ ] § 7 Slice plan — ordering and scope of each slice acceptable?
- [ ] § 10 Q1 — migrate existing Supabase data, or start fresh?
- [ ] § 10 Q2 — which Odoo plan is the owner on?
- [ ] § 10 Q3 — are Stripe webhooks live in production?
