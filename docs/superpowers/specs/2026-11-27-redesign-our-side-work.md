# GoSwing — Mobile Redesign: Our-Side Work (non-Odoo)

**Date:** 2026-11-27
**Status:** Draft
**Scope:** Map, Discover, Bookings, Profile (and everything reachable from them). Social tab ships as a disabled icon.
**Companion:** `2026-11-27-rest-api-phase-4-redesign-routes.md` — the routes OPTIDEEP builds in Odoo (numbers 128–185 referenced below).

This lists what **we** build: the mobile app, the admin app, a small proxy, Clerk configuration, and third-party setup. Nothing here needs Odoo changes beyond what the Phase 4 spec already covers.

## Decisions taken (2026-11-27)

| # | Decision |
| - | -------- |
| 1 | Profile header without Social: account-style header (avatar, name, @username, city, events attended / saved / reviews). No posts, followers, highlights, grid or Create button until Social ships. |
| 2 | Payments: **Pay now and Pay at the venue**, with partly-paid bookings and "Pay X now" later. |
| 3 | Artists ship **now**: Discover Artists tab, artist page, event line-ups. |
| 4 | Ratings: GoSwing + **Google** only. No Tripadvisor, no "popular times" / live busyness. |
| 5 | Wallet (balance, top-up, auto-reload) **deferred**. Payment methods keep cards + transaction history. |

Also out of scope: in-app partner workspaces / "Switch profile", "Become an artist", share-to-friends and add-to-story (share sheet keeps the outside-GoSwing options).

---

## 1. Places proxy (Google) — new, our side

**Why:** the redesign shows venues that are not on GoSwing ("Not on GoSwing yet · info from Google") and a Google rating next to the GoSwing one. Today the mobile app calls Google Geocoding/Places directly with a key shipped in the app (`hooks/useCurrentCity.tsx`, `components/blocks/LocationPicker.tsx`) and uses OpenStreetMap Overpass for nearby places (`components/map/nearbyPlaces.ts`).

**Where:** Next.js route handlers in `goswing-admin` (`src/app/api/places/*`), which already runs server code and holds secrets. Authenticated with the user's Clerk JWT (same Clerk instance as the API).

| Route | Purpose | Google API |
| ----- | ------- | ---------- |
| `GET /api/places/nearby?lat&lng&radius&types[]` | Unregistered venue pins (bars, clubs, restaurants…) | Places API (New) — Nearby Search, field mask: id, displayName, location, primaryType, rating, userRatingCount, currentOpeningHours.openNow, priceLevel |
| `GET /api/places/:placeId` | Unregistered place pop-up | Place Details (+ photos: first 5 photo names) |
| `GET /api/places/:placeId/photo?name&maxWidth` | Photo bytes (keeps the key server-side) | Place Photos |
| `GET /api/places/rating?placeIds[]` | Google rating for GoSwing venues that have `googlePlaceId` | Place Details (rating fields only) |
| `GET /api/geo/reverse?lat&lng` and `GET /api/geo/autocomplete?q` | City picker / "Use my current location" | Geocoding + Places Autocomplete |

Rules:
- **De-duplicate:** drop Google results whose `id` equals a GoSwing venue's `googlePlaceId` (Odoo route 128 returns it), or that are within 30 m with a similar name.
- **Cache:** 24 h for details/ratings, 15 min for nearby results keyed by rounded lat/lng (Google terms allow caching place ids indefinitely; other fields briefly). Use Vercel KV/Upstash or in-memory LRU.
- **Cost guard:** field masks on every call; per-user rate limit (60/min); daily budget alert in Google Cloud.
- Display Google attribution where Google data is shown.
- Remove the direct Google calls and the OSM Overpass code from the mobile app once the proxy is live.

## 2. Spotify data for artist pages — new, our side

The artist Music tab (top tracks, releases) and "Listen on Spotify" use `spotifyArtistId` stored in Odoo (spec § F.1).

