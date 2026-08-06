// view-admin-modal.ts
import { Component, EventEmitter, Input, Output, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminUserDetail, AdminActivityEvent, ActivityKind } from '../admin-detail.model';
import { AdminRole, AdminStatus } from '../admin.model';
import { TranslatePipe } from '../../localization/translate.pipe';
import { LanguageService } from '../../localization/language.service';

interface ActivityGroup {
  label: string;
  events: AdminActivityEvent[];
}

const ROLE_KEY_MAP: Record<AdminRole, string> = {
  'Super Admin': 'superAdmin', 'Admin': 'admin', 'Manager': 'manager', 'Support': 'support',
};

@Component({
  selector: 'app-view-admin-modal',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './view-admin-modal.html',
  styleUrl: './view-admin-modal.scss',
})
export class ViewAdminModal {
  protected lang = inject(LanguageService);

  @Input({ required: true }) admin!: AdminUserDetail;
  @Output() closed = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<AdminUserDetail>();

  activeTab = signal<'info' | 'activity'>('info');

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close(); }

  close(): void { this.closed.emit(); }
  requestEdit(): void { this.editRequested.emit(this.admin); }
  setTab(tab: 'info' | 'activity'): void { this.activeTab.set(tab); }

  activityGroups = computed<ActivityGroup[]>(() => {
    const events = this.admin?.activity ?? [];
    const groups: ActivityGroup[] = [];
    const now = new Date();

    const dayLabel = (iso: string): string => {
      const d = new Date(iso);
      const diffDays = Math.floor((this.stripTime(now).getTime() - this.stripTime(d).getTime()) / 86400000);
      if (diffDays <= 0) return this.lang.translate('common.today');
      if (diffDays === 1) return this.lang.translate('common.yesterday');
      return this.lang.translate('common.daysAgo', { count: diffDays });
    };

    for (const ev of events) {
      const label = dayLabel(ev.date);
      let group = groups.find(g => g.label === label);
      if (!group) {
        group = { label, events: [] };
        groups.push(group);
      }
      group.events.push(ev);
    }

    return groups;
  });

  private stripTime(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  roleBadgeClass(role: AdminRole): string {
    const map: Record<AdminRole, string> = {
      'Super Admin': 'role-badge--super',
      'Admin': 'role-badge--admin',
      'Manager': 'role-badge--manager',
      'Support': 'role-badge--support',
    };
    return map[role];
  }

  roleLabel(role: AdminRole): string {
    return this.lang.translate('admins.roles.' + ROLE_KEY_MAP[role]);
  }

  statusLabel(status: AdminStatus): string {
    return this.lang.translate('admins.status.' + status);
  }

  activityIconClass(kind: ActivityKind): string {
    return 'act-dot--' + kind;
  }

  formatDate(iso: string): string {
    return this.lang.formatDate(iso, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(iso: string): string {
    return this.lang.formatDate(iso, { hour: 'numeric', minute: '2-digit' });
  }

  formatLastOnline(iso: string, status: AdminStatus): string {
    if (status === 'online') return this.lang.translate('common.onlineNow');
    const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return this.lang.translate('common.justNow');
    if (diffMin < 60) return this.lang.translate('common.minutesAgo', { count: diffMin });
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return this.lang.translate('common.hoursAgo', { count: diffHours });
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return this.lang.translate('common.yesterday');
    return this.lang.translate('common.daysAgo', { count: diffDays });
  }
}