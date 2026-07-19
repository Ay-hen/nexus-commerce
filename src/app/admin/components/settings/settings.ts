// settings.ts
import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  SettingsModel, SettingsCategory, PaymentGatewayId, PaymentGateway, AdminSession,
  StoreStatus, SmtpEncryption, ThemeMode, SidebarStyle, FontSize, Environment,
  generateMockSettings,
  COUNTRY_OPTIONS, CURRENCY_OPTIONS, TIMEZONE_OPTIONS, DATE_FORMAT_OPTIONS, WAREHOUSE_OPTIONS,
} from '../../model/settings.model';
import { LanguageService } from '../../../localization/language.service';
import { TranslatePipe } from '../../../localization/translate.pipe';
import { LanguageCode, isSupportedLanguage } from '../../../localization/language.model';

interface NavItem { id: SettingsCategory; label: string; icon: string; }

type DangerAction = 'delete-logs' | 'delete-cache' | 'factory-reset' | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s()-]{7,}$/;
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/;

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {

  lang = inject(LanguageService);

  // ── Loading ────────────────────────────────────────────────────────────
  isLoading = signal(true);

  // ── Toast ──────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Category nav ───────────────────────────────────────────────────────
  activeCategory = signal<SettingsCategory>('general');
  mobileNavOpen = signal(false);

  // label now holds a translation key (resolved against settings.nav.*).
  navItems: NavItem[] = [
    { id: 'general',       label: 'settings.nav.general',       icon: 'general' },
    { id: 'profile',       label: 'settings.nav.profile',       icon: 'profile' },
    { id: 'security',      label: 'settings.nav.security',      icon: 'security' },
    { id: 'store',         label: 'settings.nav.store',         icon: 'store' },
    { id: 'payments',      label: 'settings.nav.payments',      icon: 'payments' },
    { id: 'email',         label: 'settings.nav.email',         icon: 'email' },
    { id: 'notifications', label: 'settings.nav.notifications', icon: 'notifications' },
    { id: 'appearance',    label: 'settings.nav.appearance',    icon: 'appearance' },
    { id: 'system',        label: 'settings.nav.system',        icon: 'system' },
  ];

  // ── Data: saved vs draft (for dirty tracking) ──────────────────────────
  private saved = signal<SettingsModel>(this.syncLanguage(generateMockSettings()));
  draft = signal<SettingsModel>(this.syncLanguage(generateMockSettings()));

  // generateMockSettings() always seeds general.language as 'en'. LanguageService
  // is the real source of truth (persisted in localStorage, already resolved by
  // APP_INITIALIZER before this component exists), so overwrite the mock's
  // language with the actually active one. Applied to both saved and draft so
  // isDirty() doesn't report "dirty" just because the page loaded in French.
  private syncLanguage(model: SettingsModel): SettingsModel {
    return { ...model, general: { ...model.general, language: this.lang.currentLanguage() } };
  }

  isDirty = computed(() => JSON.stringify(this.saved()) !== JSON.stringify(this.draft()));

  // ── Option lists ───────────────────────────────────────────────────────
  countryOptions = COUNTRY_OPTIONS;
  currencyOptions = CURRENCY_OPTIONS;
  timezoneOptions = TIMEZONE_OPTIONS;
  dateFormatOptions = DATE_FORMAT_OPTIONS;
  warehouseOptions = WAREHOUSE_OPTIONS;
  storeStatusOptions: StoreStatus[] = ['Open', 'Closed', 'Coming Soon'];
  encryptionOptions: SmtpEncryption[] = ['None', 'SSL', 'TLS'];
  themeOptions: ThemeMode[] = ['Light', 'Dark', 'System'];
  sidebarStyleOptions: SidebarStyle[] = ['Compact', 'Normal'];
  fontSizeOptions: FontSize[] = ['Small', 'Medium', 'Large'];
  environmentOptions: Environment[] = ['Production', 'Development'];
  primaryColorSwatches = ['#4F46E5', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#0D9488', '#10B981', '#111827'];

  // ── Translation-key helpers for enum-style values ───────────────────────
  // These only build a translation key string from a data value — no
  // behavior or bound value changes, same pattern as statusColor() below.
  storeStatusKey(s: StoreStatus): string {
    const map: Record<StoreStatus, string> = { 'Open': 'open', 'Closed': 'closed', 'Coming Soon': 'comingSoon' };
    return 'settings.store.status.' + map[s];
  }
  themeKey(t: ThemeMode): string {
    return 'settings.appearance.' + t.toLowerCase();
  }
  sidebarStyleKey(s: SidebarStyle): string {
    return 'settings.appearance.' + s.toLowerCase();
  }
  fontSizeKey(f: FontSize): string {
    return 'settings.appearance.' + f.toLowerCase();
  }
  encryptionKey(e: SmtpEncryption): string {
    const map: Record<SmtpEncryption, string> = { 'None': 'none', 'SSL': 'ssl', 'TLS': 'tls' };
    return 'settings.email.encryptionOptions.' + map[e];
  }
  systemStatusKey(s: string): string {
    return 'settings.system.status.' + s.toLowerCase();
  }
  environmentKey(e: string): string {
    return 'settings.system.env.' + e.toLowerCase();
  }

  // ── Security: change-password local state (not part of saved model) ────
  newPassword = signal('');
  confirmPassword = signal('');

  passwordStrength = computed(() => {
    const pw = this.newPassword();
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0–4
  });

  passwordStrengthLabel = computed(() => {
    const s = this.passwordStrength();
    const keys = ['veryWeak', 'weak', 'fair', 'good', 'strong'];
    return this.lang.translate('settings.security.strength.' + keys[s]);
  });

  passwordsMatch = computed(() => !this.confirmPassword() || this.newPassword() === this.confirmPassword());

  // ── Danger zone ────────────────────────────────────────────────────────
  pendingDangerAction = signal<DangerAction>(null);
  pendingTerminateSession = signal<AdminSession | null>(null);
  pendingTerminateAll = signal(false);

  // ── Validation (computed) ──────────────────────────────────────────────
  formTouched = signal(false);

  generalErrors = computed(() => {
    const g = this.draft().general;
    const errors: Record<string, string> = {};
    if (!g.storeName.trim()) errors['storeName'] = this.lang.translate('settings.general.errors.storeNameRequired');
    if (!EMAIL_RE.test(g.storeEmail)) errors['storeEmail'] = this.lang.translate('validation.invalidEmail');
    if (!EMAIL_RE.test(g.supportEmail)) errors['supportEmail'] = this.lang.translate('validation.invalidEmail');
    if (!PHONE_RE.test(g.phoneNumber)) errors['phoneNumber'] = this.lang.translate('validation.invalidPhone');
    if (g.website && !URL_RE.test(g.website)) errors['website'] = this.lang.translate('validation.invalidUrl');
    return errors;
  });

  profileErrors = computed(() => {
    const p = this.draft().profile;
    const errors: Record<string, string> = {};
    if (!p.name.trim()) errors['name'] = this.lang.translate('settings.profile.errors.nameRequired');
    if (!EMAIL_RE.test(p.email)) errors['email'] = this.lang.translate('validation.invalidEmail');
    if (!p.username.trim()) errors['username'] = this.lang.translate('settings.profile.errors.usernameRequired');
    if (p.phone && !PHONE_RE.test(p.phone)) errors['phone'] = this.lang.translate('validation.invalidPhone');
    return errors;
  });

  emailErrors = computed(() => {
    const e = this.draft().email;
    const errors: Record<string, string> = {};
    if (!e.smtpHost.trim()) errors['smtpHost'] = this.lang.translate('settings.email.errors.smtpHostRequired');
    if (!e.smtpPort || e.smtpPort < 1) errors['smtpPort'] = this.lang.translate('settings.email.errors.invalidPort');
    if (!EMAIL_RE.test(e.senderEmail)) errors['senderEmail'] = this.lang.translate('validation.invalidEmail');
    return errors;
  });

  storagePercent = computed(() => {
    const s = this.draft().system;
    return Math.round((s.storageUsedGb / s.storageTotalGb) * 100);
  });

  ngOnInit(): void {
    setTimeout(() => this.isLoading.set(false), 700);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.pendingDangerAction.set(null);
    this.pendingTerminateSession.set(null);
    this.pendingTerminateAll.set(false);
    this.mobileNavOpen.set(false);
  }

  // ── Navigation ─────────────────────────────────────────────────────────
  setCategory(cat: SettingsCategory): void {
    this.activeCategory.set(cat);
    this.mobileNavOpen.set(false);
  }
  toggleMobileNav(): void { this.mobileNavOpen.update(v => !v); }

  activeCategoryLabel = computed(() => this.navItems.find(n => n.id === this.activeCategory())?.label ?? '');

  // ── Save / Reset / Refresh ─────────────────────────────────────────────
  saveChanges(): void {
    this.formTouched.set(true);
    const hasErrors = Object.keys(this.generalErrors()).length > 0
      || Object.keys(this.profileErrors()).length > 0
      || Object.keys(this.emailErrors()).length > 0;

    if (hasErrors) {
      this.showToast(this.lang.translate('settings.toasts.fixFieldsBeforeSaving'));
      return;
    }

    this.saved.set(JSON.parse(JSON.stringify(this.draft())));
    this.showToast(this.lang.translate('toasts.savedSuccessfully'));

    // Full reload so every route/component in the app re-initializes against
    // the language currently active (already persisted to localStorage by
    // updateGeneralLanguage() / LanguageService.changeLanguage()). This is a
    // deliberate blunt-force guarantee that the whole app reflects the chosen
    // language consistently, not just the components already mounted.
    // Short delay so the "Saved successfully" toast is visible before reload.
    setTimeout(() => window.location.reload(), 500);
  }

  resetChanges(): void {
    this.draft.set(JSON.parse(JSON.stringify(this.saved())));
    this.formTouched.set(false);
    this.showToast(this.lang.translate('toasts.changesReverted'));
  }

  refresh(): void {
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 600);
    this.showToast(this.lang.translate('toasts.settingsRefreshed'));
  }

  // ── Generic update helpers ─────────────────────────────────────────────
  updateGeneral<K extends keyof SettingsModel['general']>(key: K, value: SettingsModel['general'][K]): void {
    this.draft.update(d => ({ ...d, general: { ...d.general, [key]: value } }));
  }

  // Store config field AND live admin UI language switch. Selecting a
  // language here takes effect immediately via LanguageService, same as the
  // navbar switcher — it doesn't wait for "Save Changes".
  updateGeneralLanguage(code: string): void {
    this.updateGeneral('language', code);
    if (isSupportedLanguage(code)) {
      this.lang.changeLanguage(code as LanguageCode);
    }
  }

  updateProfile<K extends keyof SettingsModel['profile']>(key: K, value: SettingsModel['profile'][K]): void {
    this.draft.update(d => ({ ...d, profile: { ...d.profile, [key]: value } }));
  }

  updateSecurity<K extends keyof SettingsModel['security']>(key: K, value: SettingsModel['security'][K]): void {
    this.draft.update(d => ({ ...d, security: { ...d.security, [key]: value } }));
  }

  updateStore<K extends keyof SettingsModel['store']>(key: K, value: SettingsModel['store'][K]): void {
    this.draft.update(d => ({ ...d, store: { ...d.store, [key]: value } }));
  }

  updatePaymentGateway<K extends keyof PaymentGateway>(id: PaymentGatewayId, key: K, value: PaymentGateway[K]): void {
    this.draft.update(d => ({
      ...d,
      payments: d.payments.map(p => p.id === id ? { ...p, [key]: value } : p),
    }));
  }

  updateEmail<K extends keyof SettingsModel['email']>(key: K, value: SettingsModel['email'][K]): void {
    this.draft.update(d => ({ ...d, email: { ...d.email, [key]: value } }));
  }

  updateNotifications<K extends keyof SettingsModel['notifications']>(key: K, value: SettingsModel['notifications'][K]): void {
    this.draft.update(d => ({ ...d, notifications: { ...d.notifications, [key]: value } }));
  }

  updateAppearance<K extends keyof SettingsModel['appearance']>(key: K, value: SettingsModel['appearance'][K]): void {
    this.draft.update(d => ({ ...d, appearance: { ...d.appearance, [key]: value } }));
  }

  // ── Section-specific actions ───────────────────────────────────────────
  sendTestEmail(): void {
    if (Object.keys(this.emailErrors()).length > 0) {
      this.formTouched.set(true);
      this.showToast(this.lang.translate('settings.toasts.fixSmtpBeforeTest'));
      return;
    }
    this.showToast(this.lang.translate('settings.toasts.testEmailSent', { email: this.draft().profile.email }));
  }

  maskedKey(value: string): string {
    if (!value) return '';
    if (value.length <= 8) return '•'.repeat(value.length);
    return value.slice(0, 6) + '••••••••••••' + value.slice(-4);
  }

  revealedKeys = signal<Set<string>>(new Set());
  toggleReveal(key: string): void {
    this.revealedKeys.update(set => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  isRevealed(key: string): boolean { return this.revealedKeys().has(key); }

  // ── Security sessions ──────────────────────────────────────────────────
  requestTerminateSession(session: AdminSession): void {
    if (session.current) { this.showToast(this.lang.translate('settings.toasts.cantTerminateCurrent')); return; }
    this.pendingTerminateSession.set(session);
  }
  cancelTerminateSession(): void { this.pendingTerminateSession.set(null); }
  confirmTerminateSession(): void {
    const target = this.pendingTerminateSession();
    if (!target) return;
    this.draft.update(d => ({ ...d, security: { ...d.security, sessions: d.security.sessions.filter(s => s.id !== target.id) } }));
    this.saved.update(s => ({ ...s, security: { ...s.security, sessions: s.security.sessions.filter(x => x.id !== target.id) } }));
    this.showToast(this.lang.translate('settings.toasts.sessionTerminated', { device: target.device }));
    this.pendingTerminateSession.set(null);
  }

  requestTerminateAll(): void { this.pendingTerminateAll.set(true); }
  cancelTerminateAll(): void { this.pendingTerminateAll.set(false); }
  confirmTerminateAll(): void {
    const keepCurrent = (sessions: AdminSession[]) => sessions.filter(s => s.current);
    this.draft.update(d => ({ ...d, security: { ...d.security, sessions: keepCurrent(d.security.sessions) } }));
    this.saved.update(s => ({ ...s, security: { ...s.security, sessions: keepCurrent(s.security.sessions) } }));
    this.showToast(this.lang.translate('settings.toasts.allSessionsTerminated'));
    this.pendingTerminateAll.set(false);
  }

  updatePassword(): void {
    if (this.passwordStrength() < 2) { this.showToast(this.lang.translate('validation.passwordTooWeak')); return; }
    if (!this.passwordsMatch()) { this.showToast(this.lang.translate('validation.passwordsDoNotMatch')); return; }
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.showToast(this.lang.translate('settings.toasts.passwordUpdated'));
  }

  // ── System actions ─────────────────────────────────────────────────────
  clearCache(): void { this.showToast(this.lang.translate('settings.toasts.cacheCleared')); }
  rebuildIndex(): void { this.showToast(this.lang.translate('settings.toasts.indexRebuildStarted')); }
  optimizeImages(): void { this.showToast(this.lang.translate('settings.toasts.imageOptimizationStarted')); }
  backupDatabase(): void { this.showToast(this.lang.translate('settings.toasts.backupStarted')); }
  exportSettings(): void { this.showToast(this.lang.translate('settings.toasts.settingsExported')); }
  importSettings(): void { this.showToast(this.lang.translate('settings.toasts.selectImportFile')); }

  requestDangerAction(action: DangerAction): void { this.pendingDangerAction.set(action); }
  cancelDangerAction(): void { this.pendingDangerAction.set(null); }

  confirmDangerAction(): void {
    const action = this.pendingDangerAction();
    const messageKeys: Record<Exclude<DangerAction, null>, string> = {
      'delete-logs': 'settings.toasts.logsDeleted',
      'delete-cache': 'settings.toasts.cacheDeleted',
      'factory-reset': 'settings.toasts.factoryResetDone',
    };
    if (action === 'factory-reset') {
      const fresh = generateMockSettings();
      this.saved.set(fresh);
      this.draft.set(JSON.parse(JSON.stringify(fresh)));
    }
    if (action) this.showToast(this.lang.translate(messageKeys[action]));
    this.pendingDangerAction.set(null);
  }

  dangerActionLabel(action: DangerAction): string {
    const map: Record<Exclude<DangerAction, null>, string> = {
      'delete-logs': 'settings.system.deleteLogsTitle',
      'delete-cache': 'settings.system.deleteCacheTitle',
      'factory-reset': 'settings.system.factoryResetTitle',
    };
    return action ? this.lang.translate(map[action]) : '';
  }

  dangerActionDescription(action: DangerAction): string {
    const map: Record<Exclude<DangerAction, null>, string> = {
      'delete-logs': 'settings.system.deleteLogsSub',
      'delete-cache': 'settings.system.deleteCacheSub',
      'factory-reset': 'settings.system.factoryResetSub',
    };
    return action ? this.lang.translate(map[action]) : '';
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  formatRelative(iso: string): string {
    const now = Date.now();
    const diffMin = Math.round((now - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return this.lang.translate('common.justNow');
    if (diffMin < 60) return this.lang.translate('common.minutesAgo', { count: diffMin });
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return this.lang.translate('common.hoursAgo', { count: diffHours });
    const diffDays = Math.round(diffHours / 24);
    return this.lang.translate('common.daysAgo', { count: diffDays });
  }

  statusDotClass(status: string): string {
    const map: Record<string, string> = { Operational: 'dot--green', Degraded: 'dot--amber', Down: 'dot--red' };
    return map[status] ?? 'dot--slate';
  }

  private showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMsg.set(msg);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 3000);
  }

  
}