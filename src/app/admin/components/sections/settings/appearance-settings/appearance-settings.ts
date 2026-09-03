import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppearanceSettings, ThemeMode, SidebarStyle, FontSize } from '../../../../model/settings.model';
import { TranslatePipe } from '../../../../localization/translate.pipe';

const ACCENT_SWATCHES = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];

@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './appearance-settings.html',
  styleUrl: './appearance-settings.scss',
})
export class AppearanceSettingsComponent {
  // Same contract as the previous sections: parent owns the SettingsModel
  // draft/saved + dirty tracking; this component only renders + edits the
  // `appearance` slice (no validation needed — every field is a closed
  // set of options) and reports patches upward.
  @Input({ required: true }) settings!: AppearanceSettings;

  @Output() settingsChange = new EventEmitter<Partial<AppearanceSettings>>();
  @Output() save = new EventEmitter<void>();

  themeOptions: ThemeMode[] = ['Light', 'Dark', 'System'];
  sidebarOptions: SidebarStyle[] = ['Expanded', 'Collapsed'];
  fontSizeOptions: FontSize[] = ['Small', 'Medium', 'Large'];
  accentSwatches = ACCENT_SWATCHES;

  update<K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]): void {
    this.settingsChange.emit({ [key]: value } as Partial<AppearanceSettings>);
  }

  themeKey(t: ThemeMode): string {
    const map: Record<ThemeMode, string> = { 'Light': 'light', 'Dark': 'dark', 'System': 'system' };
    return 'settings.appearance.themeOptions.' + map[t];
  }

  sidebarKey(s: SidebarStyle): string {
    const map: Record<SidebarStyle, string> = { 'Expanded': 'expanded', 'Collapsed': 'collapsed' };
    return 'settings.appearance.sidebarOptions.' + map[s];
  }

  fontSizeKey(f: FontSize): string {
    const map: Record<FontSize, string> = { 'Small': 'small', 'Medium': 'medium', 'Large': 'large' };
    return 'settings.appearance.fontSizeOptions.' + map[f];
  }

  fontSizePreviewPx(f: FontSize): string {
    const map: Record<FontSize, string> = { 'Small': '12px', 'Medium': '14px', 'Large': '16px' };
    return map[f];
  }
}