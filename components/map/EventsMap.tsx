// components/map/EventsMap.tsx
import React, { useMemo, useRef, useEffect, useState, type ReactElement } from 'react';
import {
  Platform,
  View,
  Pressable,
  Text,
  Modal,
  Animated,
  Easing,
  Image,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Event, ID } from '@/types/domain';
import FullscreenMap, { type FullItem } from '@/components/map/FullScreenMap';
import StoryViewerModal from '@/components/event/StoryViewerModal';
import { getStoryCountForEvent } from '@/lib/supabase/stories';

export type FiltersPayload = Readonly<{
  sortBy: 'best' | 'date' | 'price';
  dateQuick: 'any' | 'today' | 'tomorrow' | 'this_week' | 'this_weekend' | 'this_month' | 'pick';
  venueTypes: string[];
  musicStyles: string[];
  partyTypes: string[];
  access: ('free' | 'free_ladies')[];
}>;

const isExpoGo = Constants.appOwnership === 'expo';
const provider =
  Platform.OS === 'ios' ? (isExpoGo ? undefined : PROVIDER_GOOGLE) : PROVIDER_GOOGLE;

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
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return { date, time };
}

type LatLng = { lat: number; lng: number };

export type EventsMapProps = Readonly<{
  onPressEvent?: (eventId: string, initialTab?: 'about' | 'offers' | 'upcoming') => void;
  events?: ReadonlyArray<Event>;
  focusEventId?: string | null;
  height?: number;
  radiusKm?: number;
  onRadiusChange?: (next: number) => void;
  filters: FiltersPayload;

  // These can still exist for parent integration; fullscreen search is local now.
  searchValue: string;
  onChangeSearch: (text: string) => void;
  onSearchSubmit?: (query: string) => void;
  onSearchFilter?: () => void;
}>;

