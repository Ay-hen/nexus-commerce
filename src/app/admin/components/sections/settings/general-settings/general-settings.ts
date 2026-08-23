import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  GeneralSettings, COUNTRY_OPTIONS, CURRENCY_OPTIONS, TIMEZONE_OPTIONS, DATE_FORMAT_OPTIONS,
} from '../../../../model/settings.model';
import { LanguageService } from '../../../../../localization/language.service';
import { TranslatePipe } from '../../../../../localization/translate.pipe';

const STORE_DESCRIPTION_MAX = 300;

@Component({
  selector: 'app-general-settings',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './general-settings.html',
  styleUrl: './general-settings.scss',
})
export class GeneralSettingsComponent {
  lang = inject(LanguageService);

  // ── Input / Output ────────────────────────────────────────────────────
  // The parent Settings component owns the SettingsModel (draft/saved,
  // dirty tracking, validation) — this component just renders + edits the
  // `general` slice of it and reports patches back up. No second save
  // system, no duplicated validation: `errors` below are the same
  // translated messages the parent's `generalErrors()` computed already
  // produces.
  @Input({ required: true }) settings!: GeneralSettings;
  @Input() formTouched = false;
  @Input() errors: Record<string, string> = {};

  @Output() settingsChange = new EventEmitter<Partial<GeneralSettings>>();
  @Output() languageChange = new EventEmitter<string>();
  @Output() save = new EventEmitter<void>();

  // ── Static option lists ───────────────────────────────────────────────
  countryOptions = COUNTRY_OPTIONS;
  currencyOptions = CURRENCY_OPTIONS;
  timezoneOptions = TIMEZONE_OPTIONS;
  dateFormatOptions = DATE_FORMAT_OPTIONS;
  storeDescriptionMax = STORE_DESCRIPTION_MAX;

  // ── Field updates ─────────────────────────────────────────────────────
  update<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]): void {
    this.settingsChange.emit({ [key]: value } as Partial<GeneralSettings>);
  }

  onLanguageChange(code: string): void {
    // Language is special: selecting it doesn't just patch the settings
    // draft, it also has to flip the live admin UI language via
    // LanguageService. That side-effect lives in the parent (which already
    // owns the LanguageService interaction for the navbar switcher), so we
    // just report the choice upward.
    this.languageChange.emit(code);
  }

  // ── Validation display ────────────────────────────────────────────────
  hasError(field: string): boolean {
    return this.formTouched && !!this.errors[field];
  }

  errorMsg(field: string): string {
    return this.errors[field] ?? '';
  }

  // ── Live previews ─────────────────────────────────────────────────────
  // Plain methods (not computed signals) on purpose: `settings` is a
  // regular @Input, not a signal, so a computed() here would capture its
  // first read and never invalidate. Angular re-evaluates template method
  // calls on every change detection pass, which fires whenever the parent
  // pushes a new `settings` object down — so these stay live for free.

  currencyPreview(): string {
    if (!this.settings) return '';
    return this.lang.formatCurrency(99.99, this.settings.currency);
  }

  timezonePreview(): string {
    const tz = this.settings?.timezone;
    if (!tz) return '';
    const match = tz.match(/GMT([+-]\d+(?:\.\d+)?)/);
    const offsetHours = match ? parseFloat(match[1]) : 0;
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const target = new Date(utcMs + offsetHours * 3600000);
    return target.toLocaleTimeString(this.lang.locale(), { hour: 'numeric', minute: '2-digit' });
  }

  dateFormatPreview(): string {
    const format = this.settings?.dateFormat;
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const monthShort = d.toLocaleDateString('en-US', { month: 'short' });

    switch (format) {
      case 'DD/MM/YYYY': return `${dd}/${mm}/${yyyy}`;
      case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
      case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
      case 'MMM D, YYYY': return `${monthShort} ${d.getDate()}, ${yyyy}`;
      default: return `${dd}/${mm}/${yyyy}`;
    }
  }
}