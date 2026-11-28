// providers/EventsProvider.tsx
// Shared data for the Map and Discover tabs: the published events list, the
// user's saved events, and the user's location / chosen city.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { Event } from '@/types/domain';
import { getPublishedEvents } from '@/lib/supabase/events';
import { useEventFavorites } from '@/hooks/useEventFavorites';
import { useCurrentCity } from '@/hooks/useCurrentCity';

export type LatLngLiteral = Readonly<{ latitude: number; longitude: number }>;

/** A city the user picked instead of their GPS position. */
export type CityChoice = Readonly<{ label: string; center: LatLngLiteral }>;

export type EventsContextValue = Readonly<{
  events: ReadonlyArray<Event>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;

  isSaved: (eventId: string) => boolean;
  /** Optimistic; throws (after rollback) when the API call fails. */
  toggleSaved: (eventId: string, next: boolean) => Promise<void>;
  savedIds: ReadonlySet<string>;

  location: Readonly<{
    /** "Paris 11e" style label for headers. */
    label: string;
    /** GPS position, if granted. */
    coords: LatLngLiteral | null;
    /** The point distances are measured from: picked city, else GPS. */
    origin: LatLngLiteral | null;
    choice: CityChoice | null;
    setChoice: (choice: CityChoice | null) => void;
    loading: boolean;
    refresh: () => void;
  }>;
}>;

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({
  userId,
  fallbackCity,
  children,
}: Readonly<{ userId: string; fallbackCity?: string | null; children: ReactNode }>): ReactElement {
  const [events, setEvents] = useState<ReadonlyArray<Event>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await getPublishedEvents());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const fav = useEventFavorites({ userId });
  const geo = useCurrentCity();
  const [choice, setChoice] = useState<CityChoice | null>(null);

  const label =
    choice?.label ??
    (geo.city ? geo.city : geo.loading ? '…' : fallbackCity ?? '');

  const value = useMemo<EventsContextValue>(
    () => ({
      events,
      loading,
      error,
      reload,
      isSaved: fav.isFavorite,
      toggleSaved: fav.toggle,
      savedIds: fav.favoriteIds,
      location: {
        label,
        coords: geo.coords,
        origin: choice?.center ?? geo.coords,
        choice,
        setChoice,
        loading: geo.loading,
        refresh: geo.refresh,
      },
    }),
    [events, loading, error, reload, fav, label, geo.coords, geo.loading, geo.refresh, choice],
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents(): EventsContextValue {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used inside <EventsProvider>');
  return ctx;
}
