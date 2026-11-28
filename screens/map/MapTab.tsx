// screens/map/MapTab.tsx — Map tab root (home screen of the redesign).
//
// Full-screen map with a floating header (logo, city, category chips), event
// pins with a soft heat layer, place pins, right-side controls, a snapping
// carousel of events above the tab bar, and pop-ups for events and places.
import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { MapPinOff, RefreshCw } from 'lucide-react-native';

import type { Event } from '@/types/domain';
import { gs } from '@/theme/colors';
import { useEvents } from '@/providers/EventsProvider';
import { useAppNav } from '@/navigation/AppNav';
import { useTabBarSpace } from '@/components/navigation/BottomTabBar';
import { eventDistanceKm, eventPriceLabel, eventWhenLabel, formatDistance, isLiveNow, isPast, distanceKm, eventStart } from '@/lib/format';

import { CITIES, eventCategories, matchesCategory, placeKindKey, placeSeed, samePlace, type MapCategory, type MapPlace } from './model';
import { useMapPlaces } from './usePlaces';
import { EventPin, PlacePin } from './components/MapPins';
import HeatLayer, { type HeatSpot } from './components/HeatLayer';
import { LocationMenu, MapHeader } from './components/MapHeader';
import MapControls, { type MapKind } from './components/MapControls';
import EventCarousel, { CAROUSEL_HEIGHT, type CarouselItem, type EventCarouselHandle } from './components/EventCarousel';
import PopupSheet from './components/PopupSheet';
import EventPopup from './components/EventPopup';
import VenueSection, { type VenueInfo } from './components/VenueSection';
import MapSearch, { type SearchResult } from './components/MapSearch';

const isExpoGo = Constants.appOwnership === 'expo';
/** Google on Android and iOS dev/prod builds; Apple Maps in Expo Go on iOS. */
const PROVIDER = Platform.OS === 'ios' ? (isExpoGo ? undefined : PROVIDER_GOOGLE) : PROVIDER_GOOGLE;
const NATIVE_HEATMAP = PROVIDER === PROVIDER_GOOGLE && Platform.OS !== 'web';

const DELTA = 0.022;
const PARIS_11 = { latitude: CITIES[0].latitude, longitude: CITIES[0].longitude };
/** Carousel only lists events within this distance of the chosen city / GPS position. */
const NEAR_KM = 50;
/** Place names show once zoomed in this far (latitude delta). */
const LABEL_DELTA = 0.06;
const MAX_PLACE_PINS = 80;

/** Light Google style close to the prototype; hides Google's own business POIs. */
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#EEF0EB' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A8799' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#DCE8D3' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#BCDCF0' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6E8FA6' }] },
];

type Popup = Readonly<{ kind: 'event'; id: string }> | Readonly<{ kind: 'place'; id: string }>;

const evId = (e: Event): string => String(e.id);

