// screens/map/components/HeatLayer.tsx — soft glow around active events.
//
// Computed on device from each event's location and attendee count (stronger
// when the event is live now). Google Maps on native draws a real heatmap;
// Apple Maps (Expo Go on iOS) and the web preview get stacked translucent
// circles instead.
import React, { memo, useMemo, type ReactElement } from 'react';
import { Circle, Heatmap } from 'react-native-maps';

export type HeatSpot = Readonly<{ id: string; latitude: number; longitude: number; attendees: number; live: boolean }>;

/** Glow radius in meters. */
function radiusOf(s: HeatSpot): number {
  const base = 90 + Math.min(220, Math.sqrt(Math.max(0, s.attendees)) * 8);
  return s.live ? base * 1.25 : base;
}

function strengthOf(s: HeatSpot): number {
  const a = Math.min(1, 0.25 + Math.sqrt(Math.max(0, s.attendees)) / 40);
  return s.live ? Math.min(1, a + 0.25) : a * 0.6;
}

const GRADIENT = {
  colors: ['rgba(40,200,255,0)', 'rgba(40,200,255,0.55)', 'rgba(255,170,0,0.75)', 'rgba(255,45,85,0.9)'],
  startPoints: [0.02, 0.25, 0.6, 1],
  colorMapSize: 256,
};

export default memo(function HeatLayer({
  spots,
  nativeHeatmap,
}: Readonly<{ spots: ReadonlyArray<HeatSpot>; nativeHeatmap: boolean }>): ReactElement | null {
  const points = useMemo(
    () => spots.map((s) => ({ latitude: s.latitude, longitude: s.longitude, weight: Math.round(strengthOf(s) * 10) })),
    [spots],
  );
  if (spots.length === 0) return null;

  if (nativeHeatmap) {
    // Remount when the set changes: some Android versions keep stale tiles.
    const key = spots.map((s) => s.id).join('|');
    return <Heatmap key={key} points={points} radius={50} opacity={0.75} gradient={GRADIENT} />;
  }

  return (
    <>
      {spots.map((s) => {
        const r = radiusOf(s);
        const a = strengthOf(s);
        const c = { latitude: s.latitude, longitude: s.longitude };
        return (
          <React.Fragment key={s.id}>
            <Circle center={c} radius={r} fillColor={`rgba(40,200,255,${(a * 0.1).toFixed(3)})`} strokeWidth={0} strokeColor="transparent" />
            <Circle center={c} radius={r * 0.75} fillColor={`rgba(40,200,255,${(a * 0.14).toFixed(3)})`} strokeWidth={0} strokeColor="transparent" />
            <Circle center={c} radius={r * 0.5} fillColor={`rgba(255,170,0,${(a * 0.22).toFixed(3)})`} strokeWidth={0} strokeColor="transparent" />
            <Circle center={c} radius={r * 0.3} fillColor={`rgba(255,45,85,${(a * 0.26).toFixed(3)})`} strokeWidth={0} strokeColor="transparent" />
          </React.Fragment>
        );
      })}
    </>
  );
});
