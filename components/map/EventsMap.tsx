// components/map/EventsMap.tsx
import React, {
    useMemo,
    useRef,
    useEffect,
    useState,
    type ReactElement,
  } from 'react';
  import {
    Platform,
    View,
    Text,
    Pressable,
    Modal,
    Animated,
    Easing,
    Image,
  } from 'react-native';
  import MapView, {
    Marker,
    Circle,
    PROVIDER_GOOGLE,
    type Region,
  } from 'react-native-maps';
  import Constants from 'expo-constants';
  import { Feather } from '@expo/vector-icons';
  import { useSafeAreaInsets } from 'react-native-safe-area-context';
  import * as Location from 'expo-location';
  
  import { getEvents } from '@/data/loaders';
  import type { Event, ID } from '@/types/domain';
  
  const isExpoGo = Constants.appOwnership === 'expo';
  
  export type EventsMapProps = Readonly<{
    onPressEvent?: (eventId: string, initialTab?: 'about' | 'offers' | 'upcoming') => void;
  }>;
  
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
  
  export default function EventsMap({ onPressEvent }: EventsMapProps): ReactElement {
    const mapRef = useRef<MapView | null>(null);
    const insets = useSafeAreaInsets();
    const bottomPad = Math.max(insets.bottom, 12);
  
    const [hasLocation, setHasLocation] = useState(false);
    const [userLat, setUserLat] = useState<number | null>(null);
    const [userLng, setUserLng] = useState<number | null>(null);
    const [radiusKm, setRadiusKm] = useState<number>(20);
  
    useEffect(() => {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setHasLocation(false);
            return;
          }
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setHasLocation(true);
  
          const m = mapRef.current;
          if (m) {
            const region = regionForRadius(pos.coords.latitude, pos.coords.longitude, 20);
            m.animateToRegion(region, 500);
          }
        } catch {
          setHasLocation(false);
        }
      })();
    }, []);
  
    const events: ReadonlyArray<Event> = getEvents();
  
    const coords = useMemo(
      () =>
        events
          .map((e) => ({
            id: e.id,
            title: e.title,
            organizer: e.organizer,
            venue: e.venue,
            startsAtIso: e.startsAtIso,
            attendees: (e.attendees ?? []).length + (e.attendeesExtraCount ?? 0),
            lat: (e as any)?.location?.lat as number | undefined,
            lng: (e as any)?.location?.lng as number | undefined,
            priceLabel: e.priceLabel ?? undefined,
            imageUrl: (e as any)?.imageUrl as string | undefined,
          }))
          .filter(
            (c): c is {
              id: ID;
              title: string;
              organizer: string;
              venue: string;
              startsAtIso: string;
              attendees: number;
              lat: number;
              lng: number;
              priceLabel: string | undefined;
              imageUrl: string | undefined;
            } => typeof c.lat === 'number' && typeof c.lng === 'number'
          ),
      [events]
    );
  
    const initialRegion = useMemo<Region>(() => {
      if (hasLocation && userLat != null && userLng != null) {
        return regionForRadius(userLat, userLng, radiusKm);
      }
      if (coords.length === 0) return DEFAULT_REGION;
      if (coords.length === 1) {
        return {
          latitude: coords[0].lat,
          longitude: coords[0].lng,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        };
      }
      const lats = coords.map((c) => c.lat);
      const lngs = coords.map((c) => c.lng);
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
    }, [coords, hasLocation, userLat, userLng, radiusKm]);
  
    useEffect(() => {
      if (hasLocation) return;
      const m = mapRef.current;
      if (!m || coords.length === 0) return;
      const t = setTimeout(() => {
        try {
          m.fitToCoordinates(
            coords.map((c) => ({ latitude: c.lat, longitude: c.lng })),
            { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true }
          );
        } catch {}
      }, 250);
      return () => clearTimeout(t);
    }, [coords, hasLocation]);
  
    const handleExpand = () => {
      if (!hasLocation || userLat == null || userLng == null) return;
      const next = radiusKm + 40;
      setRadiusKm(next);
      const m = mapRef.current;
      if (m) {
        const region = regionForRadius(userLat, userLng, next);
        m.animateToRegion(region, 500);
      }
    };
  
    const [selected, setSelected] = useState<(typeof coords)[number] | null>(null);
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
  
    const openSheet = (item: (typeof coords)[number]) => {
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
  
    const formatDateTime = (iso: string) => {
      const d = new Date(iso);
      const date = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      return { date, time };
    };
  
    return (
      <>
        <View style={{ width: '100%', height: 600, borderRadius: 16, overflow: 'hidden' }}>
          <MapView
            ref={mapRef}
            style={{ width: '100%', height: '100%' }}
            provider={provider}
            initialRegion={initialRegion}
            showsUserLocation={hasLocation}
            followsUserLocation={false}
          >
            {/* User radius circle */}
            {hasLocation && userLat != null && userLng != null ? (
              <Circle
                center={{ latitude: userLat, longitude: userLng }}
                radius={radiusKm * 1000}
                strokeColor="rgba(14,165,233,0.9)"
                fillColor="rgba(14,165,233,0.15)"
                strokeWidth={2}
              />
            ) : null}
  
            {/* Event pins */}
            {coords.map((c) => (
              <Marker
                key={c.id}
                coordinate={{ latitude: c.lat, longitude: c.lng }}
                onPress={() => openSheet(c)}
                tracksViewChanges={false}
              />
            ))}
          </MapView>
  
          <Pressable
            onPress={handleExpand}
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
            <Feather name="maximize-2" size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Expand</Text>
          </Pressable>
        </View>
  
        <Modal visible={visible} transparent animationType="none" onRequestClose={closeSheet}>
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: 'black',
              opacity: backdropOpacity,
            }}
          >
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
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
  
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
                        if (onPressEvent) onPressEvent(selected.id, 'offers');
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
                        if (onPressEvent) onPressEvent(selected.id);
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
  