// screens/discover/components/Shade.tsx — dark gradient over cover images so
// white text stays readable (no linear-gradient package in the app).
import React, { type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export default function Shade({
  from = 0.25,
  opacity = 0.85,
  id,
}: Readonly<{ from?: number; opacity?: number; id: string }>): ReactElement {
  const gid = `shade-${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0E0B1A" stopOpacity={0} />
            <Stop offset={String(from)} stopColor="#0E0B1A" stopOpacity={0} />
            <Stop offset="1" stopColor="#0E0B1A" stopOpacity={opacity} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gid})`} />
      </Svg>
    </View>
  );
}
