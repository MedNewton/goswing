// components/map/FullScreenMap.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
  Animated,
  Easing,
  Image,
} from 'react-native';
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

export type FiltersPayload = Readonly<{
  sortBy: 'best' | 'date' | 'price';
  dateQuick:
    | 'any'
    | 'today'
    | 'tomorrow'
    | 'this_week'
    | 'this_weekend'
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
            <Marker
              key={String(c.id)}
              coordinate={{ latitude: c.lat, longitude: c.lng }}
              onPress={() => openSheet(c)}
              tracksViewChanges={false}
              title={c.title}
              description={c.venue}
            />
          ))}
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
    </Modal>
  );
}
