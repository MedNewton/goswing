// components/map/EventPinMarker.tsx
// Map pin showing the event's image. Shared by EventsMap, SearchEventMap and
// FullScreenMap.
import React, { useEffect, useState, type ReactElement } from 'react';
import { Image, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';

export type EventPinMarkerProps = Readonly<{
  lat: number;
  lng: number;
  imageUrl?: string | null;
  onPress?: () => void;
}>;

/** Stop redrawing after this long even if the image never reports back. */
const MAX_TRACKING_MS = 8000;

export default function EventPinMarker({
  lat,
  lng,
  imageUrl,
  onPress,
}: EventPinMarkerProps): ReactElement {
  const hasImage = Boolean(imageUrl);

  // A custom marker is rendered to a bitmap. With tracksViewChanges={false}
  // that bitmap is taken once, before a remote image has downloaded, so the
  // pin stays an empty dark square. Keep tracking until the image has loaded
  // (or failed), then stop, so the map doesn't keep redrawing every pin.
  const [tracking, setTracking] = useState(hasImage);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!hasImage) {
      setTracking(false);
      return;
    }
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), MAX_TRACKING_MS);
    return () => clearTimeout(timer);
  }, [imageUrl, hasImage]);

  const stopTrackingSoon = (): void => {
    // Give the native side one more frame to draw the loaded image.
    setTimeout(() => setTracking(false), 100);
  };

  const showImage = hasImage && !failed;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
      tracksViewChanges={tracking}
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
          {showImage ? (
            <Image
              source={{ uri: imageUrl ?? undefined }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              fadeDuration={0}
              onLoad={stopTrackingSoon}
              onError={() => {
                setFailed(true);
                stopTrackingSoon();
              }}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="music" size={20} color="#FFFFFF" />
            </View>
          )}
        </View>
        {/* Pointer triangle */}
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
  );
}
