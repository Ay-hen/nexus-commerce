import { Component, EventEmitter, HostListener, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationDetailModal } from '../../model/notification-detail-model/notification-detail-model';
import {
  AdminNotification,
  NOTIFICATION_PRIORITY_META,
  NOTIFICATION_TYPE_META,
  NotificationType,
  generateMockNotifications,
  relativeTime,
} from '../../model/notification-model';

type DropdownTab = 'all' | 'unread';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule, NotificationDetailModal],
  templateUrl: './notification-dropdown.html',
  styleUrl: './notification-dropdown.scss',
})
export class NotificationDropdownComponent {
  /** Emitted when the dropdown wants to be closed (e.g. after "View All" or an outside click). */
  @Output() closed = new EventEmitter<void>();

  constructor(private router: Router) {}

  // ── Data (replace with NotificationService — shares the same shape as the
  //    full Notifications page, so swapping to a live feed needs no UI changes) ──
  private allNotifications = signal<AdminNotification[]>(generateMockNotifications());

  activeTab = signal<DropdownTab>('all');
  viewingNotification = signal<AdminNotification | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────
  unreadCount = computed(() => this.allNotifications().filter(n => !n.read).length);

  visibleNotifications = computed(() => {
    const tab = this.activeTab();
    const list = [...this.allNotifications()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const filtered = tab === 'unread' ? list.filter(n => !n.read) : list;
    return filtered.slice(0, 20);
  });

  setTab(tab: DropdownTab): void {
    this.activeTab.set(tab);
  }

  // ── Actions ───────────────────────────────────────────────────────────
  markAllRead(): void {
    this.allNotifications.update(list =>
      list.map(n => (n.read ? n : { ...n, read: true, readAt: new Date().toISOString() }))
    );
  }

  onNotificationClick(n: AdminNotification): void {
    if (!n.read) {
      this.allNotifications.update(list =>
        list.map(item => (item.id === n.id ? { ...item, read: true, readAt: new Date().toISOString() } : item))
      );
    }

    if (n.actionUrl) {
      this.router.navigateByUrl(n.actionUrl);
      this.closed.emit();
    } else {
      this.viewingNotification.set(n);
    }
  }

  onDetailModalClosed(): void {
    this.viewingNotification.set(null);
  }

  onDetailMarkRead(id: string): void {
    this.allNotifications.update(list =>
      list.map(n => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    );
  }

  onDetailMarkUnread(id: string): void {
    this.allNotifications.update(list => list.map(n => (n.id === id ? { ...n, read: false, readAt: undefined } : n)));
  }

  onDetailDeleted(id: string): void {
    this.allNotifications.update(list => list.filter(n => n.id !== id));
  }

  viewAll(): void {
    this.router.navigate(['/admin/notifications']);
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.viewingNotification()) this.closed.emit();
  }

  // ── Display helpers ───────────────────────────────────────────────────
  typeMeta(type: NotificationType) { return NOTIFICATION_TYPE_META[type]; }
  priorityColor(n: AdminNotification): string { return NOTIFICATION_PRIORITY_META[n.priority].color; }
  relativeTime(iso: string): string { return relativeTime(iso); }

  messagePreview(message: string): string {
    return message.length > 64 ? message.slice(0, 61) + '…' : message;
  }

  trackById(_: number, item: AdminNotification): string { return item.id; }
}

