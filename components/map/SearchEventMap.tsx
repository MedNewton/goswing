import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  Linking,
  Platform,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Image,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Event, ID } from '@/types/domain';
import FullscreenMap, { type FullItem } from '@/components/map/FullScreenMap';
import type { FiltersPayload } from '@/components/filters/FiltersDrawer';
import {
  useNearbyPlaces,
  CATEGORY_META,
  type NearbyPlace,
} from '@/components/map/nearbyPlaces';

type LatLng = { lat: number; lng: number };

export type SearchEventMapProps = Readonly<{
  center: LatLng | null;
  radiusKm?: number;
  events: ReadonlyArray<Event>;
  onPressEvent?: (eventId: ID, initialTab?: 'about' | 'offers' | 'upcoming') => void;
  onRadiusChange?: (nextRadiusKm: number) => void;
  height?: number;
  filters: FiltersPayload;
}>;

const isExpoGo = Constants.appOwnership === 'expo';
const provider =
  Platform.OS === 'ios' ? (isExpoGo ? undefined : PROVIDER_GOOGLE) : PROVIDER_GOOGLE;

/** Hide default Google Maps POIs so we render our own */
const MAP_STYLE = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
];

const DEFAULT_REGION: Region = {
  latitude: 33.5731,
  longitude: -7.5898,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

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

function safeFormatDateTime(iso?: string | null): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return { date, time };
}

