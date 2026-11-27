/**
 * Centralized color system for GoSwing (2026 redesign).
 * - Fully typed, no `any`.
 * - Mirrored in tailwind.config.js so NativeWind classes and inline styles agree.
 * - Prefer the semantic `gs` tokens in new UI; the legacy `palette` keys remain
 *   for screens that have not been redesigned yet.
 */

/** Redesign tokens (violet brand, pink accent, lavender surfaces). */
export const gs = {
  violet: '#5B36F2',
  violetDark: '#4A26D9',
  violetSoft: '#EFEBFF',
  violetLine: '#D9D0FF',

  pink: '#E0296B',
  pinkSoft: '#FDE7EF',
  pinkDark: '#A3124A',

  green: '#1F7A43',
  greenSoft: '#E3F5EA',

  orange: '#B54708',
  orangeSoft: '#FDEFE3',

  blue: '#1F5FA8',
  blueSoft: '#E8F1FB',

  ink: '#14121F',
  subtle: '#4F4C63',
  muted: '#6B6880',
  faint: '#9C99AE',

  line: '#ECEAF3',
  lineStrong: '#D9D6E4',

  surface: '#F7F6FB',
  surface2: '#F1F0F5',
  white: '#FFFFFF',

  danger: '#D92D20',
  dangerSoft: '#FEECEB',

  /** Map base colors (used by the map style and the web preview stub). */
  mapLand: '#EEF0EC',
  mapWater: '#BFE3F2',
  mapPark: '#DCEBD5',
  mapRoad: '#FFFFFF',
} as const;

export type GsColor = keyof typeof gs;

export const palette = {
  // Brand (now violet)
  brand: gs.violet,
  brandDark: gs.violetDark,
  brandLight: gs.violetSoft,

  // Neutrals
  black: gs.ink,
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Accents / states
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#22C55E',
} as const;

export type PaletteKey = keyof typeof palette;

export const theme = {
  colors: {
    ...palette,

    /**
     * Semantic aliases for UI usage
     * (we prefer these over raw palette keys in components)
     */
    background: gs.surface,
    surface: gs.surface2,
    text: gs.ink,
    textMuted: gs.muted,
    border: gs.line,
    card: gs.white,
    brand: gs.violet,
    brandMuted: gs.violetSoft,
    brandPressed: gs.violetDark,
    accent: gs.pink,
    success: gs.green,
    warning: palette.warning,
    danger: gs.danger,
    info: palette.info,
  },
} as const;

export type Theme = typeof theme;
