// screens/bookings/bookingsStore.ts
// One shared copy of "my bookings" for the Bookings tab, the tab-bar badge and
// the ticket screen. Cached in AsyncStorage (bookings + QR payloads) so tickets
// show instantly and keep working offline.
import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchMyBookings, isNetworkError, type Booking, type BookingsData } from '@/lib/api/bookings';
import { applyMockPayments, loadMockState } from './mockPayments';

const CACHE_PREFIX = 'gs.bookings.v1';
const STALE_MS = 60_000;

export type BookingsState = Readonly<{
  data: BookingsData | null;
  /** First load in progress and nothing to show yet. */
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** Showing cached data because the network failed. */
  offline: boolean;
  /** When `data` was fetched (ms epoch). */
  fetchedAt: number | null;
}>;

const INITIAL: BookingsState = { data: null, loading: true, refreshing: false, error: null, offline: false, fetchedAt: null };
let state: BookingsState = INITIAL;
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;
let cacheLoaded = false;
let userId = '';

const cacheKey = (): string => `${CACHE_PREFIX}.${userId || 'anon'}`;

/**
 * Ties the store (and its offline cache) to the signed-in user, so another
 * account on the same device never sees someone else's tickets. Safe to call
 * during render: it only resets when the user changes, before anything loads.
 */
export function bindBookingsUser(id: string | null | undefined): void {
  const next = id ?? '';
  if (next === userId) return;
  userId = next;
  state = INITIAL;
  cacheLoaded = false;
  inflight = null;
}

function set(patch: Partial<BookingsState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

async function loadCache(): Promise<void> {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(cacheKey());
    if (!raw || state.data) return;
    const parsed = JSON.parse(raw) as { data: BookingsData; fetchedAt: number };
    if (parsed?.data?.active && parsed?.data?.past) {
      const data = applyMockPayments(parsed.data, await loadMockState(userId));
      set({ data, fetchedAt: parsed.fetchedAt ?? null, loading: false });
    }
  } catch {
    // Corrupt or unavailable cache: ignore.
  }
}

async function saveCache(data: BookingsData, fetchedAt: number): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(), JSON.stringify({ data, fetchedAt }));
  } catch {
    // Storage full or unavailable: the app still works online.
  }
}

/** Load (or reload) bookings. `force` skips the freshness check. */
export function refreshBookings(opts: Readonly<{ force?: boolean; pull?: boolean }> = {}): Promise<void> {
  if (inflight) return inflight;
  if (!opts.force && state.fetchedAt && !state.offline && Date.now() - state.fetchedAt < STALE_MS) return Promise.resolve();
  const forUser = userId;
  inflight = (async () => {
    await loadCache();
    set({ refreshing: !!opts.pull, error: null });
    try {
      const data = applyMockPayments(await fetchMyBookings(), await loadMockState(forUser));
      if (forUser !== userId) return; // signed-in user changed meanwhile
      const fetchedAt = Date.now();
      set({ data, loading: false, refreshing: false, offline: false, error: null, fetchedAt });
      void saveCache(data, fetchedAt);
    } catch (e: unknown) {
      if (forUser !== userId) return;
      const msg = e instanceof Error ? e.message : String(e);
      set({
        loading: false,
        refreshing: false,
        // With cached data, a failed refresh is shown as "offline"; without, as an error.
        offline: !!state.data,
        error: state.data ? null : isNetworkError(e) ? 'network' : msg,
      });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** The signed-in user the store is bound to (for per-user local records). */
export function currentBookingsUser(): string {
  return userId;
}

/**
 * Re-applies the test-mode payment records to the loaded bookings at once
 * (works offline), then refreshes from the API.
 */
export async function reapplyMockPayments(): Promise<void> {
  const forUser = userId;
  if (state.data) {
    const data = applyMockPayments(state.data, await loadMockState(forUser));
    if (forUser === userId) {
      set({ data });
      if (state.fetchedAt) void saveCache(data, state.fetchedAt);
    }
  }
  await refreshBookings({ force: true });
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

const getSnapshot = (): BookingsState => state;

export function useBookings(): BookingsState {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void refreshBookings();
  }, []);
  return s;
}

/** A booking from the shared list (active or past), if loaded. */
export function findBooking(id: string): Booking | null {
  const d = state.data;
  if (!d) return null;
  return d.active.find((b) => b.id === id) ?? d.past.find((b) => b.id === id) ?? null;
}

/** Number of active bookings (badge). Cancelled ones do not count. */
export function activeCount(d: BookingsData | null): number {
  if (!d) return 0;
  return d.active.filter((b) => !['cancelled', 'canceled', 'expired', 'refunded'].includes(b.status)).length;
}
