// app/admin/services/theme.service.ts
//
// Single source of truth for the Admin dashboard's appearance (theme, accent
// color, sidebar density, rounded corners, animations, reduced motion, font
// size). Mirrors the architecture of LanguageService:
//
//   ThemeService (signals)
//        ↓
//   data-admin-* attributes / CSS custom properties on <html>
//        ↓
//   global CSS variables (src/styles.scss), scoped under `.admin-shell`
//        ↓
//   every Admin component (already themed via the shared $token → var()
//   bridge in each component's stylesheet — see admin-layout.scss,
//   settings.scss, appearance-settings.scss)
//
// Because everything reactive reads color/spacing through CSS variables
// instead of hardcoded hex, changing a setting here repaints the whole
// Admin UI instantly — no reload, no per-component dark-mode branching.
//
// Persistence: localStorage['admin-appearance'] (parallel to
// LanguageService's localStorage['admin-language']). Resolution priority
// on startup:
//   1. localStorage['admin-appearance']  (explicit user choice)
//   2. OS `prefers-color-scheme` / `prefers-reduced-motion` (sane defaults)
//   3. Built-in defaults (Light theme, indigo accent, Normal sidebar, ...)
//
// Applied synchronously in the constructor (localStorage + matchMedia are
// both sync APIs) so the very first change-detection pass already has the
// right values — this, plus the tiny inline snippet in index.html, is what
// prevents a Light→Dark flash on reload (see Task: THEME PERSISTENCE).

import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AppearanceSettings, FontSize, SidebarStyle, ThemeMode } from '../model/settings.model';

export const APPEARANCE_STORAGE_KEY = 'admin-appearance';

