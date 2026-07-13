// view-activity-modal.ts
import { Component, EventEmitter, Input, Output, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityLogDetail, TimelineStep } from '../activity-detail.model';
import { ActivityAction } from '../activity-log.model';

@Component({
  selector: 'app-view-activity-modal',
  imports: [CommonModule],
  templateUrl: './view-activity-modal.html',
  styleUrl: './view-activity-modal.scss',
})
export class ViewActivityModal {
  @Input({ required: true }) log!: ActivityLogDetail;
  @Output() closed = new EventEmitter<void>();

  activeTab = signal<'details' | 'technical' | 'timeline'>('details');

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close(); }

  close(): void { this.closed.emit(); }
  setTab(tab: 'details' | 'technical' | 'timeline'): void { this.activeTab.set(tab); }

  actionBadgeClass(action: ActivityAction): string {
    const map: Record<ActivityAction, string> = {
      CREATE: 'action-badge--create',
      UPDATE: 'action-badge--update',
      DELETE: 'action-badge--delete',
      LOGIN: 'action-badge--login',
      LOGOUT: 'action-badge--logout',
      EXPORT: 'action-badge--export',
      IMPORT: 'action-badge--import',
      VIEW: 'action-badge--view',
      APPROVE: 'action-badge--approve',
      REJECT: 'action-badge--reject',
    };
    return map[action];
  }

  timelineIconClass(icon: TimelineStep['icon']): string {
    return 'tl-dot--' + icon;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  formatRelative(iso: string): string {
    const now = new Date();
    const d = new Date(iso);
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;

    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return `Today ${this.formatTime(iso)}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return this.formatDate(iso);
  }
}