export default function SearchEventMap({
  center,
  radiusKm = 20,
  events,
  onPressEvent,
  onRadiusChange,
  height = 600,
  filters,
}: SearchEventMapProps): ReactElement {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);

  const mapRef = useRef<MapView | null>(null);

  const [hasLocation, setHasLocation] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(true);

  // Request location once on mount (do not re-request on center/radius changes)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;

        if (status !== 'granted') {
          setHasLocation(false);
          setLocLoading(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!mounted) return;

        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setHasLocation(true);
        setLocLoading(false);
      } catch {
        if (!mounted) return;
        setHasLocation(false);
        setLocLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ── Nearby places (shared hook) ──
  const { nearbyPlaces, fetchPlacesForRegion, handleRegionChangeComplete } = useNearbyPlaces();

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

  const items: ReadonlyArray<FullItem> = useMemo(() => {
    const list: FullItem[] = [];

    for (const e of events) {
      const lat = e.location?.lat;
      const lng = e.location?.lng;

      if (typeof lat === 'number' && typeof lng === 'number') {
        list.push({
          id: e.id as ID,
          title: e.title,
          organizer: e.organizer,
          venue: e.venue,
          startsAtIso: e.startsAtIso,
          attendees: (e.attendees ?? []).length + (e.attendeesExtraCount ?? 0),
          priceLabel: e.priceLabel ?? undefined,
          imageUrl: e.imageUrl ?? undefined,
          lat,
          lng,
        });
      }
    }

    return list;
  }, [events]);

  const initialRegion = useMemo<Region>(() => {
    if (center) return regionForRadius(center.lat, center.lng, radiusKm);

    if (hasLocation && userLat != null && userLng != null) {
      return regionForRadius(userLat, userLng, 20);
    }

    if (items.length === 0) return DEFAULT_REGION;

    if (items.length === 1) {
      return {
        latitude: items[0].lat,
        longitude: items[0].lng,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };
    }

    const lats = items.map((c) => c.lat);
    const lngs = items.map((c) => c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(0.06, (maxLat - minLat) * 1.4),
      longitudeDelta: Math.max(0.06, (maxLng - minLng) * 1.4),
    };
  }, [center, radiusKm, hasLocation, userLat, userLng, items]);

  // If center changes, animate to it
  useEffect(() => {
    if (!center) return;
    mapRef.current?.animateToRegion(regionForRadius(center.lat, center.lng, radiusKm), 500);
  }, [center, radiusKm]);

  // If user location becomes available and there is no center, softly focus it once
  const bootFocusedRef = useRef(false);
  useEffect(() => {
    if (center) return;
    if (!hasLocation || userLat == null || userLng == null) return;
    if (bootFocusedRef.current) return;

    bootFocusedRef.current = true;
    if (radiusKm !== 20) onRadiusChange?.(20);
    mapRef.current?.animateToRegion(regionForRadius(userLat, userLng, 20), 500);
  }, [center, hasLocation, userLat, userLng, radiusKm, onRadiusChange]);

  const circleCenter =
    center ??
    (hasLocation && userLat != null && userLng != null ? { lat: userLat, lng: userLng } : null);

  const clampRadius = (v: number) => Math.max(5, Math.min(200, v));

  const handleExpand = () => {
    const base = circleCenter;
    if (!base) return;

    const next = clampRadius(radiusKm + 40);
    onRadiusChange?.(next);
    mapRef.current?.animateToRegion(regionForRadius(base.lat, base.lng, next), 500);
  };

  const handleRecenter = () => {
    const base = circleCenter;
    if (!base) return;

    const next = clampRadius(radiusKm);
    mapRef.current?.animateToRegion(regionForRadius(base.lat, base.lng, next), 450);
  };

  // Bottom sheet
  const [selected, setSelected] = useState<FullItem | null>(null);
  const [visible, setVisible] = useState(false);
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
    if (!visible) {
      setVisible(true);
      requestAnimationFrame(() => runTo(1));
    } else {
      runTo(1);
    }
  };

  const closeSheet = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    runTo(0, () => {
      setVisible(false);
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

  const selectedDt = useMemo(() => safeFormatDateTime(selected?.startsAtIso ?? null), [selected?.startsAtIso]);

  // Full screen map
  const [fullScreen, setFullScreen] = useState(false);
  const [search, setSearch] = useState<string>('');
  const openFullScreen = () => setFullScreen(true);
  const closeFullScreen = () => setFullScreen(false);

  return (
    <>
      <View style={{ width: '100%', height, borderRadius: 16, overflow: 'hidden' }}>
        <MapView
          ref={mapRef}
          style={{ width: '100%', height: '100%' }}
          provider={provider}
          initialRegion={initialRegion}
          showsUserLocation={hasLocation}
          followsUserLocation={false}
          customMapStyle={MAP_STYLE}
          onRegionChangeComplete={handleRegionChangeComplete}
        >
          {circleCenter ? (
            <Circle
              center={{ latitude: circleCenter.lat, longitude: circleCenter.lng }}
              radius={radiusKm * 1000}
              strokeColor="rgba(14,165,233,0.9)"
              fillColor="rgba(14,165,233,0.15)"
              strokeWidth={2}
            />
          ) : null}

          {items.map((c) => (
            <Marker
              key={String(c.id)}
              coordinate={{ latitude: c.lat, longitude: c.lng }}
              onPress={() => openSheet(c)}
              tracksViewChanges={false}
            >
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                    backgroundColor: '#0B0B15',
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 5,
                  }}
                >
                  {c.imageUrl ? (
                    <Image
                      source={{ uri: c.imageUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="music" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 6,
                    borderRightWidth: 6,
                    borderTopWidth: 6,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: '#FFFFFF',
                    marginTop: -1,
                  }}
                />
              </View>
            </Marker>
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

        <Pressable
          onPress={openFullScreen}
          accessibilityRole="button"
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            backgroundColor: '#0B0B15',
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 12,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 6,
          }}
        >
          <Feather name="maximize" size={16} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={handleExpand}
          accessibilityRole="button"
          style={{
            position: 'absolute',
            right: 56,
            top: 12,
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

        <Pressable
          onPress={handleRecenter}
          accessibilityRole="button"
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            backgroundColor: '#0B0B15',
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 12,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 6,
          }}
        >
          <Feather name="crosshair" size={16} color="#FFFFFF" />
        </Pressable>

        {locLoading && !center ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.3)',
            }}
          >
            <ActivityIndicator />
          </View>
        ) : null}
      </View>

      <FullscreenMap
        visible={fullScreen}
        onClose={closeFullScreen}
        provider={provider}
        initialRegion={initialRegion}
        hasLocation={hasLocation}
        userLat={userLat}
        userLng={userLng}
        radiusKm={radiusKm}
        onExpand={() => onRadiusChange?.(clampRadius(radiusKm + 40))}
        items={items}
        events={events}
        filters={filters}
        searchValue={search}
        onChangeSearch={setSearch}
        onSearchSubmit={() => {}}
        onPressEvent={(id, tab) => {
          closeFullScreen();
          onPressEvent?.(id, tab);
        }}
      />

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
            paddingBottom: bottomPad,
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

      <Modal visible={visible} transparent animationType="none" onRequestClose={closeSheet}>
        <Animated.View style={{ flex: 1, backgroundColor: 'black', opacity: backdropOpacity }}>
          <Pressable style={{ flex: 1 }} onPress={closeSheet} accessibilityRole="button" />
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
            paddingBottom: bottomPad,
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
              <View style={{ position: 'relative', width: '100%', height: 180, backgroundColor: '#F3F4F6' }}>
                {selected.imageUrl ? (
                  <Image
                    source={{ uri: selected.imageUrl }}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '100%',
                      height: '100%',
                      borderTopLeftRadius: 18,
                      borderTopRightRadius: 18,
                    }}
                    resizeMode="cover"
                  />
                ) : null}

                <View
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    backgroundColor: '#DC2626',
                    borderRadius: 8,
                    paddingHorizontal: 20,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', letterSpacing: 1.2 }}>LIVE</Text>
                </View>

                <Pressable
                  onPress={() => {
                    // TODO: open stories for selected.id
                  }}
                  accessibilityRole="button"
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    backgroundColor: 'rgba(11,11,21,0.7)',
                    borderRadius: 8,
                    padding: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="eye" size={18} color="#FFFFFF" />
                </Pressable>
              </View>

              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#0B1220' }}>
                  {selected.title}
                </Text>
                <Text style={{ marginTop: 2, color: '#6B7280' }}>{selected.organizer}</Text>

                <View style={{ marginTop: 10, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="calendar" size={16} color="#6B7280" />
                    <Text style={{ color: '#6B7280' }}>{selectedDt?.date ?? '—'}</Text>
                    <Feather name="clock" size={16} color="#6B7280" style={{ marginLeft: 14 }} />
                    <Text style={{ color: '#6B7280' }}>{selectedDt?.time ?? '—'}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="map-pin" size={16} color="#6B7280" />
                    <Text style={{ color: '#6B7280' }}>{selected.venue ?? ''}</Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 }} />

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

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
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
                    <Text style={{ color: '#0B1220', fontWeight: '600' }}>See All Offers</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      onPressEvent?.(selected.id, 'about');
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
    </>
  );
}
