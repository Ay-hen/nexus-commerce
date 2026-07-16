// settings.ts
import { Component, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  SettingsModel, SettingsCategory, PaymentGatewayId, PaymentGateway, AdminSession,
  StoreStatus, SmtpEncryption, ThemeMode, SidebarStyle, FontSize, Environment,
  generateMockSettings,
  COUNTRY_OPTIONS, CURRENCY_OPTIONS, TIMEZONE_OPTIONS, LANGUAGE_OPTIONS, DATE_FORMAT_OPTIONS, WAREHOUSE_OPTIONS,
} from '../../model/settings.model';

interface NavItem { id: SettingsCategory; label: string; icon: string; }

type DangerAction = 'delete-logs' | 'delete-cache' | 'factory-reset' | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s()-]{7,}$/;
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/;

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {

  // ── Loading ────────────────────────────────────────────────────────────
  isLoading = signal(true);

  // ── Toast ──────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Category nav ───────────────────────────────────────────────────────
  activeCategory = signal<SettingsCategory>('general');
  mobileNavOpen = signal(false);

  navItems: NavItem[] = [
    { id: 'general',       label: 'General',       icon: 'general' },
    { id: 'profile',       label: 'Profile',       icon: 'profile' },
    { id: 'security',      label: 'Security',      icon: 'security' },
    { id: 'store',         label: 'Store',         icon: 'store' },
    { id: 'payments',      label: 'Payments',      icon: 'payments' },
    { id: 'email',         label: 'Email',         icon: 'email' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'appearance',    label: 'Appearance',    icon: 'appearance' },
    { id: 'system',        label: 'System',        icon: 'system' },
  ];

  // ── Data: saved vs draft (for dirty tracking) ──────────────────────────
  private saved = signal<SettingsModel>(generateMockSettings());
  draft = signal<SettingsModel>(generateMockSettings());

  isDirty = computed(() => JSON.stringify(this.saved()) !== JSON.stringify(this.draft()));

  // ── Option lists ───────────────────────────────────────────────────────
  countryOptions = COUNTRY_OPTIONS;
  currencyOptions = CURRENCY_OPTIONS;
  timezoneOptions = TIMEZONE_OPTIONS;
  languageOptions = LANGUAGE_OPTIONS;
  dateFormatOptions = DATE_FORMAT_OPTIONS;
  warehouseOptions = WAREHOUSE_OPTIONS;
  storeStatusOptions: StoreStatus[] = ['Open', 'Closed', 'Coming Soon'];
  encryptionOptions: SmtpEncryption[] = ['None', 'SSL', 'TLS'];
  themeOptions: ThemeMode[] = ['Light', 'Dark', 'System'];
  sidebarStyleOptions: SidebarStyle[] = ['Compact', 'Normal'];
  fontSizeOptions: FontSize[] = ['Small', 'Medium', 'Large'];
  environmentOptions: Environment[] = ['Production', 'Development'];
  primaryColorSwatches = ['#4F46E5', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#0D9488', '#10B981', '#111827'];

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
    return ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][s];
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
    if (!g.storeName.trim()) errors['storeName'] = 'Store name is required.';
    if (!EMAIL_RE.test(g.storeEmail)) errors['storeEmail'] = 'Enter a valid email address.';
    if (!EMAIL_RE.test(g.supportEmail)) errors['supportEmail'] = 'Enter a valid email address.';
    if (!PHONE_RE.test(g.phoneNumber)) errors['phoneNumber'] = 'Enter a valid phone number.';
    if (g.website && !URL_RE.test(g.website)) errors['website'] = 'Enter a valid URL (https://…).';
    return errors;
  });

  profileErrors = computed(() => {
    const p = this.draft().profile;
    const errors: Record<string, string> = {};
    if (!p.name.trim()) errors['name'] = 'Name is required.';
    if (!EMAIL_RE.test(p.email)) errors['email'] = 'Enter a valid email address.';
    if (!p.username.trim()) errors['username'] = 'Username is required.';
    if (p.phone && !PHONE_RE.test(p.phone)) errors['phone'] = 'Enter a valid phone number.';
    return errors;
  });

  emailErrors = computed(() => {
    const e = this.draft().email;
    const errors: Record<string, string> = {};
    if (!e.smtpHost.trim()) errors['smtpHost'] = 'SMTP host is required.';
    if (!e.smtpPort || e.smtpPort < 1) errors['smtpPort'] = 'Enter a valid port number.';
    if (!EMAIL_RE.test(e.senderEmail)) errors['senderEmail'] = 'Enter a valid email address.';
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
      this.showToast('Please fix the highlighted fields before saving');
      return;
    }

    this.saved.set(JSON.parse(JSON.stringify(this.draft())));
    this.showToast('Settings saved successfully');
  }

  resetChanges(): void {
    this.draft.set(JSON.parse(JSON.stringify(this.saved())));
    this.formTouched.set(false);
    this.showToast('Changes reverted');
  }

  refresh(): void {
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 600);
    this.showToast('Settings refreshed');
  }

  // ── Generic update helpers ─────────────────────────────────────────────
  updateGeneral<K extends keyof SettingsModel['general']>(key: K, value: SettingsModel['general'][K]): void {
    this.draft.update(d => ({ ...d, general: { ...d.general, [key]: value } }));
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
      this.showToast('Fix the SMTP settings before sending a test email');
      return;
    }
    this.showToast(`Test email sent to ${this.draft().profile.email}`);
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
    if (session.current) { this.showToast("You can't terminate your current session"); return; }
    this.pendingTerminateSession.set(session);
  }
  cancelTerminateSession(): void { this.pendingTerminateSession.set(null); }
  confirmTerminateSession(): void {
    const target = this.pendingTerminateSession();
    if (!target) return;
    this.draft.update(d => ({ ...d, security: { ...d.security, sessions: d.security.sessions.filter(s => s.id !== target.id) } }));
    this.saved.update(s => ({ ...s, security: { ...s.security, sessions: s.security.sessions.filter(x => x.id !== target.id) } }));
    this.showToast(`Session on ${target.device} terminated`);
    this.pendingTerminateSession.set(null);
  }

  requestTerminateAll(): void { this.pendingTerminateAll.set(true); }
  cancelTerminateAll(): void { this.pendingTerminateAll.set(false); }
  confirmTerminateAll(): void {
    const keepCurrent = (sessions: AdminSession[]) => sessions.filter(s => s.current);
    this.draft.update(d => ({ ...d, security: { ...d.security, sessions: keepCurrent(d.security.sessions) } }));
    this.saved.update(s => ({ ...s, security: { ...s.security, sessions: keepCurrent(s.security.sessions) } }));
    this.showToast('All other sessions terminated');
    this.pendingTerminateAll.set(false);
  }

  updatePassword(): void {
    if (this.passwordStrength() < 2) { this.showToast('Choose a stronger password'); return; }
    if (!this.passwordsMatch()) { this.showToast('Passwords do not match'); return; }
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.showToast('Password updated successfully');
  }

  // ── System actions ─────────────────────────────────────────────────────
  clearCache(): void { this.showToast('Cache cleared successfully'); }
  rebuildIndex(): void { this.showToast('Search index rebuild started'); }
  optimizeImages(): void { this.showToast('Image optimization started'); }
  backupDatabase(): void { this.showToast('Database backup started — you\'ll be notified when it\'s ready'); }
  exportSettings(): void { this.showToast('Settings exported to JSON'); }
  importSettings(): void { this.showToast('Select a settings file to import'); }

  requestDangerAction(action: DangerAction): void { this.pendingDangerAction.set(action); }
  cancelDangerAction(): void { this.pendingDangerAction.set(null); }

  confirmDangerAction(): void {
    const action = this.pendingDangerAction();
    const messages: Record<Exclude<DangerAction, null>, string> = {
      'delete-logs': 'All activity logs have been deleted',
      'delete-cache': 'Cache has been cleared',
      'factory-reset': 'All settings have been reset to factory defaults',
    };
    if (action === 'factory-reset') {
      const fresh = generateMockSettings();
      this.saved.set(fresh);
      this.draft.set(JSON.parse(JSON.stringify(fresh)));
    }
    if (action) this.showToast(messages[action]);
    this.pendingDangerAction.set(null);
  }

  dangerActionLabel(action: DangerAction): string {
    const map: Record<Exclude<DangerAction, null>, string> = {
      'delete-logs': 'Delete All Logs',
      'delete-cache': 'Delete Cache',
      'factory-reset': 'Factory Reset',
    };
    return action ? map[action] : '';
  }

  dangerActionDescription(action: DangerAction): string {
    const map: Record<Exclude<DangerAction, null>, string> = {
      'delete-logs': 'This will permanently delete every activity log entry across the entire admin system.',
      'delete-cache': 'This will clear all cached data. The store may respond slower until the cache rebuilds.',
      'factory-reset': 'This will reset every setting in this page back to its default value, discarding all customization.',
    };
    return action ? map[action] : '';
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  formatRelative(iso: string): string {
    const now = Date.now();
    const diffMin = Math.round((now - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
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