- `GET /api/music/artists/:spotifyArtistId` in `goswing-admin` → `{ topTracks[{ title, durationSec, popularity, previewUrl, url }], releases[{ title, year, type, artworkUrl, url }] }` via Spotify Web API (client-credentials flow; needs a Spotify developer app — client id/secret as env vars). Cache 24 h. Show popularity instead of play counts (Spotify does not expose play counts).
- Admin line-up picker: optional "Find on Spotify" search (`GET /api/music/search-artists?q`) to fill `spotifyArtistId` and links when creating an artist.
- Song suggestions and voting keep **Deezer** in v1 (already integrated in `SuggestSongsModal`, free, 30 s previews) — spec § N.5.

## 3. Clerk — account security screens

Account settings in the redesign map onto Clerk; no Odoo work.

| Screen item | Clerk (Expo SDK `@clerk/clerk-expo`) |
| ----------- | ------------------------------------ |
| Change password (current + new, strength meter) | `user.updatePassword({ currentPassword, newPassword })`; strength computed client-side (zxcvbn-ts) |
| 2-step verification: SMS or authenticator app | `user.createTOTP()` / `verifyTOTP()`; phone as second factor (`phoneNumber.setReservedForSecondFactor`) — enable MFA in the Clerk dashboard |
| Email verified / change email | `user.createEmailAddress()` → `prepareVerification` / `attemptVerification`, then set primary |
| Add & verify phone (OTP) | `user.createPhoneNumber()` → `prepareVerification({ strategy: 'phone_code' })` |
| Sessions / devices + log out per device | `user.getSessions()` → `session.revoke()`; device/location from session `latestActivity` |
| Login alerts | Clerk "new device sign-in" email (dashboard setting) |
| Social sign-in (Apple / Google) | already present |

Clerk changes to email/phone already sync to the API (Phase 2 profile). Confirm the Clerk instance mismatch is resolved (Phase 4 spec § B.5).

## 4. Payments in the app

Depends on the provider OPTIDEEP picks (spec § N.1). Assuming Stripe:

- Add `@stripe/stripe-react-native`; configure Apple Pay merchant id (iOS entitlement, Apple Developer) and Google Pay (Android manifest). Needs a dev-client/EAS build (not Expo Go).
- Checkout: on open → route 145 (hold); quantity change → 146; close → 147. Countdown from `expiresAt`. "Pay now" → `POST /v1/reservations` (`paymentMode: "payNow"`) → route 148 → `initPaymentSheet` / `confirmPlatformPayPayment` with `clientSecret` → poll route 149 until `succeeded` → done screen.
- "Pay at the venue" → `POST /v1/reservations` (`paymentMode: "payAtVenue"`) → done screen with the release time.
- Bookings "Pay X now" → route 148 with the unpaid `ticketIds`.
- Add a card → route 151 + `presentPaymentSheet` in setup mode.
- Never send card data to our servers; prices always come from the server.

## 5. Mobile app work (UI rebuild)

New design system from the prototype: violet `#5B36F2` / `#4A26D9` / `#EFEBFF`, accent pink `#E0296B`, ink `#14121F`, muted `#6B6880`, surfaces `#F7F6FB` / `#F1F0F5`, success `#1F7A43` / `#E3F5EA`; rounded cards, pill chips, floating tab bar; Lucide icons (`lucide-react-native`); EN/FR copy. Replace `theme/colors.ts`, `tailwind.config.js` tokens.

