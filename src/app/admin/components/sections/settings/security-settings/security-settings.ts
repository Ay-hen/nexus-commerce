import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecuritySettings, AdminSession } from '../../../../model/settings.model';
import { LanguageService } from '../../../../localization/language.service';
import { TranslatePipe } from '../../../../localization/translate.pipe';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './security-settings.html',
  styleUrl: './security-settings.scss',
})
export class SecuritySettingsComponent {
  lang = inject(LanguageService);

  // Same contract as General/Profile: parent owns the SettingsModel
  // draft/saved and the terminate-session confirmation flow (because
  // confirming a termination mutates BOTH draft and saved immediately,
  // bypassing the normal dirty/Save Changes cycle — that cross-cutting
  // behavior stays in the parent). This component owns only the
  // change-password form (fully local, never part of the saved model)
  // and reports toggle edits / termination requests upward.
  @Input({ required: true }) settings!: SecuritySettings;

  @Output() settingsChange = new EventEmitter<Partial<SecuritySettings>>();
  @Output() terminateSessionRequested = new EventEmitter<AdminSession>();
  @Output() terminateAllRequested = new EventEmitter<void>();
  @Output() toast = new EventEmitter<string>();

  // ── Change password (local-only state, never persisted to the model) ──
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

  updatePassword(): void {
    if (this.passwordStrength() < 2) { this.toast.emit(this.lang.translate('validation.passwordTooWeak')); return; }
    if (!this.passwordsMatch()) { this.toast.emit(this.lang.translate('validation.passwordsDoNotMatch')); return; }
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.toast.emit(this.lang.translate('settings.toasts.passwordUpdated'));
  }

  // ── Preferences toggles ────────────────────────────────────────────────
  update<K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]): void {
    this.settingsChange.emit({ [key]: value } as Partial<SecuritySettings>);
  }

  // ── Sessions ────────────────────────────────────────────────────────────
  requestTerminateSession(session: AdminSession): void {
    if (session.current) { this.toast.emit(this.lang.translate('settings.toasts.cantTerminateCurrent')); return; }
    this.terminateSessionRequested.emit(session);
  }

  requestTerminateAll(): void {
    this.terminateAllRequested.emit();
  }

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
}