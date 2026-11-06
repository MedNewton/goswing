// components/map/FullScreenMap.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  Animated,
  Easing,
  Image,
} from 'react-native';
import EventPinMarker from '@/components/map/EventPinMarker';
import MapView, {
  Circle,
  Marker,
  type Region,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import type { ID, Event } from '@/types/domain';
import SearchBar from '@/components/blocks/SearchBar';
import {
  useNearbyPlaces,
  CATEGORY_META,
  type NearbyPlace,
} from '@/components/map/nearbyPlaces';

export type FiltersPayload = Readonly<{
  sortBy: 'best' | 'date' | 'price';
  dateQuick:
    | 'any'
    | 'tonight'
    | 'today'
    | 'tomorrow'
    | 'this_week'
    | 'this_weekend'
    | 'next_week'
    | 'next_weekend'
    | 'this_month'
    | 'pick';
  venueTypes: string[];
  musicStyles: string[];
  partyTypes: string[];
  access: ('free' | 'free_ladies')[];
}>;

export type FullItem = Readonly<{
  id: ID;
  title: string;
  organizer: string;
  venue: string;
  startsAtIso: string;
  attendees: number;
  priceLabel?: string | undefined;
  imageUrl?: string | undefined;
  lat: number;
  lng: number;
}>;

export type FullscreenMapProps = Readonly<{
  visible: boolean;
  onClose: () => void;

  provider?: typeof PROVIDER_GOOGLE | undefined;
  initialRegion: Region;

  hasLocation: boolean;
  userLat: number | null;
  userLng: number | null;

  radiusKm: number;
  onExpand: () => void;

  items: ReadonlyArray<FullItem>;
  events: ReadonlyArray<Event>;

  filters: FiltersPayload;
  searchValue: string;
  onChangeSearch: (text: string) => void;

  onSearchSubmit?: (query: string) => void;
  onSearchFilter?: () => void;

  onPressEvent?: (eventId: ID, initialTab?: 'about' | 'offers' | 'upcoming') => void;
}>;

function regionForRadius(lat: number, lng: number, radiusKm: number): Region {
  const latDelta = (radiusKm * 2) / 111;
  const lonDegreeKm = Math.max(0.00001, 111 * Math.cos((lat * Math.PI) / 180));
  const lonDelta = (radiusKm * 2) / lonDegreeKm;
  const pad = 1.05;
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: latDelta * pad,
    longitudeDelta: lonDelta * pad,
  };
}

function applyFiltersToEvents(
  events: ReadonlyArray<Event>,
  f: FiltersPayload,
): ReadonlyArray<Event> {
  let rows = events;

  if (f.access.length > 0) {
    rows = rows.filter((e) => {
      const evAccess = ((e as any)?.access ?? []) as ReadonlyArray<
        'free' | 'free_ladies'
      >;
      return f.access.every((flag) => evAccess.includes(flag));
    });
  }

  if (f.venueTypes.length > 0) {
    rows = rows.filter((e) => {
      const vt = (e as any)?.venueType as string | undefined;
      return vt ? f.venueTypes.includes(vt) : false;
    });
  }

  if (f.musicStyles.length > 0) {
    rows = rows.filter((e) => {
      const ms = ((e as any)?.musicStyles ?? []) as string[];
      return ms.some((x) => f.musicStyles.includes(x));
    });
  }

  if (f.partyTypes.length > 0) {
    rows = rows.filter((e) => {
      const pt = ((e as any)?.partyTypes ?? []) as string[];
      return pt.some((x) => f.partyTypes.includes(x));
    });
  }

  if (f.dateQuick !== 'any') {
    const now = new Date();
    rows = rows.filter((e) => {
      const d = new Date(e.startsAtIso);

      const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

      switch (f.dateQuick) {
        case 'today':
          return sameDay(d, now);
        case 'tomorrow': {
          const t = new Date(now);
          t.setDate(t.getDate() + 1);
          return sameDay(d, t);
        }
        case 'this_week': {
          const day = now.getDay();
          const start = new Date(now);
          start.setDate(now.getDate() - day);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 7);
          return d >= start && d < end;
        }
        case 'this_weekend': {
          const day = now.getDay();
          const sat = new Date(now);
          sat.setDate(now.getDate() + ((6 - day + 7) % 7));
          sat.setHours(0, 0, 0, 0);
          const sun = new Date(sat);
          sun.setDate(sat.getDate() + 1);
          const mon = new Date(sun);
          mon.setDate(sun.getDate() + 1);
          return d >= sat && d < mon;
        }
        case 'this_month': {
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          return d >= start && d < end;
        }
        case 'pick':
          return true;
        default:
          return true;
      }
    });
  }

  if (f.sortBy === 'date') {
    rows = [...rows].sort(
      (a, b) => +new Date(a.startsAtIso) - +new Date(b.startsAtIso),
    );
  } else if (f.sortBy === 'price') {
    rows = [...rows].sort((a, b) => {
      const pa = Number((a as any)?.basePrice ?? Number.MAX_SAFE_INTEGER);
      const pb = Number((b as any)?.basePrice ?? Number.MAX_SAFE_INTEGER);
      return pa - pb;
    });
  }

  return rows;
}

