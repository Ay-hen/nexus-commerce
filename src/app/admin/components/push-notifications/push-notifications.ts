import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  NotificationAudience, NotificationPriority, AdminUser,
} from '../../model/push-notification.model';

interface CreateFormState {
  title: string;
  body: string;
  campaignName: string;
  imageUrl: string;
  deepLink: string;
  targetScreen: string;
  audience: NotificationAudience;
  customSegmentDescription: string;
  priority: NotificationPriority;
  ttlHours: number;
  silent: boolean;
  badgeCount: number | null;
  sound: string;
  scheduleMode: 'now' | 'later';
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
}

const CURRENT_ADMIN: AdminUser = { id: 'admin-1', name: 'Ayoub Hennani', avatar: 'AH' };

function emptyForm(): CreateFormState {
  return {
    title: '',
    body: '',
    campaignName: '',
    imageUrl: '',
    deepLink: '',
    targetScreen: 'Home',
    audience: 'All Users',
    customSegmentDescription: '',
    priority: 'Normal',
    ttlHours: 24,
    silent: false,
    badgeCount: null,
    sound: 'Default',
    scheduleMode: 'now',
    scheduledDate: '',
    scheduledTime: '',
    timezone: 'GMT+1 (Casablanca)',
  };
}

@Component({
  selector: 'app-push-notifications',
  imports: [CommonModule, FormsModule],
  templateUrl: './push-notifications.html',
  styleUrl: './push-notifications.scss',
})
export class PushNotifications {

  // ── Toast ──────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Form state ─────────────────────────────────────────────────────────
  form = signal<CreateFormState>(emptyForm());
  formTouched = signal(false);
  formSaving = signal(false);

  // ── Option lists ───────────────────────────────────────────────────────
  formAudienceOptions: NotificationAudience[] = ['All Users', 'Customers', 'Admins', 'Subscribers', 'VIP', 'Custom Segment'];
  formPriorityOptions: NotificationPriority[] = ['Normal', 'High', 'Critical'];
  formSoundOptions = ['Default', 'Chime', 'Bell', 'Silent'];
  formTargetScreens = ['Home', 'Product Detail', 'Order Detail', 'Cart', 'Wishlist', 'Promotions', 'Profile'];

  // ── Live preview ───────────────────────────────────────────────────────
  previewTitle = computed(() => this.form().title.trim() || 'Notification title');
  previewBody = computed(() => this.form().body.trim() || 'Your message body will appear here as you type.');

  isFormValid = computed(() => {
    const f = this.form();
    const scheduleOk = f.scheduleMode === 'now' || (!!f.scheduledDate && !!f.scheduledTime);
    return !!f.title.trim() && !!f.body.trim() && !!f.campaignName.trim() && scheduleOk;
  });

  updateForm<K extends keyof CreateFormState>(key: K, value: CreateFormState[K]): void {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  estimatedRecipientsFor(audience: NotificationAudience): number {
    const map: Record<NotificationAudience, number> = {
      'All Users': 8420,
      'Customers': 5210,
      'Admins': 15,
      'Subscribers': 3120,
      'VIP': 640,
      'Custom Segment': 1180,
    };
    return map[audience];
  }

  resetForm(): void {
    this.form.set(emptyForm());
    this.formTouched.set(false);
  }

  saveDraft(): void {
    this.formTouched.set(true);
    if (!this.form().title.trim()) return;

    // TODO: replace with actual API call (createdBy: CURRENT_ADMIN)
    this.showToast('Notification saved as draft');
    this.resetForm();
  }

  submitCreate(): void {
    this.formTouched.set(true);
    if (!this.isFormValid()) return;

    this.formSaving.set(true);
    const scheduled = this.form().scheduleMode === 'later';

    // TODO: replace with actual API call (createdBy: CURRENT_ADMIN)
    setTimeout(() => {
      this.formSaving.set(false);
      this.showToast(scheduled ? 'Notification scheduled successfully' : 'Notification is being sent');
      this.resetForm();
    }, 800);
  }

  private showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMsg.set(msg);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 2800);
  }
}