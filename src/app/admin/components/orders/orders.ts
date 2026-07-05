// orders.ts
import { Component, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// ─── Types ──────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending' | 'confirmed' | 'processing' | 'packed'
  | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type ShippingStatus = 'preparing' | 'ready' | 'in-transit' | 'delivered' | 'returned';
export type PaymentMethod = 'Credit Card' | 'PayPal' | 'Cash on Delivery' | 'Bank Transfer' | 'Wallet';
export type ShippingMethod = 'Standard' | 'Express' | 'Overnight' | 'Pickup';

export type SearchByField = 'orderNumber' | 'customerName' | 'email' | 'phone' | 'productName' | 'sku';
export type SortByField = 'newest' | 'oldest' | 'highest' | 'lowest' | 'customer';
export type DateRangeFilter = 'all' | 'today' | '7d' | '30d' | 'custom';
export type ViewMode = 'table' | 'grid';

export interface OrderLineItem {
  id: string;
  name: string;
  sku: string;
  image: string;
  price: number;
  quantity: number;
  discount: number;
  inventoryStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
}

export interface OrderAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface OrderCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  customerSince: string;
  totalOrders: number;
  lifetimeSpend: number;
  vip: boolean;
}

export interface OrderPayment {
  method: PaymentMethod;
  transactionId: string;
  date: string;
  status: PaymentStatus;
  amountPaid: number;
  refundAmount: number;
  invoiceNumber: string;
}

export interface OrderShipping {
  method: ShippingMethod;
  company: string;
  trackingNumber: string;
  estimatedDelivery: string;
  cost: number;
  status: ShippingStatus;
}

export type TimelineKind =
  | 'placed' | 'payment' | 'confirmed' | 'packed'
  | 'shipped' | 'out-for-delivery' | 'delivered' | 'cancelled' | 'refunded';

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  label: string;
  date: string;
  employee: string;
  notes: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: OrderCustomer;
  items: OrderLineItem[];
  orderDate: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingMethod: ShippingMethod;
  shippingStatus: ShippingStatus;
  assignedEmployee: string;
  lastUpdated: string;

  subtotal: number;
  discount: number;
  couponCode: string | null;
  shippingCost: number;
  tax: number;
  total: number;

  shippingAddress: OrderAddress;
  billingAddress: OrderAddress;
  payment: OrderPayment;
  shipping: OrderShipping;
  timeline: TimelineEvent[];
  notes: string;
}