const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: 'Light',
  primaryColor: '#4F46E5',
  sidebarStyle: 'Normal',
  roundedCards: true,
  animations: true,
  reducedMotion: false,
  fontSize: 'Medium',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);

  // ── Reactive state (each field individually settable/patchable) ────────
  readonly theme = signal<ThemeMode>(DEFAULT_APPEARANCE.theme);
  readonly primaryColor = signal<string>(DEFAULT_APPEARANCE.primaryColor);
  readonly sidebarStyle = signal<SidebarStyle>(DEFAULT_APPEARANCE.sidebarStyle);
  readonly roundedCards = signal<boolean>(DEFAULT_APPEARANCE.roundedCards);
  readonly animations = signal<boolean>(DEFAULT_APPEARANCE.animations);
  readonly reducedMotion = signal<boolean>(DEFAULT_APPEARANCE.reducedMotion);
  readonly fontSize = signal<FontSize>(DEFAULT_APPEARANCE.fontSize);

  // Tracks the OS-level `prefers-color-scheme: dark` so `theme === 'System'`
  // can react live if the user flips their OS theme while Admin is open.
  private readonly systemPrefersDark = signal<boolean>(this.detectSystemDark());
  private readonly systemPrefersReducedMotion = signal<boolean>(this.detectSystemReducedMotion());

  /** The theme actually painted right now — 'System' always resolves to Light or Dark. */
  readonly resolvedTheme = computed<'Light' | 'Dark'>(() =>
    this.theme() === 'System' ? (this.systemPrefersDark() ? 'Dark' : 'Light') : (this.theme() as 'Light' | 'Dark')
  );

  /** True if motion should be minimized — either by explicit setting or OS preference. */
  readonly motionReduced = computed<boolean>(
    () => this.reducedMotion() || !this.animations() || this.systemPrefersReducedMotion()
  );

  /** Convenience snapshot matching the `AppearanceSettings` shape used by Settings > Appearance. */
  readonly settings = computed<AppearanceSettings>(() => ({
    theme: this.theme(),
    primaryColor: this.primaryColor(),
    sidebarStyle: this.sidebarStyle(),
    roundedCards: this.roundedCards(),
    animations: this.animations(),
    reducedMotion: this.reducedMotion(),
    fontSize: this.fontSize(),
  }));

  constructor() {
    // Resolve persisted / detected state before the first paint.
    this.applyStoredOrDefault();

    // Keep OS-level signals live.
    this.watchSystemPreferences();

    // Whenever any appearance signal changes, repaint the DOM attributes /
    // CSS variables and persist. This is the ONE place that knows how to
    // "apply" a theme — no other component should touch `document` for this.
    effect(() => {
      const resolved = this.resolvedTheme();
      const sidebar = this.sidebarStyle();
      const font = this.fontSize();
      const rounded = this.roundedCards();
      const reduced = this.motionReduced();
      const accent = this.primaryColor();

      const root = this.document.documentElement;
      root.setAttribute('data-admin-theme', resolved.toLowerCase());
      root.setAttribute('data-admin-sidebar', sidebar.toLowerCase());
      root.setAttribute('data-admin-font', font.toLowerCase());
      root.setAttribute('data-admin-rounded', String(rounded));
      root.setAttribute('data-admin-motion', reduced ? 'reduced' : 'full');
      root.style.setProperty('--admin-accent', accent);
      const rgb = this.hexToRgb(accent);
      if (rgb) {
        root.style.setProperty('--admin-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        // Precomputed ~7% darker shade for hover/active states. Sass's
        // darken() can't operate on a CSS var() at build time, so any
        // stylesheet that used `darken($accent, 7%)` on a literal hex
        // switches to `var(--admin-accent-hover)` instead — same visual
        // result, computed once here instead of per-file.
        root.style.setProperty('--admin-accent-hover', this.shade(rgb, 0.93));
      }
    });

    // Persist on every change (skip the very first run so we don't rewrite
    // storage with defaults before `applyStoredOrDefault()` has a chance to
    // read it — `persist()` is only ever called from setters below anyway).
  }

  // ── Public API — used by AppearanceSettingsComponent + AdminLayout ─────

  setTheme(mode: ThemeMode): void { this.theme.set(mode); this.persist(); }
  setPrimaryColor(hex: string): void { this.primaryColor.set(hex); this.persist(); }
  setSidebarStyle(style: SidebarStyle): void { this.sidebarStyle.set(style); this.persist(); }
  setRoundedCards(on: boolean): void { this.roundedCards.set(on); this.persist(); }
  setAnimations(on: boolean): void { this.animations.set(on); this.persist(); }
  setReducedMotion(on: boolean): void { this.reducedMotion.set(on); this.persist(); }
  setFontSize(size: FontSize): void { this.fontSize.set(size); this.persist(); }

  /** Toggle button in the navbar — cycles Light ⇄ Dark (System stays opt-in from Settings). */
  toggleLightDark(): void {
    this.setTheme(this.resolvedTheme() === 'Dark' ? 'Light' : 'Dark');
  }

  /** Bulk-apply a patch (used by Settings > Appearance so every field change is live). */
  applyPatch(patch: Partial<AppearanceSettings>): void {
    if (patch.theme !== undefined) this.theme.set(patch.theme);
    if (patch.primaryColor !== undefined) this.primaryColor.set(patch.primaryColor);
    if (patch.sidebarStyle !== undefined) this.sidebarStyle.set(patch.sidebarStyle);
    if (patch.roundedCards !== undefined) this.roundedCards.set(patch.roundedCards);
    if (patch.animations !== undefined) this.animations.set(patch.animations);
    if (patch.reducedMotion !== undefined) this.reducedMotion.set(patch.reducedMotion);
    if (patch.fontSize !== undefined) this.fontSize.set(patch.fontSize);
    this.persist();
  }

  /** Replace the whole appearance state at once (e.g. Settings > Reset / Factory reset). */
  applyAll(next: AppearanceSettings): void {
    this.theme.set(next.theme);
    this.primaryColor.set(next.primaryColor);
    this.sidebarStyle.set(next.sidebarStyle);
    this.roundedCards.set(next.roundedCards);
    this.animations.set(next.animations);
    this.reducedMotion.set(next.reducedMotion);
    this.fontSize.set(next.fontSize);
    this.persist();
  }

  resetToDefaults(): void { this.applyAll(DEFAULT_APPEARANCE); }

  // ── Detection & persistence ─────────────────────────────────────────────

  private applyStoredOrDefault(): void {
    const stored = this.readStored();
    const initial: AppearanceSettings = stored ?? {
      ...DEFAULT_APPEARANCE,
      // No explicit user choice yet — start reduced-motion off but let the
      // `motionReduced` computed still honor the live OS signal.
    };
    this.theme.set(initial.theme);
    this.primaryColor.set(initial.primaryColor);
    this.sidebarStyle.set(initial.sidebarStyle);
    this.roundedCards.set(initial.roundedCards);
    this.animations.set(initial.animations);
    this.reducedMotion.set(initial.reducedMotion);
    this.fontSize.set(initial.fontSize);
  }

  private readStored(): AppearanceSettings | null {
    try {
      const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_APPEARANCE, ...parsed };
    } catch {
      return null; // localStorage unavailable or corrupt payload — fall back to defaults
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(this.settings()));
    } catch {
      // Ignore write failures (private browsing / storage quota) — the
      // theme still applies for the current session via signals.
    }
  }

  private detectSystemDark(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private detectSystemReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private watchSystemPreferences(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const colorQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const onColorChange = (e: MediaQueryListEvent) => this.systemPrefersDark.set(e.matches);
    const onMotionChange = (e: MediaQueryListEvent) => this.systemPrefersReducedMotion.set(e.matches);

    // addEventListener is the modern API; older Safari needs addListener.
    if (colorQuery.addEventListener) colorQuery.addEventListener('change', onColorChange);
    else colorQuery.addListener(onColorChange);

    if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
    else motionQuery.addListener(onMotionChange);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!match) return null;
    return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
  }

  /** Multiplies each RGB channel by `factor` (e.g. 0.93 ≈ darken 7%) and returns a hex string. */
  private shade(rgb: { r: number; g: number; b: number }, factor: number): string {
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n * factor)));
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(clamp(rgb.r))}${toHex(clamp(rgb.g))}${toHex(clamp(rgb.b))}`;
  }
}