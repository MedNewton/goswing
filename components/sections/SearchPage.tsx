// pages/SearchPage.tsx
import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { View, Text, ScrollView, Pressable, Modal, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import SearchBar from '@/components/blocks/SearchBar';
import LocationPicker from '@/components/blocks/LocationPicker';
import SearchResultCard, { type SearchResultItem } from '@/components/ui/SearchResultCard';
import SearchEventMap from '@/components/map/SearchEventMap';

import type { Event, ID } from '@/types/domain';
import { applyFiltersToEvents, sortResults } from '@/components/filters/filters';
import type { DateQuick, FiltersPayload } from '@/components/filters/FiltersDrawer';

import { getPublishedEvents } from '@/lib/supabase/events';

export type SearchPageProps = Readonly<
  {
    className?: string;
    /**
     * Open an event's detail page. The parent owns navigation so the event
     * page gets every handler (organizer, booking, favorites, related events).
     */
    onOpenEvent?: (event: Event, initialTab?: 'about' | 'offers' | 'upcoming') => void;
  } & Omit<ViewProps, 'children'>
>;

const DATE_OPTIONS: ReadonlyArray<{ key: DateQuick; labelKey: string }> = [
  { key: 'any', labelKey: 'search.anyDate' },
  { key: 'today', labelKey: 'search.today' },
  { key: 'tonight', labelKey: 'when.tonight' },
  { key: 'tomorrow', labelKey: 'when.tomorrow' },
  { key: 'this_week', labelKey: 'when.thisWeek' },
  { key: 'this_weekend', labelKey: 'when.thisWeekend' },
  { key: 'next_week', labelKey: 'when.nextWeek' },
  { key: 'next_weekend', labelKey: 'when.nextWeekend' },
  { key: 'this_month', labelKey: 'when.thisMonth' },
];

const cx = (...c: ReadonlyArray<string | null | undefined | false>): string => c.filter(Boolean).join(' ');

type Mode = 'map' | 'list';
type LatLng = { lat: number; lng: number };
const RADIUS_KM_DEFAULT = 20;

function mapToResult(e: Event): SearchResultItem {
  return {
    id: String(e.id),
    title: e.title,
    organizer: e.organizer,
    city: e.city ?? null,
    venue: e.venue ?? null,
    startsAtIso: e.startsAtIso ?? null,
    priceLabel: e.priceLabel ?? null,
    rating: null,
    thumbnailUrl: e.imageUrl ?? null,
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

export default function SearchPage({ className, onOpenEvent, ...rest }: SearchPageProps): ReactElement {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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

  // Supabase-backed events source of truth
  const [allEvents, setAllEvents] = useState<ReadonlyArray<Event>>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setEventsLoading(true);
        setEventsError(null);
        const rows = await getPublishedEvents();
        if (!cancelled) setAllEvents(rows);
      } catch (e: any) {
        if (!cancelled) setEventsError(String(e?.message ?? e));
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const openEventDetailsById = (id: ID, initialTab?: 'about' | 'offers' | 'upcoming') => {
    const ev = allEvents.find((e) => String(e.id) === String(id));
    if (!ev) return;
    onOpenEvent?.(ev, initialTab);
  };

  const activeDate: DateQuick = (filters.dateQuick as DateQuick | undefined) ?? 'any';
  const activeDateOption = DATE_OPTIONS.find((o) => o.key === activeDate);
  const dateButtonLabel =
    activeDate === 'any' || !activeDateOption ? t('filters.date') : t(activeDateOption.labelKey);

  const filteredByQueryAndFilters: ReadonlyArray<Event> = useMemo(() => {
    return applyFiltersToEvents(allEvents, query, [], filters);
  }, [allEvents, query, filters]);

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

  return (
    <View {...rest} className={cx('w-full flex-1 bg-white', className)}>
      <View className="px-4">
        <SearchBar
          value={query}
          onChangeText={setQuery}
          events={filteredForMapAndList}
          onPickEvent={(eventId) => {
            const ev = filteredForMapAndList.find((e) => String(e.id) === String(eventId));
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
          events={allEvents}
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
          <Pressable
            accessibilityRole="button"
            onPress={() => setDatePickerOpen(true)}
            className={cx(
              'flex-row items-center gap-x-2 rounded-2xl border px-3 py-2 active:opacity-80',
              activeDate === 'any' ? 'bg-gray100 border-gray200' : 'bg-black border-black',
            )}
          >
            <Text className={cx('text-sm', activeDate === 'any' ? 'text-gray700' : 'text-white')}>
              {dateButtonLabel}
            </Text>
            <Feather name="chevron-down" size={16} color={activeDate === 'any' ? '#6B7280' : '#FFFFFF'} />
          </Pressable>
        </View>
      </View>

      <View className="mt-3 px-4 flex-1">
        {eventsLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray700">Loading events…</Text>
          </View>
        ) : eventsError ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-gray900 font-semibold">Could not load events</Text>
            <Text className="text-gray600 mt-2 text-center">{eventsError}</Text>
          </View>
        ) : mode === 'list' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-y-3"
            contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {resultsList.map((item) => (
              <SearchResultCard
                key={item.id}
                item={item}
                onPress={(id) => openEventDetailsById(id as ID, 'about')}
              />
            ))}

            <View style={{ height: (insets.bottom || 0) + 24 }} />
          </ScrollView>
        ) : (
          <SearchEventMap
            events={filteredForMapAndList}
            center={center}
            radiusKm={radiusKm}
            filters={filters as FiltersPayload}
            onPressEvent={(id, tab) => openEventDetailsById(id as ID, tab)}
            onRadiusChange={(next) => setRadiusKm(next)}
            height={600}
          />
        )}
      </View>

      <Modal
        visible={datePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerOpen(false)}
      >
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setDatePickerOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl px-5 pt-5"
            style={{ paddingBottom: (insets.bottom || 0) + 16 }}
          >
            <Text className="text-lg font-semibold text-gray900 mb-2">{t('search.dateTitle')}</Text>
            {DATE_OPTIONS.map((opt) => {
              const selected = opt.key === activeDate;
              return (
                <Pressable
                  key={opt.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setFilters((prev) => ({ ...prev, dateQuick: opt.key }));
                    setDatePickerOpen(false);
                  }}
                  className="flex-row items-center justify-between py-3 border-b border-gray100 active:opacity-70"
                >
                  <Text className={cx('text-base', selected ? 'text-gray900 font-semibold' : 'text-gray700')}>
                    {t(opt.labelKey)}
                  </Text>
                  {selected ? <Feather name="check" size={18} color="#0EA5E9" /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
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
