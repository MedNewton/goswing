// screens/map/components/MapPins.tsx — event and place markers.
//
// Custom markers are drawn to a bitmap on native; `tracksViewChanges` stays on
// until the cover image has loaded (then off, so the map does not keep
// redrawing every pin), and is turned on briefly when the pin's look changes.
import React, { memo, useEffect, useState, type ReactElement } from 'react';
import { Image, Platform, Text, View, type ImageStyle } from 'react-native';
import { Marker } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';

import { gs } from '@/theme/colors';
import { toneFor } from '@/components/gs/styles';
import Cover from '@/components/gs/Cover';
import { placeIcon } from '../model';

const MAX_TRACKING_MS = 6000;

function useTracking(deps: ReadonlyArray<unknown>, waitForImage: boolean): [boolean, () => void] {
  const [tracking, setTracking] = useState<boolean>(true);
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), waitForImage ? MAX_TRACKING_MS : 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  const done = (): void => {
    setTimeout(() => setTracking(false), 120);
  };
  return [tracking, done];
}

export function FlameIcon({ size = 13, color = gs.pink }: Readonly<{ size?: number; color?: string }>): ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-4.5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" fill={color} />
    </Svg>
  );
}

export type EventPinProps = Readonly<{
  id: string;
  latitude: number;
  longitude: number;
  imageUrl?: string | null;
  price: string | null;
  live: boolean;
  selected: boolean;
  accessibilityLabel: string;
  onPress: (id: string) => void;
}>;

export const EventPin = memo(function EventPin({
  id,
  latitude,
  longitude,
  imageUrl,
  price,
  live,
  selected,
  accessibilityLabel,
  onPress,
}: EventPinProps): ReactElement {
  const [tracking, done] = useTracking([imageUrl, selected, live, price], Boolean(imageUrl));
  const d = selected ? 64 : 52;
  const ring = selected ? gs.pink : gs.violet;
  const [tone] = toneFor(id);
  return (
    <Marker
      identifier={`event-${id}`}
      coordinate={{ latitude, longitude }}
      anchor={{ x: (6 + d / 2) / (26 + d), y: (6 + d / 2) / (16 + d) }}
      onPress={() => onPress(id)}
      tracksViewChanges={tracking}
      zIndex={selected ? 30 : live ? 20 : 10}
      accessibilityLabel={accessibilityLabel}
    >
      {/* Padding leaves room for the flame badge and the price chip. */}
      <View style={{ paddingLeft: 6, paddingTop: 6, paddingRight: 20, paddingBottom: 10 }} accessibilityLabel={accessibilityLabel}>
        <View
          style={{
            width: d,
            height: d,
            borderRadius: d / 2,
            padding: 3,
            backgroundColor: gs.white,
            borderWidth: 3,
            borderColor: ring,
            shadowColor: '#14121F',
            shadowOpacity: 0.25,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 5,
          }}
        >
          <View style={{ flex: 1, borderRadius: d / 2, overflow: 'hidden', backgroundColor: tone }}>
            {Platform.OS === 'web' || !imageUrl ? (
              <Cover uri={imageUrl} toneKey={id} radius={d / 2} style={{ flex: 1 }} />
            ) : (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: '100%', height: '100%' } as ImageStyle}
                resizeMode="cover"
                fadeDuration={0}
                onLoad={done}
                onError={done}
              />
            )}
          </View>
        </View>
        {live ? (
          <View
            style={{
              position: 'absolute',
              left: 2,
              top: 2,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: gs.white,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#14121F',
              shadowOpacity: 0.2,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 3,
            }}
          >
            <FlameIcon />
          </View>
        ) : null}
        {price ? (
          <View
            style={{
              position: 'absolute',
              right: 4,
              bottom: 2,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: selected ? '#D11F5F' : gs.white,
              shadowColor: '#14121F',
              shadowOpacity: 0.2,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: selected ? gs.white : gs.ink }} numberOfLines={1}>
              {price}
            </Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
});

export type PlacePinProps = Readonly<{
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  kind: string;
  registered: boolean;
  selected: boolean;
  showLabel: boolean;
  accessibilityLabel: string;
  onPress: (id: string) => void;
}>;

export const PlacePin = memo(function PlacePin({
  id,
  latitude,
  longitude,
  name,
  kind,
  registered,
  selected,
  showLabel,
  accessibilityLabel,
  onPress,
}: PlacePinProps): ReactElement {
  const [tracking] = useTracking([selected, showLabel, registered], false);
  const Icon = placeIcon(kind);
  const border = selected ? gs.pink : registered ? gs.violet : '#A9A6BA';
  const iconColor = registered ? gs.violet : gs.muted;
  return (
    <Marker
      identifier={`place-${id}`}
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0, y: 0.5 }}
      centerOffset={{ x: 0, y: 0 }}
      onPress={() => onPress(id)}
      tracksViewChanges={tracking}
      zIndex={selected ? 25 : 5}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingRight: 4 }} accessibilityLabel={accessibilityLabel}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: gs.white,
            borderWidth: 2,
            borderColor: border,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#14121F',
            shadowOpacity: 0.2,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        >
          <Icon size={17} color={iconColor} strokeWidth={2.2} />
        </View>
        {showLabel ? (
          <View
            style={{
              marginLeft: 4,
              maxWidth: 140,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.92)',
              shadowColor: '#14121F',
              shadowOpacity: 0.12,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: gs.ink }} numberOfLines={1}>
              {name}
            </Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
});
