// lib/i18n/useLanguage.ts
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANG_KEY } from './index';

export type Lang = 'en' | 'fr';

export function useLanguage() {
  const { i18n } = useTranslation();
  const [lang, setLangState] = useState<Lang>((i18n.language as Lang) ?? 'en');

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(LANG_KEY);
      if (stored === 'en' || stored === 'fr') {
        if (i18n.language !== stored) {
          await i18n.changeLanguage(stored);
        }
        setLangState(stored);
      }
    })();
  }, [i18n]);

  useEffect(() => {
    const onChanged = (next: string) => {
      if (next === 'en' || next === 'fr') {
        setLangState(next);
      }
    };

    i18n.on('languageChanged', onChanged);
    return () => {
      i18n.off('languageChanged', onChanged);
    };
  }, [i18n]);

  const setLanguage = useCallback(
    async (next: Lang) => {
      await AsyncStorage.setItem(LANG_KEY, next);
      await i18n.changeLanguage(next);
      setLangState(next);
    },
    [i18n],
  );

  return { lang, setLanguage };
}
