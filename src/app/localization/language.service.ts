// app/localization/language.service.ts
//
// Single source of truth for the app's active language. Everything reactive
// (sidebar, navbar, dialogs, toasts, tables, etc.) reads translations through
// this service's signals, so switching language updates the whole app
// instantly with zero reloads.
//
// Resolution priority on startup:
//   1. localStorage['admin-language']  (explicit user choice — always wins)
//   2. navigator.language / navigator.languages (auto-detect fr/de/es)
//   3. English (default / fallback for anything else)

import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LanguageCode,
  LanguageDefinition,
  SUPPORTED_LANGUAGES,
  TranslationTree,
  getLanguageDefinition,
  isSupportedLanguage,
  matchBrowserLanguage,
} from './language.model';
import { TranslationLoader } from './translation-loader';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private loader = inject(TranslationLoader);

  // ── Reactive state ────────────────────────────────────────────────────
  readonly currentLanguage = signal<LanguageCode>(DEFAULT_LANGUAGE);
  readonly translations = signal<TranslationTree>({});
  readonly fallbackTranslations = signal<TranslationTree>({});
  readonly isLoading = signal<boolean>(true);

  readonly languageDefinition = computed<LanguageDefinition>(() =>
    getLanguageDefinition(this.currentLanguage())
  );
  readonly locale = computed(() => this.languageDefinition().locale);
  readonly direction = computed(() => this.languageDefinition().dir);
  readonly availableLanguages = computed(() => SUPPORTED_LANGUAGES);

  constructor() {
    // Keep <html lang> / dir in sync automatically — helps accessibility,
    // SEO, and CSS that keys off [dir="rtl"] for future RTL languages.
    effect(() => {
      const def = this.languageDefinition();
      if (typeof document !== 'undefined') {
        document.documentElement.lang = def.code;
        document.documentElement.dir = def.dir;
      }
    });
  }

  /** Call once from APP_INITIALIZER (or app bootstrap) before first render. */
  async init(): Promise<void> {
    const resolved = this.resolveInitialLanguage();

    // English is always kept loaded as the fallback dictionary so missing
    // keys in any other language degrade gracefully instead of showing
    // raw key paths or "undefined".
    const fallback$ = this.loader.load('en');
    const fallback = await firstValueFrom(fallback$);
    this.fallbackTranslations.set(fallback);

    if (resolved === 'en') {
      this.translations.set(fallback);
      this.currentLanguage.set('en');
      this.isLoading.set(false);
      return;
    }

    await this.changeLanguage(resolved, { persist: false });
  }

  /**
   * Switches the active language at runtime. This is what the Settings page
   * and the navbar language dropdown call — translations update live via
   * signals, no reload/navigation involved.
   */
  async changeLanguage(code: LanguageCode, opts: { persist?: boolean } = { persist: true }): Promise<void> {
    if (!isSupportedLanguage(code)) code = DEFAULT_LANGUAGE;

    this.isLoading.set(true);
    try {
      const tree = await firstValueFrom(this.loader.load(code));
      this.translations.set(tree);
      this.currentLanguage.set(code);

      if (opts.persist !== false) {
        this.persist(code);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Translation lookup ────────────────────────────────────────────────

  /**
   * Resolves a dot-notation key ("common.save", "products.title") against
   * the active language tree, falling back to English, then to the key
   * itself so the UI never shows "undefined" or blank text.
   * `params` supports simple {{token}} interpolation.
   */
  translate(key: string, params?: Record<string, string | number>): string {
    const fromCurrent = this.lookup(this.translations(), key);
    const value = fromCurrent ?? this.lookup(this.fallbackTranslations(), key) ?? key;
    return params ? this.interpolate(value, params) : value;
  }

  /** Signal-friendly variant for use inside computed()/templates that want reactivity by key. */
  t = (key: string, params?: Record<string, string | number>): string => this.translate(key, params);

  private lookup(tree: TranslationTree, key: string): string | undefined {
    const parts = key.split('.');
    let node: unknown = tree;
    for (const part of parts) {
      if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return typeof node === 'string' ? node : undefined;
  }

  private interpolate(template: string, params: Record<string, string | number>): string {
    return template.replace(/{{\s*(\w+)\s*}}/g, (_match, token) =>
      token in params ? String(params[token]) : `{{${token}}}`
    );
  }

  // ── Locale-aware formatting helpers ───────────────────────────────────
  // Every component should use these instead of hand-rolled date/number
  // strings so formatting always matches the active language.

  formatDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(this.locale(), options ?? { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  }

  formatDateTime(value: string | number | Date): string {
    return this.formatDate(value, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale(), options).format(value);
  }

  formatCurrency(value: number, currency = 'USD'): string {
    return new Intl.NumberFormat(this.locale(), { style: 'currency', currency }).format(value);
  }

  formatPercent(value: number): string {
    return new Intl.NumberFormat(this.locale(), { style: 'percent', maximumFractionDigits: 1 }).format(value / 100);
  }

  // ── Detection & persistence ───────────────────────────────────────────

  private resolveInitialLanguage(): LanguageCode {
    const saved = this.readStoredLanguage();
    if (saved) return saved;
    return this.detectBrowserLanguage();
  }

  private readStoredLanguage(): LanguageCode | null {
    try {
      const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return raw && isSupportedLanguage(raw) ? raw : null;
    } catch {
      return null; // localStorage unavailable (SSR, privacy mode, etc.)
    }
  }

  private detectBrowserLanguage(): LanguageCode {
    if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;

    const candidates = [
      ...(navigator.languages ?? []),
      navigator.language,
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      const match = matchBrowserLanguage(candidate);
      if (match) return match;
    }
    return DEFAULT_LANGUAGE;
  }

  private persist(code: LanguageCode): void {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // Ignore write failures (private browsing / storage quota) —
      // language still works for the session via the signal.
    }
  }
}