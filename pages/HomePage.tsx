// pages/HomePage.tsx
import '../style/globals.css';
import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Alert } from 'react-native';

import Header from '@/components/sections/Header';
import SearchBar from '@/components/blocks/SearchBar';
import CategoriesSlider, { type CategoryItem } from '@/components/sections/CategoriesSlider';
import HomeTabs, { type HomeTabKey } from '@/components/sections/HomeTabs';
import FeaturedEvents from '@/components/sections/FeaturedEvents';
import WhenSlider, { type WhenKey } from '@/components/sections/WhenSlider';
import BottomTabBar, { type BottomTabKey } from '@/components/navigation/BottomTabBar';
import SearchPage from '@/pages/SearchPage';
import SavedPage from '@/components/sections/SavedPage';
import ReservationsPage from '@/pages/ReservationPage'; // <-- ensure this path matches your actual file

import EventsMap from '@/components/map/EventsMap';
import EventDetailsPage from '@/pages/EventDetailsPage';
import ProfilePage from '@/pages/ProfilePage';
import CheckoutPage from '@/pages/CheckoutPage';
import ReservationDetailsRoutePage from '@/pages/ReservationDetailsRoutePage';
import OrganizerProfilePage from '@/pages/OrganizerProfilePage';
import NotificationsPage from '@/pages/NotificationsPage';

import { getUser } from '@/data/loaders';
import type { Event } from '@/types/domain';
import { useCurrentCity } from '@/hooks/useCurrentCity';
import { applyFiltersToEvents } from '@/components/filters/filters';
import { VENUE_TYPES, type FiltersPayload } from '@/components/filters/FiltersDrawer';

import LocationPicker from '@/components/blocks/LocationPicker';
import { getPublishedEvents, getEventDetailsById } from '@/lib/supabase/events';
import type { TicketQuantities, TicketType } from '@/components/blocks/TicketQuantitySheet';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useProfile } from '@/hooks/profile/useProfile';


import { useEventFavorites } from '@/hooks/useEventFavorites';

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

type Route =
  | { name: 'root' }
  | { name: 'eventDetails'; event: Event; initialTab?: 'about' | 'offers' | 'upcoming' }
  | { name: 'organizerProfile'; organizerId: string; organizerName?: string }
  | {
    name: 'checkout';
    event: Event;
    eventId: string;
    ticketTypes: ReadonlyArray<TicketType>;
    quantities: TicketQuantities;
    eventSnapshot?: {
      title: string;
      imageUrl?: string | null;
      startsAtIso?: string | null;
      venue?: string | null;
      city?: string | null;
    };
  }
  | { name: 'reservationDetails'; reservationId: string }
  | { name: 'notifications' };

function filterByWhenKey(events: ReadonlyArray<Event>, key: WhenKey): ReadonlyArray<Event> {
  const now = new Date();

  function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }
  function startOfWeekMon(d: Date): Date {
    const x = new Date(d);
    const day = x.getDay();
    const diff = (day + 6) % 7;
    x.setDate(x.getDate() - diff);
    return startOfDay(x);
  }

  let rangeStart: Date;
  let rangeEnd: Date;

  switch (key) {
    case 'tonight':
      rangeStart = now;
      rangeEnd = endOfDay(now);
      break;
    case 'tomorrow': {
      const t = new Date(now);
      t.setDate(now.getDate() + 1);
      rangeStart = startOfDay(t);
      rangeEnd = endOfDay(t);
      break;
    }
    case 'this_week': {
      rangeStart = startOfWeekMon(now);
      const end = new Date(rangeStart);
      end.setDate(rangeStart.getDate() + 6);
      rangeEnd = endOfDay(end);
      break;
    }
    case 'this_weekend': {
      const weekStart = startOfWeekMon(now);
      const sat = new Date(weekStart);
      sat.setDate(weekStart.getDate() + 5);
      rangeStart = startOfDay(sat);
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      rangeEnd = endOfDay(sun);
      break;
    }
    case 'next_week': {
      const thisWeekStart = startOfWeekMon(now);
      const nextWeekStart = new Date(thisWeekStart);
      nextWeekStart.setDate(thisWeekStart.getDate() + 7);
      rangeStart = startOfDay(nextWeekStart);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
      rangeEnd = endOfDay(nextWeekEnd);
      break;
    }
    case 'next_weekend': {
      const thisWeekStart = startOfWeekMon(now);
      const nextSat = new Date(thisWeekStart);
      nextSat.setDate(thisWeekStart.getDate() + 12);
      rangeStart = startOfDay(nextSat);
      const nextSun = new Date(nextSat);
      nextSun.setDate(nextSat.getDate() + 1);
      rangeEnd = endOfDay(nextSun);
      break;
    }
    case 'this_month': {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    default:
      return events;
  }

  return events.filter((e) => {
    if (!e.startsAtIso) return false;
    const d = new Date(e.startsAtIso);
    if (Number.isNaN(d.getTime())) return false;
    return d >= rangeStart && d <= rangeEnd;
  });
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}

