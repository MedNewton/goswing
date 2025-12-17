// pages/HomePage.tsx
import '../style/globals.css';
import React, { useMemo, useState, type ReactElement } from 'react';
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

import { getEvents, getCategories, getUser } from '@/data/loaders';
import type { Event } from '@/types/domain';
import { useCurrentCity } from '@/hooks/useCurrentCity';
import { applyFiltersToEvents } from '@/components/filters/filters';
import type { FiltersPayload } from '@/components/filters/FiltersDrawer';

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

type Route =
  | { name: 'root' }
  | { name: 'eventDetails'; id: string; initialTab?: 'about' | 'offers' | 'upcoming' };

export default function HomePage(): ReactElement {
  const user = getUser();
  const allEvents = getEvents();
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

  const openEventDetails = (eventId: string, initialTab?: 'about' | 'offers' | 'upcoming'): void =>
    setRoute({ name: 'eventDetails', id: eventId, initialTab });
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
    [categories]
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
            {String(bottomTab ?? '').charAt(0).toUpperCase() + String(bottomTab ?? '').slice(1)} coming soon…
          </Text>
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
            events={eventsForUI}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setPickedEventId(null);
            }}
            onSubmit={() => {}}
            onPressFilter={() => {}}
            initialFilters={filters}
            onApplyFilters={(f) => {
              setFilters(f);
              setActiveTab('map');
              setPickedEventId(null);
            }}
            onPickEvent={(eventId) => {
              setPickedEventId(eventId);
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
                  onToggleFavorite={() => {}}
                  onPressSeeAll={() => {}}
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
      ) : (
        <EventDetailsPage
          eventId={route.id}
          initialTab={route.initialTab}
          onBack={closeEventDetails}
          onBook={(id) => console.log('Book', id)}
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
