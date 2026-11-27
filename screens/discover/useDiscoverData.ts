// screens/discover/useDiscoverData.ts
// Places and artists for the Discover tab, loaded per city. Events come from
// the shared EventsProvider. Failures hide the matching sections.
import { useCallback, useEffect, useState } from 'react';
import { listVenues, type Venue } from '@/lib/api/venues';
import { getDiscoverPlaces, type RankedVenue } from '@/lib/api/discover';
import { getDiscoverArtists, type DiscoverArtist } from '@/lib/api/artists';

/** "Paris 11e" → "Paris"; "Lyon 2e Arrondissement" → "Lyon". */
export function cityFromLabel(label: string | null | undefined): string | null {
  const s = (label ?? '').trim();
  if (!s || s === '…') return null;
  return s.replace(/\s+\d.*$/, '').replace(/,.*$/, '').trim() || null;
}

export type DiscoverData = Readonly<{
  /** null = places unavailable (section hidden). */
  venues: ReadonlyArray<Venue> | null;
  /** Server ranking (Phase 4 route 136); null = rank on the device. */
  rankedVenues: ReadonlyArray<RankedVenue> | null;
  /** null = artists not available yet ("coming soon"). */
  artists: ReadonlyArray<DiscoverArtist> | null;
  loading: boolean;
  reload: () => void;
}>;

export function useDiscoverData(city: string | null, origin: { latitude: number; longitude: number } | null): DiscoverData {
  const [venues, setVenues] = useState<ReadonlyArray<Venue> | null>(null);
  const [rankedVenues, setRanked] = useState<ReadonlyArray<RankedVenue> | null>(null);
  const [artists, setArtists] = useState<ReadonlyArray<DiscoverArtist> | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const lat = origin?.latitude;
  const lng = origin?.longitude;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const geo = city ? {} : { lat, lng };
    void Promise.allSettled([
      listVenues({ city }),
      getDiscoverPlaces({ city, ...geo }),
      getDiscoverArtists({ city, ...geo }),
    ]).then(([v, r, a]) => {
      if (cancelled) return;
      setVenues(v.status === 'fulfilled' ? v.value : null);
      setRanked(r.status === 'fulfilled' ? r.value : null);
      setArtists(a.status === 'fulfilled' ? a.value : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // Coordinates only matter when there is no city.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, city ? 0 : lat, city ? 0 : lng, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { venues, rankedVenues, artists, loading, reload };
}
