import {
  Component,
  signal,
  computed,
  inject,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification';
import { Notification, NotificationCategory, CategoryFilter } from '../../model/notification.model';

@Component({
  selector: 'app-notification',
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrl:  './notification.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent {
  readonly ns     = inject(NotificationService);
  private router  = inject(Router);

  // ── Local state ────────────────────────────────────────────────────────────
  /** ID of the notification currently being dismissed (drives exit animation) */
  removingId = signal<string | null>(null);

  // ── Forwarded signals (used in template) ──────────────────────────────────
  isOpen              = this.ns.isOpen;
  isLoading           = this.ns.isLoading;
  unreadCount         = this.ns.unreadCount;
  hasUnread           = this.ns.hasUnread;
  notifications       = this.ns.filteredNotifications;
  activeFilter        = this.ns.activeFilter;
  categoryFilters     = this.ns.categoryFilters;

  // ── Toggle ────────────────────────────────────────────────────────────────
  toggle(): void { this.ns.toggle(); }

  // ── Filter ────────────────────────────────────────────────────────────────
  setFilter(key: NotificationCategory | 'all'): void {
    this.ns.setFilter(key);
  }

  // ── Mark as read ──────────────────────────────────────────────────────────
  markRead(notification: Notification, event: Event): void {
    event.stopPropagation();
    this.ns.markRead(notification.id);
  }

  markAllRead(): void { this.ns.markAllRead(); }

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteNotification(notification: Notification, event: Event): void {
    event.stopPropagation();
    this.removingId.set(notification.id);
    setTimeout(() => {
      this.ns.delete(notification.id);
      this.removingId.set(null);
    }, 320);
  }

  clearAll(): void { this.ns.clearAll(); }

  // ── Action button click ───────────────────────────────────────────────────
  onAction(notification: Notification, event: Event): void {
    event.stopPropagation();
    this.ns.handleAction(notification);
  }

  // ── Card click (mark read) ────────────────────────────────────────────────
  onCardClick(notification: Notification): void {
    if (!notification.read) this.ns.markRead(notification.id);
  }

  // ── Keyboard: close on Escape ─────────────────────────────────────────────
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) this.ns.close();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  timeAgo(iso: string): string {
    return this.ns.timeAgo(iso);
  }

  getCategoryMeta(category: NotificationCategory) {
    return this.ns.getCategoryMeta(category);
  }

  trackById(_: number, n: Notification): string { return n.id; }
  trackByKey(_: number, f: CategoryFilter): string { return f.key; }

  /** Display "99+" when count exceeds two digits */
  badgeLabel(count: number): string {
    return count > 99 ? '99+' : String(count);
  }
}