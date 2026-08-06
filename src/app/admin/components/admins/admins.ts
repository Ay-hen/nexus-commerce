// admins.ts
import { Component, signal, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminUser, AdminRole, AdminStatus, generateMockAdmins } from '../../model/admin.model';
import { AdminUserDetail, toAdminDetail } from '../../model/admin-detail.model';

import { ViewAdminModal } from '../../model/view-admin-modal/view-admin-modal';
import { AddAdminModal } from '../../model/add-admin-modal/add-admin-modal';
import { EditAdminModal } from '../../model/edit-admin-modal/edit-admin-modal';
import { DeleteAdminModal } from '../../model/delete-admin-modal/delete-admin-modal';
import { TranslatePipe } from '../../../localization/translate.pipe';
import { LanguageService } from '../../../localization/language.service';

export type RoleFilter = 'all' | AdminRole;
export type StatusFilter = 'all' | AdminStatus;
export type TwoFaFilter = 'all' | 'enabled' | 'disabled';
export type SortKey = 'newest' | 'oldest' | 'name' | 'role' | 'last-online' | 'most-active';
export type ViewMode = 'table' | 'grid';

// Maps AdminRole (data value) -> translation key segment, for display only.
const ROLE_KEY_MAP: Record<AdminRole, string> = {
  'Super Admin': 'superAdmin', 'Admin': 'admin', 'Manager': 'manager', 'Support': 'support',
};

@Component({
  selector: 'app-admins',
  imports: [CommonModule, FormsModule, ViewAdminModal, AddAdminModal, EditAdminModal, DeleteAdminModal, TranslatePipe],
  templateUrl: './admins.html',
  styleUrl: './admins.scss',
})
export class Admins {
  protected lang = inject(LanguageService);

  // ── Loading ────────────────────────────────────────────────────────────
  isLoading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  // ── Toast ──────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Data ───────────────────────────────────────────────────────────────
  private admins = signal<AdminUser[]>(generateMockAdmins(30));

  // ── Search / filters ───────────────────────────────────────────────────
  searchQuery = signal('');
  roleFilter = signal<RoleFilter>('all');
  statusFilter = signal<StatusFilter>('all');
  twoFaFilter = signal<TwoFaFilter>('all');
  sortKey = signal<SortKey>('newest');

  // ── View mode ──────────────────────────────────────────────────────────
  viewMode = signal<ViewMode>('table');

  // ── Pagination ─────────────────────────────────────────────────────────
  pageSize = signal(8);
  rowsPerPageOptions = [8, 15, 25];
  currentPage = signal(1);

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  // ── Row menu ───────────────────────────────────────────────────────────
  openMenuId = signal<string | null>(null);
  exportMenuOpen = false;

  // ── Bulk selection ─────────────────────────────────────────────────────
  selectedIds = signal<Set<string>>(new Set());

  // ── Modals ─────────────────────────────────────────────────────────────
  viewingAdmin = signal<AdminUserDetail | null>(null);
  addingAdmin = signal(false);
  editingAdmin = signal<AdminUserDetail | null>(null);
  pendingDelete = signal<AdminUser | null>(null);
  pendingReset = signal<AdminUser | null>(null);
  pendingDisable = signal<AdminUser | null>(null);

