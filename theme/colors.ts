// src/theme/colors.ts

/**
 * Centralized color system for GoSwing.
 * - Fully typed, no `any`.
 * - Tailwind/NativeWind will map to these in a later step.
 * - Use semantic names in UI (e.g., theme.colors.brand) rather than raw hex.
 */

export const palette = {
    // Brand
    brand: '#0EA5E9',          // cyan/sky
    brandDark: '#0284C7',
    brandLight: '#7DD3FC',
  
    // Neutrals
    black: '#0B1220',
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
       * (prefer these over raw palette keys in components)
       */
      background: palette.white,
      surface: palette.gray50,
      text: palette.black,
      textMuted: palette.gray600,
      border: palette.gray200,
      card: palette.white,
      brand: palette.brand,
      brandMuted: palette.brandLight,
      brandPressed: palette.brandDark,
      success: palette.success,
      warning: palette.warning,
      danger: palette.danger,
      info: palette.info,
    },
  } as const;
  
  export type Theme = typeof theme;
  