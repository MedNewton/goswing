import type { TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  monospace: 'System',
} as const;

export type FontFamilyKey = keyof typeof fontFamilies;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 64,
  '7xl': 80,
  '8xl': 96,
  '9xl': 112,
  '10xl': 128,
} as const;

export type FontSizeKey = keyof typeof fontSizes;

export const lineHeights = {
  xs: 16,
  sm: 20,
  base: 22,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 38,
  '4xl': 44,
} as const;

export type LineHeightKey = keyof typeof lineHeights;

export const fontWeights: Record<
  'regular' | 'medium' | 'bold',
  NonNullable<TextStyle['fontWeight']>
> = {
  regular: '400',
  medium: '500',
  bold: '700',
} as const;

export type FontWeightKey = keyof typeof fontWeights;

export type TextVariantName =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyMuted'
  | 'caption'
  | 'button'
  | 'overline';

export type TextVariant = Readonly<{
  fontFamily: (typeof fontFamilies)[FontFamilyKey];
  fontSize: (typeof fontSizes)[FontSizeKey];
  lineHeight: (typeof lineHeights)[LineHeightKey];
  fontWeight: NonNullable<TextStyle['fontWeight']>;
  letterSpacing?: number;
}>;

export const variants: Readonly<Record<TextVariantName, TextVariant>> = {
  h1: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: 0.2,
  },
  h2: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: 0.15,
  },
  h3: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.1,
  },
  title: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.medium,
  },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.regular,
    letterSpacing: 0.1,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.regular,
  },
  bodyMuted: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.regular,
    letterSpacing: 0.1,
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },
  overline: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.medium,
    letterSpacing: 1,
  },
} as const;

export const typography = {
  families: fontFamilies,
  sizes: fontSizes,
  lineHeights,
  weights: fontWeights,
  variants,
} as const;

export type Typography = typeof typography;
