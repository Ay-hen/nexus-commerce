import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileSettings } from '../../../../model/settings.model';
import { LanguageService } from '../../../../../localization/language.service';
import { TranslatePipe } from '../../../../../localization/translate.pipe';

const BIO_MAX = 240;

@Component({
  selector: 'app-profile-settings',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './profile-settings.html',
  styleUrl: './profile-settings.scss',
})
export class ProfileSettingsComponent {
  lang = inject(LanguageService);

  // Same Input/Output contract as GeneralSettingsComponent: the parent
  // Settings component owns the SettingsModel draft/saved state, dirty
  // tracking, and validation (profileErrors()) — this component only
  // renders + edits the `profile` slice and reports patches upward.
  @Input({ required: true }) settings!: ProfileSettings;
  @Input() formTouched = false;
  @Input() errors: Record<string, string> = {};

  @Output() settingsChange = new EventEmitter<Partial<ProfileSettings>>();
  @Output() save = new EventEmitter<void>();

  bioMax = BIO_MAX;

  update<K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]): void {
    this.settingsChange.emit({ [key]: value } as Partial<ProfileSettings>);
  }

  // Mock avatar upload: real implementation would read the File, upload it,
  // and patch `avatar` with the returned URL/initials. For now, regenerate
  // initials from the current name so the preview always has something
  // sensible even without a real upload pipeline behind it yet.
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = '';
    // No backend endpoint to upload to yet — avatar stays derived from name.
  }

  avatarInitials(): string {
    const name = this.settings?.name?.trim();
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  hasError(field: string): boolean {
    return this.formTouched && !!this.errors[field];
  }

  errorMsg(field: string): string {
    return this.errors[field] ?? '';
  }
}