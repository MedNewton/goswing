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
import ReservationsPage from '@/pages/ReservationPage';

import EventsMap from '@/components/map/EventsMap';
import EventDetailsPage from '@/pages/EventDetailsPage';
import ProfilePage from '@/pages/ProfilePage';
import CheckoutPage from '@/pages/CheckoutPage';

import { getCategories, getUser } from '@/data/loaders';
import type { Event } from '@/types/domain';
import { useCurrentCity } from '@/hooks/useCurrentCity';
import { applyFiltersToEvents } from '@/components/filters/filters';
import type { FiltersPayload } from '@/components/filters/FiltersDrawer';

import { getPublishedEvents } from '@/lib/supabase/events';
import type { TicketQuantities, TicketType } from '@/components/blocks/TicketQuantitySheet';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

import { useEventFavorites } from '@/hooks/useEventFavorites';

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

type Route =
  | { name: 'root' }
  | { name: 'eventDetails'; event: Event; initialTab?: 'about' | 'offers' | 'upcoming' }
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
    };

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}

export default function HomePage(): ReactElement {
  const { user: clerkUser } = useAuth();
  const user = getUser();

  // This is the ONLY userId you should pass to CheckoutPage/createReservation
  const userId: string = String(clerkUser?.id ?? '');

  if (!userId) {
    // AuthGate should prevent this, but keep it as a safety net
    return <Text>Missing auth session</Text>;
  }

  const categories = getCategories();
  const { city, region, loading, error, refresh } = useCurrentCity();

  const [bottomTab, setBottomTab] = useState<BottomTabKey>('home');
  const [route, setRoute] = useState<Route>({ name: 'root' });

  const [query, setQuery] = useState<string>('');
  const [activeCats, setActiveCats] = useState<ReadonlyArray<string>>([]);
  const [activeTab, setActiveTab] = useState<HomeTabKey>('map');
  const [whenKey, setWhenKey] = useState<WhenKey | null>(null);

  const [filters, setFilters] = useState<Partial<FiltersPayload>>({
    sortBy: 'best',
    dateQuick: 'any',
    venueTypes: [],
    musicStyles: [],
    partyTypes: [],
    access: [],
  });

  const [pickedEventId, setPickedEventId] = useState<string | null>(null);

  // Supabase-backed events source of truth
  const [allEvents, setAllEvents] = useState<ReadonlyArray<Event>>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Favorites: run ONCE here, then pass down
  const fav = useEventFavorites({
    supabase,
    userId,
  });

  useEffect(() => {
    (async () => {
      const { data, error: rpcError } = await supabase.rpc('debug_auth_context');
      console.log('debug_auth_context', { data, error: rpcError });
    })();
  }, []);

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

  const openEventDetails = (eventId: string, initialTab?: 'about' | 'offers' | 'upcoming'): void => {
    const ev = allEvents.find((e) => String(e.id) === String(eventId));
    if (!ev) return;
    setRoute({ name: 'eventDetails', event: ev, initialTab });
  };

  const closeEventDetails = (): void => setRoute({ name: 'root' });

  const toggleCategory = (key: string, next: boolean): void => {
    setActiveCats((prev) => (next ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const filteredEvents: ReadonlyArray<Event> = useMemo(() => {
    return applyFiltersToEvents(allEvents, query, activeCats, filters);
  }, [allEvents, query, activeCats, filters]);

  const catItems: ReadonlyArray<CategoryItem> = useMemo(
    () =>
      categories.map((c) => ({
        key: c.key,
        label: c.label,
        emoji: c.emoji,
        disabled: Boolean(c.disabled),
      })),
    [categories],
  );

  const locationLabel =
    loading
      ? 'Locating…'
      : error
        ? user.city ?? 'Unknown'
        : city
          ? region
            ? `${city}, ${region}`
            : city
          : user.city ?? 'Unknown';

  // IMPORTANT: add favorite flag from hook
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
    if (bottomTab === 'saved') return <SavedPage />;
    if (bottomTab === 'reservations') return <ReservationsPage />;
    if (bottomTab === 'profile') return <ProfilePage />;

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
          userName={user.name}
          greeting="Good evening"
          locationLabel={locationLabel}
          onPressNotifications={() => {}}
          onPressLocation={refresh}
        />

        <View className="mt-3 px-4">
          <SearchBar
            events={eventsForUIWithFav}
            value={query}
            onChangeText={(t: string) => {
              setQuery(t);
              setPickedEventId(null);
            }}
            onSubmit={() => {}}
            onPressFilter={() => {}}
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
          <WhenSlider activeKey={whenKey} onChange={(key) => setWhenKey(key)} />
        </View>

        <View className="mt-5">
          <CategoriesSlider
            categories={catItems}
            activeKeys={activeCats}
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
                  // Do not pass no-op handlers
                  // onPressSeeAll={() => {}}
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
          onBack={closeEventDetails}
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
          if (route.name !== 'root') closeEventDetails();
        }}
      />
    </SafeAreaView>
  );
}