@Component({
  selector: 'app-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders {
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
  pageSize = 8;

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

  // ── Option lists (for template dropdowns) ─────────────────────────────
  searchByOptions: { key: SearchByField; label: string }[] = [
    { key: 'orderNumber', label: 'Order Number' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'productName', label: 'Product Name' },
    { key: 'sku', label: 'SKU' },
  ];

  statusOptions: { key: 'all' | OrderStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'processing', label: 'Processing' },
    { key: 'packed', label: 'Packed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'refunded', label: 'Refunded' },
  ];

  statusDropdownOptions: OrderStatus[] = [
    'pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded',
  ];

  paymentStatusOptions: { key: 'all' | PaymentStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'pending', label: 'Pending' },
    { key: 'failed', label: 'Failed' },
    { key: 'refunded', label: 'Refunded' },
  ];

  paymentMethodOptions: { key: 'all' | PaymentMethod; label: string }[] = [
    { key: 'all', label: 'All Methods' },
    { key: 'Credit Card', label: 'Credit Card' },
    { key: 'PayPal', label: 'PayPal' },
    { key: 'Cash on Delivery', label: 'Cash on Delivery' },
    { key: 'Bank Transfer', label: 'Bank Transfer' },
    { key: 'Wallet', label: 'Wallet' },
  ];

  dateRangeOptions: { key: DateRangeFilter; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: 'custom', label: 'Custom Range' },
  ];

  sortOptions: { key: SortByField; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'highest', label: 'Highest Total' },
    { key: 'lowest', label: 'Lowest Total' },
    { key: 'customer', label: 'Customer' },
  ];

  // ── Mock data source pools ────────────────────────────────────────────
  // NOTE: these MUST be declared before `orders` below — class field
  // initializers run top-to-bottom at construction time, and
  // generateMockOrders() (called by `orders`'s initializer) reads all of
  // these. If `orders` were declared first, every pool referenced inside
  // generateMockOrders() would still be `undefined` at that point.
  private customerPool = [
    { name: 'Ayoub Hennani', email: 'ayoub@nexus.com', phone: '+212 6 12 34 56 78' },
    { name: 'Sara Idrissi', email: 'sara@mail.com', phone: '+212 6 22 11 44 09' },
    { name: 'Karim Mansouri', email: 'karim@mail.com', phone: '+212 6 61 78 90 12' },
    { name: 'Leila Boudali', email: 'leila@mail.com', phone: '+212 6 55 32 87 40' },
    { name: 'Youssef Alami', email: 'youssef@mail.com', phone: '+212 6 44 90 21 33' },
    { name: 'Nadia Cherkaoui', email: 'nadia@mail.com', phone: '+212 6 09 87 65 43' },
    { name: 'Omar Fassi', email: 'omar@mail.com', phone: '+212 6 71 20 55 19' },
    { name: 'Ines Bennis', email: 'ines@mail.com', phone: '+212 6 33 48 91 27' },
  ];

  private productPool: { name: string; sku: string; image: string; price: number }[] = [
    { name: 'WH-XM6 Wireless ANC', sku: 'SONY-WH-XM6', image: '/products/headphones.png', price: 249 },
    { name: 'AirPods Pro 2nd Gen', sku: 'APL-APP-2G', image: '/products/airpods pro w1.png', price: 199 },
    { name: 'Galaxy S24 Ultra', sku: 'SAM-S24U', image: '/products/samsung galxy s24 ultra silver.png', price: 1099 },
    { name: 'MacBook Pro M3', sku: 'APL-MBP-M3', image: '/products/macbook pro 13.png', price: 1999 },
    { name: 'Ultra Watch Series 3', sku: 'APL-UW-S3', image: '/products/appel watch.png', price: 189 },
  ];

  private employeePool = ['Ayoub H.', 'Sara I.', 'Karim M.', 'Unassigned'];
  private shippingCompanies = ['DHL Express', 'FedEx', 'Aramex', 'Local Courier'];
  private cities = ['Casablanca', 'Rabat', 'Marrakesh', 'Tangier', 'Fes'];

  private statusCycle: OrderStatus[] = [
    'pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded',
  ];

  // ── Mock data (generated once, mutable via signal) ───────────────────────
  private orders = signal<Order[]>(this.generateMockOrders());

  private orderNumberFor(i: number): string {
    return '#ORD-' + (10450 + i * 3);
  }

  private buildTimeline(status: OrderStatus, orderDate: Date, employee: string): TimelineEvent[] {
    const steps: { kind: TimelineKind; label: string }[] = [
      { kind: 'placed', label: 'Order Placed' },
      { kind: 'payment', label: 'Payment Received' },
      { kind: 'confirmed', label: 'Order Confirmed' },
      { kind: 'packed', label: 'Order Packed' },
      { kind: 'shipped', label: 'Order Shipped' },
      { kind: 'out-for-delivery', label: 'Out for Delivery' },
      { kind: 'delivered', label: 'Order Delivered' },
    ];

    const statusIndexMap: Record<OrderStatus, number> = {
      pending: 0, confirmed: 2, processing: 2, packed: 3,
      shipped: 4, delivered: 6, cancelled: 1, refunded: 6,
    };

    const cutoff = statusIndexMap[status];
    const events: TimelineEvent[] = [];
    let cursor = new Date(orderDate);

    for (let i = 0; i <= cutoff && i < steps.length; i++) {
      cursor = new Date(cursor.getTime() + (i === 0 ? 0 : (3 + i) * 3600000));
      events.push({
        id: 'tl-' + i,
        kind: steps[i].kind,
        label: steps[i].label,
        date: cursor.toISOString(),
        employee: i === 0 ? 'System' : employee,
        notes: this.timelineNoteFor(steps[i].kind),
      });
    }

    if (status === 'cancelled') {
      cursor = new Date(cursor.getTime() + 5 * 3600000);
      events.push({
        id: 'tl-cancel', kind: 'cancelled', label: 'Order Cancelled',
        date: cursor.toISOString(), employee,
        notes: 'Cancelled at customer request',
      });
    }
    if (status === 'refunded') {
      cursor = new Date(cursor.getTime() + 8 * 3600000);
      events.push({
        id: 'tl-refund', kind: 'refunded', label: 'Order Refunded',
        date: cursor.toISOString(), employee,
        notes: 'Refund processed to original payment method',
      });
    }

    return events.reverse();
  }

  private timelineNoteFor(kind: TimelineKind): string {
    const map: Record<TimelineKind, string> = {
      placed: 'Customer placed the order online',
      payment: 'Payment captured successfully',
      confirmed: 'Order confirmed and queued for fulfillment',
      packed: 'Items picked and packed at warehouse',
      shipped: 'Handed off to shipping carrier',
      'out-for-delivery': 'Package is out for delivery',
      delivered: 'Package delivered to customer',
      cancelled: 'Cancelled at customer request',
      refunded: 'Refund processed to original payment method',
    };
    return map[kind];
  }

  private generateMockOrders(): Order[] {
    const methods: PaymentMethod[] = ['Credit Card', 'PayPal', 'Cash on Delivery', 'Bank Transfer', 'Wallet'];
    const shipMethods: ShippingMethod[] = ['Standard', 'Express', 'Overnight', 'Pickup'];
    const paymentStatuses: PaymentStatus[] = ['paid', 'pending', 'failed', 'refunded'];
    const shippingStatuses: ShippingStatus[] = ['preparing', 'ready', 'in-transit', 'delivered', 'returned'];

    const orders: Order[] = [];
    const now = Date.now();

    for (let i = 0; i < 32; i++) {
      const customer = this.customerPool[i % this.customerPool.length];
      const status = this.statusCycle[i % this.statusCycle.length];
      const paymentMethod = methods[i % methods.length];
      const shippingMethod = shipMethods[i % shipMethods.length];
      const employee = this.employeePool[i % this.employeePool.length];
      const daysAgo = i % 34;
      const orderDate = new Date(now - daysAgo * 86400000 - (i * 1800000));

      const itemCount = 1 + (i % 3);
      const items: OrderLineItem[] = [];
      for (let j = 0; j < itemCount; j++) {
        const p = this.productPool[(i + j) % this.productPool.length];
        const qty = 1 + ((i + j) % 3);
        const discount = (i + j) % 4 === 0 ? Math.round(p.price * 0.1) : 0;
        items.push({
          id: `it-${i}-${j}`,
          name: p.name,
          sku: p.sku,
          image: p.image,
          price: p.price,
          quantity: qty,
          discount,
          inventoryStatus: (i + j) % 7 === 0 ? 'out-of-stock' : (i + j) % 5 === 0 ? 'low-stock' : 'in-stock',
        });
      }

      const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
      const discount = items.reduce((s, it) => s + it.discount, 0) + (i % 6 === 0 ? 20 : 0);
      const shippingCost = shippingMethod === 'Pickup' ? 0 : shippingMethod === 'Overnight' ? 45 : shippingMethod === 'Express' ? 25 : 12;
      const tax = Math.round((subtotal - discount) * 0.08);
      const total = Math.max(0, subtotal - discount + shippingCost + tax);

      const city = this.cities[i % this.cities.length];
      const address: OrderAddress = {
        name: customer.name,
        phone: customer.phone,
        street: `${12 + i} Rue Al Amal`,
        city,
        state: city,
        zip: `${20000 + i * 3}`,
        country: 'Morocco',
      };

      const paymentStatus: PaymentStatus = status === 'refunded' ? 'refunded'
        : status === 'cancelled' ? 'failed'
        : paymentStatuses[i % paymentStatuses.length] === 'refunded' ? 'paid'
        : paymentStatuses[i % paymentStatuses.length];

      const shippingStatus: ShippingStatus = status === 'delivered' ? 'delivered'
        : status === 'shipped' ? 'in-transit'
        : status === 'packed' ? 'ready'
        : status === 'refunded' ? 'returned'
        : shippingStatuses[i % shippingStatuses.length];

      orders.push({
        id: 'ord-' + i,
        orderNumber: this.orderNumberFor(i),
        customer: {
          id: 'cust-' + (i % this.customerPool.length),
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          avatar: customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
          customerSince: new Date(now - (400 + i * 17) * 86400000).toISOString().slice(0, 10),
          totalOrders: 2 + (i % 12),
          lifetimeSpend: 400 + (i * 173) % 5200,
          vip: (i % 5 === 0),
        },
        items,
        orderDate: orderDate.toISOString(),
        status,
        paymentMethod,
        paymentStatus,
        shippingMethod,
        shippingStatus,
        assignedEmployee: employee,
        lastUpdated: new Date(orderDate.getTime() + (2 + i % 5) * 3600000).toISOString(),

        subtotal,
        discount,
        couponCode: i % 6 === 0 ? 'SAVE20' : null,
        shippingCost,
        tax,
        total,

        shippingAddress: address,
        billingAddress: address,
        payment: {
          method: paymentMethod,
          transactionId: 'TXN-' + (900000 + i * 47),
          date: orderDate.toISOString(),
          status: paymentStatus,
          amountPaid: paymentStatus === 'paid' || paymentStatus === 'refunded' ? total : 0,
          refundAmount: paymentStatus === 'refunded' ? total : 0,
          invoiceNumber: 'INV-' + (2200 + i),
        },
        shipping: {
          method: shippingMethod,
          company: this.shippingCompanies[i % this.shippingCompanies.length],
          trackingNumber: shippingMethod === 'Pickup' ? '—' : 'TRK' + (5000000 + i * 91),
          estimatedDelivery: new Date(orderDate.getTime() + 5 * 86400000).toISOString().slice(0, 10),
          cost: shippingCost,
          status: shippingStatus,
        },
        timeline: this.buildTimeline(status, orderDate, employee),
        notes: i % 4 === 0 ? 'Customer requested gift wrapping.' : '',
      });
    }

    return orders;
  }

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
    if (total === 0) return '0 results';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `${start}–${end} of ${total}`;
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
    this.showToast(`Editing ${order.orderNumber} — open the order editor`);
  }

  editOrder(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.showToast(`Editing ${order.orderNumber}`);
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
      const newEvent: TimelineEvent = {
        id: 'tl-' + Date.now(),
        kind: newStatus === 'cancelled' ? 'cancelled' : newStatus === 'refunded' ? 'refunded'
          : newStatus === 'shipped' ? 'shipped' : newStatus === 'delivered' ? 'delivered'
          : newStatus === 'packed' ? 'packed' : newStatus === 'confirmed' ? 'confirmed' : 'placed',
        label: `Status updated to ${this.statusLabel(newStatus)}`,
        date: now,
        employee: 'You',
        notes: this.updateNotes() || `Status manually updated to ${this.statusLabel(newStatus)}`,
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

      this.showToast(`${target.orderNumber} updated to "${this.statusLabel(newStatus)}"`);
      this.closeUpdateStatus();
    }, 700);
  }

  // ── Row / bulk actions ─────────────────────────────────────────────────
  assignStaff(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    const idx = this.employeePool.indexOf(order.assignedEmployee);
    const next = this.employeePool[(idx + 1) % this.employeePool.length];
    this.orders.update(list => list.map(o => o.id === order.id ? { ...o, assignedEmployee: next } : o));
    this.showToast(`${order.orderNumber} assigned to ${next}`);
  }

  printInvoice(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.showToast(`Printing invoice ${order.payment.invoiceNumber}`);
  }

  downloadInvoice(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.showToast(`Downloading invoice ${order.payment.invoiceNumber}.pdf`);
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
    this.showToast(`${order.orderNumber} refunded`);
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
    this.showToast(`${target.orderNumber} cancelled`);
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
    this.showToast(`${target.orderNumber} deleted`);
  }

  exportOrders(): void { this.showToast('Exporting orders to CSV…'); }
  printAll(): void { this.showToast('Preparing print view…'); }
  createOrder(): void { this.showToast('Opening new order form…'); }

  // ── Helpers ────────────────────────────────────────────────────────────
  statusLabel(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing', packed: 'Packed',
      shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded',
    };
    return map[status];
  }

  paymentStatusLabel(status: PaymentStatus): string {
    const map: Record<PaymentStatus, string> = {
      paid: 'Paid', pending: 'Pending', failed: 'Failed', refunded: 'Refunded',
    };
    return map[status];
  }

  shippingStatusLabel(status: ShippingStatus): string {
    const map: Record<ShippingStatus, string> = {
      preparing: 'Preparing', ready: 'Ready', 'in-transit': 'In Transit',
      delivered: 'Delivered', returned: 'Returned',
    };
    return map[status];
  }

  itemSubtotal(item: OrderLineItem): number {
    return item.price * item.quantity - item.discount;
  }

  availableItemCount(order: Order): number {
    return order.items.reduce((s, i) => s + i.quantity, 0);
  }

  formatCurrency(v: number): string { return '$' + v.toLocaleString(); }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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