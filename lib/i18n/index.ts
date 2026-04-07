// lib/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './en';
import fr from './fr';

const deviceLang = getLocales()[0]?.languageCode ?? 'en';
const supported = ['en', 'fr'];
const fallback = supported.includes(deviceLang) ? deviceLang : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: fallback,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export const LANG_KEY = '@gs:language';
export default i18n;
