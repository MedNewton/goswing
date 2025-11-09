import './style/globals.css';
import React, { useMemo, useState, type ReactElement } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
import EventPage from '@/pages/EventPage';

import { getEvents, getCategories, getUser } from '@/data/loaders';
import type { Event } from '@/types/domain';

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

type Route =
  | { name: 'root' }
  | { name: 'eventDetails'; id: string };

function HomeScreen(): ReactElement {
  const user = getUser();
  const allEvents = getEvents();
  const categories = getCategories();

  const [bottomTab, setBottomTab] = useState<BottomTabKey>('home');
  const [route, setRoute] = useState<Route>({ name: 'root' });

  const [query, setQuery] = useState<string>('');
  const [activeCats, setActiveCats] = useState<ReadonlyArray<string>>([]);
  const [activeTab, setActiveTab] = useState<HomeTabKey>('events');
  const [whenKey, setWhenKey] = useState<WhenKey | null>(null);

  const openEventDetails = (eventId: string): void => setRoute({ name: 'eventDetails', id: eventId });
  const closeEventDetails = (): void => setRoute({ name: 'root' });

  const toggleCategory = (key: string, next: boolean): void => {
    setActiveCats((prev) => (next ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const filteredEvents: ReadonlyArray<Event> = useMemo(() => {
    let list = allEvents;

    if (query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.organizer.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          (e.city ? e.city.toLowerCase().includes(q) : false)
      );
    }

    if (activeCats.length > 0) {
      list = list.filter((e) => (e.categories ?? []).some((c) => activeCats.includes(c)));
    }

    if (whenKey) {
      list = list;
    }

    return list;
  }, [allEvents, query, activeCats, whenKey]);

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

  const renderRoot = (): ReactElement => {
    if (bottomTab === 'search') return <SearchPage />;
    if (bottomTab === 'saved') return <SavedPage />;

    if (bottomTab !== 'home') {
      return (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray600">
            {bottomTab.charAt(0).toUpperCase() + bottomTab.slice(1)} coming soon…
          </Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerClassName={cx('pb-32')} showsVerticalScrollIndicator={false}>
        <Header
          userName={user.name}
          greeting="Good evening"
          locationLabel={user.city ?? 'Unknown'}
          onPressNotifications={() => { }}
          onPressLocation={() => { }}
        />

        <View className="mt-3 px-4">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onSubmit={() => { }}
            onPressFilter={() => { }}
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
            onChange={setActiveTab}
            renderPanel={(key) =>
              key === 'events' ? (
                <FeaturedEvents
                  events={filteredEvents}
                  onPressEvent={openEventDetails}
                  onToggleFavorite={() => { }}
                  onPressSeeAll={() => {
                    console.log('See All tapped');
                  }}
                />
              ) : (
                <View className="h-64 items-center justify-center bg-white rounded-2xl border border-gray200">
                  <Text className="text-gray600">Map view coming soon…</Text>
                </View>
              )
            }
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      {route.name === 'root' ? renderRoot() : (
        <EventPage eventId={route.id} onBack={closeEventDetails} onBook={(id) => console.log('Book', id)} />
      )}

      <BottomTabBar activeKey={bottomTab} onChange={(key) => {
        setBottomTab(key);
        if (route.name !== 'root') closeEventDetails();
      }} />
    </SafeAreaView>
  );
}

export default function App(): ReactElement {
  return (
    <SafeAreaProvider>
      <HomeScreen />
    </SafeAreaProvider>
  );
}
