import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import ko from '@/locales/ko.json';

/**
 * i18n setup for the admin app.
 *
 * Mirrors the client's setup (`client/src/lib/i18n.ts`): Korean is the default
 * language so the existing UI is unchanged, and English is available as a
 * faithful translation. Only static UI chrome is translated — dynamic / machine
 * data (sheet ids, device hashes, timestamps, user-entered content) is never
 * routed through `t()`.
 *
 * Default language is Korean. A fresh visitor lands on Korean; switching the
 * language persists the choice in localStorage ("rda-lang"). Navigator detection
 * is intentionally dropped so the default stays Korean for everyone.
 *
 * Adding a new key: edit BOTH `locales/ko.json` and `locales/en.json`. Missing
 * keys fall back to Korean (the default), then to the raw key string.
 */

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
    },
    // No explicit `lng` — detection finds a stored choice; absent one, i18next
    // falls back to `fallbackLng` (Korean). Fresh visitors get Korean.
    fallbackLng: 'ko',
    supportedLngs: ['en', 'ko'],
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'rda-lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
