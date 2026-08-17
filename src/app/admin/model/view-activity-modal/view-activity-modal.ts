// view-activity-modal.ts
import { Component, EventEmitter, Input, Output, HostListener, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityLogDetail, TimelineStep } from '../activity-detail.model';
import { ActivityAction, actionTranslationKey, moduleTranslationKey, roleTranslationKey } from '../activity-log.model';
import { LanguageService } from '../../../localization/language.service';
import { TranslatePipe } from '../../../localization/translate.pipe';

@Component({
  selector: 'app-view-activity-modal',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './view-activity-modal.html',
  styleUrl: './view-activity-modal.scss',
})
export class ViewActivityModal {
  @Input({ required: true }) log!: ActivityLogDetail;
  @Output() closed = new EventEmitter<void>();

  lang = inject(LanguageService);

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

  actionTranslationKey = actionTranslationKey;
  moduleTranslationKey = moduleTranslationKey;
  roleTranslationKey = roleTranslationKey;

  timelineIconClass(icon: TimelineStep['icon']): string {
    return 'tl-dot--' + icon;
  }

  formatDate(iso: string): string {
    return this.lang.formatDate(iso, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(this.lang.locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  formatRelative(iso: string): string {
    const now = new Date();
    const d = new Date(iso);
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);

    if (diffMin < 1) return this.lang.translate('common.justNow');
    if (diffMin < 60) return this.lang.translate('common.minutesAgo', { count: diffMin });

    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return this.lang.translate('common.todayAt', { time: this.formatTime(iso) });

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return this.lang.translate('common.yesterday');

    return this.formatDate(iso);
  }
}