| Area | Work | Backend needed |
| ---- | ---- | -------------- |
| Tab bar | Map · Discover · Bookings (badge = active count) · Social (**disabled**, "Coming soon") · Profile | — |
| Map | Event pins with price chip + live flame, carousel, category chips, heat layer + hot-spot labels (computed on device from events' `attendeeCount` and location), venue pins, map/satellite toggle, recenter, city picker, map search, event pop-up, place pop-up (GoSwing and unregistered), directions deep link (Apple/Google Maps), share | Works today for events (route 1); venues need 128–135; unregistered places need proxy § 1 |
| Discover | Header + search, All/Events/Places/Artists tabs, type chips, rows (now & today, all today, top this week, all this week, best places, all places, best/all artists), See-all lists, filter sheet (when, price, access, distance, venue types, genres) with live count | Events work today with on-device filtering; places 128/136; artists 137–144 |
| Event page | Full redesign; line-up; music block (suggest / vote / scan venue QR with `expo-camera`); similar & more-from rows with list/calendar view; sticky Book bar | 141, 158, 160–167; works partially today |
| Place / Organizer / Artist pages | New place and artist pages; organizer page restyle; reviews tabs and write-review flow | 129–135, 139–144, 154–159 |
| Checkout | Quantity stepper (max 10), holder names/emails, pay now / pay at venue, payment method picker, overview with "You save", door price line, done screen | 145–151 + § 4 |
| Bookings | Savings header, Active/Past, status chips (Paid / Partly paid / Unpaid / Used / Ended), ticket sheet with per-ticket QR, holder, payment state, "Pay X now", download (`expo-media-library`), share, **offline cache** of bookings + QR payloads (AsyncStorage/SecureStore) | Works today except payment states/savings summary (§ H of spec) |
| Profile | Account header (decision 1), overview menu, interests, quick settings (push, location, language), Saved (events, songs), My reviews (pending + list), Edit profile (photo upload, username with live availability, bio, city, date of birth), Account settings (§ 3), Payment methods (cards, transactions), Notifications, Help, Legal | 165–171 + Clerk; most settings work today |

Fix while there: Edit profile must upload the photo (route 169) instead of PATCHing a local file path; remove dead `pages/EventPage.tsx`, `pages/EventGalleryPage.tsx`, unused `data/*.json`.

## 6. Admin app work (`goswing-admin`)

| Feature | Work | Odoo route |
| ------- | ---- | ---------- |
| Event form | Doors open, last entry, min age, pay-at-venue toggle, max per order; per tier: sale price, door price, benefits, sales window | 78/79 (spec § L.1) |
| Line-up | Artist picker (search + create, optional Spotify lookup), roles, set times, headliner, drag to sort | 172–175 |
| Music settings | Mode, suggestion cutoff and per-user limit, walk-in voting toggle; `dj` role can edit these only | § L.1 / L.6 |
| Vote lists | Create from suggestions, open/close, live counts | 176–179 |
| Venue QR | Printable/displayable venue code page with auto-refresh on rotation | 180–181 |
| Venue form | Area, price level, phone, website, Instagram, amenities, weekly opening hours editor (split hours, after midnight), Google place link (search via proxy § 1), video uploads | 82/84, 115 |
| Door mode | Camera QR scan (browser `BarcodeDetector` or `@zxing/browser`), manual code, guest search, undo, collect payment (cash / card terminal), wrong-event and already-used states; for `entrance_manager` | 182–185 |
| Orders / attendees / finance | Payment mode & status columns and filters, unpaid/released counts, door payments in transactions | 90–95 (spec § L.10) |
| Places proxy & music proxy | Host §§ 1–2 under `src/app/api/` | — |

Admin bugs B2–B9 from `docs/e2e-test-report-2026-08-01.md` should be closed in the same pass (B1/B7 are Odoo's, spec § B).

## 7. Content & third-party setup

- **Help & support:** FAQ content (EN/FR) as static JSON in the app (or a CMS later); "Report a problem" → email to support (or a ticketing tool) with optional screenshot; live chat via a hosted widget (e.g. Crisp/Intercom) or hide the row in v1.
- **Legal:** privacy policy and terms (EN/FR) hosted on the website with a "last updated" date and PDF; the app opens them in-app.
- **Accounts/keys to create:** Google Cloud (Places API New, Geocoding) server key; Spotify developer app; payment provider account(s) with Apple Pay / Google Pay enabled; Apple merchant id.
- **Builds:** Stripe and camera require an EAS dev client; set up EAS build profiles if not already.

## 8. Suggested order (our side)

1. Design system + tab bar + Map/Discover/Bookings/Profile on **today's** API (no Odoo dependency).
2. Places proxy (§ 1) → unregistered venues + Google ratings; swap out OSM and the in-app Google key.
3. Clerk security screens (§ 3).
4. Plug in Odoo slices as they land (spec § O): P4-A event/ticket fields → P4-B venues → P4-C payments (+ § 4, admin door mode) → P4-D profile → P4-E reviews → P4-F artists (+ § 2, admin line-up) → P4-G music voting.
