// components/gs/Cover.tsx — image with a striped tone placeholder behind it.
import React, { useId, type ReactElement, type ReactNode } from 'react';
import { Image, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect, Line } from 'react-native-svg';
import { toneFor } from './styles';

export type CoverProps = Readonly<{
  uri?: string | null;
  /** Stable key (event id, name) to pick the placeholder tone. */
  toneKey: string;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  children?: ReactNode;
}>;

export default function Cover({ uri, toneKey, style, radius = 0, children }: CoverProps): ReactElement {
  const [a, b] = toneFor(toneKey);
  // Unique per instance: two covers with the same toneKey must not share an SVG id.
  const pid = `gsp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[{ overflow: 'hidden', borderRadius: radius, backgroundColor: a }, style]}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <Defs>
          <Pattern id={pid} width={22} height={22} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Rect width={22} height={22} fill={a} />
            <Line x1={0} y1={0} x2={0} y2={22} stroke={b} strokeWidth={14} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${pid})`} />
      </Svg>
      {uri ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as ImageStyle}
        />
      ) : null}
      {children}
    </View>
  );
}