const MAP_STYLE = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
];

export default function FullscreenMap({
  visible,
  onClose,
  provider = PROVIDER_GOOGLE,
  initialRegion,
  hasLocation,
  userLat,
  userLng,
  radiusKm,
  onExpand,
  items,
  events,
  filters,
  searchValue,
  onChangeSearch,
  onSearchSubmit,
  onSearchFilter,
  onPressEvent,
}: FullscreenMapProps): ReactElement {
  const insets = useSafeAreaInsets();

  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // ── Nearby places (shared hook) ──
  const { nearbyPlaces, fetchPlacesForRegion, handleRegionChangeComplete } = useNearbyPlaces();

  // Initial fetch when user location is available
  useEffect(() => {
    if (userLat == null || userLng == null) return;
    fetchPlacesForRegion({
      latitude: userLat,
      longitude: userLng,
      latitudeDelta: 0.054,
      longitudeDelta: 0.054,
    });
  }, [userLat, userLng, fetchPlacesForRegion]);

  // Place bottom sheet
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [placeSheetVisible, setPlaceSheetVisible] = useState(false);
  const placeAnim = useRef(new Animated.Value(0)).current;
  const placeClosingRef = useRef(false);

  const runPlaceAnim = (toValue: 0 | 1, cb?: () => void) => {
    Animated.timing(placeAnim, {
      toValue,
      duration: toValue ? 260 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) cb?.();
    });
  };

  const openPlaceSheet = useCallback((place: NearbyPlace) => {
    placeClosingRef.current = false;
    setSelectedPlace(place);
    if (!placeSheetVisible) {
      setPlaceSheetVisible(true);
      requestAnimationFrame(() => runPlaceAnim(1));
    } else {
      runPlaceAnim(1);
    }
  }, [placeSheetVisible]);

  const closePlaceSheet = useCallback(() => {
    if (placeClosingRef.current) return;
    placeClosingRef.current = true;
    runPlaceAnim(0, () => {
      setPlaceSheetVisible(false);
      setSelectedPlace(null);
      placeClosingRef.current = false;
    });
  }, []);

  const placeTranslateY = placeAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  const placeBackdropOpacity = placeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

  const openPlaceInMaps = useCallback((place: NearbyPlace) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(place.name)}@${place.lat},${place.lng}`,
      default: `geo:${place.lat},${place.lng}?q=${encodeURIComponent(place.name)}`,
    });
    Linking.openURL(url).catch(() => {});
  }, []);

  // Suppress auto camera moves while user intentionally moves the map (e.g., picking an event)
  const suppressAutoMoveRef = useRef(false);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suppressAutoMove = (ms = 900) => {
    suppressAutoMoveRef.current = true;
    if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = setTimeout(() => {
      suppressAutoMoveRef.current = false;
    }, ms);
  };

  useEffect(() => {
    return () => {
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    };
  }, []);

  // If user picks before the map is ready, we store the target region and apply on ready.
  const pendingRegionRef = useRef<Region | null>(null);

  const [selected, setSelected] = useState<FullItem | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const runTo = (toValue: 0 | 1, cb?: () => void) => {
    Animated.timing(anim, {
      toValue,
      duration: toValue ? 260 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) cb?.();
    });
  };

  const openSheet = (item: FullItem) => {
    closingRef.current = false;
    setSelected(item);
    if (!sheetVisible) {
      setSheetVisible(true);
      requestAnimationFrame(() => runTo(1));
    } else {
      runTo(1);
    }
  };

  const closeSheet = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    runTo(0, () => {
      setSheetVisible(false);
      setSelected(null);
      closingRef.current = false;
    });
  };

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });
  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    return { date, time };
  };

  const currentRegion: Region | null = useMemo(() => {
    if (hasLocation && userLat != null && userLng != null) {
      return regionForRadius(userLat, userLng, radiusKm);
    }
    return null;
  }, [hasLocation, userLat, userLng, radiusKm]);

  const filteredEvents: ReadonlyArray<Event> = useMemo(
    () => applyFiltersToEvents(events, filters),
    [events, filters],
  );

  const allowedIds = useMemo(
    () => new Set(filteredEvents.map((e) => String(e.id))),
    [filteredEvents],
  );

  const filteredItems: ReadonlyArray<FullItem> = useMemo(
    () => items.filter((it) => allowedIds.has(String(it.id))),
    [items, allowedIds],
  );

  useEffect(() => {
    if (!selected) return;
    if (!allowedIds.has(String(selected.id))) {
      closeSheet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedIds]);

  // One single guarded auto-camera effect (prevents snapping back after search pick)
  useEffect(() => {
    if (!visible) return;
    if (!mapReady) return;
    if (suppressAutoMoveRef.current) return;

    const m = mapRef.current;
    if (!m) return;

    if (currentRegion) {
      m.animateToRegion(currentRegion, 400);
      return;
    }

    if (filteredItems.length > 0) {
      try {
        m.fitToCoordinates(
          filteredItems.map((c) => ({ latitude: c.lat, longitude: c.lng })),
          {
            edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
            animated: true,
          },
        );
      } catch {
        // noop
      }
    }
  }, [visible, mapReady, currentRegion, filteredItems]);

  const handlePickEventFromSearch = (eventId: string) => {
    const ev = filteredEvents.find((e) => String(e.id) === String(eventId));
    const loc = ev?.location;

    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
      return;
    }

    const fromItems =
      filteredItems.find((it) => String(it.id) === String(eventId)) ??
      ({
        id: ev!.id as ID,
        title: ev!.title,
        organizer: ev!.organizer,
        venue: ev!.venue,
        startsAtIso: ev!.startsAtIso,
        attendees: (ev!.attendees ?? []).length + (ev!.attendeesExtraCount ?? 0),
        priceLabel: ev!.priceLabel ?? undefined,
        imageUrl: (ev as any)?.imageUrl as string | undefined,
        lat: loc.lat,
        lng: loc.lng,
      } as FullItem);

    const targetRegion: Region = {
      latitude: loc.lat,
      longitude: loc.lng,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    };

    // Prevent any auto effect from snapping the camera back right after this move
    suppressAutoMove(900);

    if (!mapReady) {
      pendingRegionRef.current = targetRegion;
    } else {
      requestAnimationFrame(() => {
        mapRef.current?.animateToRegion(targetRegion, 350);
      });
    }

    onChangeSearch(String(ev?.title ?? ''));
    openSheet(fromItems);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (sheetVisible) {
          closeSheet();
          return;
        }
        onClose();
      }}
      presentationStyle="fullScreen"
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={provider}
          initialRegion={currentRegion ?? initialRegion}
          showsUserLocation={hasLocation}
          followsUserLocation={false}

          customMapStyle={MAP_STYLE}
          onRegionChangeComplete={handleRegionChangeComplete}
          onMapReady={() => {
            setMapReady(true);
            if (pendingRegionRef.current) {
              const r = pendingRegionRef.current;
              pendingRegionRef.current = null;
              requestAnimationFrame(() => mapRef.current?.animateToRegion(r, 350));
            }
          }}
        >
          {hasLocation && userLat != null && userLng != null ? (
            <Circle
              center={{ latitude: userLat, longitude: userLng }}
              radius={radiusKm * 1000}
              strokeColor="rgba(14,165,233,0.9)"
              fillColor="rgba(14,165,233,0.15)"
              strokeWidth={2}
            />
          ) : null}

          {filteredItems.map((c) => (
            <EventPinMarker
              key={String(c.id)}
              lat={c.lat}
              lng={c.lng}
              imageUrl={c.imageUrl}
              onPress={() => openSheet(c)}
            />
          ))}

          {/* Nearby places from OpenStreetMap */}
          {nearbyPlaces.map((place) => {
            const meta = CATEGORY_META[place.category] ?? CATEGORY_META.restaurant;
            return (
              <Marker
                key={`place-${place.id}`}
                coordinate={{ latitude: place.lat, longitude: place.lng }}
                onPress={() => openPlaceSheet(place)}
                tracksViewChanges={false}
              >
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: meta.color,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: '#FFFFFF',
                      shadowColor: '#000',
                      shadowOpacity: 0.2,
                      shadowRadius: 3,
                      shadowOffset: { width: 0, height: 1 },
                      elevation: 4,
                    }}
                  >
                    <Feather name={meta.icon} size={16} color="#FFFFFF" />
                  </View>
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: 5,
                      borderRightWidth: 5,
                      borderTopWidth: 5,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      borderTopColor: meta.color,
                      marginTop: -1,
                    }}
                  />
                </View>
              </Marker>
            );
          })}
        </MapView>

        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: Math.max(insets.top, 0) + 12,
            paddingHorizontal: 12,
          }}
        >
          <View
            pointerEvents="box-none"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Pressable
              onPress={() => {
                if (sheetVisible) closeSheet();
                else onClose();
              }}
              accessibilityRole="button"
              style={{
                backgroundColor: '#0B0B15',
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 12,
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 6,
              }}
            >
              <Feather name="x" size={18} color="#FFFFFF" />
            </Pressable>

            <Pressable
              onPress={onExpand}
              accessibilityRole="button"
              style={{
                backgroundColor: '#0B0B15',
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 6,
              }}
            >
              <Feather name="maximize-2" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Expand</Text>
            </Pressable>
          </View>

          <View style={{ width: '100%', zIndex: 10, elevation: 8 }}>
            <SearchBar
              value={searchValue}
              onChangeText={onChangeSearch}
              events={filteredEvents}
              onSubmit={(q) => onSearchSubmit?.(q)}
              onPickEvent={handlePickEventFromSearch}
              onPressFilter={onSearchFilter}
              className="w-full"
            />
          </View>
        </View>
      </View>

      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <Animated.View style={{ flex: 1, backgroundColor: 'black', opacity: backdropOpacity }}>
          <Pressable style={{ flex: 1 }} onPress={closeSheet} />
        </Animated.View>

        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateY }],
            backgroundColor: '#ffffff',

            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,

            paddingBottom: Math.max(insets.bottom, 12),

            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 8,
            overflow: 'hidden',
          }}
        >
          {selected ? (
            <>
              {selected.imageUrl ? (
                <Image
                  source={{ uri: selected.imageUrl }}
                  style={{
                    width: '100%',
                    height: 180,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                  }}
                  resizeMode="cover"
                />
              ) : null}

              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#0B1220' }}>
                  {selected.title}
                </Text>
                <Text style={{ marginTop: 2, color: '#6B7280' }}>{selected.organizer}</Text>

                <View style={{ marginTop: 10, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="calendar" size={16} color="#6B7280" />
                    <Text style={{ color: '#6B7280' }}>
                      {formatDateTime(selected.startsAtIso).date}
                    </Text>
                    <Feather name="clock" size={16} color="#6B7280" style={{ marginLeft: 14 }} />
                    <Text style={{ color: '#6B7280' }}>
                      {formatDateTime(selected.startsAtIso).time}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="map-pin" size={16} color="#6B7280" />
                    <Text style={{ color: '#6B7280' }}>{selected.venue}</Text>
                  </View>
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: '#E5E7EB',
                    marginVertical: 12,
                  }}
                />

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: '#0B0B15',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '600' }}>
                      {selected.priceLabel ?? 'From $15'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <Feather name="star" size={16} color="#F5C13D" />
                    <Text style={{ color: '#0B1220' }}>4.8</Text>
                    <Feather name="users" size={16} color="#6B7280" />
                    <Text style={{ color: '#6B7280' }}>{selected.attendees}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable
                    onPress={() => {
                      onPressEvent?.(selected.id, 'offers');
                      closeSheet();
                    }}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      backgroundColor: 'white',
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#0B1220', fontWeight: '600' }}>
                      See All Offers
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      onPressEvent?.(selected.id);
                      closeSheet();
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#0B0B15',
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '600' }}>View Details</Text>
                  </Pressable>
                </View>
              </View>
            </>
          ) : null}
        </Animated.View>
      </Modal>

      {/* Place bottom sheet */}
      <Modal visible={placeSheetVisible} transparent animationType="none" onRequestClose={closePlaceSheet}>
        <Animated.View style={{ flex: 1, backgroundColor: 'black', opacity: placeBackdropOpacity }}>
          <Pressable style={{ flex: 1 }} onPress={closePlaceSheet} accessibilityRole="button" />
        </Animated.View>

        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateY: placeTranslateY }],
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            paddingBottom: Math.max(insets.bottom, 12),
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 8,
          }}
        >
          {selectedPlace ? (() => {
            const meta = CATEGORY_META[selectedPlace.category] ?? CATEGORY_META.restaurant;
            return (
              <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: meta.color,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather name={meta.icon} size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#0B1220' }}>
                      {selectedPlace.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: meta.color, fontWeight: '500', marginTop: 2 }}>
                      {meta.label}
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 8, marginBottom: 16 }}>
                  {selectedPlace.address ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="map-pin" size={15} color="#6B7280" />
                      <Text style={{ color: '#6B7280', fontSize: 14 }}>{selectedPlace.address}</Text>
                    </View>
                  ) : null}
                  {selectedPlace.openingHours ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="clock" size={15} color="#6B7280" />
                      <Text style={{ color: '#6B7280', fontSize: 14 }}>{selectedPlace.openingHours}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={{ height: 1, backgroundColor: '#E5E7EB', marginBottom: 14 }} />

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                  <Pressable
                    onPress={() => {
                      openPlaceInMaps(selectedPlace);
                      closePlaceSheet();
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: meta.color,
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Feather name="navigation" size={16} color="#FFFFFF" />
                    <Text style={{ color: 'white', fontWeight: '600' }}>Get Directions</Text>
                  </Pressable>

                  <Pressable
                    onPress={closePlaceSheet}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      backgroundColor: 'white',
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#0B1220', fontWeight: '600' }}>Close</Text>
                  </Pressable>
                </View>
              </View>
            );
          })() : null}
        </Animated.View>
      </Modal>
    </Modal>
  );
}
