import { Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailSettings, SmtpEncryption } from '../../../../model/settings.model';
import { LanguageService } from '../../../../localization/language.service';
import { TranslatePipe } from '../../../../localization/translate.pipe';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-email-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './email-settings.html',
  styleUrl: './email-settings.scss',
})
export class EmailSettingsComponent {
  lang = inject(LanguageService);

  // Same contract as the previous sections: parent owns the SettingsModel
  // draft/saved + dirty tracking. Validation, though, is now owned locally
  // — SMTP config validity only matters for this section's own Save and
  // Send Test actions, so there's no reason to route it back through the
  // parent's generic `emailErrors()` computed like before. This component
  // computes its own errors and exposes a `canSave`-style gate to the
  // parent only implicitly (by refusing to emit `save`/`sendTest` when
  // invalid), matching how Security already handles its own password
  // validation locally.
  @Input({ required: true }) settings!: EmailSettings;

  @Output() settingsChange = new EventEmitter<Partial<EmailSettings>>();
  @Output() save = new EventEmitter<void>();
  @Output() toast = new EventEmitter<string>();

  encryptionOptions: SmtpEncryption[] = ['None', 'SSL', 'TLS'];

  formTouched = signal(false);
  private passwordRevealed = signal(false);

  update<K extends keyof EmailSettings>(key: K, value: EmailSettings[K]): void {
    this.settingsChange.emit({ [key]: value } as Partial<EmailSettings>);
    this.formTouched.set(false);
  }

  encryptionKey(e: SmtpEncryption): string {
    const map: Record<SmtpEncryption, string> = { 'None': 'none', 'SSL': 'ssl', 'TLS': 'tls' };
    return 'settings.email.encryptionOptions.' + map[e];
  }

  errors(): Record<string, string> {
    const e = this.settings;
    const errs: Record<string, string> = {};
    if (!e.smtpHost.trim()) errs['smtpHost'] = this.lang.translate('settings.email.errors.smtpHostRequired');
    if (!e.smtpPort || e.smtpPort < 1) errs['smtpPort'] = this.lang.translate('settings.email.errors.invalidPort');
    if (!EMAIL_RE.test(e.senderEmail)) errs['senderEmail'] = this.lang.translate('validation.invalidEmail');
    return errs;
  }

  hasError(field: string): boolean {
    return this.formTouched() && !!this.errors()[field];
  }

  errorMsg(field: string): string {
    return this.errors()[field] ?? '';
  }

  isPasswordRevealed(): boolean {
    return this.passwordRevealed();
  }

  togglePasswordReveal(): void {
    this.passwordRevealed.update(v => !v);
  }

  sendTestEmail(): void {
    this.formTouched.set(true);
    if (Object.keys(this.errors()).length > 0) {
      this.toast.emit(this.lang.translate('settings.toasts.fixSmtpBeforeTest'));
      return;
    }
    this.toast.emit(this.lang.translate('settings.toasts.testEmailSent', { email: this.settings.senderEmail }));
  }

  requestSave(): void {
    this.formTouched.set(true);
    if (Object.keys(this.errors()).length > 0) {
      this.toast.emit(this.lang.translate('settings.toasts.fixFieldsBeforeSaving'));
      return;
    }
    this.save.emit();
  }
}