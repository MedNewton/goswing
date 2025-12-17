// pages/SearchPage.tsx
import React, { useMemo, useState, type ReactElement } from 'react';
import { View, Text, ScrollView, Pressable, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import SearchBar from '@/components/blocks/SearchBar';
import LocationPicker from '@/components/blocks/LocationPicker';
import SearchResultCard, { type SearchResultItem } from '@/components/ui/SearchResultCard';
import SearchEventMap from '@/components/map/SearchEventMap';
import EventDetailsPage from '@/pages/EventDetailsPage';

import { getEvents } from '@/data/loaders';
import type { Event, ID } from '@/types/domain';

import { applyFiltersToEvents, sortResults } from '@/components/filters/filters';
import type { FiltersPayload } from '@/components/filters/FiltersDrawer';

export type SearchPageProps = Readonly<{ className?: string } & Omit<ViewProps, 'children'>>;

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string => c.filter(Boolean).join(' ');

type Mode = 'map' | 'list';
type LatLng = { lat: number; lng: number };
const RADIUS_KM_DEFAULT = 20;

type Route =
  | { name: 'root' }
  | { name: 'eventDetails'; id: ID; initialTab?: 'about' | 'offers' | 'upcoming' };

function mapToResult(e: Event): SearchResultItem {
  return {
    id: e.id,
    title: e.title,
    organizer: e.organizer,
    city: e.city ?? null,
    venue: e.venue,
    startsAtIso: e.startsAtIso,
    priceLabel: e.priceLabel ?? null,
    rating: null,
    thumbnailUrl: (e as any)?.imageUrl as string | undefined,
  };
}

function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export default function SearchPage({ className, ...rest }: SearchPageProps): ReactElement {
  const insets = useSafeAreaInsets();

  const [route, setRoute] = useState<Route>({ name: 'root' });
  const openEventDetails = (id: ID, initialTab?: 'about' | 'offers' | 'upcoming') =>
    setRoute({ name: 'eventDetails', id, initialTab });
  const closeEventDetails = () => setRoute({ name: 'root' });

  const [mode, setMode] = useState<Mode>('map');

  const [query, setQuery] = useState<string>('');

  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [center, setCenter] = useState<LatLng | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(RADIUS_KM_DEFAULT);

  const [filters, setFilters] = useState<Partial<FiltersPayload>>({
    sortBy: 'best',
    dateQuick: 'any',
    venueTypes: [],
    musicStyles: [],
    partyTypes: [],
    access: [],
  });

  const events = useMemo(() => getEvents(), []);
  const filteredByQueryAndFilters: ReadonlyArray<Event> = useMemo(() => {
    return applyFiltersToEvents(events, query, [], filters);
  }, [events, query, filters]);

  const filteredForMapAndList: ReadonlyArray<Event> = useMemo(() => {
    let rows = filteredByQueryAndFilters;
    if (center) {
      rows = rows.filter((e) => (e.location ? distanceKm(center, e.location) <= radiusKm : false));
    }
    const sortBy: 'best' | 'date' | 'price' = (filters.sortBy as any) ?? 'best';
    return sortResults(rows, sortBy);
  }, [filteredByQueryAndFilters, center, radiusKm, filters.sortBy]);

  const resultsList: ReadonlyArray<SearchResultItem> = useMemo(
    () => filteredForMapAndList.map(mapToResult),
    [filteredForMapAndList]
  );

  if (route.name === 'eventDetails') {
    return (
      <EventDetailsPage
        eventId={route.id}
        initialTab={route.initialTab}
        onBack={closeEventDetails}
        onBook={(id) => console.log('Book', id)}
      />
    );
  }

  return (
    <View {...rest} className={cx('w-full flex-1 bg-white', className)}>
      <View className="px-4">
        <SearchBar
          value={query}
          onChangeText={setQuery}
          events={filteredForMapAndList}
          onPickEvent={(eventId) => {
            const ev = filteredForMapAndList.find((e) => e.id === eventId);
            if (ev?.location) {
              setCenter({ lat: ev.location.lat, lng: ev.location.lng });
              setMode('map');
              setRadiusKm(RADIUS_KM_DEFAULT);
            }
          }}
          onSubmit={(q) => setQuery(q)}
          initialFilters={filters}
          onApplyFilters={(next) => {
            setFilters(next);
            setMode('map');
          }}
        />
      </View>

      <View className="px-4 mt-3">
        <LocationPicker
          value={locationLabel}
          onChange={(label) => setLocationLabel(label)}
          events={events}
          onPickCenter={(c) => {
            setCenter(c);
            setMode('map');
            setRadiusKm(RADIUS_KM_DEFAULT);
          }}
        />
      </View>

      <View className="px-4 mt-3">
        <View className="flex-row items-center rounded-full bg-gray100 p-1 border border-gray200">
          <SegBtn label="Map" icon="map" selected={mode === 'map'} onPress={() => setMode('map')} />
          <SegBtn label="List" icon="list" selected={mode === 'list'} onPress={() => setMode('list')} />
        </View>
      </View>

      <View className="px-4 mt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray700">
            {resultsList.length} {resultsList.length === 1 ? 'event' : 'events'} found
          </Text>
          <Pressable className="flex-row items-center gap-x-2 rounded-2xl bg-gray100 border border-gray200 px-3 py-2">
            <Text className="text-sm text-gray700">Date</Text>
            <Feather name="chevron-down" size={16} color="#6B7280" />
          </Pressable>
        </View>
      </View>

      <View className="mt-3 px-4 flex-1">
        {mode === 'list' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-y-3"
            contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {resultsList.map((item) => (
              <Pressable key={item.id} onPress={() => openEventDetails(item.id as ID, 'about')}>
                <SearchResultCard item={item} />
              </Pressable>
            ))}
            <View style={{ height: (insets.bottom || 0) + 24 }} />
          </ScrollView>
        ) : (
          <SearchEventMap
            events={filteredForMapAndList}
            center={center}
            radiusKm={radiusKm}
            filters={filters as FiltersPayload}
            onPressEvent={(id, tab) => openEventDetails(id as ID, tab)}
            onRadiusChange={(next) => setRadiusKm(next)}
            height={600}
          />
        )}
      </View>
    </View>
  );
}

function SegBtn({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cx(
        'flex-1 flex-row items-center justify-center gap-x-2 py-2 rounded-full',
        selected ? 'bg-white border border-gray300' : 'bg-transparent'
      )}
    >
      <Feather name={icon} size={18} color={selected ? '#0EA5E9' : '#374151'} />
      <Text className={selected ? 'text-brand font-medium' : 'text-gray700 font-medium'}>
        {label}
      </Text>
    </Pressable>
  );
}
