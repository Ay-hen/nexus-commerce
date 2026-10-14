// orders.ts
import { Component, signal, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../localization/translate.pipe';
import { LanguageService } from '../../../localization/language.service';
import { OrderService } from '../../services/order.service';
import {
  Order, OrderLineItem, OrderStatus, PaymentMethod, PaymentStatus,
  ShippingStatus, TimelineEvent, TimelineKind,
} from '../../model/order.model';

// ─── Types ──────────────────────────────────────────────────────────────────
// Domain types (Order, OrderStatus, …) now live in the shared order model so
// the list, create-order, update-order and OrderService all use one definition.
export type SearchByField = 'orderNumber' | 'customerName' | 'email' | 'phone' | 'productName' | 'sku';
export type SortByField = 'newest' | 'oldest' | 'highest' | 'lowest' | 'customer';
export type DateRangeFilter = 'all' | 'today' | '7d' | '30d' | 'custom';
export type ViewMode = 'table' | 'grid';

// Maps PaymentMethod (data value) -> translation key segment, for display only.
const PAYMENT_METHOD_KEY_MAP: Record<PaymentMethod, string> = {
  'Credit Card': 'creditCard',
  'PayPal': 'paypal',
  'Cash on Delivery': 'cashOnDelivery',
  'Bank Transfer': 'bankTransfer',
  'Wallet': 'wallet',
};

const TIMELINE_KEY_MAP: Record<TimelineKind, string> = {
  placed: 'placed', payment: 'payment', confirmed: 'confirmed', packed: 'packed',
  shipped: 'shipped', 'out-for-delivery': 'outForDelivery', delivered: 'delivered',
  cancelled: 'cancelled', refunded: 'refunded', updated: 'updated',
};

@Component({
  selector: 'app-orders',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders {
  protected lang = inject(LanguageService);

  private orderService = inject(OrderService);

  constructor(private router: Router) {}

  // ── Loading ────────────────────────────────────────────────────────────
  isLoading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6];

  // ── View mode ──────────────────────────────────────────────────────────
  viewMode = signal<ViewMode>('table');

  // ── Filters ────────────────────────────────────────────────────────────
  searchQuery = signal('');
  searchBy = signal<SearchByField>('orderNumber');
  statusFilter = signal<'all' | OrderStatus>('all');
  paymentStatusFilter = signal<'all' | PaymentStatus>('all');
  paymentMethodFilter = signal<'all' | PaymentMethod>('all');
  dateRangeFilter = signal<DateRangeFilter>('all');
  sortBy = signal<SortByField>('newest');

  // ── Pagination ─────────────────────────────────────────────────────────
  currentPage = signal(1);
  pageSize = 9;

  // ── Row menu ───────────────────────────────────────────────────────────
  openMenuId = signal<string | null>(null);

  // ── Modals ─────────────────────────────────────────────────────────────
  viewingOrder = signal<Order | null>(null);
  updatingOrder = signal<Order | null>(null);
  pendingDelete = signal<Order | null>(null);
  pendingCancel = signal<Order | null>(null);

  // ── Update-status form fields ─────────────────────────────────────────
  updateStatusValue = signal<OrderStatus>('pending');
  updateTracking = signal('');
  updateShippingCompany = signal('');
  updateEstDelivery = signal('');
  updateNotes = signal('');
  updateSaving = signal(false);

  // ── Toast ──────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Option lists — labels are translation keys resolved via `| translate` ──
  searchByOptions: { key: SearchByField; label: string }[] = [
    { key: 'orderNumber', label: 'orders.searchBy.orderNumber' },
    { key: 'customerName', label: 'orders.searchBy.customerName' },
    { key: 'email', label: 'orders.searchBy.email' },
    { key: 'phone', label: 'orders.searchBy.phone' },
    { key: 'productName', label: 'orders.searchBy.productName' },
    { key: 'sku', label: 'orders.searchBy.sku' },
  ];

  statusOptions: { key: 'all' | OrderStatus; label: string }[] = [
    { key: 'all', label: 'common.allStatuses' },
    { key: 'pending', label: 'orders.status.pending' },
    { key: 'confirmed', label: 'orders.status.confirmed' },
    { key: 'processing', label: 'orders.status.processing' },
    { key: 'packed', label: 'orders.status.packed' },
    { key: 'shipped', label: 'orders.status.shipped' },
    { key: 'delivered', label: 'orders.status.delivered' },
    { key: 'cancelled', label: 'orders.status.cancelled' },
    { key: 'refunded', label: 'orders.status.refunded' },
  ];

  statusDropdownOptions: OrderStatus[] = [
    'pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded',
  ];

  paymentStatusOptions: { key: 'all' | PaymentStatus; label: string }[] = [
    { key: 'all', label: 'orders.allPayments' },
    { key: 'paid', label: 'orders.payment.paid' },
    { key: 'pending', label: 'orders.payment.pending' },
    { key: 'failed', label: 'orders.payment.failed' },
    { key: 'refunded', label: 'orders.payment.refunded' },
  ];

  paymentMethodOptions: { key: 'all' | PaymentMethod; label: string }[] = [
    { key: 'all', label: 'orders.allMethods' },
    { key: 'Credit Card', label: 'orders.paymentMethods.creditCard' },
    { key: 'PayPal', label: 'orders.paymentMethods.paypal' },
    { key: 'Cash on Delivery', label: 'orders.paymentMethods.cashOnDelivery' },
    { key: 'Bank Transfer', label: 'orders.paymentMethods.bankTransfer' },
    { key: 'Wallet', label: 'orders.paymentMethods.wallet' },
  ];

  dateRangeOptions: { key: DateRangeFilter; label: string }[] = [
    { key: 'all', label: 'common.allTime' },
    { key: 'today', label: 'common.today' },
    { key: '7d', label: 'common.last7Days' },
    { key: '30d', label: 'common.last30Days' },
    { key: 'custom', label: 'common.customRange' },
  ];

  sortOptions: { key: SortByField; label: string }[] = [
    { key: 'newest', label: 'orders.sort.newest' },
    { key: 'oldest', label: 'orders.sort.oldest' },
    { key: 'highest', label: 'orders.sort.highest' },
    { key: 'lowest', label: 'orders.sort.lowest' },
    { key: 'customer', label: 'orders.sort.customer' },
  ];

  // ── Orders store (shared with create-order / update-order via OrderService) ──
  private orders = this.orderService.orders;

  // ── Filtering ──────────────────────────────────────────────────────────
  private matchesDateRange(order: Order, range: DateRangeFilter): boolean {
    if (range === 'all' || range === 'custom') return true;
    const orderTime = new Date(order.orderDate).getTime();
    const now = Date.now();
    const days = range === 'today' ? 1 : range === '7d' ? 7 : 30;
    return now - orderTime <= days * 86400000;
  }

  private matchesSearch(order: Order, q: string, field: SearchByField): boolean {
    if (!q) return true;
    const needle = q.toLowerCase();
    switch (field) {
      case 'orderNumber': return order.orderNumber.toLowerCase().includes(needle);
      case 'customerName': return order.customer.name.toLowerCase().includes(needle);
      case 'email': return order.customer.email.toLowerCase().includes(needle);
      case 'phone': return order.customer.phone.toLowerCase().includes(needle);
      case 'productName': return order.items.some(it => it.name.toLowerCase().includes(needle));
      case 'sku': return order.items.some(it => it.sku.toLowerCase().includes(needle));
      default: return true;
    }
  }

  filteredOrders = computed(() => {
    const q = this.searchQuery().trim();
    const field = this.searchBy();
    const status = this.statusFilter();
    const paymentStatus = this.paymentStatusFilter();
    const paymentMethod = this.paymentMethodFilter();
    const range = this.dateRangeFilter();

    return this.orders().filter(o => {
      if (status !== 'all' && o.status !== status) return false;
      if (paymentStatus !== 'all' && o.paymentStatus !== paymentStatus) return false;
      if (paymentMethod !== 'all' && o.paymentMethod !== paymentMethod) return false;
      if (!this.matchesDateRange(o, range)) return false;
      if (!this.matchesSearch(o, q, field)) return false;
      return true;
    });
  });

  sortedOrders = computed(() => {
    const sort = this.sortBy();
    const list = [...this.filteredOrders()];
    list.sort((a, b) => {
      switch (sort) {
        case 'newest': return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
        case 'oldest': return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
        case 'highest': return b.total - a.total;
        case 'lowest': return a.total - b.total;
        case 'customer': return a.customer.name.localeCompare(b.customer.name);
        default: return 0;
      }
    });
    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.sortedOrders().length / this.pageSize)));

  pagedOrders = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.sortedOrders().slice(start, start + this.pageSize);
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
    const total = this.sortedOrders().length;
    if (total === 0) return this.lang.translate('products.pageRangeEmpty');
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return this.lang.translate('products.pageRange', { start, end, total });
  });

  // ── Stats ──────────────────────────────────────────────────────────────
  stats = computed(() => {
    const all = this.orders();
    const totalOrders = all.length;
    const count = (s: OrderStatus) => all.filter(o => o.status === s).length;
    const pending = count('pending');
    const processing = count('processing') + count('confirmed') + count('packed');
    const shipped = count('shipped');
    const delivered = count('delivered');
    const cancelled = count('cancelled') + count('refunded');
    const revenueOrders = all.filter(o => o.status !== 'cancelled' && o.status !== 'refunded');
    const totalRevenue = revenueOrders.reduce((s, o) => s + o.total, 0);
    const avgOrderValue = revenueOrders.length > 0 ? Math.round(totalRevenue / revenueOrders.length) : 0;

    return { totalOrders, pending, processing, shipped, delivered, cancelled, totalRevenue, avgOrderValue };
  });

  // ── Filter handlers ────────────────────────────────────────────────────
  onSearch(value: string): void { this.searchQuery.set(value); this.currentPage.set(1); }
  setSearchBy(field: SearchByField): void { this.searchBy.set(field); this.currentPage.set(1); }
  setStatusFilter(status: 'all' | OrderStatus): void { this.statusFilter.set(status); this.currentPage.set(1); }
  setPaymentStatusFilter(status: 'all' | PaymentStatus): void { this.paymentStatusFilter.set(status); this.currentPage.set(1); }
  setPaymentMethodFilter(method: 'all' | PaymentMethod): void { this.paymentMethodFilter.set(method); this.currentPage.set(1); }
  setDateRangeFilter(range: DateRangeFilter): void { this.dateRangeFilter.set(range); this.currentPage.set(1); }
  setSort(sort: SortByField): void { this.sortBy.set(sort); }
  setViewMode(mode: ViewMode): void { this.viewMode.set(mode); }

  clearFilters(): void {
    this.searchQuery.set('');
    this.searchBy.set('orderNumber');
    this.statusFilter.set('all');
    this.paymentStatusFilter.set('all');
    this.paymentMethodFilter.set('all');
    this.dateRangeFilter.set('all');
    this.currentPage.set(1);
  }

  hasActiveFilters(): boolean {
    return !!this.searchQuery() || this.statusFilter() !== 'all' || this.paymentStatusFilter() !== 'all'
      || this.paymentMethodFilter() !== 'all' || this.dateRangeFilter() !== 'all';
  }

  // ── Pagination ─────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  // ── Row menu ───────────────────────────────────────────────────────────
  toggleMenu(order: Order, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update(id => id === order.id ? null : order.id);
  }
  closeMenu(): void { this.openMenuId.set(null); }

  @HostListener('document:click')
  onDocClick(): void { this.closeMenu(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
    this.closeView();
    this.closeUpdateStatus();
    this.pendingDelete.set(null);
    this.pendingCancel.set(null);
  }

  // ── View details modal ─────────────────────────────────────────────────
  openView(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.viewingOrder.set(order);
  }
  closeView(): void { this.viewingOrder.set(null); }

  editFromView(order: Order): void {
    this.closeView();
    this.router.navigate(['/admin/order', order.id, 'edit']);
  }

  editOrder(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.router.navigate(['/admin/order', order.id, 'edit']);
  }

  // ── Update status modal ────────────────────────────────────────────────
  openUpdateStatus(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.updatingOrder.set(order);
    this.updateStatusValue.set(order.status);
    this.updateTracking.set(order.shipping.trackingNumber === '—' ? '' : order.shipping.trackingNumber);
    this.updateShippingCompany.set(order.shipping.company);
    this.updateEstDelivery.set(order.shipping.estimatedDelivery);
    this.updateNotes.set('');
  }

  closeUpdateStatus(): void {
    this.updatingOrder.set(null);
    this.updateSaving.set(false);
  }

  submitStatusUpdate(): void {
    const target = this.updatingOrder();
    if (!target) return;
    this.updateSaving.set(true);

    setTimeout(() => {
      const newStatus = this.updateStatusValue();
      const now = new Date().toISOString();
      const statusLabelText = this.statusLabel(newStatus);
      const newEvent: TimelineEvent = {
        id: 'tl-' + Date.now(),
        kind: newStatus === 'cancelled' ? 'cancelled' : newStatus === 'refunded' ? 'refunded'
          : newStatus === 'shipped' ? 'shipped' : newStatus === 'delivered' ? 'delivered'
          : newStatus === 'packed' ? 'packed' : newStatus === 'confirmed' ? 'confirmed' : 'placed',
        label: this.lang.translate('orders.timeline.statusUpdatedTo', { status: statusLabelText }),
        date: now,
        employee: 'You',
        notes: this.updateNotes() || this.lang.translate('orders.timeline.statusManuallyUpdated', { status: statusLabelText }),
      };

      this.orders.update(list => list.map(o => o.id === target.id ? {
        ...o,
        status: newStatus,
        lastUpdated: now,
        shipping: {
          ...o.shipping,
          trackingNumber: this.updateTracking() || o.shipping.trackingNumber,
          company: this.updateShippingCompany() || o.shipping.company,
          estimatedDelivery: this.updateEstDelivery() || o.shipping.estimatedDelivery,
        },
        timeline: [newEvent, ...o.timeline],
      } : o));

      this.showToast(this.lang.translate('orders.toasts.statusUpdated', { order: target.orderNumber, status: statusLabelText }));
      this.closeUpdateStatus();
    }, 700);
  }

  // ── Row / bulk actions ─────────────────────────────────────────────────
  assignStaff(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    const pool = this.orderService.employees;
    const idx = pool.indexOf(order.assignedEmployee);
    const next = pool[(idx + 1) % pool.length];
    this.orders.update(list => list.map(o => o.id === order.id ? { ...o, assignedEmployee: next } : o));
    this.showToast(this.lang.translate('orders.toasts.assigned', { order: order.orderNumber, employee: next }));
  }

  printInvoice(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.showToast(this.lang.translate('orders.toasts.printingInvoice', { invoice: order.payment.invoiceNumber }));
  }

  downloadInvoice(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.showToast(this.lang.translate('orders.toasts.downloadingInvoice', { invoice: order.payment.invoiceNumber }));
  }

  requestRefund(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.orders.update(list => list.map(o => o.id === order.id ? {
      ...o,
      status: 'refunded',
      paymentStatus: 'refunded',
      payment: { ...o.payment, status: 'refunded', refundAmount: o.total },
      lastUpdated: new Date().toISOString(),
      timeline: [{
        id: 'tl-' + Date.now(), kind: 'refunded', label: 'Order Refunded',
        date: new Date().toISOString(), employee: 'You', notes: 'Refund issued to customer',
      }, ...o.timeline],
    } : o));
    this.showToast(this.lang.translate('orders.toasts.refunded', { order: order.orderNumber }));
  }

  requestCancel(order: Order, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.pendingCancel.set(order);
  }
  cancelCancelFlow(): void { this.pendingCancel.set(null); }
  confirmCancelOrder(): void {
    const target = this.pendingCancel();
    if (!target) return;
    this.orders.update(list => list.map(o => o.id === target.id ? {
      ...o,
      status: 'cancelled',
      lastUpdated: new Date().toISOString(),
      timeline: [{
        id: 'tl-' + Date.now(), kind: 'cancelled', label: 'Order Cancelled',
        date: new Date().toISOString(), employee: 'You', notes: 'Cancelled by admin',
      }, ...o.timeline],
    } : o));
    this.showToast(this.lang.translate('orders.toasts.cancelled', { order: target.orderNumber }));
    this.pendingCancel.set(null);
  }

  requestDelete(order: Order, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.pendingDelete.set(order);
  }
  cancelDelete(): void { this.pendingDelete.set(null); }
  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target) return;
    this.orders.update(list => list.filter(o => o.id !== target.id));
    this.pendingDelete.set(null);
    this.showToast(this.lang.translate('orders.toasts.deleted', { order: target.orderNumber }));
  }

  exportOrders(): void { this.showToast(this.lang.translate('orders.toasts.exporting')); }
  printAll(): void { this.showToast(this.lang.translate('orders.toasts.preparingPrint')); }
  createOrder(): void { this.router.navigate(['/admin/orders/new']); }

  // ── Helpers ────────────────────────────────────────────────────────────
  statusLabel(status: OrderStatus): string {
    return this.lang.translate('orders.status.' + status);
  }

  paymentStatusLabel(status: PaymentStatus): string {
    return this.lang.translate('orders.payment.' + status);
  }

  shippingStatusLabel(status: ShippingStatus): string {
    const key = status === 'in-transit' ? 'inTransit' : status;
    return this.lang.translate('orders.shipping.' + key);
  }

  paymentMethodLabel(method: PaymentMethod): string {
    return this.lang.translate('orders.paymentMethods.' + PAYMENT_METHOD_KEY_MAP[method]);
  }

  timelineLabel(kind: TimelineKind): string {
    return this.lang.translate('orders.timeline.' + TIMELINE_KEY_MAP[kind]);
  }

  inventoryStatusLabel(status: 'in-stock' | 'low-stock' | 'out-of-stock'): string {
    const key = status === 'in-stock' ? 'inStock' : status === 'low-stock' ? 'lowStock' : 'outOfStock';
    return this.lang.translate('inventory.status.' + key);
  }

  itemSubtotal(item: OrderLineItem): number {
    return item.price * item.quantity - item.discount;
  }

  availableItemCount(order: Order): number {
    return order.items.reduce((s, i) => s + i.quantity, 0);
  }

  formatCurrency(v: number): string { return this.lang.formatCurrency(v); }

  formatDate(iso: string): string {
    return this.lang.formatDate(iso, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(iso: string): string {
    return this.lang.formatDate(iso, { hour: 'numeric', minute: '2-digit' });
  }

  formatDateTime(iso: string): string {
    return this.lang.formatDateTime(iso);
  }

  trackById(_: number, item: { id: string }): string { return item.id; }

  private showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMsg.set(msg);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 2800);
  }

  ngOnInit(): void {
    setTimeout(() => this.isLoading.set(false), 700);
  }
}