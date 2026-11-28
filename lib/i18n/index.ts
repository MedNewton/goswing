// lib/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './en';
import fr from './fr';
import gs from './features/gs';
import mapStrings from './features/map';
import discoverStrings from './features/discover';
import bookingsStrings from './features/bookings';
import profileStrings from './features/profile';

// Each redesign area keeps its strings in its own file (lib/i18n/features/*).
const features = [gs, mapStrings, discoverStrings, bookingsStrings, profileStrings];
const merge = (lang: 'en' | 'fr', base: Record<string, string>): Record<string, string> =>
  Object.assign({}, base, ...features.map((f) => f[lang]));

const deviceLang = getLocales()[0]?.languageCode ?? 'en';
const supported = ['en', 'fr'];
const fallback = supported.includes(deviceLang) ? deviceLang : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: merge('en', en) },
    fr: { translation: merge('fr', fr) },
  },
  lng: fallback,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export const LANG_KEY = '@gs:language';
export default i18n;
