// screens/map/usePlaces.ts — place pins for the visible map area.
//
// Nearby bars/restaurants/clubs come from OpenStreetMap (the existing
// Overpass code in components/map/nearbyPlaces.ts); GoSwing venues come from
// the API (see ./api.ts). An OSM place that matches a GoSwing venue is shown
// once, as the GoSwing venue.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Region } from 'react-native-maps';

import { fetchNearbyPlaces, type NearbyPlace } from '@/components/map/nearbyPlaces';
import { fetchMapVenues } from './api';
import { categoriesOfText, samePlace, type MapPlace } from './model';

function osmToPlace(p: NearbyPlace): MapPlace {
  return {
    id: `osm-${p.id}`,
    name: p.name,
    source: 'osm',
    kind: p.category,
    lat: p.lat,
    lng: p.lng,
    address: p.address ?? null,
    openingHours: p.openingHours ?? null,
    categories: categoriesOfText([p.category]),
  };
}

export function useMapPlaces(cityLabel: string): Readonly<{
  places: ReadonlyArray<MapPlace>;
  onRegion: (r: Region) => void;
}> {
  const [osm, setOsm] = useState<ReadonlyMap<string, MapPlace>>(new Map());
  const [venues, setVenues] = useState<ReadonlyArray<MapPlace>>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKey = useRef<string>('');
  const venueKey = useRef<string>('');

  const load = useCallback(
    (r: Region) => {
      const radiusM = Math.round(Math.min(Math.max((r.latitudeDelta / 2) * 111_000, 600), 4000));
      const key = `${r.latitude.toFixed(3)},${r.longitude.toFixed(3)},${radiusM}`;
      if (key !== lastKey.current) {
        lastKey.current = key;
        fetchNearbyPlaces(r.latitude, r.longitude, radiusM)
          .then((list) => {
            if (!list.length) return;
            setOsm((prev) => {
              const next = new Map(prev);
              for (const p of list) if (!next.has(`osm-${p.id}`)) next.set(`osm-${p.id}`, osmToPlace(p));
              return next;
            });
          })
          .catch(() => undefined);
      }
      // GoSwing venues: once per ~10 km area / city.
      const vKey = `${r.latitude.toFixed(1)},${r.longitude.toFixed(1)},${cityLabel}`;
      if (vKey !== venueKey.current) {
        venueKey.current = vKey;
        fetchMapVenues({ lat: r.latitude, lng: r.longitude, city: cityLabel })
          .then((list) =>
            setVenues((prev) => {
              const seen = new Set(prev.map((v) => v.id));
              return [...prev, ...list.filter((v) => !seen.has(v.id))];
            }),
          )
          .catch(() => undefined);
      }
    },
    [cityLabel],
  );

  const onRegion = useCallback(
    (r: Region) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => load(r), 500);
    },
    [load],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const places = useMemo(() => {
    const osmList = [...osm.values()];
    // A GoSwing venue borrows the OSM address / opening hours it lacks.
    const out: MapPlace[] = venues.map((v) => {
      const m = osmList.find((p) => samePlace(v, p));
      return m ? { ...v, address: v.address ?? m.address, openingHours: v.openingHours ?? m.openingHours } : v;
    });
    for (const p of osmList) {
      if (venues.some((v) => samePlace(v, p))) continue;
      out.push(p);
    }
    return out;
  }, [osm, venues]);

  return { places, onRegion };
}
