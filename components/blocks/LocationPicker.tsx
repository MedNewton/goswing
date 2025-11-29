// components/blocks/LocationPicker.tsx
import React, { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, type ViewProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import TextField from '@/components/ui/TextField';
import Card from '@/components/ui/Card';
import Constants from 'expo-constants';
import type { Event } from '@/types/domain';

export type City = Readonly<{
  key: string;
  label: string;
}>;

export const DEFAULT_CITIES: ReadonlyArray<City> = [
  { key: 'casablanca', label: 'Casablanca, MA' },
  { key: 'rabat', label: 'Rabat, MA' },
  { key: 'marrakech', label: 'Marrakech, MA' },
  { key: 'tangier', label: 'Tangier, MA' },
  { key: 'agadir', label: 'Agadir, MA' },
  { key: 'fes', label: 'Fes, MA' },
  { key: 'chefchaouen', label: 'Chefchaouen, MA' },
  { key: 'essaouira', label: 'Essaouira, MA' },
  { key: 'ouarzazate', label: 'Ouarzazate, MA' },
];

type LatLng = { lat: number; lng: number };

export type LocationPickerProps = Readonly<
  {
    value: string | null;
    onChange: (label: string | null) => void;
    options?: ReadonlyArray<City>;
    events?: ReadonlyArray<Event>;
    onPickCenter?: (center: LatLng | null) => void;
    placeholder?: string;
    className?: string;
  } & Omit<ViewProps, 'children'>
>;

function buildCityCentroids(events?: ReadonlyArray<Event>): Record<string, LatLng> {
  if (!events) return {};
  const buckets: Record<string, { sumLat: number; sumLng: number; n: number }> = {};
  for (const e of events) {
    if (!e.city || !e.location) continue;
    const key = e.city.trim().toLowerCase();
    const b = buckets[key] ?? { sumLat: 0, sumLng: 0, n: 0 };
    buckets[key] = { sumLat: b.sumLat + e.location.lat, sumLng: b.sumLng + e.location.lng, n: b.n + 1 };
  }
  const out: Record<string, LatLng> = {};
  for (const [k, v] of Object.entries(buckets)) {
    out[k] = { lat: v.sumLat / v.n, lng: v.sumLng / v.n };
  }
  return out;
}

type PlaceSuggestion = { placeId: string; description: string };

function usePlacesAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tRef = useRef<NodeJS.Timeout | null>(null);

  const apiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
    (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
    (Constants.manifestExtra as any)?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
    null;

  useEffect(() => {
    if (!apiKey) return;
    if (tRef.current) clearTimeout(tRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    tRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const url =
          'https://maps.googleapis.com/maps/api/place/autocomplete/json?' +
          new URLSearchParams({
            input: q,
            types: 'geocode',
            // components: 'country:ma', // uncomment to restrict to Morocco
            key: apiKey,
          }).toString();
        const res = await fetch(url);
        const data = await res.json();
        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          throw new Error(data.error_message || data.status);
        }
        setSuggestions(
          (data.predictions ?? []).map((p: any) => ({
            placeId: p.place_id,
            description: p.description,
          }))
        );
      } catch (e: any) {
        setError(e?.message ?? 'Autocomplete failed');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, [query, apiKey]);

  const getPlaceLatLng = async (placeId: string): Promise<LatLng | null> => {
    if (!apiKey) return null;
    const url =
      'https://maps.googleapis.com/maps/api/place/details/json?' +
      new URLSearchParams({
        place_id: placeId,
        fields: 'geometry',
        key: apiKey,
      }).toString();
    const res = await fetch(url);
    const data = await res.json();
    const loc = data?.result?.geometry?.location;
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  };

  return { query, setQuery, suggestions, loading, error, getPlaceLatLng };
}

const cx = (...c: ReadonlyArray<string | null | undefined | false>) => c.filter(Boolean).join(' ');

export default function LocationPicker({
  value,
  onChange,
  options = DEFAULT_CITIES,
  events,
  onPickCenter,
  placeholder = 'Search a place or pick a city…',
  className,
  ...rest
}: LocationPickerProps): ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('');
  const places = usePlacesAutocomplete();

  const cityCentroids = useMemo(() => buildCityCentroids(events), [events]);

  const filteredCities = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, filter]);

  const pickCity = (o: City) => {
    onChange(o.label);
    const cityName = o.label.split(',')[0]?.trim().toLowerCase();
    const center = cityCentroids[cityName] ?? null;
    onPickCenter?.(center);
    setOpen(false);
    setFilter('');
    places.setQuery('');
  };

  const pickPlace = async (s: PlaceSuggestion) => {
    const center = await places.getPlaceLatLng(s.placeId);
    onChange(s.description);
    onPickCenter?.(center);
    setOpen(false);
    setFilter('');
    places.setQuery(s.description);
  };

  return (
    <View {...rest} className={cx('w-full', className)}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((s) => !s)}
        className="flex-row items-center justify-between rounded-2xl bg-gray100 border border-gray200 px-4 py-3"
      >
        <View className="flex-row items-center gap-x-2">
          <Feather name="map-pin" size={18} color="#6B7280" />
          <Text className={value ? 'text-gray800' : 'text-gray500'}>
            {value ?? 'Select location…'}
          </Text>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
      </Pressable>

      {open ? (
        <Card variant="outlined" padding="md" className="mt-2">
          <TextField
            value={places.query}
            onChangeText={places.setQuery}
            placeholder={placeholder}
            variant="filled"
            size="md"
            left={<Feather name="search" size={16} color="#9CA3AF" />}
            containerClassName="rounded-xl bg-gray100"
            inputClassName="text-gray800"
          />
          <View className="mt-2 rounded-xl border border-gray200 overflow-hidden bg-white">
            {places.loading ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <ActivityIndicator />
              </View>
            ) : places.query.trim().length >= 2 ? (
              <ScrollView className="max-h-60">
                {places.suggestions.length === 0 ? (
                  <View className="py-3 items-center">
                    <Text className="text-gray500">No places found</Text>
                  </View>
                ) : (
                  places.suggestions.map((s) => (
                    <Pressable
                      key={s.placeId}
                      onPress={() => pickPlace(s)}
                      className="px-3 py-2 active:opacity-90"
                    >
                      <Text className="text-gray800">{s.description}</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            ) : (
              <View className="py-3 items-center">
                <Text className="text-gray500">Type at least 2 characters…</Text>
              </View>
            )}
          </View>
          {places.error ? <Text className="text-xs text-red-500 mt-1">{places.error}</Text> : null}

          <View className="mt-3 h-px bg-gray200" />

          <TextField
            value={filter}
            onChangeText={setFilter}
            placeholder="Filter cities…"
            variant="filled"
            size="md"
            left={<Feather name="search" size={16} color="#9CA3AF" />}
            containerClassName="rounded-xl bg-gray100 mt-3"
            inputClassName="text-gray800"
          />

          <ScrollView className="max-h-60 mt-3">
            {filteredCities.map((o) => {
              const selected = o.label === value;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => pickCity(o)}
                  className={cx(
                    'flex-row items-center justify-between px-2 py-2 rounded-lg',
                    selected ? 'bg-gray100' : 'bg-transparent'
                  )}
                >
                  <Text className="text-gray800">{o.label}</Text>
                  {selected ? <Feather name="check" size={18} color="#0EA5E9" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>
      ) : null}
    </View>
  );
}
