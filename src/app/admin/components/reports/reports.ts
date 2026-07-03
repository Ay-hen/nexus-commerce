// reports.ts
import { Component, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ─── Types ──────────────────────────────────────────────────────────────────
export type ReportType = 'sales' | 'orders' | 'products' | 'customers' | 'categories' | 'payment-methods';
export type DateRangeKey = 'today' | '7d' | '30d' | '90d' | 'custom';
export type StatusFilter = 'all' | 'completed' | 'pending' | 'cancelled';
export type ColumnKey = 'date' | 'orderId' | 'customer' | 'products' | 'paymentMethod' | 'category' | 'revenue' | 'status';

export interface ReportRow {
  id: string;
  date: string;          // ISO yyyy-mm-dd
  orderId: string;
  customer: string;
  customerAvatar: string;
  products: string;
  unitsSold: number;
  paymentMethod: string;
  category: string;
  revenue: number;
  status: 'completed' | 'pending' | 'cancelled';
}

interface ChartPoint { label: string; value: number; color: string; }
interface TrendPoint { label: string; value: number; }
interface DonutSegment extends ChartPoint {
  dashArray: number;
  dashOffset: number;
  circumference: number;
}

const PALETTE = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#7C3AED', '#94A3B8'];

@Component({
  selector: 'app-reports',
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {

  // ── Loading / generating state ───────────────────────────────────────────
  isLoading    = signal(true);
  isGenerating = signal(false);
  skeletons    = [1, 2, 3, 4, 5, 6, 7, 8];

  // ── Filters ───────────────────────────────────────────────────────────────
  dateRange    = signal<DateRangeKey>('30d');
  customStart  = signal('');
  customEnd    = signal('');
  reportType   = signal<ReportType>('sales');
  statusFilter = signal<StatusFilter>('all');
  searchQuery  = signal('');

  // ── Table state ───────────────────────────────────────────────────────────
  sortField   = signal<ColumnKey>('date');
  sortDir     = signal<'asc' | 'desc'>('desc');
  currentPage = signal(1);
  pageSize    = 8;

  // ── Toast ─────────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Static option lists ──────────────────────────────────────────────────
  dateRangeOptions: { key: DateRangeKey; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d',    label: 'Last 7 Days' },
    { key: '30d',   label: 'Last 30 Days' },
    { key: '90d',   label: 'Last 90 Days' },
    { key: 'custom',label: 'Custom Range' },
  ];

  reportTypeOptions: { key: ReportType; label: string }[] = [
    { key: 'sales',            label: 'Sales' },
    { key: 'orders',           label: 'Orders' },
    { key: 'products',         label: 'Products' },
    { key: 'customers',        label: 'Customers' },
    { key: 'categories',       label: 'Categories' },
    { key: 'payment-methods',  label: 'Payment Methods' },
  ];

  statusOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'pending',   label: 'Pending' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  // Which columns render for each report type
  private reportTypeColumns: Record<ReportType, ColumnKey[]> = {
    'sales':           ['date', 'orderId', 'customer', 'products', 'paymentMethod', 'revenue', 'status'],
    'orders':          ['date', 'orderId', 'customer', 'products', 'status'],
    'products':        ['date', 'products', 'category', 'revenue', 'status'],
    'customers':       ['date', 'customer', 'orderId', 'revenue', 'status'],
    'categories':      ['date', 'category', 'products', 'revenue', 'status'],
    'payment-methods': ['date', 'orderId', 'paymentMethod', 'revenue', 'status'],
  };

  columnLabels: Record<ColumnKey, string> = {
    date: 'Date', orderId: 'Order ID', customer: 'Customer', products: 'Products',
    paymentMethod: 'Payment Method', category: 'Category', revenue: 'Revenue', status: 'Status',
  };

  visibleColumns = computed(() => this.reportTypeColumns[this.reportType()]);

  // ── Mock dataset (generated once) ────────────────────────────────────────
  private allRows: ReportRow[] = this.generateMockData();

  private generateMockData(): ReportRow[] {
    const customers = [
      ['Ayoub Hennani', 'AH'], ['Sara Idrissi', 'SI'], ['Karim Mansouri', 'KM'],
      ['Leila Boudali', 'LB'], ['Youssef Alami', 'YA'], ['Nadia Cherkaoui', 'NC'],
      ['Omar Fassi', 'OF'], ['Hind Bennis', 'HB'],
    ];
    const products = [
      ['WH-XM6 Wireless ANC', 'Audio'], ['AirPods Pro 2nd Gen', 'Electronics'],
      ['Galaxy S24 Ultra', 'Smartphones'], ['MacBook Pro M3', 'Laptops'],
      ['Ultra Watch Series 3', 'Watches'], ['Air Max 270', 'Shoes'],
      ['Galaxy Buds Pro 2', 'Audio'], ['iPad Pro 12.9"', 'Electronics'],
    ];
    const paymentMethods = ['Visa', 'Mastercard', 'PayPal', 'Apple Pay'];
    const statuses: ReportRow['status'][] = ['completed', 'completed', 'completed', 'pending', 'cancelled'];

    const rows: ReportRow[] = [];
    const today = new Date();

    for (let i = 0; i < 96; i++) {
      const daysAgo = Math.floor((i * 97) % 90); // spread pseudo-evenly across 90 days
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);

      const cust = customers[i % customers.length];
      const prod = products[i % products.length];
      const units = 1 + (i % 4);

      rows.push({
        id: 'r' + i,
        date: d.toISOString().slice(0, 10),
        orderId: '#' + (2000 + i),
        customer: cust[0],
        customerAvatar: cust[1],
        products: prod[0],
        unitsSold: units,
        category: prod[1],
        paymentMethod: paymentMethods[i % paymentMethods.length],
        revenue: Math.round((units * (40 + (i * 13) % 260)) * 1.0),
        status: statuses[i % statuses.length],
      });
    }

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  // ── Date range resolution ────────────────────────────────────────────────
  private resolveRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (this.dateRange()) {
      case 'today': start.setHours(0, 0, 0, 0); break;
      case '7d':  start.setDate(end.getDate() - 7); break;
      case '30d': start.setDate(end.getDate() - 30); break;
      case '90d': start.setDate(end.getDate() - 90); break;
      case 'custom':
        if (this.customStart()) start.setTime(new Date(this.customStart()).getTime());
        else start.setDate(end.getDate() - 30);
        if (this.customEnd()) end.setTime(new Date(this.customEnd()).getTime());
        break;
    }
    return { start, end };
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  filteredRows = computed(() => {
    const { start, end } = this.resolveRange();
    const status = this.statusFilter();
    const q = this.searchQuery().trim().toLowerCase();

    return this.allRows.filter(row => {
      const d = new Date(row.date);
      if (d < start || d > end) return false;
      if (status !== 'all' && row.status !== status) return false;
      if (q) {
        const hay = `${row.orderId} ${row.customer} ${row.products} ${row.category} ${row.paymentMethod}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  // ── Previous-period comparison (for % change badges) ────────────────────
  private previousPeriodRows = computed(() => {
    const { start, end } = this.resolveRange();
    const spanMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(start.getTime() - spanMs);

    return this.allRows.filter(row => {
      const d = new Date(row.date);
      return d >= prevStart && d <= prevEnd;
    });
  });

  private pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  // ── Summary cards ─────────────────────────────────────────────────────────
  summary = computed(() => {
    const rows = this.filteredRows();
    const prev = this.previousPeriodRows();

    const revenue   = rows.reduce((s, r) => s + r.revenue, 0);
    const prevRev    = prev.reduce((s, r) => s + r.revenue, 0);
    const orders    = new Set(rows.map(r => r.orderId)).size;
    const prevOrders = new Set(prev.map(r => r.orderId)).size;
    const customers = new Set(rows.map(r => r.customer)).size;
    const prevCust   = new Set(prev.map(r => r.customer)).size;
    const unitsSold  = rows.reduce((s, r) => s + r.unitsSold, 0);
    const prevUnits   = prev.reduce((s, r) => s + r.unitsSold, 0);

    return [
      { id: 'revenue',   label: 'Total Revenue',   value: revenue,   prefix: '$', icon: 'revenue',   color: 'blue',   change: this.pctChange(revenue, prevRev) },
      { id: 'orders',    label: 'Total Orders',    value: orders,    prefix: '',  icon: 'orders',    color: 'green',  change: this.pctChange(orders, prevOrders) },
      { id: 'customers', label: 'Total Customers', value: customers, prefix: '',  icon: 'customers', color: 'purple', change: this.pctChange(customers, prevCust) },
      { id: 'products',  label: 'Products Sold',   value: unitsSold, prefix: '',  icon: 'products',  color: 'amber',  change: this.pctChange(unitsSold, prevUnits) },
    ];
  });

  // ── Sorting ───────────────────────────────────────────────────────────────
  sortedRows = computed(() => {
    const field = this.sortField();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const list = [...this.filteredRows()];

    list.sort((a, b) => {
      const av = (a as any)[field];
      const bv = (b as any)[field];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });

    return list;
  });

  setSort(field: ColumnKey): void {
    if (!this.visibleColumns().includes(field)) return;
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('desc');
    }
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  totalPages = computed(() => Math.max(1, Math.ceil(this.sortedRows().length / this.pageSize)));

  paginatedRows = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.sortedRows().slice(start, start + this.pageSize);
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const span = 1;
    const range: number[] = [];
    for (let i = Math.max(1, current - span); i <= Math.min(total, current + span); i++) range.push(i);
    return range;
  });

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  pageRangeLabel = computed(() => {
    const total = this.sortedRows().length;
    if (total === 0) return '0 results';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `${start}–${end} of ${total}`;
  });

  // ── Charts: revenue / orders trend ───────────────────────────────────────
  private bucketize(rows: ReportRow[], valueFn: (rows: ReportRow[]) => number, bucketCount = 10): TrendPoint[] {
    const rowsSorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    if (rowsSorted.length === 0) return [];

    const start = new Date(rowsSorted[0].date).getTime();
    const end = new Date(rowsSorted[rowsSorted.length - 1].date).getTime();
    const span = Math.max(end - start, 86400000);
    const bucketMs = span / bucketCount;

    const buckets: ReportRow[][] = Array.from({ length: bucketCount }, () => []);
    for (const row of rowsSorted) {
      const t = new Date(row.date).getTime();
      const idx = Math.min(bucketCount - 1, Math.floor((t - start) / bucketMs));
      buckets[idx].push(row);
    }

    return buckets.map((bucketRows, i) => {
      const d = new Date(start + i * bucketMs);
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: valueFn(bucketRows),
      };
    });
  }

  revenueTrend = computed(() =>
    this.bucketize(this.filteredRows(), rows => rows.reduce((s, r) => s + r.revenue, 0))
  );

  ordersTrend = computed(() =>
    this.bucketize(this.filteredRows(), rows => new Set(rows.map(r => r.orderId)).size)
  );

  maxRevenueTrend = computed(() => Math.max(1, ...this.revenueTrend().map(p => p.value)));
  maxOrdersTrend  = computed(() => Math.max(1, ...this.ordersTrend().map(p => p.value)));

  barHeight(value: number, max: number): number {
    return Math.max(3, (value / max) * 100);
  }

  // ── Charts: top products ─────────────────────────────────────────────────
  topProducts = computed(() => {
    const map = new Map<string, number>();
    for (const row of this.filteredRows()) {
      map.set(row.products, (map.get(row.products) ?? 0) + row.revenue);
    }
    return [...map.entries()]
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  });

  maxTopProductRevenue = computed(() => Math.max(1, ...this.topProducts().map(p => p.revenue)));

  // ── Charts: category & payment-method distribution (donuts) ─────────────
  private aggregate(rows: ReportRow[], key: 'category' | 'paymentMethod'): ChartPoint[] {
    const map = new Map<string, number>();
    for (const row of rows) map.set(row[key], (map.get(row[key]) ?? 0) + row.revenue);
    const total = [...map.values()].reduce((a, b) => a + b, 0) || 1;

    return [...map.entries()]
      .map(([label, value], i) => ({ label, value: Math.round((value / total) * 1000) / 10, color: PALETTE[i % PALETTE.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }

  categoryDistribution = computed(() => this.aggregate(this.filteredRows(), 'category'));
  paymentDistribution  = computed(() => this.aggregate(this.filteredRows(), 'paymentMethod'));

  private buildDonutSegments(data: ChartPoint[]): DonutSegment[] {
    const r = 42;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    return data.map(d => {
      const dashArray = (d.value / 100) * circ;
      const seg: DonutSegment = { ...d, dashArray, dashOffset: circ - offset, circumference: circ };
      offset += dashArray;
      return seg;
    });
  }

  categoryDonut = computed(() => this.buildDonutSegments(this.categoryDistribution()));
  paymentDonut  = computed(() => this.buildDonutSegments(this.paymentDistribution()));

  // ── Actions ───────────────────────────────────────────────────────────────
  generateReport(): void {
    this.isGenerating.set(true);
    this.currentPage.set(1);
    setTimeout(() => {
      this.isGenerating.set(false);
      this.showToast('Report generated successfully');
    }, 900);
  }

  resetFilters(): void {
    this.dateRange.set('30d');
    this.customStart.set('');
    this.customEnd.set('');
    this.reportType.set('sales');
    this.statusFilter.set('all');
    this.searchQuery.set('');
    this.sortField.set('date');
    this.sortDir.set('desc');
    this.currentPage.set(1);
    this.showToast('Filters reset');
  }

  exportPdf():   void { this.showToast('Exporting report as PDF…'); }
  exportExcel(): void { this.showToast('Exporting report as Excel…'); }
  exportCsv():   void { this.showToast('Exporting report as CSV…'); }
  printReport(): void { this.showToast('Preparing report for print…'); }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatCurrency(v: number): string { return '$' + v.toLocaleString(); }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  statusColor(status: string): string {
    const map: Record<string, string> = { completed: 'green', pending: 'amber', cancelled: 'red' };
    return map[status] ?? 'slate';
  }

  trackById(_: number, item: { id: string }): string { return item.id; }
  trackByLabel(_: number, item: { label: string }): string { return item.label; }

  private showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMsg.set(msg);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 2600);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { /* reserved */ }

  ngOnInit(): void {
    setTimeout(() => this.isLoading.set(false), 700);
  }
}