export default function EventsMap({
  onPressEvent,
  events: externalEvents,
  focusEventId,
  height = 600,
  radiusKm: radiusKmProp,
  onRadiusChange,
  filters,
  // kept for compatibility with your existing call-sites:
  searchValue,
  onChangeSearch,
  onSearchSubmit,
  onSearchFilter,
}: EventsMapProps): ReactElement {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);

  const mapRef = useRef<MapView | null>(null);

  const [hasLocation, setHasLocation] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(true);

  const [radiusKmInternal, setRadiusKmInternal] = useState<number>(20);
  const radiusKm = radiusKmProp ?? radiusKmInternal;

  const setRadius = (next: number) => {
    if (onRadiusChange) onRadiusChange(next);
    else setRadiusKmInternal(next);
  };

  const clampRadius = (v: number) => Math.max(5, Math.min(200, v));

  const all = useMemo<ReadonlyArray<Event>>(() => externalEvents ?? [], [externalEvents]);

  // Request location once on mount
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

        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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

  const fsItems: ReadonlyArray<FullItem> = useMemo(() => {
    const items: FullItem[] = [];
    for (const e of all) {
      const lat = e.location?.lat;
      const lng = e.location?.lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        items.push({
          id: e.id as ID,
          title: e.title,
          organizer: e.organizer,
          venue: e.venue,
          startsAtIso: e.startsAtIso,
          attendees: (e.attendees ?? []).length + (e.attendeesExtraCount ?? 0),
          priceLabel: e.priceLabel ?? undefined,
          imageUrl: (e as any)?.imageUrl ?? e.imageUrl ?? undefined,
          lat,
          lng,
        });
      }
    }
    return items;
  }, [all]);

  // Base center for radius circle / recenter / expand:
  const circleCenter: LatLng | null =
    hasLocation && userLat != null && userLng != null
      ? { lat: userLat, lng: userLng }
      : (() => {
        const ev = all.find((e) => String(e.id) === String(focusEventId));
        return ev?.location ? { lat: ev.location.lat, lng: ev.location.lng } : null;
      })();

  const initialRegion = useMemo<Region>(() => {
    if (circleCenter) return regionForRadius(circleCenter.lat, circleCenter.lng, Math.max(20, radiusKm));

    if (fsItems.length === 0) return DEFAULT_REGION;

    if (fsItems.length === 1) {
      return {
        latitude: fsItems[0].lat,
        longitude: fsItems[0].lng,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };
    }

    const lats = fsItems.map((c) => c.lat);
    const lngs = fsItems.map((c) => c.lng);
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
  }, [circleCenter, radiusKm, fsItems]);

  // Soft boot focus to user location ONCE (only when there's no focusEventId)
  const bootFocusedRef = useRef(false);
  useEffect(() => {
    if (focusEventId) return;
    if (!circleCenter) return;
    if (bootFocusedRef.current) return;

    bootFocusedRef.current = true;
    const next = clampRadius(20);
    if (radiusKm !== next) setRadius(next);
    mapRef.current?.animateToRegion(regionForRadius(circleCenter.lat, circleCenter.lng, next), 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusEventId, circleCenter?.lat, circleCenter?.lng]);

  // If focusing a specific event, animate to it
  useEffect(() => {
    if (!focusEventId) return;
    const ev = all.find((e) => String(e.id) === String(focusEventId));
    if (!ev?.location) return;

    mapRef.current?.animateToRegion(
      {
        latitude: ev.location.lat,
        longitude: ev.location.lng,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
      350,
    );
  }, [focusEventId, all]);

  // If no focusEventId and no user circle center, fit to all events
  useEffect(() => {
    if (focusEventId) return;
    if (circleCenter) return; // if we have a meaningful center, keep it
    const m = mapRef.current;
    if (!m || all.length === 0) return;

    const coords = all
      .map((e) => e.location)
      .filter(Boolean)
      .map((loc) => ({ latitude: loc!.lat, longitude: loc!.lng }));

    if (coords.length === 0) return;

    try {
      m.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    } catch { }
  }, [all, focusEventId, circleCenter]);

  const handleExpand = () => {
    const base = circleCenter;
    if (!base) return;

    const next = clampRadius(radiusKm + 40);
    setRadius(next);
    mapRef.current?.animateToRegion(regionForRadius(base.lat, base.lng, next), 500);
  };

  const handleRecenter = () => {
    const base = circleCenter;
    if (!base) return;

    mapRef.current?.animateToRegion(regionForRadius(base.lat, base.lng, clampRadius(radiusKm)), 450);
  };

  // Full screen map (SEARCH behavior like SearchEventMap: local state)
  const [fullScreen, setFullScreen] = useState(false);
  const [fsSearch, setFsSearch] = useState<string>('');
  const openFullScreen = () => {
    // initialize local fullscreen search from current parent value (optional)
    setFsSearch((prev) => (prev.trim().length ? prev : String(searchValue ?? '')));
    setFullScreen(true);
  };
  const closeFullScreen = () => setFullScreen(false);

  // Bottom sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<FullItem | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  // Story viewer
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [selectedStoryCount, setSelectedStoryCount] = useState(0);

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
    setSelectedStoryCount(0); // Reset while loading

    // Fetch story count for this event
    getStoryCountForEvent(String(item.id)).then((count) => {
      setSelectedStoryCount(count);
    }).catch(() => {
      setSelectedStoryCount(0);
    });

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

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

  const selectedDt = useMemo(
    () => safeFormatDateTime(selected?.startsAtIso ?? null),
    [selected?.startsAtIso],
  );

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

          {all.map((e) => {
            const loc = e.location;
            if (!loc) return null;

            return (
              <Marker
                key={String(e.id)}
                coordinate={{ latitude: loc.lat, longitude: loc.lng }}
                title={e.title}
                description={e.venue}
                onPress={() => {
                  const item: FullItem = {
                    id: e.id as ID,
                    title: e.title,
                    organizer: e.organizer,
                    venue: e.venue,
                    startsAtIso: e.startsAtIso,
                    attendees: (e.attendees ?? []).length + (e.attendeesExtraCount ?? 0),
                    priceLabel: e.priceLabel ?? undefined,
                    imageUrl: (e as any)?.imageUrl ?? e.imageUrl ?? undefined,
                    lat: loc.lat,
                    lng: loc.lng,
                  };
                  openSheet(item);
                }}
                tracksViewChanges={false}
              />
            );
          })}

        </MapView>

        {/* Full screen */}
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
          <Feather name="maximize" size={16} color="#FFFFFF" />
        </Pressable>

        {/* Expand radius */}
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

        {/* Recenter (added) */}
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

        {/* Location loading overlay (like SearchEventMap) */}
        {locLoading && !circleCenter && !focusEventId ? (
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
        onExpand={() => setRadius(clampRadius(radiusKm + 40))}
        items={fsItems}
        events={all}
        filters={filters}
        // IMPORTANT: local fullscreen search state (same behavior as SearchEventMap)
        searchValue={fsSearch}
        onChangeSearch={setFsSearch}
        onSearchSubmit={(q) => onSearchSubmit?.(q)}
        onSearchFilter={onSearchFilter}
        onPressEvent={(id, tab) => {
          closeFullScreen();
          onPressEvent?.(String(id), tab);
        }}
      />

      {/* Bottom sheet */}
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
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

                {selectedStoryCount > 0 && (
                  <Pressable
                    onPress={() => setStoryViewerOpen(true)}
                    accessibilityRole="button"
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      backgroundColor: 'rgba(11,11,21,0.7)',
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Feather name="eye" size={18} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                      {selectedStoryCount}
                    </Text>
                  </Pressable>
                )}
              </View>

              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#0B1220' }}>{selected.title}</Text>
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
                    <Text style={{ color: 'white', fontWeight: '600' }}>{selected.priceLabel ?? 'From $15'}</Text>
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
                      onPressEvent?.(String(selected.id), 'offers');
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
                      onPressEvent?.(String(selected.id), 'about');
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

      {/* Story Viewer Modal */}
      {selected && (
        <StoryViewerModal
          visible={storyViewerOpen}
          eventId={String(selected.id)}
          eventTitle={selected.title}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}
    </>
  );
}
