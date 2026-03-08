// components/map/nearbyPlaces.ts
// Shared nearby places logic (Overpass API / OpenStreetMap)
// Used by EventsMap, FullScreenMap, and SearchEventMap.

import { useCallback, useRef, useState } from 'react';
import type { Region } from 'react-native-maps';
import type { Feather } from '@expo/vector-icons';

/* ── Types ── */

export type PlaceCategory =
  | 'restaurant' | 'brasserie' | 'bistro'
  | 'bar' | 'pub' | 'lounge' | 'guinguette' | 'taverne'
  | 'rooftop'
  | 'discotheque' | 'club' | 'cabaret';

export type NearbyPlace = Readonly<{
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  address?: string;
  openingHours?: string;
}>;

export const CATEGORY_META: Record<
  PlaceCategory,
  { icon: keyof typeof Feather.glyphMap; color: string; label: string }
> = {
  restaurant:   { icon: 'coffee',  color: '#F59E0B', label: 'Restaurant' },
  brasserie:    { icon: 'coffee',  color: '#D97706', label: 'Brasserie' },
  bistro:       { icon: 'coffee',  color: '#B45309', label: 'Bistro' },
  bar:          { icon: 'moon' as any, color: '#8B5CF6', label: 'Bar' },
  pub:          { icon: 'moon' as any, color: '#7C3AED', label: 'Pub' },
  lounge:       { icon: 'moon' as any, color: '#6D28D9', label: 'Lounge' },
  guinguette:   { icon: 'sun',     color: '#10B981', label: 'Guinguette' },
  taverne:      { icon: 'moon' as any, color: '#5B21B6', label: 'Taverne' },
  rooftop:      { icon: 'sunrise', color: '#0EA5E9', label: 'Rooftop' },
  discotheque:  { icon: 'music',   color: '#EC4899', label: 'Discothèque' },
  club:         { icon: 'music',   color: '#DB2777', label: 'Club' },
  cabaret:      { icon: 'star',    color: '#E11D48', label: 'Cabaret' },
};

/* ── Classification ── */

function classifyPlace(tags: Record<string, string>): PlaceCategory {
  const amenity = (tags.amenity ?? '').toLowerCase();
  const name = (tags.name ?? '').toLowerCase();
  const cuisine = (tags.cuisine ?? '').toLowerCase();
  const desc = (tags.description ?? '').toLowerCase();
  const all = `${name} ${cuisine} ${desc}`;

  if (amenity === 'nightclub') {
    if (all.includes('cabaret')) return 'cabaret';
    if (all.includes('club')) return 'club';
    return 'discotheque';
  }

  if (amenity === 'bar' || amenity === 'pub') {
    if (all.includes('rooftop')) return 'rooftop';
    if (all.includes('lounge')) return 'lounge';
    if (all.includes('guinguette')) return 'guinguette';
    if (all.includes('tavern') || all.includes('taverne')) return 'taverne';
    if (amenity === 'pub') return 'pub';
    return 'bar';
  }

  if (amenity === 'restaurant') {
    if (all.includes('brasserie')) return 'brasserie';
    if (all.includes('bistro') || all.includes('bistrot')) return 'bistro';
    return 'restaurant';
  }

  return 'restaurant';
}

/* ── Fetch ── */

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<NearbyPlace[]> {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="bar"](around:${radiusM},${lat},${lng});
      node["amenity"="pub"](around:${radiusM},${lat},${lng});
      node["amenity"="restaurant"](around:${radiusM},${lat},${lng});
      node["amenity"="nightclub"](around:${radiusM},${lat},${lng});
    );
    out body 200;
  `;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) return [];

  const json = await res.json();
  const elements: any[] = json.elements ?? [];

  return elements
    .filter((el: any) => el.lat && el.lon && el.tags?.name)
    .map((el: any) => ({
      id: String(el.id),
      name: String(el.tags.name),
      category: classifyPlace(el.tags ?? {}),
      lat: el.lat,
      lng: el.lon,
      address: el.tags['addr:street']
        ? `${el.tags['addr:housenumber'] ?? ''} ${el.tags['addr:street']}`.trim()
        : undefined,
      openingHours: el.tags.opening_hours ?? undefined,
    }));
}

/* ── Hook: useNearbyPlaces ── */

export function useNearbyPlaces() {
  const placesMapRef = useRef<Map<string, NearbyPlace>>(new Map());
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const placesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlacesFetchRef = useRef<string>('');

  const mergeNewPlaces = useCallback((incoming: NearbyPlace[]) => {
    const map = placesMapRef.current;
    let added = false;
    for (const p of incoming) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
        added = true;
      }
    }
    if (added) {
      setNearbyPlaces(Array.from(map.values()));
    }
  }, []);

  const fetchPlacesForRegion = useCallback(
    (region: Region) => {
      const radiusM = Math.min((region.latitudeDelta / 2) * 111000, 5000);
      const key = `${region.latitude.toFixed(3)},${region.longitude.toFixed(3)},${Math.round(radiusM)}`;

      if (key === lastPlacesFetchRef.current) return;
      lastPlacesFetchRef.current = key;

      fetchNearbyPlaces(region.latitude, region.longitude, radiusM)
        .then(mergeNewPlaces)
        .catch(() => {});
    },
    [mergeNewPlaces],
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      if (placesTimerRef.current) clearTimeout(placesTimerRef.current);
      placesTimerRef.current = setTimeout(() => fetchPlacesForRegion(region), 600);
    },
    [fetchPlacesForRegion],
  );

  return {
    nearbyPlaces,
    fetchPlacesForRegion,
    handleRegionChangeComplete,
  };
}
