import { Component, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationDetailModal } from '../../model/notification-detail-model/notification-detail-model';
import {
  AdminNotification,
  NotificationPriority,
  NotificationSort,
  NotificationStatusFilter,
  NotificationType,
  NOTIFICATION_PRIORITY_META,
  NOTIFICATION_TYPE_META,
  formatFullDate,
  generateMockNotifications,
  relativeTime,
} from '../../model/notification-model';
import { TranslatePipe } from '../../localization/translate.pipe';
import { LanguageService } from '../../localization/language.service';

type TypeFilter = 'all' | NotificationType;
type PriorityFilter = 'all' | NotificationPriority;
type DateFilter = 'all' | 'today' | 'week' | 'month';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationDetailModal, TranslatePipe],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications {
  protected lang = inject(LanguageService);

  // ── Loading ────────────────────────────────────────────────────────────
  isLoading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  // ── Data (replace with NotificationService) ──────────────────────────
  private allNotifications = signal<AdminNotification[]>(generateMockNotifications());

  // ── Search / filters ──────────────────────────────────────────────────
  searchQuery    = signal('');
  typeFilter     = signal<TypeFilter>('all');
  priorityFilter = signal<PriorityFilter>('all');
  statusFilter   = signal<NotificationStatusFilter>('all');
  dateFilter     = signal<DateFilter>('all');
  sortBy         = signal<NotificationSort>('newest');
  filtersOpen    = signal(false);

  // ── Pagination ─────────────────────────────────────────────────────────
  pageSize    = signal(8);
  currentPage = signal(1);

  // ── Bulk selection ─────────────────────────────────────────────────────
  selectedIds = signal<Set<string>>(new Set());

  // ── Row menu ───────────────────────────────────────────────────────────
  openMenuId = signal<string | null>(null);

  // ── Modals ─────────────────────────────────────────────────────────────
  viewingNotification = signal<AdminNotification | null>(null);
  pendingDelete        = signal<AdminNotification | null>(null);
  pendingBulkDelete     = signal(false);

  // ── Toast ──────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Static option lists — labels are translation keys ──────────────────
  typeOptions: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'common.allTypes' },
    { key: 'order', label: 'notifications.type.order' },
    { key: 'customer', label: 'notifications.type.customer' },
    { key: 'inventory', label: 'notifications.type.inventory' },
    { key: 'product', label: 'notifications.type.product' },
    { key: 'payment', label: 'notifications.type.payment' },
    { key: 'system', label: 'notifications.type.system' },
    { key: 'warning', label: 'notifications.type.warning' },
    { key: 'success', label: 'notifications.type.success' },
    { key: 'info', label: 'notifications.type.info' },
  ];

  priorityOptions: { key: PriorityFilter; label: string }[] = [
    { key: 'all', label: 'notifications.allPriorities' },
    { key: 'high', label: 'notifications.priority.high' },
    { key: 'medium', label: 'notifications.priority.medium' },
    { key: 'low', label: 'notifications.priority.low' },
  ];

  statusOptions: { key: NotificationStatusFilter; label: string }[] = [
    { key: 'all', label: 'notifications.filterAll' },
    { key: 'unread', label: 'notifications.tabs.unread' },
    { key: 'read', label: 'reviews.status.read' },
  ];

  dateOptions: { key: DateFilter; label: string }[] = [
    { key: 'all', label: 'notifications.anyDate' },
    { key: 'today', label: 'common.today' },
    { key: 'week', label: 'notifications.stats.thisWeek' },
    { key: 'month', label: 'notifications.thisMonth' },
  ];

  sortOptions: { key: NotificationSort; label: string }[] = [
    { key: 'newest', label: 'orders.sort.newest' },
    { key: 'oldest', label: 'orders.sort.oldest' },
    { key: 'unread', label: 'notifications.sortUnreadFirst' },
    { key: 'priority', label: 'notifications.sortPriority' },
  ];

  // ── Computed: statistics ───────────────────────────────────────────────
  unreadCount = computed(() => this.allNotifications().filter(n => !n.read).length);

  todayCount = computed(() => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    return this.allNotifications().filter(n => new Date(n.createdAt).getTime() >= startOfDay.getTime()).length;
  });

  thisWeekCount = computed(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    return this.allNotifications().filter(n => new Date(n.createdAt).getTime() >= weekAgo).length;
  });

  highPriorityCount = computed(() => this.allNotifications().filter(n => n.priority === 'high').length);

  // ── Computed: filtered + sorted list ───────────────────────────────────
  filteredNotifications = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const type = this.typeFilter();
    const priority = this.priorityFilter();
    const status = this.statusFilter();
    const dateRange = this.dateFilter();
    const sort = this.sortBy();

    let list = this.allNotifications().filter(n => {
      if (type !== 'all' && n.type !== type) return false;
      if (priority !== 'all' && n.priority !== priority) return false;
      if (status === 'read' && !n.read) return false;
      if (status === 'unread' && n.read) return false;

      if (dateRange !== 'all') {
        const created = new Date(n.createdAt).getTime();
        if (dateRange === 'today') {
          const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
          if (created < startOfDay.getTime()) return false;
        } else if (dateRange === 'week') {
          if (created < Date.now() - 7 * 86400000) return false;
        } else if (dateRange === 'month') {
          if (created < Date.now() - 30 * 86400000) return false;
        }
      }

      if (q) {
        const hay = `${n.title} ${n.message} ${n.actor?.name ?? ''} ${n.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    const priorityRank: Record<NotificationPriority, number> = { high: 0, medium: 1, low: 2 };

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'unread':
          if (a.read !== b.read) return a.read ? 1 : -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'priority':
          if (priorityRank[a.priority] !== priorityRank[b.priority]) {
            return priorityRank[a.priority] - priorityRank[b.priority];
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredNotifications().length / this.pageSize())));

  pagedNotifications = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredNotifications().slice(start, start + this.pageSize());
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
    const total = this.filteredNotifications().length;
    if (total === 0) return this.lang.translate('products.pageRangeEmpty');
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return this.lang.translate('products.pageRange', { start, end, total });
  });

  // ── Computed: bulk selection state ─────────────────────────────────────
  selectedCount = computed(() => this.selectedIds().size);

  allVisibleSelected = computed(() => {
    const visible = this.pagedNotifications();
    if (visible.length === 0) return false;
    const selected = this.selectedIds();
    return visible.every(n => selected.has(n.id));
  });

  someVisibleSelected = computed(() => {
    const visible = this.pagedNotifications();
    const selected = this.selectedIds();
    return visible.some(n => selected.has(n.id)) && !this.allVisibleSelected();
  });

  hasActiveFilters = computed(() =>
    !!this.searchQuery() ||
    this.typeFilter() !== 'all' ||
    this.priorityFilter() !== 'all' ||
    this.statusFilter() !== 'all' ||
    this.dateFilter() !== 'all'
  );

  ngOnInit(): void {
    setTimeout(() => this.isLoading.set(false), 700);
  }

  // ── Search / filter handlers ────────────────────────────────────────────
  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  setTypeFilter(value: TypeFilter): void { this.typeFilter.set(value); this.currentPage.set(1); }
  setPriorityFilter(value: PriorityFilter): void { this.priorityFilter.set(value); this.currentPage.set(1); }
  setStatusFilter(value: NotificationStatusFilter): void { this.statusFilter.set(value); this.currentPage.set(1); }
  setDateFilter(value: DateFilter): void { this.dateFilter.set(value); this.currentPage.set(1); }
  setSort(value: NotificationSort): void { this.sortBy.set(value); }

  toggleFiltersPanel(): void { this.filtersOpen.update(v => !v); }

  clearFilters(): void {
    this.searchQuery.set('');
    this.typeFilter.set('all');
    this.priorityFilter.set('all');
    this.statusFilter.set('all');
    this.dateFilter.set('all');
    this.currentPage.set(1);
  }

  // ── Pagination ───────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  // ── Bulk selection ───────────────────────────────────────────────────────
  isSelected(id: string): boolean { return this.selectedIds().has(id); }

  toggleSelect(id: string, event?: Event): void {
    event?.stopPropagation();
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  toggleSelectAllVisible(): void {
    const visible = this.pagedNotifications();
    const allSelected = this.allVisibleSelected();
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (allSelected) {
        visible.forEach(n => next.delete(n.id));
      } else {
        visible.forEach(n => next.add(n.id));
      }
      return next;
    });
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  // ── Row menu ───────────────────────────────────────────────────────────
  toggleMenu(notification: AdminNotification, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update(id => (id === notification.id ? null : notification.id));
  }

  closeMenu(): void { this.openMenuId.set(null); }

  @HostListener('document:click')
  onDocClick(): void { this.closeMenu(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
    this.pendingDelete.set(null);
    this.pendingBulkDelete.set(false);
  }

  // ── Row / mark read-unread ───────────────────────────────────────────────
  markRead(id: string): void {
    this.allNotifications.update(list =>
      list.map(n => (n.id === id && !n.read ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    );
  }

  markUnread(id: string): void {
    this.allNotifications.update(list =>
      list.map(n => (n.id === id ? { ...n, read: false, readAt: undefined } : n))
    );
  }

  markSelectedRead(): void {
    const ids = this.selectedIds();
    if (ids.size === 0) return;
    this.allNotifications.update(list =>
      list.map(n => (ids.has(n.id) && !n.read ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    );
    this.showToast(this.lang.translate('notifications.toasts.markedRead', { count: ids.size }));
    this.clearSelection();
  }

  refresh(): void {
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 500);
  }

  // ── Delete flow ───────────────────────────────────────────────────────
  requestDelete(notification: AdminNotification, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.pendingDelete.set(notification);
  }

  cancelDelete(): void { this.pendingDelete.set(null); }

  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target) return;
    this.allNotifications.update(list => list.filter(n => n.id !== target.id));
    this.selectedIds.update(set => { const next = new Set(set); next.delete(target.id); return next; });
    this.pendingDelete.set(null);
    this.showToast(this.lang.translate('notifications.toasts.deleted'));
  }

  requestBulkDelete(): void {
    if (this.selectedCount() === 0) return;
    this.pendingBulkDelete.set(true);
  }

  cancelBulkDelete(): void { this.pendingBulkDelete.set(false); }

  confirmBulkDelete(): void {
    const ids = this.selectedIds();
    this.allNotifications.update(list => list.filter(n => !ids.has(n.id)));
    this.showToast(this.lang.translate('notifications.toasts.bulkDeleted', { count: ids.size }));
    this.clearSelection();
    this.pendingBulkDelete.set(false);
  }

  // ── View details modal ────────────────────────────────────────────────
  showDetails(notification: AdminNotification): void {
    this.closeMenu();
    this.viewingNotification.set(notification);
    if (!notification.read) this.markRead(notification.id);
  }

  onRowClick(notification: AdminNotification): void {
    this.showDetails(notification);
  }

  onDetailModalClosed(): void { this.viewingNotification.set(null); }

  onDetailMarkRead(id: string): void { this.markRead(id); }
  onDetailMarkUnread(id: string): void { this.markUnread(id); }
  onDetailDeleted(id: string): void {
    this.allNotifications.update(list => list.filter(n => n.id !== id));
    this.showToast(this.lang.translate('notifications.toasts.deleted'));
  }

  // ── Display helpers ───────────────────────────────────────────────────
  typeMeta(type: NotificationType) { return NOTIFICATION_TYPE_META[type]; }
  priorityMeta(priority: NotificationPriority) { return NOTIFICATION_PRIORITY_META[priority]; }
  relativeTime(iso: string): string { return relativeTime(iso, this.lang); }
  formatFullDate(iso: string): string { return formatFullDate(iso, this.lang); }

  messagePreview(message: string): string {
    return message.length > 90 ? message.slice(0, 87) + '…' : message;
  }

  trackById(_: number, item: AdminNotification): string { return item.id; }

  private showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMsg.set(msg);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 2800);
  }
}