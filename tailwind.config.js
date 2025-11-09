// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{ts,tsx,js,jsx}',
    './app/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',  // Add this line
    './data/**/*.{ts,tsx,js,jsx}',        // Add this if you have styled components in data
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          DEFAULT: '#0EA5E9',
          dark: '#0284C7',
          light: '#7DD3FC',
        },
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

        // States
        success: '#10B981',
        warning: '#F59E0B',
        danger:  '#EF4444',
        info:    '#22C55E',
        border:  '#E5E7EB',
        surface: '#F9FAFB',
      },
      fontFamily: {
        regular: ['System'],
        medium: ['System'],
        bold: ['System'],
        mono: ['System'],
      },
      // Match our typography.ts tokens: [fontSize, lineHeight]
      fontSize: {
        xs:   ['12px', '16px'],
        sm:   ['14px', '20px'],
        base: ['16px', '22px'],
        lg:   ['18px', '24px'],
        xl:   ['20px', '28px'],
        '2xl':['24px', '32px'],
        '3xl':['30px', '38px'],
        '4xl':['36px', '44px'],
      },
    },
  },
  plugins: [],
};