// activity-logs.ts
import { Component, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ActivityLog, AdminRole, ActivityAction, ActivityModule, generateMockActivityLogs,
} from '../../model/activity-log.model';
import { ActivityLogDetail, toActivityDetail } from '../../model/activity-detail.model';
import { ViewActivityModal } from '../../model/view-activity-modal/view-activity-modal';

export type SearchByField = 'admin' | 'entity' | 'description' | 'module' | 'ip';
export type ModuleFilter = 'all' | ActivityModule;
export type ActionFilter = 'all' | ActivityAction;
export type StatusFilter = 'all' | 'success' | 'failed';
export type RoleFilter = 'all' | AdminRole;
export type DateFilter = 'all' | 'today' | '7d' | '30d' | 'custom';
export type SortKey = 'newest' | 'oldest' | 'admin' | 'module' | 'action' | 'status';
export type ViewMode = 'table' | 'grid';

@Component({
  selector: 'app-activity-logs',
  imports: [CommonModule, FormsModule, ViewActivityModal],
  templateUrl: './activity-logs.html',
  styleUrl: './activity-logs.scss',
})
export class ActivityLogs {

  // ── Loading ────────────────────────────────────────────────────────────
  isLoading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // ── Toast ──────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Data ───────────────────────────────────────────────────────────────
  private logs = signal<ActivityLog[]>(generateMockActivityLogs(200));

  // ── Search / filters ───────────────────────────────────────────────────
  searchQuery = signal('');
  searchBy = signal<SearchByField>('admin');
  moduleFilter = signal<ModuleFilter>('all');
  actionFilter = signal<ActionFilter>('all');
  statusFilter = signal<StatusFilter>('all');
  roleFilter = signal<RoleFilter>('all');
  dateFilter = signal<DateFilter>('all');
  sortKey = signal<SortKey>('newest');

  // ── Pagination ─────────────────────────────────────────────────────────
  pageSize = signal(10);
  rowsPerPageOptions = [10, 25, 50, 100];
  currentPage = signal(1);

  // ── Row menu ───────────────────────────────────────────────────────────
  openMenuId = signal<string | null>(null);
  exportMenuOpen = false;

  // ── Modal ──────────────────────────────────────────────────────────────
  viewingLog = signal<ActivityLogDetail | null>(null);

  // ── Option lists ───────────────────────────────────────────────────────
  searchByOptions: { key: SearchByField; label: string }[] = [
    { key: 'admin', label: 'Admin' },
    { key: 'entity', label: 'Entity' },
    { key: 'description', label: 'Description' },
    { key: 'module', label: 'Module' },
    { key: 'ip', label: 'IP Address' },
  ];

  moduleOptions: { key: ModuleFilter; label: string }[] = [
    { key: 'all', label: 'All Modules' },
    { key: 'Products', label: 'Products' },
    { key: 'Orders', label: 'Orders' },
    { key: 'Categories', label: 'Categories' },
    { key: 'Customers', label: 'Customers' },
    { key: 'Inventory', label: 'Inventory' },
    { key: 'Reviews', label: 'Reviews' },
    { key: 'Notifications', label: 'Notifications' },
    { key: 'Admins', label: 'Admins' },
    { key: 'Reports', label: 'Reports' },
    { key: 'Settings', label: 'Settings' },
  ];

  actionOptions: { key: ActionFilter; label: string }[] = [
    { key: 'all', label: 'All Actions' },
    { key: 'CREATE', label: 'Create' },
    { key: 'UPDATE', label: 'Update' },
    { key: 'DELETE', label: 'Delete' },
    { key: 'LOGIN', label: 'Login' },
    { key: 'LOGOUT', label: 'Logout' },
    { key: 'EXPORT', label: 'Export' },
    { key: 'IMPORT', label: 'Import' },
    { key: 'APPROVE', label: 'Approve' },
    { key: 'REJECT', label: 'Reject' },
    { key: 'VIEW', label: 'View' },
  ];

  statusOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All Statuses' },
    { key: 'success', label: 'Successful' },
    { key: 'failed', label: 'Failed' },
  ];

  roleOptions: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: 'All Roles' },
    { key: 'Super Admin', label: 'Super Admin' },
    { key: 'Admin', label: 'Admin' },
    { key: 'Manager', label: 'Manager' },
    { key: 'Support', label: 'Support' },
  ];

  dateOptions: { key: DateFilter; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last Month' },
    { key: 'custom', label: 'Custom Range' },
  ];

  sortOptions: { key: SortKey; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'admin', label: 'Admin' },
    { key: 'module', label: 'Module' },
    { key: 'action', label: 'Action' },
    { key: 'status', label: 'Status' },
  ];

  // ── Computed: filtered + sorted list ─────────────────────────────────
  private matchesSearch(log: ActivityLog, q: string, field: SearchByField): boolean {
    if (!q) return true;
    const needle = q.toLowerCase();
    switch (field) {
      case 'admin': return log.adminName.toLowerCase().includes(needle);
      case 'entity': return log.entityName.toLowerCase().includes(needle);
      case 'description': return log.description.toLowerCase().includes(needle);
      case 'module': return log.module.toLowerCase().includes(needle);
      case 'ip': return log.ipAddress.toLowerCase().includes(needle);
      default: return true;
    }
  }

  private matchesDate(log: ActivityLog, range: DateFilter): boolean {
    if (range === 'all' || range === 'custom') return true;
    const created = new Date(log.createdAt).getTime();
    const now = Date.now();
    const days = range === 'today' ? 1 : range === '7d' ? 7 : 30;
    return now - created <= days * 86400000;
  }

  filteredLogs = computed(() => {
    const q = this.searchQuery().trim();
    const field = this.searchBy();
    const module = this.moduleFilter();
    const action = this.actionFilter();
    const status = this.statusFilter();
    const role = this.roleFilter();
    const date = this.dateFilter();

    return this.logs().filter(log => {
      if (!this.matchesSearch(log, q, field)) return false;
      if (module !== 'all' && log.module !== module) return false;
      if (action !== 'all' && log.action !== action) return false;
      if (status === 'success' && !log.success) return false;
      if (status === 'failed' && log.success) return false;
      if (role !== 'all' && log.role !== role) return false;
      if (!this.matchesDate(log, date)) return false;
      return true;
    });
  });

  sortedLogs = computed(() => {
    const key = this.sortKey();
    const list = [...this.filteredLogs()];

    list.sort((a, b) => {
      switch (key) {
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'admin': return a.adminName.localeCompare(b.adminName);
        case 'module': return a.module.localeCompare(b.module);
        case 'action': return a.action.localeCompare(b.action);
        case 'status': return Number(a.success) - Number(b.success);
        default: return 0;
      }
    });

    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.sortedLogs().length / this.pageSize())));

  pagedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sortedLogs().slice(start, start + this.pageSize());
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const span = 1;
    const range: number[] = [];
    for (let i = Math.max(1, current - span); i <= Math.min(total, current + span); i++) range.push(i);
    return range;
  });

  pageRangeLabel = computed(() => {
    const total = this.sortedLogs().length;
    if (total === 0) return '0 results';
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return `${start}–${end} of ${total}`;
  });

  // ── Stats ──────────────────────────────────────────────────────────────
  totalActivities = computed(() => this.logs().length);

  todaysActivities = computed(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.logs().filter(l => new Date(l.createdAt).getTime() >= startOfDay.getTime()).length;
  });

  successfulActions = computed(() => this.logs().filter(l => l.success).length);
  failedActions = computed(() => this.logs().filter(l => !l.success).length);

  ngOnInit(): void {
    setTimeout(() => this.isLoading.set(false), 700);
  }

  // ── View mode ──────────────────────────────────────────────────────────
  viewMode = signal<ViewMode>('table');
  setViewMode(mode: ViewMode): void { this.viewMode.set(mode); }

  // ── Filter handlers ────────────────────────────────────────────────────
  onSearch(value: string): void { this.searchQuery.set(value); this.currentPage.set(1); }
  setSearchBy(field: SearchByField): void { this.searchBy.set(field); this.currentPage.set(1); }
  setModuleFilter(m: ModuleFilter): void { this.moduleFilter.set(m); this.currentPage.set(1); }
  setActionFilter(a: ActionFilter): void { this.actionFilter.set(a); this.currentPage.set(1); }
  setStatusFilter(s: StatusFilter): void { this.statusFilter.set(s); this.currentPage.set(1); }
  setRoleFilter(r: RoleFilter): void { this.roleFilter.set(r); this.currentPage.set(1); }
  setDateFilter(d: DateFilter): void { this.dateFilter.set(d); this.currentPage.set(1); }
  setSort(key: SortKey): void { this.sortKey.set(key); }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  hasActiveFilters(): boolean {
    return !!this.searchQuery()
      || this.moduleFilter() !== 'all'
      || this.actionFilter() !== 'all'
      || this.statusFilter() !== 'all'
      || this.roleFilter() !== 'all'
      || this.dateFilter() !== 'all';
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.moduleFilter.set('all');
    this.actionFilter.set('all');
    this.statusFilter.set('all');
    this.roleFilter.set('all');
    this.dateFilter.set('all');
    this.currentPage.set(1);
  }

  // ── Pagination ─────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  // ── Row menu ───────────────────────────────────────────────────────────
  toggleMenu(log: ActivityLog, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update(id => id === log.id ? null : log.id);
  }
  closeMenu(): void { this.openMenuId.set(null); this.exportMenuOpen = false; }

  @HostListener('document:click')
  onDocClick(): void { this.closeMenu(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
    this.viewingLog.set(null);
  }

  // ── View modal ─────────────────────────────────────────────────────────
  showDetails(log: ActivityLog, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.viewingLog.set(toActivityDetail(log));
  }
  closeView(): void { this.viewingLog.set(null); }

  // ── Export ─────────────────────────────────────────────────────────────
  exportCsv(): void { this.showToast('Exporting activity logs to CSV…'); }
  exportPdf(): void { this.showToast('Exporting activity logs to PDF…'); }
  downloadReport(): void { this.showToast('Generating full activity report…'); }

  // ── Helpers ────────────────────────────────────────────────────────────
  trackById(_: number, item: ActivityLog): string { return item.id; }

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

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(iso: string): string {
    const now = new Date();
    const d = new Date(iso);
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;

    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return `Today ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMsg.set(msg);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 2800);
  }
}