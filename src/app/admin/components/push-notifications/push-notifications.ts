// push-notifications.ts
import { Component, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  PushNotification, PushNotificationStatus, NotificationAudience, NotificationPriority,
  AdminUser, generateMockNotifications,
} from '../../model/push-notification.model';

export type StatusFilter = 'all' | PushNotificationStatus;
export type AudienceFilter = 'all' | NotificationAudience;
export type SortKey = 'newest' | 'oldest' | 'scheduled' | 'title';

interface CreateFormState {
  title: string;
  body: string;
  campaignName: string;
  imageUrl: string;
  deepLink: string;
  targetScreen: string;
  audience: NotificationAudience;
  customSegmentDescription: string;
  priority: NotificationPriority;
  ttlHours: number;
  silent: boolean;
  badgeCount: number | null;
  sound: string;
  scheduleMode: 'now' | 'later';
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
}

const CURRENT_ADMIN: AdminUser = { id: 'admin-1', name: 'Ayoub Hennani', avatar: 'AH' };

function emptyForm(): CreateFormState {
  return {
    title: '',
    body: '',
    campaignName: '',
    imageUrl: '',
    deepLink: '',
    targetScreen: 'Home',
    audience: 'All Users',
    customSegmentDescription: '',
    priority: 'Normal',
    ttlHours: 24,
    silent: false,
    badgeCount: null,
    sound: 'Default',
    scheduleMode: 'now',
    scheduledDate: '',
    scheduledTime: '',
    timezone: 'GMT+1 (Casablanca)',
  };
}

@Component({
  selector: 'app-push-notifications',
  imports: [CommonModule, FormsModule],
  templateUrl: './push-notifications.html',
  styleUrl: './push-notifications.scss',
})
export class PushNotificationsComponent {

  // ── Loading ────────────────────────────────────────────────────────────
  isLoading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // ── Toast ──────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Data ───────────────────────────────────────────────────────────────
  private notifications = signal<PushNotification[]>(generateMockNotifications(42));

  // ── Search / filters ───────────────────────────────────────────────────
  searchQuery = signal('');
  statusFilter = signal<StatusFilter>('all');
  audienceFilter = signal<AudienceFilter>('all');
  sortKey = signal<SortKey>('newest');

  // ── Pagination ─────────────────────────────────────────────────────────
  pageSize = 9;
  currentPage = signal(1);

  // ── Row menu / selection ───────────────────────────────────────────────
  openMenuId = signal<string | null>(null);
  selectedIds = signal<Set<string>>(new Set());

  // ── Modals ─────────────────────────────────────────────────────────────
  viewingNotification = signal<PushNotification | null>(null);
  creating = signal(false);
  pendingDelete = signal<PushNotification | null>(null);
  pendingBulkDelete = signal(false);

  // ── Create form state ──────────────────────────────────────────────────
  form = signal<CreateFormState>(emptyForm());
  formTouched = signal(false);
  formSaving = signal(false);

