// customers.ts
import { Component, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// ─── Types ──────────────────────────────────────────────────────────────────
export type CustomerStatus = 'active' | 'inactive' | 'blocked' | 'pending-verification';
export type CustomerType = 'regular' | 'premium' | 'vip' | 'business';
export type SearchByField = 'name' | 'email' | 'phone' | 'customerId';
export type CustomerTypeFilter = 'all' | CustomerType;
export type RegistrationFilter = 'all' | 'today' | '7d' | '30d' | '1y' | 'custom';
export type SortByField = 'newest' | 'oldest' | 'highest-spending' | 'most-orders' | 'name';
export type ViewMode = 'table' | 'grid';

export interface RecentOrder {
  orderNumber: string;
  date: string;
  items: number;
  total: number;
  status: string;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
}

export interface SavedAddress {
  id: string;
  type: 'shipping' | 'billing';
  isDefault: boolean;
  recipient: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface CustomerPaymentMethod {
  id: string;
  kind: 'card' | 'paypal' | 'bank' | 'wallet';
  cardBrand?: string;
  maskedNumber?: string;
  expiry?: string;
  isDefault: boolean;
}

export interface WishlistItem {
  id: string;
  name: string;
  image: string;
  price: number;
  availability: 'in-stock' | 'out-of-stock';
  rating: number;
}

export type ActivityKind =
  | 'account-created' | 'email-verified' | 'order-placed' | 'order-delivered'
  | 'review-submitted' | 'password-changed' | 'profile-updated' | 'reward-earned';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  label: string;
  date: string;
  description: string;
  actor: string;
}

export interface CustomerNote {
  id: string;
  text: string;
  author: string;
  date: string;
  kind: 'admin' | 'internal';
}

export interface CustomerInsights {
  favoriteCategory: string;
  favoriteBrand: string;
  mostPurchasedProduct: string;
  preferredPaymentMethod: string;
  preferredShippingMethod: string;
  avgPurchaseInterval: string;
  lastPurchase: string;
  segment: string;
}

export interface Customer {
  id: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  country: string;
  city: string;
  address: string;
  status: CustomerStatus;
  type: CustomerType;
  registrationDate: string;
  lastLogin: string;
  preferredLanguage: string;
  preferredCurrency: string;
  marketingSubscribed: boolean;

  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  lifetimeSpending: number;
  avgOrderValue: number;
  wishlistCount: number;
  reviewsWritten: number;
  rewardPoints: number;
  storeCredit: number;
  lastOrderDate: string | null;

  orders: RecentOrder[];
  addresses: SavedAddress[];
  paymentMethods: CustomerPaymentMethod[];
  wishlist: WishlistItem[];
  activity: ActivityEvent[];
  notes: CustomerNote[];
  insights: CustomerInsights;
}

@Component({
  selector: 'app-customers',
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.html',
  styleUrl: './customers.scss',
})
export class Customers {
  constructor(private router: Router) {}

  // ── Loading ────────────────────────────────────────────────────────────
  isLoading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6];

  // ── View mode ──────────────────────────────────────────────────────────
  viewMode = signal<ViewMode>('table');

  // ── Filters ────────────────────────────────────────────────────────────
  searchQuery = signal('');
  searchBy = signal<SearchByField>('name');
  statusFilter = signal<'all' | CustomerStatus>('all');
  typeFilter = signal<CustomerTypeFilter>('all');
  registrationFilter = signal<RegistrationFilter>('all');
  sortBy = signal<SortByField>('newest');

  // ── Pagination ─────────────────────────────────────────────────────────
  currentPage = signal(1);
  pageSize = 8;

  // ── Row menu ───────────────────────────────────────────────────────────
  openMenuId = signal<string | null>(null);

  // ── Modals ─────────────────────────────────────────────────────────────
  viewingCustomer = signal<Customer | null>(null);
  editingCustomer = signal<Customer | null>(null);
  emailingCustomer = signal<Customer | null>(null);
  pendingDelete = signal<Customer | null>(null);
  pendingBlockToggle = signal<Customer | null>(null);

  // Profile modal active tab
  profileTab = signal<'overview' | 'orders' | 'addresses' | 'payments' | 'wishlist' | 'activity' | 'notes' | 'insights'>('overview');

  // Notes composer
  newNoteText = signal('');
  newNoteKind = signal<'admin' | 'internal'>('admin');

  // Edit customer form fields
  editName = signal('');
  editEmail = signal('');
  editPhone = signal('');
  editCountry = signal('');
  editCity = signal('');
  editAddress = signal('');
  editStatus = signal<CustomerStatus>('active');
  editType = signal<CustomerType>('regular');
  editMarketing = signal(true);
  editSaving = signal(false);

  // Send email form fields
  emailSubject = signal('');
  emailMessage = signal('');
  emailTemplate = signal<'order-update' | 'promotion' | 'newsletter' | 'custom'>('custom');
  emailSending = signal(false);

  // ── Toast ──────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Option lists ───────────────────────────────────────────────────────
  searchByOptions: { key: SearchByField; label: string }[] = [
    { key: 'name', label: 'Customer Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'customerId', label: 'Customer ID' },
  ];

  statusOptions: { key: 'all' | CustomerStatus; label: string }[] = [
    { key: 'all', label: 'All Statuses' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'pending-verification', label: 'Pending Verification' },
  ];

  statusDropdownOptions: CustomerStatus[] = ['active', 'inactive', 'blocked', 'pending-verification'];

  typeOptions: { key: CustomerTypeFilter; label: string }[] = [
    { key: 'all', label: 'All Types' },
    { key: 'regular', label: 'Regular' },
    { key: 'premium', label: 'Premium' },
    { key: 'vip', label: 'VIP' },
    { key: 'business', label: 'Business' },
  ];

  typeDropdownOptions: CustomerType[] = ['regular', 'premium', 'vip', 'business'];

  registrationOptions: { key: RegistrationFilter; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: '1y', label: 'Last Year' },
    { key: 'custom', label: 'Custom Range' },
  ];

  sortOptions: { key: SortByField; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'highest-spending', label: 'Highest Spending' },
    { key: 'most-orders', label: 'Most Orders' },
    { key: 'name', label: 'Customer Name' },
  ];

  emailTemplateOptions: { key: 'order-update' | 'promotion' | 'newsletter' | 'custom'; label: string }[] = [
    { key: 'order-update', label: 'Order Update' },
    { key: 'promotion', label: 'Promotion' },
    { key: 'newsletter', label: 'Newsletter' },
    { key: 'custom', label: 'Custom' },
  ];

  // ── Mock data pools ────────────────────────────────────────────────────
  private namePool = [
    'Ayoub Hennani', 'Sara Idrissi', 'Karim Mansouri', 'Leila Boudali', 'Youssef Alami',
    'Nadia Cherkaoui', 'Omar Fassi', 'Ines Bennis', 'Hamza Ziani', 'Salma Tazi',
    'Amine Berrada', 'Yasmine Sabir', 'Reda Kabbaj', 'Zineb Amrani', 'Bilal Ouahbi',
  ];
  private countryPool = ['Morocco', 'France', 'Spain', 'UAE', 'Canada', 'Germany'];
  private cityByCountry: Record<string, string[]> = {
    Morocco: ['Casablanca', 'Rabat', 'Marrakesh', 'Tangier', 'Fes'],
    France: ['Paris', 'Lyon', 'Marseille'],
    Spain: ['Madrid', 'Barcelona'],
    UAE: ['Dubai', 'Abu Dhabi'],
    Canada: ['Toronto', 'Montreal'],
    Germany: ['Berlin', 'Munich'],
  };
  private languagePool = ['English', 'French', 'Arabic', 'Spanish'];
  private currencyPool = ['USD', 'EUR', 'MAD', 'AED'];
  private categoryPool = ['Electronics', 'Smartphones', 'Laptops', 'Audio', 'Watches', 'Fashion'];
  private brandPool = ['Apple', 'Sony', 'Samsung', 'Nike', 'Bose'];
  private productPool = [
    { name: 'WH-XM6 Wireless ANC', image: '/products/headphones.png', price: 249 },
    { name: 'AirPods Pro 2nd Gen', image: '/products/airpods pro w1.png', price: 199 },
    { name: 'Galaxy S24 Ultra', image: '/products/samsung galxy s24 ultra silver.png', price: 1099 },
    { name: 'MacBook Pro M3', image: '/products/macbook pro 13.png', price: 1999 },
    { name: 'Ultra Watch Series 3', image: '/products/appel watch.png', price: 189 },
  ];
  private shippingMethodPool = ['Standard', 'Express', 'Overnight', 'Pickup'];
  private paymentMethodPool = ['Credit Card', 'PayPal', 'Cash on Delivery', 'Bank Transfer', 'Wallet'];
  private segmentPool = ['High Value', 'Frequent Buyer', 'At Risk', 'New', 'Loyal'];

  private statusCycle: CustomerStatus[] = ['active', 'active', 'active', 'inactive', 'blocked', 'pending-verification'];
  private typeCycle: CustomerType[] = ['regular', 'regular', 'premium', 'vip', 'business'];

  private customerIdFor(i: number): string {
    return 'CUST-' + (30200 + i * 7);
  }

  private buildActivity(regDate: Date, name: string): ActivityEvent[] {
    const now = regDate.getTime();
    const steps: { kind: ActivityKind; label: string; offsetDays: number; desc: string }[] = [
      { kind: 'account-created', label: 'Account Created', offsetDays: 0, desc: `${name} created an account.` },
      { kind: 'email-verified', label: 'Email Verified', offsetDays: 0.1, desc: 'Verified email address via confirmation link.' },
      { kind: 'profile-updated', label: 'Profile Updated', offsetDays: 3, desc: 'Updated shipping address and phone number.' },
      { kind: 'order-placed', label: 'Order Placed', offsetDays: 6, desc: 'Placed a new order.' },
      { kind: 'order-delivered', label: 'Order Delivered', offsetDays: 11, desc: 'Order was delivered successfully.' },
      { kind: 'review-submitted', label: 'Review Submitted', offsetDays: 13, desc: 'Left a 5-star product review.' },
      { kind: 'reward-earned', label: 'Reward Earned', offsetDays: 13.2, desc: 'Earned 120 reward points.' },
      { kind: 'password-changed', label: 'Password Changed', offsetDays: 20, desc: 'Changed account password.' },
    ];
    return steps.map((s, idx) => ({
      id: 'act-' + idx,
      kind: s.kind,
      label: s.label,
      date: new Date(now + s.offsetDays * 86400000).toISOString(),
      description: s.desc,
      actor: s.kind === 'account-created' || s.kind === 'email-verified' ? 'System' : name,
    })).reverse();
  }

  private generateMockCustomers(): Customer[] {
    const customers: Customer[] = [];
    const now = Date.now();

    for (let i = 0; i < 30; i++) {
      const name = this.namePool[i % this.namePool.length] + (i >= this.namePool.length ? ` ${Math.floor(i / this.namePool.length) + 1}` : '');
      const country = this.countryPool[i % this.countryPool.length];
      const cities = this.cityByCountry[country];
      const city = cities[i % cities.length];
      const status = this.statusCycle[i % this.statusCycle.length];
      const type = this.typeCycle[i % this.typeCycle.length];
      const daysAgoReg = 30 + (i * 11) % 700;
      const regDate = new Date(now - daysAgoReg * 86400000);
      const lastLogin = new Date(now - (i % 12) * 86400000 - (i * 1500000));

      const totalOrders = i % 9 === 0 ? 0 : 1 + (i * 3) % 24;
      const cancelledOrders = Math.round(totalOrders * ((i % 5) / 20));
      const completedOrders = Math.max(0, totalOrders - cancelledOrders);
      const avgOrderValue = 60 + (i * 37) % 420;
      const lifetimeSpending = totalOrders * avgOrderValue;
      const lastOrderDate = totalOrders > 0 ? new Date(now - (i % 20) * 86400000).toISOString() : null;

      const orders: RecentOrder[] = [];
      const orderCount = Math.min(5, totalOrders);
      for (let j = 0; j < orderCount; j++) {
        const items = 1 + (j % 3);
        const total = avgOrderValue + (j * 13) % 60;
        orders.push({
          orderNumber: '#ORD-' + (10450 + i * 3 + j),
          date: new Date(now - (j * 9 + i % 15) * 86400000).toISOString(),
          items,
          total,
          status: ['Delivered', 'Shipped', 'Processing', 'Cancelled'][j % 4],
          paymentStatus: ['paid', 'paid', 'pending', 'refunded'][j % 4] as RecentOrder['paymentStatus'],
        });
      }

      const addresses: SavedAddress[] = [
        {
          id: 'addr-' + i + '-s', type: 'shipping', isDefault: true,
          recipient: name, phone: `+212 6${(10000000 + i * 137).toString().slice(0, 8)}`,
          street: `${12 + i} Rue Al Amal`, city, postalCode: `${20000 + i * 3}`, country,
        },
        {
          id: 'addr-' + i + '-b', type: 'billing', isDefault: i % 3 !== 0,
          recipient: name, phone: `+212 6${(10000000 + i * 137).toString().slice(0, 8)}`,
          street: `${44 + i} Avenue Hassan II`, city, postalCode: `${20000 + i * 3 + 5}`, country,
        },
      ];

      const paymentMethods: CustomerPaymentMethod[] = [
        { id: 'pm-' + i + '-1', kind: 'card', cardBrand: i % 2 === 0 ? 'Visa' : 'Mastercard', maskedNumber: '•••• •••• •••• ' + (4000 + i).toString().slice(-4), expiry: `0${1 + i % 9}/2${7 + i % 3}`, isDefault: true },
        { id: 'pm-' + i + '-2', kind: 'paypal', isDefault: false },
      ];

      const wishlist: WishlistItem[] = [];
      const wishCount = i % 6;
      for (let w = 0; w < wishCount; w++) {
        const p = this.productPool[(i + w) % this.productPool.length];
        wishlist.push({
          id: 'wish-' + i + '-' + w,
          name: p.name, image: p.image, price: p.price,
          availability: (i + w) % 4 === 0 ? 'out-of-stock' : 'in-stock',
          rating: 3.5 + ((i + w) % 3) * 0.5,
        });
      }

      const notes: CustomerNote[] = i % 3 === 0 ? [
        { id: 'note-' + i + '-1', text: 'Prefers phone contact over email for order updates.', author: 'Sara I.', date: new Date(now - 12 * 86400000).toISOString(), kind: 'admin' },
      ] : [];

      customers.push({
        id: 'cust-' + i,
        customerId: this.customerIdFor(i),
        name, email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@mail.com',
        phone: `+212 6${(10000000 + i * 137).toString().slice(0, 8)}`,
        avatar: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        country, city,
        address: `${12 + i} Rue Al Amal, ${city}, ${country}`,
        status, type,
        registrationDate: regDate.toISOString(),
        lastLogin: lastLogin.toISOString(),
        preferredLanguage: this.languagePool[i % this.languagePool.length],
        preferredCurrency: this.currencyPool[i % this.currencyPool.length],
        marketingSubscribed: i % 3 !== 0,

        totalOrders, completedOrders, cancelledOrders, lifetimeSpending, avgOrderValue,
        wishlistCount: wishCount,
        reviewsWritten: Math.round(completedOrders * 0.3),
        rewardPoints: lifetimeSpending > 0 ? Math.round(lifetimeSpending * 1.2) : 0,
        storeCredit: i % 7 === 0 ? 25 : 0,
        lastOrderDate,

        orders, addresses, paymentMethods, wishlist,
        activity: this.buildActivity(regDate, name),
        notes,
        insights: {
          favoriteCategory: this.categoryPool[i % this.categoryPool.length],
          favoriteBrand: this.brandPool[i % this.brandPool.length],
          mostPurchasedProduct: this.productPool[i % this.productPool.length].name,
          preferredPaymentMethod: this.paymentMethodPool[i % this.paymentMethodPool.length],
          preferredShippingMethod: this.shippingMethodPool[i % this.shippingMethodPool.length],
          avgPurchaseInterval: `${8 + (i % 5) * 4} days`,
          lastPurchase: lastOrderDate ? this.formatDate(lastOrderDate) : 'No purchases yet',
          segment: this.segmentPool[i % this.segmentPool.length],
        },
      });
    }

    return customers;
  }

  private customers = signal<Customer[]>(this.generateMockCustomers());

  // ── Filtering ──────────────────────────────────────────────────────────
  private matchesRegistration(c: Customer, range: RegistrationFilter): boolean {
    if (range === 'all' || range === 'custom') return true;
    const regTime = new Date(c.registrationDate).getTime();
    const now = Date.now();
    const days = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 365;
    return now - regTime <= days * 86400000;
  }

  private matchesSearch(c: Customer, q: string, field: SearchByField): boolean {
    if (!q) return true;
    const needle = q.toLowerCase();
    switch (field) {
      case 'name': return c.name.toLowerCase().includes(needle);
      case 'email': return c.email.toLowerCase().includes(needle);
      case 'phone': return c.phone.toLowerCase().includes(needle);
      case 'customerId': return c.customerId.toLowerCase().includes(needle);
      default: return true;
    }
  }

  filteredCustomers = computed(() => {
    const q = this.searchQuery().trim();
    const field = this.searchBy();
    const status = this.statusFilter();
    const type = this.typeFilter();
    const range = this.registrationFilter();

    return this.customers().filter(c => {
      if (status !== 'all' && c.status !== status) return false;
      if (type !== 'all' && c.type !== type) return false;
      if (!this.matchesRegistration(c, range)) return false;
      if (!this.matchesSearch(c, q, field)) return false;
      return true;
    });
  });

  sortedCustomers = computed(() => {
    const sort = this.sortBy();
    const list = [...this.filteredCustomers()];
    list.sort((a, b) => {
      switch (sort) {
        case 'newest': return new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
        case 'oldest': return new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime();
        case 'highest-spending': return b.lifetimeSpending - a.lifetimeSpending;
        case 'most-orders': return b.totalOrders - a.totalOrders;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.sortedCustomers().length / this.pageSize)));

  pagedCustomers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.sortedCustomers().slice(start, start + this.pageSize);
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
    const total = this.sortedCustomers().length;
    if (total === 0) return '0 results';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `${start}–${end} of ${total}`;
  });

  // ── Stats ──────────────────────────────────────────────────────────────
  stats = computed(() => {
    const all = this.customers();
    const totalCustomers = all.length;
    const now = Date.now();
    const newThisMonth = all.filter(c => now - new Date(c.registrationDate).getTime() <= 30 * 86400000).length;
    const activeCustomers = all.filter(c => c.status === 'active').length;
    const vipCustomers = all.filter(c => c.type === 'vip').length;
    const returningCustomers = all.filter(c => c.totalOrders > 1).length;
    const totalRevenue = all.reduce((s, c) => s + c.lifetimeSpending, 0);
    const avgLifetimeValue = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;
    const totalOrdersAll = all.reduce((s, c) => s + c.totalOrders, 0);
    const avgOrdersPerCustomer = totalCustomers > 0 ? +(totalOrdersAll / totalCustomers).toFixed(1) : 0;

    return { totalCustomers, newThisMonth, activeCustomers, vipCustomers, returningCustomers, avgLifetimeValue, totalRevenue, avgOrdersPerCustomer };
  });

  // ── Filter handlers ────────────────────────────────────────────────────
  onSearch(value: string): void { this.searchQuery.set(value); this.currentPage.set(1); }
  setSearchBy(field: SearchByField): void { this.searchBy.set(field); this.currentPage.set(1); }
  setStatusFilter(status: 'all' | CustomerStatus): void { this.statusFilter.set(status); this.currentPage.set(1); }
  setTypeFilter(type: CustomerTypeFilter): void { this.typeFilter.set(type); this.currentPage.set(1); }
  setRegistrationFilter(range: RegistrationFilter): void { this.registrationFilter.set(range); this.currentPage.set(1); }
  setSort(sort: SortByField): void { this.sortBy.set(sort); }
  setViewMode(mode: ViewMode): void { this.viewMode.set(mode); }

  clearFilters(): void {
    this.searchQuery.set('');
    this.searchBy.set('name');
    this.statusFilter.set('all');
    this.typeFilter.set('all');
    this.registrationFilter.set('all');
    this.currentPage.set(1);
  }

  hasActiveFilters(): boolean {
    return !!this.searchQuery() || this.statusFilter() !== 'all' || this.typeFilter() !== 'all' || this.registrationFilter() !== 'all';
  }

  // ── Pagination ─────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  // ── Row menu ───────────────────────────────────────────────────────────
  toggleMenu(customer: Customer, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update(id => id === customer.id ? null : customer.id);
  }
  closeMenu(): void { this.openMenuId.set(null); }

  @HostListener('document:click')
  onDocClick(): void { this.closeMenu(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
    this.closeView();
    this.closeEdit();
    this.closeEmail();
    this.pendingDelete.set(null);
    this.pendingBlockToggle.set(null);
  }

  // ── Profile modal ──────────────────────────────────────────────────────
  openView(customer: Customer, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.profileTab.set('overview');
    this.viewingCustomer.set(customer);
  }
  closeView(): void { this.viewingCustomer.set(null); }

  setProfileTab(tab: 'overview' | 'orders' | 'addresses' | 'payments' | 'wishlist' | 'activity' | 'notes' | 'insights'): void {
    this.profileTab.set(tab);
  }

  viewOrders(customer: Customer, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.openView(customer);
    this.profileTab.set('orders');
  }

  viewWishlist(customer: Customer, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.openView(customer);
    this.profileTab.set('wishlist');
  }

  addNote(): void {
    const target = this.viewingCustomer();
    const text = this.newNoteText().trim();
    if (!target || !text) return;
    const note: CustomerNote = {
      id: 'note-' + Date.now(), text, author: 'You',
      date: new Date().toISOString(), kind: this.newNoteKind(),
    };
    this.customers.update(list => list.map(c => c.id === target.id ? { ...c, notes: [note, ...c.notes] } : c));
    this.viewingCustomer.update(c => c ? { ...c, notes: [note, ...c.notes] } : c);
    this.newNoteText.set('');
  }

  deleteNote(noteId: string): void {
    const target = this.viewingCustomer();
    if (!target) return;
    this.customers.update(list => list.map(c => c.id === target.id ? { ...c, notes: c.notes.filter(n => n.id !== noteId) } : c));
    this.viewingCustomer.update(c => c ? { ...c, notes: c.notes.filter(n => n.id !== noteId) } : c);
  }

  // ── Edit modal ─────────────────────────────────────────────────────────
  openEdit(customer: Customer, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.editName.set(customer.name);
    this.editEmail.set(customer.email);
    this.editPhone.set(customer.phone);
    this.editCountry.set(customer.country);
    this.editCity.set(customer.city);
    this.editAddress.set(customer.address);
    this.editStatus.set(customer.status);
    this.editType.set(customer.type);
    this.editMarketing.set(customer.marketingSubscribed);
    this.editingCustomer.set(customer);
  }

  editFromProfile(customer: Customer): void {
    this.closeView();
    this.openEdit(customer);
  }

  closeEdit(): void {
    this.editingCustomer.set(null);
    this.editSaving.set(false);
  }

  saveEdit(): void {
    const target = this.editingCustomer();
    if (!target) return;
    this.editSaving.set(true);

    setTimeout(() => {
      const updated: Partial<Customer> = {
        name: this.editName(), email: this.editEmail(), phone: this.editPhone(),
        country: this.editCountry(), city: this.editCity(), address: this.editAddress(),
        status: this.editStatus(), type: this.editType(), marketingSubscribed: this.editMarketing(),
      };
      this.customers.update(list => list.map(c => c.id === target.id ? { ...c, ...updated } : c));
      this.showToast(`${this.editName()} updated successfully`);
      this.closeEdit();
    }, 700);
  }

  // ── Send email modal ───────────────────────────────────────────────────
  openEmail(customer: Customer, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.emailTemplate.set('custom');
    this.emailSubject.set('');
    this.emailMessage.set('');
    this.emailingCustomer.set(customer);
  }
  closeEmail(): void { this.emailingCustomer.set(null); this.emailSending.set(false); }

  applyEmailTemplate(kind: 'order-update' | 'promotion' | 'newsletter' | 'custom'): void {
    this.emailTemplate.set(kind);
    const map: Record<string, { subject: string; message: string }> = {
      'order-update': { subject: 'An update on your recent order', message: 'Hi there,\n\nWe wanted to give you a quick update on your recent order status.\n\nThanks for shopping with us!' },
      promotion: { subject: 'A special offer just for you', message: 'Hi there,\n\nAs a valued customer, enjoy an exclusive discount on your next purchase.\n\nHappy shopping!' },
      newsletter: { subject: 'What\'s new this month', message: 'Hi there,\n\nHere\'s a roundup of what\'s new in our store this month.' },
      custom: { subject: '', message: '' },
    };
    const t = map[kind];
    this.emailSubject.set(t.subject);
    this.emailMessage.set(t.message);
  }

  sendEmail(): void {
    const target = this.emailingCustomer();
    if (!target || !this.emailSubject().trim()) return;
    this.emailSending.set(true);
    setTimeout(() => {
      this.showToast(`Email sent to ${target.email}`);
      this.closeEmail();
    }, 700);
  }

  // ── Block / Unblock / Delete ───────────────────────────────────────────
  requestBlockToggle(customer: Customer, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.pendingBlockToggle.set(customer);
  }
  cancelBlockToggle(): void { this.pendingBlockToggle.set(null); }
  confirmBlockToggle(): void {
    const target = this.pendingBlockToggle();
    if (!target) return;
    const newStatus: CustomerStatus = target.status === 'blocked' ? 'active' : 'blocked';
    this.customers.update(list => list.map(c => c.id === target.id ? { ...c, status: newStatus } : c));
    this.showToast(`${target.name} ${newStatus === 'blocked' ? 'blocked' : 'unblocked'}`);
    this.pendingBlockToggle.set(null);
  }

  requestDelete(customer: Customer, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.pendingDelete.set(customer);
  }
  cancelDelete(): void { this.pendingDelete.set(null); }
  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target) return;
    this.customers.update(list => list.filter(c => c.id !== target.id));
    this.showToast(`${target.name} deleted`);
    this.pendingDelete.set(null);
  }

  exportCustomers(): void { this.showToast('Exporting customers to CSV…'); }
  importCustomers(): void { this.showToast('Opening import dialog…'); }
  addCustomer(): void { this.showToast('Opening new customer form…'); }

  // ── Helpers ────────────────────────────────────────────────────────────
  statusLabel(status: CustomerStatus): string {
    const map: Record<CustomerStatus, string> = {
      active: 'Active', inactive: 'Inactive', blocked: 'Blocked', 'pending-verification': 'Pending Verification',
    };
    return map[status];
  }

  typeLabel(type: CustomerType): string {
    const map: Record<CustomerType, string> = {
      regular: 'Regular', premium: 'Premium', vip: 'VIP', business: 'Business',
    };
    return map[type];
  }

  ratingStars(rating: number): number[] {
    return [1, 2, 3, 4, 5];
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