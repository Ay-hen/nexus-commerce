import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppearanceSettings, ThemeMode, SidebarStyle, FontSize } from '../../../../model/settings.model';
import { TranslatePipe } from '../../../../../localization/translate.pipe';
import { ThemeService } from '../../../../services/theme.service';

const ACCENT_SWATCHES = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];

@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './appearance-settings.html',
  styleUrl: './appearance-settings.scss',
})
export class AppearanceSettingsComponent {
  // Same contract as the previous sections: parent (Settings) owns the
  // SettingsModel draft/saved + dirty tracking; this component renders +
  // edits the `appearance` slice and reports patches upward so "Reset" /
  // "Save" / the dirty indicator keep working exactly like every other
  // settings category.
  //
  // IMPORTANT: unlike the other sections, appearance is also applied LIVE
  // via ThemeService the instant a control is touched — per the product
  // requirement, a theme/appearance setting must visibly change the UI
  // immediately, not just sit in a form waiting for "Save". The parent's
  // save/reset flow still works on top of that: Settings syncs its
  // draft/saved appearance slice from ThemeService itself (see settings.ts)
  // so "Reset" correctly reverts the live theme too, not just the form.
  @Input({ required: true }) settings!: AppearanceSettings;

  @Output() settingsChange = new EventEmitter<Partial<AppearanceSettings>>();
  @Output() save = new EventEmitter<void>();

  theme = inject(ThemeService);

  themeOptions: ThemeMode[] = ['Light', 'Dark', 'System'];
  sidebarOptions: SidebarStyle[] = ['Compact', 'Normal'];
  fontSizeOptions: FontSize[] = ['Small', 'Medium', 'Large'];
  accentSwatches = ACCENT_SWATCHES;

  update<K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]): void {
    // Apply immediately (live preview across the whole Admin UI)...
    this.theme.applyPatch({ [key]: value } as Partial<AppearanceSettings>);
    // ...and report upward so the Settings page's draft/dirty/save state
    // stays consistent with every other settings category.
    this.settingsChange.emit({ [key]: value } as Partial<AppearanceSettings>);
  }

  // NOTE: these map to the FLAT keys that actually exist in the translation
  // files (settings.appearance.light / .dark / .system / .compact / ...).
  // A previous version of this component built keys under a non-existent
  // "themeOptions." / "sidebarOptions." / "fontSizeOptions." namespace,
  // which rendered raw key paths in the UI instead of translated text.
  themeKey(t: ThemeMode): string {
    return 'settings.appearance.' + t.toLowerCase();
  }

  sidebarKey(s: SidebarStyle): string {
    return 'settings.appearance.' + s.toLowerCase();
  }

  fontSizeKey(f: FontSize): string {
    return 'settings.appearance.' + f.toLowerCase();
  }

  fontSizePreviewPx(f: FontSize): string {
    const map: Record<FontSize, string> = { 'Small': '12px', 'Medium': '14px', 'Large': '16px' };
    return map[f];
  }
}