export default function MapTab(): ReactElement {
  const { t, i18n } = useTranslation();
  const { events, loading, error, reload, isSaved, toggleSaved, location } = useEvents();
  const nav = useAppNav();
  const tabBarSpace = useTabBarSpace();

  const mapRef = useRef<MapView | null>(null);
  const carouselRef = useRef<EventCarouselHandle | null>(null);
  const origin = location.origin;
  const initialRegion = useRef<Region>({ ...(origin ?? PARIS_11), latitudeDelta: DELTA, longitudeDelta: DELTA }).current;
  const regionRef = useRef<Region>(initialRegion);
  const [delta, setDelta] = useState<number>(DELTA);
  const userMoved = useRef<boolean>(false);

  const [category, setCategory] = useState<MapCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [mapKind, setMapKind] = useState<MapKind>('standard');
  const pendingGps = useRef<boolean>(false);

  const { places, onRegion: loadPlacesFor } = useMapPlaces(location.label);

  const animateTo = useCallback((latitude: number, longitude: number, d?: number) => {
    const r = regionRef.current;
    const next: Region = { latitude, longitude, latitudeDelta: d ?? r.latitudeDelta, longitudeDelta: d ?? r.longitudeDelta };
    mapRef.current?.animateToRegion(next, 450);
  }, []);

  // First GPS fix (or city change): move there unless the user already panned.
  useEffect(() => {
    if (!origin) return;
    if (pendingGps.current || !userMoved.current) {
      pendingGps.current = false;
      animateTo(origin.latitude, origin.longitude, DELTA);
    }
  }, [origin?.latitude, origin?.longitude, animateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load places for the starting area.
  useEffect(() => {
    loadPlacesFor(regionRef.current);
  }, [loadPlacesFor]);

  // ── Events on the map ────────────────────────────────────────────────────
  const now = Date.now();
  const mapEvents = useMemo(() => {
    const at = new Date(now);
    return events.filter((e) => e.location && !isPast(e, at) && matchesCategory(eventCategories(e), category));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, category, Math.floor(now / 60_000)]);

  const liveIds = useMemo(() => new Set(mapEvents.filter((e) => isLiveNow(e)).map(evId)), [mapEvents]);

  /** One pin per spot: events at the same venue share it (selected, else live, else soonest). */
  const pinEvents = useMemo(() => {
    const groups = new Map<string, Event[]>();
    for (const e of mapEvents) {
      const k = `${e.location!.lat.toFixed(4)},${e.location!.lng.toFixed(4)}`;
      groups.set(k, [...(groups.get(k) ?? []), e]);
    }
    const rank = (e: Event): number =>
      (evId(e) === selectedId ? -2e13 : 0) + (liveIds.has(evId(e)) ? -1e13 : 0) + (eventStart(e)?.getTime() ?? 0);
    return [...groups.values()].map((g) => g.slice().sort((a, b) => rank(a) - rank(b))[0]);
  }, [mapEvents, liveIds, selectedId]);

  const carouselEvents = useMemo(() => {
    const ref = origin ?? regionRef.current;
    const withDist = mapEvents.map((e) => ({ e, km: eventDistanceKm(e, ref) ?? Number.POSITIVE_INFINITY }));
    // Around the chosen city / GPS position only; without either, everything.
    const list = origin ? withDist.filter((x) => x.km <= NEAR_KM) : withDist;
    return list
      .sort((a, b) => {
        const la = liveIds.has(evId(a.e)) ? 0 : 1;
        const lb = liveIds.has(evId(b.e)) ? 0 : 1;
        if (la !== lb) return la - lb;
        return (eventStart(a.e)?.getTime() ?? 0) - (eventStart(b.e)?.getTime() ?? 0);
      })
      .slice(0, 25)
      .map((x) => x.e);
  }, [mapEvents, liveIds, origin]);

  // Keep a selection (the first card) like the prototype.
  useEffect(() => {
    if (!carouselEvents.length) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (!selectedId || !carouselEvents.some((e) => evId(e) === selectedId)) setSelectedId(evId(carouselEvents[0]));
  }, [carouselEvents, selectedId]);

  const carouselItems = useMemo<ReadonlyArray<CarouselItem>>(
    () =>
      carouselEvents.map((e) => {
        const dist = formatDistance(eventDistanceKm(e, origin));
        const price = eventPriceLabel(e, t);
        return {
          id: evId(e),
          title: e.title,
          when: eventWhenLabel(e, t, i18n.language),
          where: [e.venue, dist].filter(Boolean).join(' · '),
          price,
          imageUrl: e.imageUrl || null,
          accessibilityLabel: [e.title, eventWhenLabel(e, t, i18n.language), e.venue, price].filter(Boolean).join(', '),
        };
      }),
    [carouselEvents, origin, t, i18n.language],
  );

  const heatSpots = useMemo<ReadonlyArray<HeatSpot>>(() => {
    const soon = now + 24 * 3600_000;
    return mapEvents
      .filter((e) => liveIds.has(evId(e)) || (eventStart(e)?.getTime() ?? Infinity) < soon)
      .map((e) => ({
        id: evId(e),
        latitude: e.location!.lat,
        longitude: e.location!.lng,
        attendees: e.attendeeCount ?? 0,
        live: liveIds.has(evId(e)),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapEvents, liveIds]);

  // ── Places ───────────────────────────────────────────────────────────────
  const eventVenues = useMemo(
    () => mapEvents.map((e) => ({ name: e.venue ?? '', lat: e.location!.lat, lng: e.location!.lng })).filter((v) => v.name),
    [mapEvents],
  );

  const visiblePlaces = useMemo(() => {
    const c = regionRef.current;
    return places
      .filter((p) => matchesCategory(p.categories, category))
      .filter((p) => !eventVenues.some((v) => samePlace(v, p)))
      .map((p) => ({ p, km: distanceKm(c, { latitude: p.lat, longitude: p.lng }) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, MAX_PLACE_PINS)
      .map((x) => x.p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, category, eventVenues, delta]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const onEventPin = useCallback((id: string) => {
    setMenuOpen(false);
    setSelectedId(id);
    carouselRef.current?.scrollToId(id);
    setPopup({ kind: 'event', id });
  }, []);

  const onPlacePin = useCallback((id: string) => {
    setMenuOpen(false);
    setPopup({ kind: 'place', id });
  }, []);

  const onCarouselFocus = useCallback(
    (id: string) => {
      setSelectedId(id);
      const e = events.find((x) => evId(x) === id);
      if (e?.location) animateTo(e.location.lat, e.location.lng);
    },
    [events, animateTo],
  );

  const onCarouselOpen = useCallback(
    (id: string) => {
      setSelectedId(id);
      const e = events.find((x) => evId(x) === id);
      if (e?.location) animateTo(e.location.lat, e.location.lng);
      setPopup({ kind: 'event', id });
    },
    [events, animateTo],
  );

  const onRegionChangeComplete = useCallback(
    (r: Region, details?: { isGesture?: boolean }) => {
      regionRef.current = r;
      if (details?.isGesture) userMoved.current = true;
      setDelta((d) => (Math.abs(d - r.latitudeDelta) / d > 0.15 ? r.latitudeDelta : d));
      loadPlacesFor(r);
    },
    [loadPlacesFor],
  );

  const recenter = useCallback(() => {
    const c = location.coords;
    if (c) {
      animateTo(c.latitude, c.longitude, DELTA);
    } else {
      pendingGps.current = true;
      location.refresh();
      if (location.origin) animateTo(location.origin.latitude, location.origin.longitude, DELTA);
    }
  }, [location, animateTo]);

  const pickCity = useCallback(
    (key: string) => {
      const c = CITIES.find((x) => x.key === key);
      setMenuOpen(false);
      if (!c) return;
      userMoved.current = false;
      location.setChoice({ label: c.label, center: { latitude: c.latitude, longitude: c.longitude } });
      animateTo(c.latitude, c.longitude, DELTA);
    },
    [location, animateTo],
  );

  const useMyLocation = useCallback(() => {
    setMenuOpen(false);
    userMoved.current = false;
    pendingGps.current = true;
    location.setChoice(null);
    location.refresh();
    if (location.coords) animateTo(location.coords.latitude, location.coords.longitude, DELTA);
  }, [location, animateTo]);

  const closePopup = useCallback(() => setPopup(null), []);

  const onToggleSave = useCallback(
    (id: string) => {
      toggleSaved(id, !isSaved(id)).catch((e: unknown) =>
        Alert.alert(t('home.savedAlertTitle'), e instanceof Error ? e.message : t('common.somethingWentWrong')),
      );
    },
    [isSaved, toggleSaved, t],
  );

  // ── Search ───────────────────────────────────────────────────────────────
  const searchResults = useMemo<ReadonlyArray<SearchResult>>(() => {
    const ref = origin ?? regionRef.current;
    const strip = (s: string): string =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
    const evs: SearchResult[] = events
      .filter((e) => e.location && !isPast(e))
      .map((e) => {
        const km = eventDistanceKm(e, ref);
        return {
          key: `event:${evId(e)}`,
          kind: 'event' as const,
          title: e.title,
          meta: eventWhenLabel(e, t, i18n.language),
          metaColor: gs.violetDark,
          sub: [e.venue, formatDistance(km)].filter(Boolean).join(' · '),
          imageUrl: e.imageUrl || null,
          toneKey: evId(e),
          haystack: strip([e.title, e.venue, e.organizer, e.city, ...(e.musicStyles ?? []), ...(e.partyTypes ?? []), e.venueType].filter(Boolean).join(' ')),
          order: (isLiveNow(e) ? 0 : 1e13) + (eventStart(e)?.getTime() ?? 9e12) / 1e3,
        };
      });
    const pls: SearchResult[] = places.map((p) => {
      const km = distanceKm(ref, { latitude: p.lat, longitude: p.lng });
      const k = placeKindKey(p.kind);
      const kind = k ? t(k) : p.kind;
      return {
        key: `place:${p.id}`,
        kind: 'place' as const,
        title: p.name,
        meta: kind,
        metaColor: gs.orange,
        sub: formatDistance(km) ?? '',
        imageUrl: p.coverImageUrl ?? null,
        toneKey: p.id,
        haystack: strip(`${p.name} ${kind} ${p.kind} ${p.address ?? ''}`),
        order: 1e14 + km,
      };
    });
    return [...evs, ...pls];
  }, [events, places, origin, t, i18n.language]);

  const onSearchPick = useCallback(
    (r: SearchResult) => {
      setSearchOpen(false);
      const [kind, ...rest] = r.key.split(':');
      const id = rest.join(':');
      if (kind === 'event') {
        const e = events.find((x) => evId(x) === id);
        if (e?.location) animateTo(e.location.lat, e.location.lng, DELTA);
        if (carouselItems.some((c) => c.id === id)) {
          setSelectedId(id);
          carouselRef.current?.scrollToId(id);
        }
        setPopup({ kind: 'event', id });
      } else {
        const p = places.find((x) => x.id === id);
        if (p) animateTo(p.lat, p.lng, DELTA);
        setPopup({ kind: 'place', id });
      }
    },
    [events, places, carouselItems, animateTo],
  );

  // ── Pop-up data ──────────────────────────────────────────────────────────
  const popupEvent = popup?.kind === 'event' ? (events.find((e) => evId(e) === popup.id) ?? null) : null;
  const popupPlace = popup?.kind === 'place' ? (places.find((p) => p.id === popup.id) ?? null) : null;

  const venueOfEvent = (e: Event): VenueInfo | null => {
    if (!e.location || !e.venue) return null;
    const match =
      places.find((p) => p.venueId && e.venueId && p.venueId === String(e.venueId)) ??
      places.find((p) => samePlace({ name: e.venue, lat: e.location!.lat, lng: e.location!.lng }, p)) ??
      null;
    return {
      name: e.venue,
      kind: match?.kind ?? e.venueType ?? 'bar',
      registered: true,
      source: 'goswing',
      venueId: e.venueId ? String(e.venueId) : (match?.venueId ?? null),
      lat: e.location.lat,
      lng: e.location.lng,
      address: match?.address ?? e.city ?? null,
      distanceKm: eventDistanceKm(e, origin),
      openingHours: match?.openingHours ?? null,
      coverImageUrl: match?.coverImageUrl ?? null,
      toneKey: `venue-${e.venue}`,
    };
  };

  const placeVenue = (p: MapPlace): VenueInfo => ({
    name: p.name,
    kind: p.kind,
    registered: p.source === 'goswing',
    source: p.source,
    venueId: p.venueId ?? null,
    lat: p.lat,
    lng: p.lng,
    address: p.address ?? null,
    distanceKm: origin ? distanceKm(origin, { latitude: p.lat, longitude: p.lng }) : null,
    openingHours: p.openingHours ?? null,
    coverImageUrl: p.coverImageUrl ?? null,
    toneKey: p.id,
  });

  const goEvent = (e: Event, tab?: 'offers'): void => {
    setPopup(null);
    nav.push({ name: 'eventDetails', event: e, initialTab: tab });
  };

  // ── Bottom overlay state ─────────────────────────────────────────────────
  const carouselBottom = tabBarSpace + 6;
  const showLoading = loading && events.length === 0;
  const showError = !loading && !!error && events.length === 0;
  const showEmpty = !loading && !error && carouselItems.length === 0;
  const stateCard = showLoading ? 96 : showError || (showEmpty && category !== 'all') ? 170 : showEmpty ? 120 : 0;
  const controlsBottom = carouselBottom + (carouselItems.length ? CAROUSEL_HEIGHT : stateCard ? stateCard + 16 : 0) + 8;

  return (
    <View className="flex-1" style={{ backgroundColor: gs.mapLand }}>
      <MapView
        ref={mapRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        provider={PROVIDER}
        initialRegion={initialRegion}
        mapType={mapKind === 'satellite' ? 'hybrid' : 'standard'}
        customMapStyle={mapKind === 'standard' ? MAP_STYLE : undefined}
        showsUserLocation={!!location.coords}
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={() => setMenuOpen(false)}
      >
        <HeatLayer spots={heatSpots} nativeHeatmap={NATIVE_HEATMAP} />

        {visiblePlaces.map((p) => {
          const registered = p.source === 'goswing';
          return (
            <PlacePin
              key={p.id}
              id={p.id}
              latitude={p.lat}
              longitude={p.lng}
              name={p.name}
              kind={p.kind}
              registered={registered}
              selected={popup?.kind === 'place' && popup.id === p.id}
              showLabel={delta <= LABEL_DELTA}
              accessibilityLabel={t(registered ? 'map.openPlace' : 'map.openPlaceNotOn', { name: p.name })}
              onPress={onPlacePin}
            />
          );
        })}

        {pinEvents.map((e) => {
          const id = evId(e);
          const price = eventPriceLabel(e, t);
          return (
            <EventPin
              key={id}
              id={id}
              latitude={e.location!.lat}
              longitude={e.location!.lng}
              imageUrl={e.imageUrl || null}
              price={price}
              live={liveIds.has(id)}
              selected={id === selectedId}
              accessibilityLabel={price ? t('map.openEvent', { name: e.title, price }) : t('map.openEventNoPrice', { name: e.title })}
              onPress={onEventPin}
            />
          );
        })}
      </MapView>

      <MapHeader
        cityLabel={location.label && location.label !== '…' ? location.label : location.loading ? t('map.locating') : t('map.chooseCity')}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((v) => !v)}
        category={category}
        onCategory={(c) => {
          setCategory(c);
          setMenuOpen(false);
        }}
      />

      <MapControls
        bottom={controlsBottom}
        mapKind={mapKind}
        onMapKind={setMapKind}
        onSearch={() => {
          setMenuOpen(false);
          setSearchOpen(true);
        }}
        onRecenter={recenter}
      />

      {carouselItems.length ? (
        <EventCarousel
          ref={carouselRef}
          items={carouselItems}
          selectedId={selectedId}
          bottom={carouselBottom}
          onFocus={onCarouselFocus}
          onOpen={onCarouselOpen}
        />
      ) : null}

      {showLoading || showError || showEmpty ? (
        <View pointerEvents="box-none" className="absolute left-6 right-6" style={{ bottom: carouselBottom + 16 }}>
          <View
            className="bg-white rounded-[22px] p-4"
            style={{ shadowColor: '#14121F', shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}
            accessibilityLiveRegion="polite"
          >
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View className="h-12 w-12 rounded-full items-center justify-center" style={{ backgroundColor: showError ? gs.pinkSoft : gs.violetSoft }}>
                {showLoading ? (
                  <ActivityIndicator color={gs.violet} />
                ) : showError ? (
                  <RefreshCw size={20} color={gs.pink} />
                ) : (
                  <MapPinOff size={20} color={gs.violet} />
                )}
              </View>
              <View className="flex-1" style={{ gap: 2 }}>
                <Text className="text-[16px] font-extrabold text-ink">
                  {showLoading ? t('map.loadingTitle') : showError ? t('map.errorTitle') : t('map.emptyTitle')}
                </Text>
                {showLoading ? null : (
                  <Text className="text-[13px] leading-[18px] text-muted">{showError ? t('map.errorMessage') : category === 'all' ? t('map.emptyNearby') : t('map.emptyMessage')}</Text>
                )}
              </View>
            </View>
            {showError ? (
              <Pressable
                onPress={() => void reload()}
                accessibilityRole="button"
                className="mt-3 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: gs.violet }}
              >
                <Text className="text-[15px] font-bold text-white">{t('gs.retry')}</Text>
              </Pressable>
            ) : showEmpty && category !== 'all' ? (
              <Pressable
                onPress={() => setCategory('all')}
                accessibilityRole="button"
                className="mt-3 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: gs.violetSoft }}
              >
                <Text className="text-[15px] font-bold" style={{ color: gs.violetDark }}>
                  {t('map.emptyAll')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {menuOpen ? (
        <LocationMenu
          cities={CITIES}
          currentLabel={location.label}
          onUseMyLocation={useMyLocation}
          onPickCity={pickCity}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}

      <PopupSheet
        visible={!!popupEvent || !!popupPlace}
        onClose={closePopup}
        resetKey={popup ? `${popup.kind}:${popup.id}` : undefined}
        accessibilityLabel={popupEvent ? t('map.pop.eventDetails') : t('map.pop.placeDetails')}
      >
        {popupEvent ? (
          <EventPopup
            event={popupEvent}
            venue={venueOfEvent(popupEvent)}
            saved={isSaved(evId(popupEvent))}
            onToggleSave={() => onToggleSave(evId(popupEvent))}
            onOpenEvent={() => goEvent(popupEvent)}
            onBook={() => goEvent(popupEvent, 'offers')}
            onOpenBookings={() => {
              setPopup(null);
              nav.switchTab('bookings');
            }}
            onOpenOrganizer={(organizerId, organizerName) => {
              setPopup(null);
              nav.push({ name: 'organizerProfile', organizerId, organizerName });
            }}
            onSeePlace={() => {
              const v = venueOfEvent(popupEvent);
              if (!v) return;
              setPopup(null);
              nav.push({
                name: 'place',
                place: {
                  id: v.venueId ?? `venue-${v.name}`,
                  name: v.name,
                  source: 'goswing',
                  category: v.kind,
                  address: v.address ?? null,
                  lat: v.lat,
                  lng: v.lng,
                  openingHours: v.openingHours ?? null,
                  venueId: v.venueId ?? null,
                },
              });
            }}
          />
        ) : popupPlace ? (
          <VenueSection
            venue={placeVenue(popupPlace)}
            heading={t('map.pop.place')}
            onSeePlace={() => {
              setPopup(null);
              nav.push({ name: 'place', place: placeSeed(popupPlace) });
            }}
          />
        ) : null}
      </PopupSheet>

      <MapSearch visible={searchOpen} results={searchResults} onClose={() => setSearchOpen(false)} onPick={onSearchPick} />
    </View>
  );
}
