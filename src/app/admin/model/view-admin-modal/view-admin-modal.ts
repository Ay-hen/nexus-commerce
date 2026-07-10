// view-admin-modal.ts
import { Component, EventEmitter, Input, Output, HostListener, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminUserDetail, AdminActivityEvent, ActivityKind } from '../admin-detail.model';
import { AdminRole, AdminStatus } from '../admin.model';

interface ActivityGroup {
  label: string;
  events: AdminActivityEvent[];
}

@Component({
  selector: 'app-view-admin-modal',
  imports: [CommonModule],
  templateUrl: './view-admin-modal.html',
  styleUrl: './view-admin-modal.scss',
})
export class ViewAdminModal {
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
      if (diffDays <= 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays} days ago`;
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

  statusLabel(status: AdminStatus): string {
    const map: Record<AdminStatus, string> = { online: 'Online', offline: 'Offline', busy: 'Busy' };
    return map[status];
  }

  activityIconClass(kind: ActivityKind): string {
    return 'act-dot--' + kind;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  formatLastOnline(iso: string, status: AdminStatus): string {
    if (status === 'online') return 'Online now';
    const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }
}