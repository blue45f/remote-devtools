import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import ko from '@/locales/ko.json';

/**
 * i18n setup.
 *
 * Scope: the whole app. Marketing (Landing, Pricing, Auth, Topbar, Sidebar)
 * and the engineering UI (Dashboard, Sessions, SessionDetail, SDK sandbox) all
 * read their copy through `t()`. Dynamic / machine data (URLs, device hashes,
 * timestamps, raw CDP payloads, IDs) is never translated — only UI chrome is.
 *
 * Default language is Korean. A fresh visitor lands on Korean; switching via
 * the language menu persists the choice in localStorage ("rd-lang"). We drop
 * navigator detection on purpose so the default is Korean for everyone, not
 * just Korean-locale browsers.
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
    lng: 'ko',
    fallbackLng: 'ko',
    supportedLngs: ['en', 'ko'],
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      // Respect an explicit stored choice; otherwise fall through to `lng`
      // (Korean). No navigator/path/query/cookie detection — keeps the default
      // predictable and URLs clean.
      order: ['localStorage'],
      lookupLocalStorage: 'rd-lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