  // ── Option lists — labels are translation keys resolved via `| translate` ──
  roleOptions: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: 'common.allRoles' },
    { key: 'Super Admin', label: 'admins.roles.superAdmin' },
    { key: 'Admin', label: 'admins.roles.admin' },
    { key: 'Manager', label: 'admins.roles.manager' },
    { key: 'Support', label: 'admins.roles.support' },
  ];

  statusOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'common.allStatuses' },
    { key: 'online', label: 'admins.status.online' },
    { key: 'offline', label: 'admins.status.offline' },
    { key: 'busy', label: 'admins.status.busy' },
  ];

  twoFaOptions: { key: TwoFaFilter; label: string }[] = [
    { key: 'all', label: 'admins.allTwoFa' },
    { key: 'enabled', label: 'common.enabled' },
    { key: 'disabled', label: 'common.disabled' },
  ];

  sortOptions: { key: SortKey; label: string }[] = [
    { key: 'newest', label: 'orders.sort.newest' },
    { key: 'oldest', label: 'orders.sort.oldest' },
    { key: 'name', label: 'admins.sort.name' },
    { key: 'role', label: 'admins.sort.role' },
    { key: 'last-online', label: 'admins.sort.lastOnline' },
    { key: 'most-active', label: 'admins.sort.mostActive' },
  ];

  // ── Computed: filtered + sorted list ─────────────────────────────────
  filteredAdmins = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();
    const twoFa = this.twoFaFilter();

    return this.admins().filter(a => {
      if (q) {
        const haystack = `${a.fullName} ${a.email} ${a.phone} ${a.role}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (role !== 'all' && a.role !== role) return false;
      if (status !== 'all' && a.status !== status) return false;
      if (twoFa === 'enabled' && !a.twoFactorEnabled) return false;
      if (twoFa === 'disabled' && a.twoFactorEnabled) return false;
      return true;
    });
  });

  private roleWeight: Record<AdminRole, number> = { 'Super Admin': 0, 'Admin': 1, 'Manager': 2, 'Support': 3 };

  sortedAdmins = computed(() => {
    const key = this.sortKey();
    const list = [...this.filteredAdmins()];

    list.sort((a, b) => {
      switch (key) {
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name': return a.fullName.localeCompare(b.fullName);
        case 'role': return this.roleWeight[a.role] - this.roleWeight[b.role];
        case 'last-online': return new Date(b.lastOnline).getTime() - new Date(a.lastOnline).getTime();
        case 'most-active': return b.activityCount - a.activityCount;
        default: return 0;
      }
    });

    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.sortedAdmins().length / this.pageSize())));

  pagedAdmins = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sortedAdmins().slice(start, start + this.pageSize());
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
    const total = this.sortedAdmins().length;
    if (total === 0) return this.lang.translate('products.pageRangeEmpty');
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return this.lang.translate('products.pageRange', { start, end, total });
  });

  // ── Stats ──────────────────────────────────────────────────────────────
  totalAdmins = computed(() => this.admins().length);
  superAdminCount = computed(() => this.admins().filter(a => a.role === 'Super Admin').length);
  onlineCount = computed(() => this.admins().filter(a => a.status === 'online').length);
  twoFaEnabledCount = computed(() => this.admins().filter(a => a.twoFactorEnabled).length);

  // ── Bulk selection computed ────────────────────────────────────────────
  selectedCount = computed(() => this.selectedIds().size);
  allOnPageSelected = computed(() => {
    const page = this.pagedAdmins();
    if (page.length === 0) return false;
    const ids = this.selectedIds();
    return page.every(a => ids.has(a.id));
  });

  ngOnInit(): void {
    setTimeout(() => this.isLoading.set(false), 700);
  }

  // ── Search / filter handlers ───────────────────────────────────────────
  onSearch(value: string): void { this.searchQuery.set(value); this.currentPage.set(1); }
  setRoleFilter(role: RoleFilter): void { this.roleFilter.set(role); this.currentPage.set(1); }
  setStatusFilter(status: StatusFilter): void { this.statusFilter.set(status); this.currentPage.set(1); }
  setTwoFaFilter(v: TwoFaFilter): void { this.twoFaFilter.set(v); this.currentPage.set(1); }
  setSort(key: SortKey): void { this.sortKey.set(key); }
  setViewMode(mode: ViewMode): void { this.viewMode.set(mode); }

  hasActiveFilters(): boolean {
    return !!this.searchQuery() || this.roleFilter() !== 'all' || this.statusFilter() !== 'all' || this.twoFaFilter() !== 'all';
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.roleFilter.set('all');
    this.statusFilter.set('all');
    this.twoFaFilter.set('all');
    this.currentPage.set(1);
  }

  // ── Pagination ─────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  // ── Row menu ───────────────────────────────────────────────────────────
  toggleMenu(admin: AdminUser, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update(id => id === admin.id ? null : admin.id);
  }
  closeMenu(): void { this.openMenuId.set(null); this.exportMenuOpen = false; }

  @HostListener('document:click')
  onDocClick(): void { this.closeMenu(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
    this.viewingAdmin.set(null);
    this.addingAdmin.set(false);
    this.editingAdmin.set(null);
    this.pendingDelete.set(null);
    this.pendingReset.set(null);
    this.pendingDisable.set(null);
  }

  // ── Bulk selection ─────────────────────────────────────────────────────
  toggleSelect(admin: AdminUser, event: Event): void {
    event.stopPropagation();
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (next.has(admin.id)) next.delete(admin.id); else next.add(admin.id);
      return next;
    });
  }

  isSelected(admin: AdminUser): boolean {
    return this.selectedIds().has(admin.id);
  }

  toggleSelectAllOnPage(): void {
    const page = this.pagedAdmins();
    const allSelected = this.allOnPageSelected();
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (allSelected) {
        page.forEach(a => next.delete(a.id));
      } else {
        page.forEach(a => next.add(a.id));
      }
      return next;
    });
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  bulkDisable(): void {
    const ids = this.selectedIds();
    this.admins.update(list => list.map(a => ids.has(a.id) ? { ...a, status: 'offline' as AdminStatus } : a));
    this.showToast(this.lang.translate('admins.toasts.bulkDisabled', { count: ids.size }));
    this.clearSelection();
  }

  bulkEnable(): void {
    const ids = this.selectedIds();
    this.admins.update(list => list.map(a => ids.has(a.id) ? { ...a, status: 'online' as AdminStatus } : a));
    this.showToast(this.lang.translate('admins.toasts.bulkEnabled', { count: ids.size }));
    this.clearSelection();
  }

  bulkDelete(): void {
    const ids = this.selectedIds();
    this.admins.update(list => list.filter(a => !ids.has(a.id)));
    this.showToast(this.lang.translate('admins.toasts.bulkDeleted', { count: ids.size }));
    this.clearSelection();
  }

  bulkExport(): void {
    this.showToast(this.lang.translate('admins.toasts.bulkExporting', { count: this.selectedIds().size }));
  }

  // ── View modal ─────────────────────────────────────────────────────────
  showDetails(admin: AdminUser, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.viewingAdmin.set(toAdminDetail(admin));
  }
  closeView(): void { this.viewingAdmin.set(null); }

  onEditFromView(detail: AdminUserDetail): void {
    this.viewingAdmin.set(null);
    this.editingAdmin.set(detail);
  }

  // ── Add modal ──────────────────────────────────────────────────────────
  openAdd(): void { this.addingAdmin.set(true); }
  closeAdd(): void { this.addingAdmin.set(false); }

  onAdminCreated(admin: AdminUser): void {
    this.admins.update(list => [admin, ...list]);
    this.showToast(this.lang.translate('admins.toasts.added', { name: admin.fullName, role: this.roleLabel(admin.role) }));
    this.addingAdmin.set(false);
  }

  // ── Edit modal ─────────────────────────────────────────────────────────
  editAdmin(admin: AdminUser, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.editingAdmin.set(toAdminDetail(admin));
  }
  closeEdit(): void { this.editingAdmin.set(null); }

  onAdminSaved(updated: AdminUser): void {
    this.admins.update(list => list.map(a => a.id === updated.id ? { ...a, ...updated } : a));
    this.showToast(this.lang.translate('admins.toasts.updated', { name: updated.fullName }));
    this.editingAdmin.set(null);
  }

  // ── Delete flow ────────────────────────────────────────────────────────
  requestDelete(admin: AdminUser, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.pendingDelete.set(admin);
  }
  cancelDelete(): void { this.pendingDelete.set(null); }
  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target) return;
    this.admins.update(list => list.filter(a => a.id !== target.id));
    this.showToast(this.lang.translate('admins.toasts.deleted', { name: target.fullName }));
    this.pendingDelete.set(null);
  }

  // ── Reset password flow ────────────────────────────────────────────────
  requestReset(admin: AdminUser, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.pendingReset.set(admin);
  }
  cancelReset(): void { this.pendingReset.set(null); }
  confirmReset(): void {
    const target = this.pendingReset();
    if (!target) return;
    this.showToast(this.lang.translate('admins.toasts.resetLinkSent', { email: target.email }));
    this.pendingReset.set(null);
  }

  // ── Disable account flow ───────────────────────────────────────────────
  requestDisable(admin: AdminUser, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.pendingDisable.set(admin);
  }
  cancelDisable(): void { this.pendingDisable.set(null); }
  confirmDisable(): void {
    const target = this.pendingDisable();
    if (!target) return;
    this.admins.update(list => list.map(a => a.id === target.id ? { ...a, status: 'offline' as AdminStatus } : a));
    this.showToast(this.lang.translate('admins.toasts.accountDisabled', { name: target.fullName }));
    this.pendingDisable.set(null);
  }

  // ── Export ─────────────────────────────────────────────────────────────
  exportCsv(): void { this.showToast(this.lang.translate('admins.toasts.exportingCsv')); }
  exportPdf(): void { this.showToast(this.lang.translate('admins.toasts.exportingPdf')); }

  // ── Helpers ────────────────────────────────────────────────────────────
  trackById(_: number, item: AdminUser): string { return item.id; }

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

  formatDate(iso: string): string {
    return this.lang.formatDate(iso, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatLastOnline(iso: string, status: AdminStatus): string {
    if (status === 'online') return this.lang.translate('common.onlineNow');
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMin = Math.round((now - then) / 60000);

    if (diffMin < 1) return this.lang.translate('common.justNow');
    if (diffMin < 60) return this.lang.translate('common.minutesAgo', { count: diffMin });

    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return this.lang.translate('common.hoursAgo', { count: diffHours });

    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return this.lang.translate('common.yesterday');
    return this.lang.translate('common.daysAgo', { count: diffDays });
  }

  private showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMsg.set(msg);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 2800);
  }
}