import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

type Coords = { latitude: number; longitude: number };

export type CurrentCityState = {
  city: string | null;
  region: string | null;
  coords: Coords | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

function pickCityFromReverseGeocode(entry?: Location.LocationGeocodedAddress | null) {
  if (!entry) return { city: null, region: null };

  const city =
    entry.city ??
    entry.district ??
    entry.subregion ??
    entry.name ??
    null;

  const region =
    entry.region ??
    entry.subregion ??
    null;

  return { city, region };
}

async function reverseWithGoogle(coords: Coords, apiKey?: string | null) {
  if (!apiKey) return { city: null, region: null };
  const url =
    'https://maps.googleapis.com/maps/api/geocode/json?' +
    new URLSearchParams({
      latlng: `${coords.latitude},${coords.longitude}`,
      key: apiKey,
      result_type: 'locality|administrative_area_level_1',
    }).toString();

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') return { city: null, region: null };

    let city: string | null = null;
    let region: string | null = null;

    for (const r of data.results as any[]) {
      for (const c of r.address_components as any[]) {
        if (c.types?.includes('locality') && !city) city = c.long_name;
        if (c.types?.includes('administrative_area_level_1') && !region) region = c.long_name;
      }
    }
    return { city, region };
  } catch {
    return { city: null, region: null };
  }
}

export function useCurrentCity(): CurrentCityState {
  const [city, setCity] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef<boolean>(false);
  const isMounted = useRef<boolean>(true);

  const googleKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
    (globalThis as any)?.expo?.modules?.ExponentConstants?.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
    null;

  const resolveCity = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission was not granted.');
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const c: Coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      if (!isMounted.current) return;
      setCoords(c);

      const gc = await Location.reverseGeocodeAsync(c);
      const picked = pickCityFromReverseGeocode(gc?.[0]);
      let nextCity = picked.city;
      let nextRegion = picked.region;

      if (!nextCity && !nextRegion && googleKey) {
        const viaGoogle = await reverseWithGoogle(c, googleKey);
        nextCity = viaGoogle.city ?? nextCity;
        nextRegion = viaGoogle.region ?? nextRegion;
      }

      if (!isMounted.current) return;
      setCity(nextCity ?? null);
      setRegion(nextRegion ?? null);
    } catch (e: any) {
      if (!isMounted.current) return;
      setError(e?.message ?? 'Failed to resolve current city.');
      setCity(null);
      setRegion(null);
      setCoords(null);
    } finally {
      if (isMounted.current) setLoading(false);
      inFlight.current = false;
    }
  }, [googleKey]);

  useEffect(() => {
    isMounted.current = true;
    resolveCity();
    return () => {
      isMounted.current = false;
    };
  }, [resolveCity]);

  return {
    city,
    region,
    coords,
    loading,
    error,
    refresh: resolveCity,
  };
}
