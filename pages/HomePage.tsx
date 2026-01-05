// pages/HomePage.tsx
import '../style/globals.css';
import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text } from 'react-native';

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


const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

type Route =
  | { name: 'root' }
  | { name: 'eventDetails'; event: Event; initialTab?: 'about' | 'offers' | 'upcoming' }
  | {
    name: 'checkout';
    event: Event; // keep full event so Checkout + back navigation is easy
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

export default function HomePage(): ReactElement {
  const { user: clerkUser } = useAuth();

  const user = getUser(); // you can keep this for UI mock fields (name/city) if you want

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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.rpc('debug_auth_context');
      console.log('debug_auth_context', { data, error });
      console.log("log")
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
        disabled: !!c.disabled,
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

  const eventsForUI = filteredEvents;



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
          onPressNotifications={() => { }}
          onPressLocation={refresh}
        />

        <View className="mt-3 px-4">
          <SearchBar
            events={eventsForUI}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setPickedEventId(null);
            }}
            onSubmit={() => { }}
            onPressFilter={() => { }}
            initialFilters={filters}
            onApplyFilters={(f) => {
              setFilters(f);
              setActiveTab('map');
              setPickedEventId(null);
            }}
            onPickEvent={(id) => {
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
                        const idx = eventsForUI.findIndex((e) => String(e.id) === String(pickedEventId));
                        if (idx <= 0) return eventsForUI;
                        const picked = eventsForUI[idx];
                        return [picked, ...eventsForUI.slice(0, idx), ...eventsForUI.slice(idx + 1)];
                      })()
                      : eventsForUI
                  }
                  onPressEvent={(id) => openEventDetails(id)}
                  onToggleFavorite={() => { }}
                  onPressSeeAll={() => { }}
                  highlightId={pickedEventId ?? undefined}
                />
              ) : (
                <EventsMap
                  events={eventsForUI}
                  filters={filters as FiltersPayload}
                  searchValue={query}
                  onChangeSearch={setQuery}
                  focusEventId={pickedEventId}
                  onPressEvent={(id, tab) => openEventDetails(id, tab)}
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
          // IMPORTANT: use onBook to route (no type mismatch, no setRoute signature issues)
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
          // If CheckoutPage also expects eventSnapshot, pass it too:
          // eventSnapshot={route.eventSnapshot}
          onBack={() => setRoute({ name: 'eventDetails', event: route.event })}
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
