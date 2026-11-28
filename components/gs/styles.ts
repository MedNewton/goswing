// components/gs/styles.ts — shared style helpers for the redesign.
import { Platform, type ViewStyle } from 'react-native';

/** Soft card shadow used across the redesign. */
export const softShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: { shadowColor: '#1B1240', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  android: { elevation: 3 },
  default: { shadowColor: '#1B1240', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
}) as ViewStyle;

/** Stronger shadow for floating controls (map buttons, tab bar). */
export const floatShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: { shadowColor: '#1B1240', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 8 },
  default: { shadowColor: '#1B1240', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
}) as ViewStyle;

export const cx = (...c: ReadonlyArray<string | null | undefined | false>): string => c.filter(Boolean).join(' ');

/** Deterministic dark tones used behind images and as placeholders. */
const TONES: ReadonlyArray<readonly [string, string]> = [
  ['#4A1630', '#5C1D3C'],
  ['#5A2A12', '#6E3418'],
  ['#163A2C', '#1D4A38'],
  ['#231A4A', '#2E235E'],
  ['#3A2A16', '#4A361C'],
  ['#1A2A44', '#223658'],
];

export function toneFor(key: string): readonly [string, string] {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}
