// app/localization/language.model.ts
//
// Central registry of supported languages. Adding a new language later is a
// two-step change: (1) drop a new JSON file in public/i18n/<code>.json,
// (2) add one entry to SUPPORTED_LANGUAGES below. Nothing else in the app
// needs to change — components consume translations only through keys.

export type LanguageCode = 'en' | 'fr' | 'de' | 'es';

export interface LanguageDefinition {
  /** ISO 639-1 code, also the JSON filename under public/i18n/ */
  code: LanguageCode;
  /** Native name shown in the UI, e.g. "Français" */
  label: string;
  /** Flag emoji shown in dropdowns */
  flag: string;
  /** BCP 47 locale used for Intl.DateTimeFormat / Intl.NumberFormat */
  locale: string;
  /** Text direction — future-proofs Arabic/Hebrew support */
  dir: 'ltr' | 'rtl';
}

// ── Registered languages ────────────────────────────────────────────────────
// To add Arabic later:
//   1. Create public/i18n/ar.json (copy en.json and translate).
//   2. Add { code: 'ar', label: 'العربية', flag: '🇸🇦', locale: 'ar-SA', dir: 'rtl' }
//      to this array.
// That's it — LanguageService, the pipe, the navbar dropdown, and the
// settings selector all read from this list dynamically.
export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { code: 'en', label: 'English', flag: '🇬🇧', locale: 'en-US', dir: 'ltr' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', locale: 'fr-FR', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', locale: 'de-DE', dir: 'ltr' },
  { code: 'es', label: 'Español', flag: '🇪🇸', locale: 'es-ES', dir: 'ltr' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';
export const LANGUAGE_STORAGE_KEY = 'admin-language';

/** Nested JSON translation tree, e.g. { common: { save: "Save" } } */
export type TranslationTree = Record<string, unknown>;

export function isSupportedLanguage(code: string): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some(l => l.code === code);
}

export function getLanguageDefinition(code: LanguageCode): LanguageDefinition {
  return SUPPORTED_LANGUAGES.find(l => l.code === code) ?? SUPPORTED_LANGUAGES[0];
}

/**
 * Maps a raw navigator.language value (e.g. "fr-CA", "de-AT", "es-MX")
 * down to one of our supported base language codes. Falls back to null
 * when there's no match, so the caller can decide what "no match" means.
 */
export function matchBrowserLanguage(raw: string): LanguageCode | null {
  const base = raw.toLowerCase().split('-')[0];
  const found = SUPPORTED_LANGUAGES.find(l => l.code === base);
  return found ? found.code : null;
}