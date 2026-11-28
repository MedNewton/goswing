// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{ts,tsx,js,jsx}',
    './app/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './data/**/*.{ts,tsx,js,jsx}',
    './pages/**/*.{ts,tsx,js,jsx}',
    './screens/**/*.{ts,tsx,js,jsx}',
    './navigation/**/*.{ts,tsx,js,jsx}',
    './providers/**/*.{ts,tsx,js,jsx}',
    './preview/**/*.{ts,tsx,js,jsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          DEFAULT: '#5B36F2',
          dark: '#4A26D9',
          light: '#EFEBFF',
        },
        // Redesign tokens (mirror theme/colors.ts `gs`)
        violet: { DEFAULT: '#5B36F2', dark: '#4A26D9', soft: '#EFEBFF', line: '#D9D0FF' },
        pink: { DEFAULT: '#E0296B', soft: '#FDE7EF', dark: '#A3124A' },
        green: { DEFAULT: '#1F7A43', soft: '#E3F5EA' },
        orange: { DEFAULT: '#B54708', soft: '#FDEFE3' },
        blue: { DEFAULT: '#1F5FA8', soft: '#E8F1FB' },
        ink: '#14121F',
        subtle: '#4F4C63',
        muted: '#6B6880',
        faint: '#9C99AE',
        line: { DEFAULT: '#ECEAF3', strong: '#D9D6E4' },
        surface2: '#F1F0F5',
        // Neutrals
        black: '#14121F',
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
        border:  '#ECEAF3',
        surface: '#F7F6FB',
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