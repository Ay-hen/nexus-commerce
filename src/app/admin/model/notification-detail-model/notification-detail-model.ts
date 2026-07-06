import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AdminNotification,
  NOTIFICATION_TYPE_META,
  NOTIFICATION_PRIORITY_META,
  relativeTime,
  formatFullDate,
} from '../notification-model';

@Component({
  selector: 'app-notification-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-detail-model.html',
  styleUrl: './notification-detail-model.scss',
})
export class NotificationDetailModal implements OnInit, OnDestroy {
  @Input({ required: true }) notification!: AdminNotification;

  @Output() closed = new EventEmitter<void>();
  @Output() markRead = new EventEmitter<string>();
  @Output() markUnread = new EventEmitter<string>();
  @Output() deleted = new EventEmitter<string>();

  closing = false;
  private previousOverflow = '';

  ngOnInit(): void {
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.previousOverflow;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.requestClose();
  }

  // ── Display helpers ────────────────────────────────────────────────────
  typeMeta() {
    return NOTIFICATION_TYPE_META[this.notification.type];
  }

  priorityMeta() {
    return NOTIFICATION_PRIORITY_META[this.notification.priority];
  }

  relativeCreated(): string {
    return relativeTime(this.notification.createdAt);
  }

  relativeRead(): string {
    return this.notification.readAt ? relativeTime(this.notification.readAt) : '';
  }

  fullCreatedDate(): string {
    return formatFullDate(this.notification.createdAt);
  }

  fullReadDate(): string {
    return this.notification.readAt ? formatFullDate(this.notification.readAt) : '';
  }

  hasMetadataLinks(): boolean {
    const m = this.notification.metadata;
    return !!(m && (m.orderId || m.customerId || m.productId));
  }

  iconPath(): string {
    return this.notification.type;
  }

  // ── Actions ────────────────────────────────────────────────────────────
  onBackdropClick(): void {
    this.requestClose();
  }

  stop(event: Event): void {
    event.stopPropagation();
  }

  requestClose(): void {
    if (this.closing) return;
    this.closing = true;
    setTimeout(() => this.closed.emit(), 180);
  }

  onMarkRead(): void {
    this.markRead.emit(this.notification.id);
  }

  onMarkUnread(): void {
    this.markUnread.emit(this.notification.id);
  }

  onDelete(): void {
    this.deleted.emit(this.notification.id);
    this.requestClose();
  }
}