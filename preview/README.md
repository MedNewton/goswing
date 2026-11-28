# Web preview (fake data)

Runs the real app in a browser with a fake signed-in user and fake API responses,
so screens can be checked and screenshotted without a device, Clerk or the API.
It is **off by default**: nothing here is bundled into the iOS/Android app.

```bash
npm run preview:web            # http://localhost:8099
node preview/shot.js out.png   # 390×844 screenshot (Playwright)
node preview/shot.js out.png Discover          # click visible text first
node preview/shot.js out.png "@Close"          # click by accessibility label
```

How it works (`GOSWING_PREVIEW=1`, see `metro.config.js`):

| Real module | Preview stand-in |
| ----------- | ---------------- |
| `@clerk/clerk-expo` | `mocks/clerk.tsx` — always signed in |
| `react-native-maps` | `mocks/maps.tsx` — drawn backdrop, markers projected from coordinates |
| `expo-location` | `mocks/location.ts` — fixed position in Paris 11e |
| `fetch` to the API | `api/mockFetch.ts` → handlers in `fixtures/*.ts` |

Add fake responses for your area in `fixtures/<area>.ts` (`map`, `discover`,
`bookings`, `profile`); they take precedence over `fixtures/core.ts`.
Dates in fixtures are relative to now (`fixtures/time.ts`) so "live now" and
"tonight" states always show.
