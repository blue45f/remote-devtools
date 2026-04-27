import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import ko from "@/locales/ko.json";

/**
 * i18n setup.
 *
 * Scope: marketing surface only (Landing, Pricing, Auth, Topbar, Sidebar nav).
 * The engineering UI (Dashboard, Sessions, SessionDetail, SDK sandbox) stays
 * English on purpose — those screens are used by developers who already work
 * in English-language tools, and translating CDP / DevTools terms produces
 * stranger results than helpful ones.
 *
 * Adding a new key: edit BOTH `locales/en.json` and `locales/ko.json`. The
 * type-safety of the `t()` calls is enforced at runtime, not compile-time, so
 * a missing key falls back to English.
 */

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "ko"],
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      // Persist explicit user choice in localStorage; otherwise infer from
      // navigator.language. Skip path/query/cookie detection — keeps URLs clean.
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "rd-lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