export default function HomePage(): ReactElement {
  const { isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useAuth();
  const user = getUser();
  const { profile } = useProfile();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = profile?.name || user.name;

  const userId: string = String(clerkUser?.id ?? '');

  if (!userId) {
    return <Text>Missing auth session</Text>;
  }

  const { city, region, loading, error, refresh } = useCurrentCity();

  const [locationOverride, setLocationOverride] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const [bottomTab, setBottomTab] = useState<BottomTabKey>('home');
  const [route, setRoute] = useState<Route>({ name: 'root' });

  const [query, setQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<HomeTabKey>('map');
  const [whenKey, setWhenKey] = useState<WhenKey | null>(null);

  const handleWhenChange = (key: WhenKey | null): void => {
    setWhenKey(key);
  };

  const [filters, setFilters] = useState<Partial<FiltersPayload>>({
    sortBy: 'best',
    dateQuick: 'any',
    venueTypes: [],
    musicStyles: [],
    partyTypes: [],
    access: [],
  });

  const [pickedEventId, setPickedEventId] = useState<string | null>(null);

  const [allEvents, setAllEvents] = useState<ReadonlyArray<Event>>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [reservationsInitialTab, setReservationsInitialTab] = useState<'active' | 'past'>('active');

  const fav = useEventFavorites({
    supabase,
    userId,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isSignedIn) return;

      // Wait until Clerk can actually produce the Supabase JWT
      const token = await getToken({ template: 'supabase' });
      if (cancelled) return;

      if (!token) {
        console.log('debug_auth_context skipped: no supabase token yet');
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('debug_auth_context');
      if (!cancelled) console.log('debug_auth_context', { data, error: rpcError });
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setEventsLoading(true);
        setEventsError(null);

        const events = await getPublishedEvents();
        if (!cancelled) setAllEvents(events);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setEventsError(msg);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const closeOverlay = (): void => setRoute({ name: 'root' });

  const openEventDetails = (eventId: string, initialTab?: 'about' | 'offers' | 'upcoming'): void => {
    const ev = allEvents.find((e) => String(e.id) === String(eventId));
    if (!ev) return;
    setRoute({ name: 'eventDetails', event: ev, initialTab });
  };

  const toggleCategory = (key: string, next: boolean): void => {
    setFilters((prev) => {
      const current = prev.venueTypes ?? [];
      const exists = current.includes(key);
      if (next && !exists) return { ...prev, venueTypes: [...current, key] };
      if (!next && exists) return { ...prev, venueTypes: current.filter((k) => k !== key) };
      return prev;
    });
  };

  const filteredEvents: ReadonlyArray<Event> = useMemo(() => {
    let result = applyFiltersToEvents(allEvents, query, [], filters);

    if (whenKey) {
      result = filterByWhenKey(result, whenKey);
    }

    return result;
  }, [allEvents, query, filters, whenKey]);

  const catItems: ReadonlyArray<CategoryItem> = useMemo(
    () =>
      VENUE_TYPES.map((label) => ({
        key: label,
        label,
      })),
    [],
  );

  const locationLabel = locationOverride
    ? locationOverride
    : loading
      ? 'Locating…'
      : error
        ? user.city ?? 'Unknown'
        : city
          ? region
            ? `${city}, ${region}`
            : city
          : user.city ?? 'Unknown';

  const eventsForUIWithFav: ReadonlyArray<Event> = useMemo(() => {
    return filteredEvents.map((ev) => ({
      ...ev,
      favorite: fav.isFavorite(String(ev.id)),
    }));
  }, [filteredEvents, fav]);

  const handleToggleFavorite = async (eventId: string, next: boolean): Promise<void> => {
    try {
      await fav.toggle(String(eventId), next);
    } catch (e: unknown) {
      Alert.alert('Saved', errorMessage(e));
    }
  };

  const renderRoot = (): ReactElement => {
    if (bottomTab === 'search') return <SearchPage />;

    if (bottomTab === 'saved')
      return (
        <SavedPage
          onOpenEvent={(eventId) => {
            const ev = allEvents.find((e) => String(e.id) === String(eventId));
            if (!ev) {
              Alert.alert('Event', 'This event is not loaded yet. Pull to refresh and try again.');
              return;
            }
            setRoute({ name: 'eventDetails', event: ev, initialTab: 'about' });
          }}
        />
      );

    if (bottomTab === 'reservations') {
      return (
        <ReservationsPage
          initialTab={reservationsInitialTab}
          route={(r) => {
            setRoute(r);
          }}
        />
      );
    }

    if (bottomTab === 'profile') {
      return (
        <ProfilePage
          onNavigateToReservations={(tab) => {
            setReservationsInitialTab(tab);
            setBottomTab('reservations');
          }}
          onNavigateToSaved={() => {
            setBottomTab('saved');
          }}
        />
      );
    }

    if (bottomTab !== 'home') {
      return (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray600">
            {String(bottomTab ?? '').charAt(0).toUpperCase() + String(bottomTab ?? '').slice(1)} coming
            soon…
          </Text>
        </View>
      );
    }

    if (eventsLoading) {
      return (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray700">Loading events…</Text>
        </View>
      );
    }

    if (eventsError) {
      return (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray900 font-semibold">Could not load events</Text>
          <Text className="text-gray600 mt-2 text-center">{eventsError}</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerClassName={cx('pb-32')} showsVerticalScrollIndicator={false}>
        <Header
          userName={displayName}
          greeting={greeting}
          locationLabel={locationLabel}
          onPressNotifications={() => setRoute({ name: 'notifications' })}
          onPressLocation={() => setLocationPickerOpen((v) => !v)}
        />

        {locationPickerOpen ? (
          <View className="px-4 mt-2">
            <LocationPicker
              value={locationOverride}
              onChange={(label) => {
                setLocationOverride(label);
                if (label) setLocationPickerOpen(false);
              }}
              events={allEvents}
            />
          </View>
        ) : null}

        <View className="mt-3 px-4">
          <SearchBar
            events={eventsForUIWithFav}
            value={query}
            onChangeText={(t: string) => {
              setQuery(t);
              setPickedEventId(null);
            }}
            onSubmit={() => { }}
            onPressFilter={() => { }}
            initialFilters={filters}
            onApplyFilters={(f: Partial<FiltersPayload>) => {
              setFilters(f);
              setActiveTab('map');
              setPickedEventId(null);
            }}
            onPickEvent={(id: string) => {
              setPickedEventId(id);
              setActiveTab('map');
            }}
          />
        </View>

        <View className="mt-5">
          <WhenSlider activeKey={whenKey} onChange={handleWhenChange} />
        </View>

        <View className="mt-5">
          <CategoriesSlider
            categories={catItems}
            activeKeys={filters.venueTypes ?? []}
            onToggle={toggleCategory}
            singleSelect={false}
          />
        </View>

        <View className="mt-4">
          <HomeTabs
            activeKey={activeTab}
            onChange={(k) => setActiveTab(k)}
            renderPanel={(key) =>
              key === 'events' ? (
                <FeaturedEvents
                  events={
                    pickedEventId
                      ? (() => {
                        const idx = eventsForUIWithFav.findIndex(
                          (e) => String(e.id) === String(pickedEventId),
                        );
                        if (idx <= 0) return eventsForUIWithFav;

                        const picked = eventsForUIWithFav[idx];
                        return [
                          picked,
                          ...eventsForUIWithFav.slice(0, idx),
                          ...eventsForUIWithFav.slice(idx + 1),
                        ];
                      })()
                      : eventsForUIWithFav
                  }
                  onPressEvent={(id: string) => openEventDetails(id)}
                  onToggleFavorite={handleToggleFavorite}
                  highlightId={pickedEventId ?? undefined}
                />
              ) : (
                <EventsMap
                  events={eventsForUIWithFav}
                  filters={filters as FiltersPayload}
                  searchValue={query}
                  onChangeSearch={setQuery}
                  focusEventId={pickedEventId}
                  onPressEvent={(id: string, tab?: 'about' | 'offers' | 'upcoming') =>
                    openEventDetails(id, tab)
                  }
                />
              )
            }
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      {route.name === 'root' ? (
        renderRoot()
      ) : route.name === 'eventDetails' ? (
        <EventDetailsPage
          event={route.event}
          initialTab={route.initialTab}
          onBack={closeOverlay}
          isFavorite={fav.isFavorite(String(route.event.id))}
          onToggleFavorite={handleToggleFavorite}
          onOpenOrganizer={({ organizerId, organizerName }) => {
            setRoute({ name: 'organizerProfile', organizerId, organizerName });
          }}
          onPressEvent={async (eventId) => {
            const local = allEvents.find((e) => String(e.id) === String(eventId));
            if (local) {
              setRoute({ name: 'eventDetails', event: local });
              return;
            }
            try {
              const ev = await getEventDetailsById(eventId);
              setRoute({ name: 'eventDetails', event: ev });
            } catch { /* ignore */ }
          }}
          onBook={(payload) => {
            setRoute({
              name: 'checkout',
              event: route.event,
              eventId: payload.eventId,
              ticketTypes: payload.ticketTypes,
              quantities: payload.quantities,
              eventSnapshot: payload.eventSnapshot,
            });
          }}
        />
      ) : route.name === 'organizerProfile' ? (
        <OrganizerProfilePage
          organizerId={route.organizerId}
          organizerName={route.organizerName}
          onBack={closeOverlay}
        />
      ) : route.name === 'notifications' ? (
        <NotificationsPage onBack={closeOverlay} />
      ) : route.name === 'reservationDetails' ? (
        <ReservationDetailsRoutePage
          reservationId={route.reservationId}
          onBack={closeOverlay}
        />
      ) : (
        <CheckoutPage
          event={route.event}
          userId={userId}
          ticketTypes={route.ticketTypes}
          quantities={route.quantities}
          onBack={() => setRoute({ name: 'eventDetails', event: route.event })}
          onSeeReservations={() => {
            setRoute({ name: 'root' });
            setBottomTab('reservations');
          }}
        />
      )}

      <BottomTabBar
        activeKey={bottomTab}
        onChange={(key) => {
          setBottomTab(key);
          if (route.name !== 'root') closeOverlay();
        }}
      />
    </SafeAreaView>
  );
}
