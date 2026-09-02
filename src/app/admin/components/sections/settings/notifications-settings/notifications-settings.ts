import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationSettings } from '../../../../model/settings.model';
import { TranslatePipe } from '../../../../localization/translate.pipe';

@Component({
  selector: 'app-notifications-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './notifications-settings.html',
  styleUrl: './notifications-settings.scss',
})
export class NotificationsSettingsComponent {
  // Same contract as the previous sections: parent owns the SettingsModel
  // draft/saved + dirty tracking; this component only renders + edits the
  // `notifications` slice (all boolean toggles, no validation needed) and
  // reports patches upward.
  @Input({ required: true }) settings!: NotificationSettings;

  @Output() settingsChange = new EventEmitter<Partial<NotificationSettings>>();
  @Output() save = new EventEmitter<void>();

  update<K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]): void {
    this.settingsChange.emit({ [key]: value } as Partial<NotificationSettings>);
  }
}