  // ── Option lists ───────────────────────────────────────────────────────
  statusOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All Statuses' },
    { key: 'Draft', label: 'Draft' },
    { key: 'Scheduled', label: 'Scheduled' },
    { key: 'Sending', label: 'Sending' },
    { key: 'Sent', label: 'Sent' },
    { key: 'Failed', label: 'Failed' },
    { key: 'Cancelled', label: 'Cancelled' },
  ];

  audienceOptions: { key: AudienceFilter; label: string }[] = [
    { key: 'all', label: 'All Audiences' },
    { key: 'All Users', label: 'All Users' },
    { key: 'Customers', label: 'Customers' },
    { key: 'Admins', label: 'Admins' },
    { key: 'Subscribers', label: 'Subscribers' },
    { key: 'VIP', label: 'VIP' },
  ];

  sortOptions: { key: SortKey; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'scheduled', label: 'Scheduled Date' },
    { key: 'title', label: 'Title' },
  ];

  formAudienceOptions: NotificationAudience[] = ['All Users', 'Customers', 'Admins', 'Subscribers', 'VIP', 'Custom Segment'];
  formPriorityOptions: NotificationPriority[] = ['Normal', 'High', 'Critical'];
  formSoundOptions = ['Default', 'Chime', 'Bell', 'Silent'];
  formTargetScreens = ['Home', 'Product Detail', 'Order Detail', 'Cart', 'Wishlist', 'Promotions', 'Profile'];

  // ── Computed: filtering / sorting / pagination ────────────────────────
  filteredNotifications = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const audience = this.audienceFilter();

    return this.notifications().filter(n => {
      if (q) {
        const haystack = `${n.title} ${n.body} ${n.campaignName} ${n.createdBy.name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (status !== 'all' && n.status !== status) return false;
      if (audience !== 'all' && n.audience !== audience) return false;
      return true;
    });
  });

  sortedNotifications = computed(() => {
    const key = this.sortKey();
    const list = [...this.filteredNotifications()];

    list.sort((a, b) => {
      switch (key) {
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'scheduled': {
          const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
          const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
          return bt - at;
        }
        case 'title': return a.title.localeCompare(b.title);
        default: return 0;
      }
    });

    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.sortedNotifications().length / this.pageSize)));

  pagedNotifications = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.sortedNotifications().slice(start, start + this.pageSize);
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
    const total = this.sortedNotifications().length;
    if (total === 0) return '0 results';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `${start}–${end} of ${total}`;
  });

  // ── Stats ──────────────────────────────────────────────────────────────
  totalNotifications = computed(() => this.notifications().length);
  sentCount = computed(() => this.notifications().filter(n => n.status === 'Sent').length);
  scheduledCount = computed(() => this.notifications().filter(n => n.status === 'Scheduled').length);
  draftCount = computed(() => this.notifications().filter(n => n.status === 'Draft').length);

  // ── Bulk selection computed ────────────────────────────────────────────
  selectedCount = computed(() => this.selectedIds().size);
  allOnPageSelected = computed(() => {
    const page = this.pagedNotifications();
    if (page.length === 0) return false;
    const ids = this.selectedIds();
    return page.every(n => ids.has(n.id));
  });

  // ── Live preview computed (Create modal) ──────────────────────────────
  previewTitle = computed(() => this.form().title.trim() || 'Notification title');
  previewBody = computed(() => this.form().body.trim() || 'Your message body will appear here as you type.');

  isFormValid = computed(() => {
    const f = this.form();
    const scheduleOk = f.scheduleMode === 'now' || (!!f.scheduledDate && !!f.scheduledTime);
    return !!f.title.trim() && !!f.body.trim() && !!f.campaignName.trim() && scheduleOk;
  });

  ngOnInit(): void {
    setTimeout(() => this.isLoading.set(false), 700);
  }

  // ── Filter handlers ────────────────────────────────────────────────────
  onSearch(value: string): void { this.searchQuery.set(value); this.currentPage.set(1); }
  setStatusFilter(s: StatusFilter): void { this.statusFilter.set(s); this.currentPage.set(1); }
  setAudienceFilter(a: AudienceFilter): void { this.audienceFilter.set(a); this.currentPage.set(1); }
  setSort(key: SortKey): void { this.sortKey.set(key); }

  hasActiveFilters(): boolean {
    return !!this.searchQuery() || this.statusFilter() !== 'all' || this.audienceFilter() !== 'all';
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.audienceFilter.set('all');
    this.currentPage.set(1);
  }

  refresh(): void {
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 600);
    this.showToast('Notifications refreshed');
  }

  exportCsv(): void { this.showToast('Exporting notifications to CSV…'); }

  // ── Pagination ─────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  // ── Row menu ───────────────────────────────────────────────────────────
  toggleMenu(n: PushNotification, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update(id => id === n.id ? null : n.id);
  }
  closeMenu(): void { this.openMenuId.set(null); }

  @HostListener('document:click')
  onDocClick(): void { this.closeMenu(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
    this.viewingNotification.set(null);
    this.creating.set(false);
    this.pendingDelete.set(null);
    this.pendingBulkDelete.set(false);
  }

  // ── Bulk selection ─────────────────────────────────────────────────────
  toggleSelect(n: PushNotification, event: Event): void {
    event.stopPropagation();
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (next.has(n.id)) next.delete(n.id); else next.add(n.id);
      return next;
    });
  }

  isSelected(n: PushNotification): boolean { return this.selectedIds().has(n.id); }

  toggleSelectAllOnPage(): void {
    const page = this.pagedNotifications();
    const allSelected = this.allOnPageSelected();
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (allSelected) page.forEach(n => next.delete(n.id));
      else page.forEach(n => next.add(n.id));
      return next;
    });
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  bulkMarkDraft(): void {
    const ids = this.selectedIds();
    this.notifications.update(list => list.map(n => ids.has(n.id) ? { ...n, status: 'Draft' as PushNotificationStatus, scheduledAt: undefined } : n));
    this.showToast(`${ids.size} notification${ids.size === 1 ? '' : 's'} marked as draft`);
    this.clearSelection();
  }

  bulkCancelSchedule(): void {
    const ids = this.selectedIds();
    this.notifications.update(list => list.map(n => ids.has(n.id) && n.status === 'Scheduled' ? { ...n, status: 'Cancelled' as PushNotificationStatus } : n));
    this.showToast(`${ids.size} scheduled notification${ids.size === 1 ? '' : 's'} cancelled`);
    this.clearSelection();
  }

  bulkDuplicate(): void {
    const ids = this.selectedIds();
    const toDuplicate = this.notifications().filter(n => ids.has(n.id));
    const copies = toDuplicate.map(n => this.buildDuplicate(n));
    this.notifications.update(list => [...copies, ...list]);
    this.showToast(`${copies.length} notification${copies.length === 1 ? '' : 's'} duplicated`);
    this.clearSelection();
  }

  requestBulkDelete(): void { this.pendingBulkDelete.set(true); }
  cancelBulkDelete(): void { this.pendingBulkDelete.set(false); }
  confirmBulkDelete(): void {
    const ids = this.selectedIds();
    this.notifications.update(list => list.filter(n => !ids.has(n.id)));
    this.showToast(`${ids.size} notification${ids.size === 1 ? '' : 's'} deleted`);
    this.clearSelection();
    this.pendingBulkDelete.set(false);
  }

  // ── View modal ─────────────────────────────────────────────────────────
  showDetails(n: PushNotification, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.viewingNotification.set(n);
  }
  closeView(): void { this.viewingNotification.set(null); }

  duplicateFromView(n: PushNotification): void {
    this.viewingNotification.set(null);
    this.duplicate(n);
  }

  deleteFromView(n: PushNotification): void {
    this.viewingNotification.set(null);
    this.requestDelete(n);
  }

  // ── Create modal ───────────────────────────────────────────────────────
  openCreate(): void {
    this.form.set(emptyForm());
    this.formTouched.set(false);
    this.creating.set(true);
  }
  closeCreate(): void { this.creating.set(false); }

  updateForm<K extends keyof CreateFormState>(key: K, value: CreateFormState[K]): void {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  private buildNotificationFromForm(status: PushNotificationStatus): PushNotification {
    const f = this.form();
    const now = new Date();

    let scheduledAt: string | undefined;
    if (f.scheduleMode === 'later' && f.scheduledDate && f.scheduledTime) {
      scheduledAt = new Date(`${f.scheduledDate}T${f.scheduledTime}`).toISOString();
    }

    const estimatedRecipients = this.estimatedRecipientsFor(f.audience);

    return {
      id: 'push-' + Date.now(),
      title: f.title.trim(),
      body: f.body.trim(),
      campaignName: f.campaignName.trim(),
      imageUrl: f.imageUrl.trim() || undefined,
      deepLink: f.deepLink.trim() || undefined,
      targetScreen: f.targetScreen,

      audience: f.audience,
      customSegmentDescription: f.audience === 'Custom Segment' ? (f.customSegmentDescription.trim() || 'Custom segment') : undefined,

      priority: f.priority,
      ttlHours: f.ttlHours,
      silent: f.silent,
      badgeCount: f.badgeCount ?? undefined,
      sound: f.sound,

      status,
      scheduledAt,
      createdAt: now.toISOString(),
      createdBy: CURRENT_ADMIN,

      delivery: {
        totalRecipients: estimatedRecipients,
        delivered: 0, opened: 0, ctr: 0, failed: 0,
        pending: status === 'Draft' ? 0 : estimatedRecipients,
      },
      timeline: { created: now.toISOString(), scheduled: scheduledAt },
    };
  }

  estimatedRecipientsFor(audience: NotificationAudience): number {
    const map: Record<NotificationAudience, number> = {
      'All Users': 8420,
      'Customers': 5210,
      'Admins': 15,
      'Subscribers': 3120,
      'VIP': 640,
      'Custom Segment': 1180,
    };
    return map[audience];
  }

  saveDraft(): void {
    this.formTouched.set(true);
    if (!this.form().title.trim()) return;
    const draft = this.buildNotificationFromForm('Draft');
    this.notifications.update(list => [draft, ...list]);
    this.showToast('Notification saved as draft');
    this.creating.set(false);
  }

  submitCreate(): void {
    this.formTouched.set(true);
    if (!this.isFormValid()) return;

    this.formSaving.set(true);
    const status: PushNotificationStatus = this.form().scheduleMode === 'later' ? 'Scheduled' : 'Sending';

    setTimeout(() => {
      const created = this.buildNotificationFromForm(status);
      this.notifications.update(list => [created, ...list]);
      this.formSaving.set(false);
      this.creating.set(false);
      this.showToast(status === 'Scheduled' ? 'Notification scheduled successfully' : 'Notification is being sent');

      // Simulate a scheduled/sending notification finishing shortly after, for a livelier demo.
      if (status === 'Sending') {
        setTimeout(() => {
          this.notifications.update(list => list.map(n => n.id === created.id
            ? { ...n, status: 'Sent' as PushNotificationStatus, delivery: this.simulateSentDelivery(n.delivery.totalRecipients) }
            : n));
        }, 4000);
      }
    }, 800);
  }

  private simulateSentDelivery(totalRecipients: number) {
    const failed = Math.round(totalRecipients * 0.02);
    const delivered = totalRecipients - failed;
    const opened = Math.round(delivered * 0.4);
    const ctr = +((opened / delivered) * 0.45 * 100).toFixed(1);
    return { totalRecipients, delivered, opened, ctr, failed, pending: 0 };
  }

  // ── Row actions ────────────────────────────────────────────────────────
  private buildDuplicate(n: PushNotification): PushNotification {
    const now = new Date();
    return {
      ...n,
      id: 'push-' + Date.now() + '-' + Math.round(Math.random() * 1000),
      title: n.title + ' (Copy)',
      status: 'Draft',
      scheduledAt: undefined,
      createdAt: now.toISOString(),
      createdBy: CURRENT_ADMIN,
      delivery: { totalRecipients: n.delivery.totalRecipients, delivered: 0, opened: 0, ctr: 0, failed: 0, pending: 0 },
      timeline: { created: now.toISOString() },
    };
  }

  duplicate(n: PushNotification, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    const copy = this.buildDuplicate(n);
    this.notifications.update(list => [copy, ...list]);
    this.showToast(`"${n.title}" duplicated as a draft`);
  }

  cancelSchedule(n: PushNotification, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, status: 'Cancelled' as PushNotificationStatus } : x));
    this.showToast(`"${n.title}" schedule cancelled`);
  }

  requestDelete(n: PushNotification, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.pendingDelete.set(n);
  }
  cancelDelete(): void { this.pendingDelete.set(null); }
  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target) return;
    this.notifications.update(list => list.filter(n => n.id !== target.id));
    this.showToast(`"${target.title}" deleted`);
    this.pendingDelete.set(null);
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  trackById(_: number, item: PushNotification): string { return item.id; }

  statusBadgeClass(status: PushNotificationStatus): string {
    const map: Record<PushNotificationStatus, string> = {
      Draft: 'status-badge--draft',
      Scheduled: 'status-badge--scheduled',
      Sending: 'status-badge--sending',
      Sent: 'status-badge--sent',
      Failed: 'status-badge--failed',
      Cancelled: 'status-badge--cancelled',
    };
    return map[status];
  }

  audienceBadgeClass(audience: NotificationAudience): string {
    const map: Record<NotificationAudience, string> = {
      'All Users': 'audience-badge--all',
      'Customers': 'audience-badge--customers',
      'Admins': 'audience-badge--admins',
      'Subscribers': 'audience-badge--subscribers',
      'VIP': 'audience-badge--vip',
      'Custom Segment': 'audience-badge--custom',
    };
    return map[audience];
  }

  deliveryPercent(n: PushNotification): number {
    const total = n.delivery.totalRecipients;
    if (!total) return 0;
    return +(((n.delivery.delivered) / total) * 100).toFixed(1);
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatRelative(iso: string): string {
    const now = new Date();
    const d = new Date(iso);
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);

    if (diffMin >= 0 && diffMin < 1) return 'Just now';
    if (diffMin >= 0 && diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;

    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return `Today ${this.formatTime(iso)}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return this.formatDate(iso);
  }

  private showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMsg.set(msg);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 2800);
  }
}