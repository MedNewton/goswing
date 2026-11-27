// preview/mocks/maps.tsx — react-native-maps stand-in for the web preview.
// Draws a simple city backdrop and places markers/circles by projecting their
// coordinates into the visible region. Good enough to check layouts.
import React, {
  createContext,
  forwardRef,
  useContext,
  useImperativeHandle,
  useState,
  type ReactNode,
} from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

export type LatLng = { latitude: number; longitude: number };
export type Region = LatLng & { latitudeDelta: number; longitudeDelta: number };
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = undefined;

type Ctx = { region: Region; w: number; h: number };
const MapCtx = createContext<Ctx | null>(null);

const DEFAULT_REGION: Region = { latitude: 48.8636, longitude: 2.3735, latitudeDelta: 0.03, longitudeDelta: 0.03 };

function project(c: LatLng, ctx: Ctx): { x: number; y: number } {
  const x = ((c.longitude - (ctx.region.longitude - ctx.region.longitudeDelta / 2)) / ctx.region.longitudeDelta) * ctx.w;
  const y = (((ctx.region.latitude + ctx.region.latitudeDelta / 2) - c.latitude) / ctx.region.latitudeDelta) * ctx.h;
  return { x, y };
}

type MapViewProps = {
  style?: StyleProp<ViewStyle>;
  initialRegion?: Region;
  region?: Region;
  children?: ReactNode;
  onRegionChangeComplete?: (r: Region) => void;
  onPress?: (e: unknown) => void;
  mapType?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

const MapView = forwardRef<unknown, MapViewProps>(function MapView(props: MapViewProps, ref) {
  const [region, setRegion] = useState<Region>(props.region ?? props.initialRegion ?? DEFAULT_REGION);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const shown = props.region ?? region;

  useImperativeHandle(ref, () => ({
    animateToRegion: (r: Region) => { setRegion(r); props.onRegionChangeComplete?.(r); },
    animateCamera: () => undefined,
    fitToCoordinates: () => undefined,
    fitToSuppliedMarkers: () => undefined,
    getCamera: async () => ({ center: shown, zoom: 14, heading: 0, pitch: 0 }),
    getMapBoundaries: async () => ({
      northEast: { latitude: shown.latitude + shown.latitudeDelta / 2, longitude: shown.longitude + shown.longitudeDelta / 2 },
      southWest: { latitude: shown.latitude - shown.latitudeDelta / 2, longitude: shown.longitude - shown.longitudeDelta / 2 },
    }),
  }));

  const satellite = props.mapType === 'satellite' || props.mapType === 'hybrid';
  return (
    <View
      style={[{ overflow: 'hidden', backgroundColor: satellite ? '#3B4A3A' : '#EEF0EC' }, props.style]}
      onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <Svg width="100%" height="100%" style={{ position: 'absolute' }} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <Rect x={250} y={500} width={160} height={120} fill={satellite ? '#2F3D2E' : '#DCEBD5'} />
        <Rect x={40} y={140} width={110} height={90} fill={satellite ? '#2F3D2E' : '#DCEBD5'} />
        <Path d="M60 0 C 70 300, 20 600, 120 800" stroke={satellite ? '#2C4A5A' : '#BFE3F2'} strokeWidth={26} fill="none" />
        {[
          'M0 220 L400 120', 'M0 420 L400 360', 'M0 640 L400 560', 'M170 0 L230 800',
          'M320 0 L280 800', 'M0 760 L400 700', 'M0 300 L400 520', 'M90 0 L360 800',
        ].map((d) => (
          <Path key={d} d={d} stroke={satellite ? '#56604F' : '#FFFFFF'} strokeWidth={d.startsWith('M170') ? 14 : 8} fill="none" />
        ))}
      </Svg>
      {size.w > 0 ? <MapCtx.Provider value={{ region: shown, ...size }}>{props.children}</MapCtx.Provider> : null}
    </View>
  );
});

export default MapView;

type MarkerProps = {
  coordinate: LatLng;
  children?: ReactNode;
  onPress?: (e: unknown) => void;
  anchor?: { x: number; y: number };
  [key: string]: unknown;
};

export function Marker({ coordinate, children, onPress, anchor }: MarkerProps) {
  const ctx = useContext(MapCtx);
  const [box, setBox] = useState({ w: 0, h: 0 });
  if (!ctx || !coordinate) return null;
  const p = project(coordinate, ctx);
  const ax = anchor?.x ?? 0.5;
  const ay = anchor?.y ?? 1;
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ position: 'absolute', left: p.x - box.w * ax, top: p.y - box.h * ay, opacity: box.w ? 1 : 0 }}
      onTouchEnd={onPress ? () => onPress({ nativeEvent: { coordinate } }) : undefined}
    >
      {children ?? <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#E0296B' }} />}
    </View>
  );
}

export function Circle({ center, radius, fillColor }: { center: LatLng; radius: number; fillColor?: string; [k: string]: unknown }) {
  const ctx = useContext(MapCtx);
  if (!ctx) return null;
  const p = project(center, ctx);
  const px = (radius / 111_000 / ctx.region.latitudeDelta) * ctx.h;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: p.x - px, top: p.y - px, width: px * 2, height: px * 2, borderRadius: px, backgroundColor: fillColor ?? 'rgba(91,54,242,0.15)' }}
    />
  );
}

export function Heatmap({ points }: { points: ReadonlyArray<LatLng & { weight?: number }>; [k: string]: unknown }) {
  const ctx = useContext(MapCtx);
  if (!ctx) return null;
  return (
    <>
      {points.map((pt, i) => {
        const p = project(pt, ctx);
        const r = 40 + (pt.weight ?? 1) * 6;
        return (
          <View
            key={i}
            pointerEvents="none"
            style={{ position: 'absolute', left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: 'rgba(255,140,60,0.22)' }}
          />
        );
      })}
    </>
  );
}

export const Callout = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const Polygon = () => null;
export const Polyline = () => null;
export const Overlay = () => null;
export const UrlTile = () => null;
