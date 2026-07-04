// inventory.ts
import { Component, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdjustStock, AdjustStockProduct, StockAdjustmentPayload } from '../adjust-stock/adjust-stock';
import { AddInventoryItem, NewInventoryItemPayload } from '../add-inventory-item/add-inventory-item';

// ─── Types ──────────────────────────────────────────────────────────────────
export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'overstock' | 'critical';
export type MovementType = 'increase' | 'decrease' | 'transfer' | 'correction';
export type SortField = 'product' | 'stock' | 'value' | 'updated';
export type StockStatusFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';

export interface StockMovement {
  id: string;
  date: string;
  type: MovementType;
  quantity: number;
  before: number;
  after: number;
  user: string;
  notes: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  image: string;
  category: string;
  warehouse: string;
  supplier: string;
  currentStock: number;
  reserved: number;
  incoming: number;
  outgoing: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  reorderQty: number;
  lastUpdated: string; // ISO datetime
  movements: StockMovement[];
}

@Component({
  selector: 'app-inventory',
  imports: [CommonModule, FormsModule, AdjustStock, AddInventoryItem],
  templateUrl: './inventory.html',
  styleUrl: './inventory.scss',
})
export class Inventory {

  constructor(private router: Router) {}

  // ── Loading ────────────────────────────────────────────────────────────────
  isLoading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6];

  // ── View mode ──────────────────────────────────────────────────────────────
  viewMode = signal<'table' | 'grid'>('table');

  // ── Filters ───────────────────────────────────────────────────────────────
  searchQuery        = signal('');
  warehouseFilter     = signal('all');
  categoryFilter      = signal('all');
  stockStatusFilter   = signal<StockStatusFilter>('all');
  sortField           = signal<SortField>('product');
  sortDir             = signal<'asc' | 'desc'>('asc');

  // ── Pagination ────────────────────────────────────────────────────────────
  currentPage = signal(1);
  pageSize    = 8;

  // ── Row menu ──────────────────────────────────────────────────────────────
  openMenuId = signal<string | null>(null);

  // ── Modals ────────────────────────────────────────────────────────────────
  viewingItem   = signal<InventoryItem | null>(null);
  adjustingItem = signal<InventoryItem | null>(null);
  pendingDelete = signal<InventoryItem | null>(null);
  isAddingItem  = signal(false);

  existingSkus = computed(() => this.items().map(i => i.sku));

  // Product shape handed to <app-adjust-stock>, derived from the raw inventory item.
  adjustingProduct = computed<AdjustStockProduct | null>(() => {
    const item = this.adjustingItem();
    return item ? this.toAdjustProduct(item) : null;
  });

  // ── Toast ─────────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Static option lists ──────────────────────────────────────────────────
  warehouses = ['Main Warehouse', 'North DC', 'South DC', 'East Hub'];
  categories = ['Electronics', 'Smartphones', 'Laptops', 'Audio', 'Watches', 'Shoes', 'Accessories', 'Gaming', 'Fashion'];
  suppliers  = ['TechSource Inc', 'Global Distributors', 'Prime Supply Co', 'Apex Trading'];

  stockStatusOptions: { key: StockStatusFilter; label: string }[] = [
    { key: 'all',           label: 'All' },
    { key: 'in-stock',      label: 'In Stock' },
    { key: 'low-stock',     label: 'Low Stock' },
    { key: 'out-of-stock',  label: 'Out of Stock' },
  ];

  sortOptions: { key: SortField; label: string }[] = [
    { key: 'product', label: 'Product' },
    { key: 'stock',   label: 'Stock' },
    { key: 'value',   label: 'Value' },
    { key: 'updated', label: 'Last Updated' },
  ];

  // ── Mock data (generated once, mutable via signal) ───────────────────────
  private items = signal<InventoryItem[]>(this.generateMockData());

  private generateMockData(): InventoryItem[] {
    const productNames = [
      ['WH-XM6 Wireless ANC', 'Audio', '/products/headphones.png'],
      ['AirPods Pro 2nd Gen', 'Electronics', '/products/airpods pro w1.png'],
      ['Galaxy S24 Ultra', 'Smartphones', '/products/samsung galxy s24 ultra silver.png'],
      ['MacBook Pro M3', 'Laptops', '/products/macbook pro 13.png'],
      ['Ultra Watch Series 3', 'Watches', '/products/appel watch.png'],
      ['Air Max 270', 'Shoes', '/products/headphones.png'],
      ['Galaxy Buds Pro 2', 'Audio', '/products/airpods pro b1.png'],
      ['iPad Pro 12.9"', 'Electronics', '/products/airpods pro w2.png'],
      ['Surface Pro 9', 'Laptops', '/products/macbook pro 13.png'],
      ['Pixel Watch 2', 'Watches', '/products/appel watch.png'],
      ['OnePlus 12 Pro', 'Smartphones', '/products/samsung galxy s24 ultra silver.png'],
      ['Sony WF-1000XM5', 'Audio', '/products/headphones.png'],
    ];

    const items: InventoryItem[] = [];
    const now = Date.now();

    for (let i = 0; i < 36; i++) {
      const [name, category, image] = productNames[i % productNames.length];
      const warehouse = this.warehouses[i % this.warehouses.length];
      const supplier  = this.suppliers[i % this.suppliers.length];

      const minStock = 10 + (i % 3) * 5;
      const maxStock = 100 + (i % 4) * 40;

      // Distribute stock levels across the full status spectrum
      let currentStock: number;
      const cycle = i % 7;
      if (cycle === 0) currentStock = 0;                                   // out of stock
      else if (cycle === 1) currentStock = Math.round(minStock * 0.3);     // critical
      else if (cycle === 2) currentStock = Math.round(minStock * 0.8);     // low stock
      else if (cycle === 3) currentStock = Math.round(maxStock * 1.1);     // overstock
      else currentStock = minStock + Math.round((maxStock - minStock) * 0.45); // in stock

      const reserved  = Math.min(currentStock, Math.round(currentStock * 0.12));
      const incoming  = (i % 5 === 0) ? 20 + (i % 3) * 10 : 0;
      const outgoing  = (i % 6 === 0) ? 5 + (i % 4) * 3 : 0;
      const unitCost  = 20 + ((i * 37) % 380);
      const daysAgo   = i % 21;
      const lastUpdated = new Date(now - daysAgo * 86400000 - (i * 3600000)).toISOString();

      items.push({
        id: 'inv-' + i,
        name: name + (i >= productNames.length ? ` (${warehouse})` : ''),
        sku: this.skuFor(name, i),
        barcode: '8' + String(100000000000 + i * 137).slice(0, 12),
        image,
        category,
        warehouse,
        supplier,
        currentStock,
        reserved,
        incoming,
        outgoing,
        minStock,
        maxStock,
        unitCost,
        reorderQty: Math.max(20, minStock * 2),
        lastUpdated,
        movements: this.generateMovements(currentStock, daysAgo),
      });
    }

    return items;
  }

  private skuFor(name: string, i: number): string {
    const code = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
    return `${code}-${(1000 + i * 7).toString().slice(-4)}`;
  }

  private generateMovements(finalStock: number, daysAgo: number): StockMovement[] {
    const users = ['Ayoub H.', 'Sara I.', 'Karim M.', 'System'];
    const types: MovementType[] = ['increase', 'decrease', 'correction', 'transfer'];
    const movements: StockMovement[] = [];
    let running = Math.max(0, finalStock - 40);
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      const type = types[(i + daysAgo) % types.length];
      const qty = 3 + ((i * 11 + daysAgo) % 20);
      const before = running;
      const after = type === 'decrease'
        ? Math.max(0, before - qty)
        : type === 'increase'
          ? before + qty
          : before + (i % 2 === 0 ? qty : -qty);
      running = Math.max(0, after);

      movements.push({
        id: 'mv-' + i + '-' + daysAgo,
        date: new Date(now - (daysAgo + (5 - i) * 3) * 86400000).toISOString(),
        type,
        quantity: qty,
        before,
        after: running,
        user: users[i % users.length],
        notes: this.notesFor(type),
      });
    }

    // Ensure the final movement lands on the item's actual current stock
    if (movements.length) {
      movements[movements.length - 1].after = finalStock;
    }

    return movements.reverse(); // most recent first
  }

  private notesFor(type: MovementType): string {
    const map: Record<MovementType, string> = {
      increase: 'Restocked from supplier delivery',
      decrease: 'Sold via storefront orders',
      correction: 'Cycle count adjustment',
      transfer: 'Transferred between warehouses',
    };
    return map[type];
  }

  // ── Calculations ──────────────────────────────────────────────────────────
  availableStock(item: InventoryItem): number {
    return Math.max(0, item.currentStock - item.reserved);
  }

  inventoryValueFor(item: InventoryItem): number {
    return item.currentStock * item.unitCost;
  }

  stockPercent(item: InventoryItem): number {
    if (item.maxStock <= 0) return 0;
    return Math.min(100, Math.round((item.currentStock / item.maxStock) * 100));
  }

  statusFor(item: InventoryItem): StockStatus {
    if (item.currentStock === 0) return 'out-of-stock';
    if (item.currentStock <= item.minStock * 0.5) return 'critical';
    if (item.currentStock <= item.minStock) return 'low-stock';
    if (item.currentStock >= item.maxStock) return 'overstock';
    return 'in-stock';
  }

  statusLabel(status: StockStatus): string {
    const map: Record<StockStatus, string> = {
      'in-stock': 'In Stock', 'low-stock': 'Low Stock', 'out-of-stock': 'Out of Stock',
      'overstock': 'Overstock', 'critical': 'Critical',
    };
    return map[status];
  }

  private statusMatchesFilter(item: InventoryItem, filter: StockStatusFilter): boolean {
    if (filter === 'all') return true;
    const status = this.statusFor(item);
    if (filter === 'low-stock') return status === 'low-stock' || status === 'critical';
    return status === filter;
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const warehouse = this.warehouseFilter();
    const category = this.categoryFilter();
    const statusFilter = this.stockStatusFilter();

    return this.items().filter(item => {
      if (warehouse !== 'all' && item.warehouse !== warehouse) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (!this.statusMatchesFilter(item, statusFilter)) return false;
      if (q) {
        const hay = `${item.name} ${item.sku} ${item.barcode} ${item.category} ${item.warehouse}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  // ── Sorting ───────────────────────────────────────────────────────────────
  sortedItems = computed(() => {
    const field = this.sortField();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const list = [...this.filteredItems()];

    list.sort((a, b) => {
      switch (field) {
        case 'product': return a.name.localeCompare(b.name) * dir;
        case 'stock':   return (a.currentStock - b.currentStock) * dir;
        case 'value':   return (this.inventoryValueFor(a) - this.inventoryValueFor(b)) * dir;
        case 'updated': return a.lastUpdated.localeCompare(b.lastUpdated) * dir;
        default: return 0;
      }
    });

    return list;
  });

  setSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  totalPages = computed(() => Math.max(1, Math.ceil(this.sortedItems().length / this.pageSize)));

  paginatedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.sortedItems().slice(start, start + this.pageSize);
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
    const total = this.sortedItems().length;
    if (total === 0) return '0 results';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `${start}–${end} of ${total}`;
  });

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  onFilterChange(): void { this.currentPage.set(1); }

  resetFilters(): void {
    this.searchQuery.set('');
    this.warehouseFilter.set('all');
    this.categoryFilter.set('all');
    this.stockStatusFilter.set('all');
    this.sortField.set('product');
    this.sortDir.set('asc');
    this.currentPage.set(1);
  }

  // ── Summary cards ─────────────────────────────────────────────────────────
  summary = computed(() => {
    const all = this.items();
    const totalProducts = all.length;
    const totalStockUnits = all.reduce((s, i) => s + i.currentStock, 0);
    const lowStockItems = all.filter(i => {
      const s = this.statusFor(i);
      return s === 'low-stock' || s === 'critical';
    }).length;
    const outOfStock = all.filter(i => this.statusFor(i) === 'out-of-stock').length;
    const inventoryValue = all.reduce((s, i) => s + this.inventoryValueFor(i), 0);
    const avgStockLevel = totalProducts > 0
      ? Math.round(all.reduce((s, i) => s + this.stockPercent(i), 0) / totalProducts)
      : 0;

    return { totalProducts, totalStockUnits, lowStockItems, outOfStock, inventoryValue, avgStockLevel };
  });

  // ── Low stock alerts ──────────────────────────────────────────────────────
  alertItems = computed(() =>
    this.items()
      .filter(i => ['critical', 'low-stock', 'out-of-stock'].includes(this.statusFor(i)))
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 6)
  );

  // ── View mode / row menu ──────────────────────────────────────────────────
  setViewMode(mode: 'table' | 'grid'): void { this.viewMode.set(mode); }

  toggleMenu(item: InventoryItem, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update(id => id === item.id ? null : item.id);
  }
  closeMenu(): void { this.openMenuId.set(null); }

  @HostListener('document:click')
  onDocClick(): void { this.closeMenu(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
    this.closeView();
    this.pendingDelete.set(null);
    // Note: the adjust-stock modal handles its own ESC/backdrop-close internally
    // and emits (closed) back to us; we don't force-close it from here.
  }

  // ── Details modal ─────────────────────────────────────────────────────────
  openView(item: InventoryItem, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.viewingItem.set(item);
  }
  closeView(): void { this.viewingItem.set(null); }

  editFromView(item: InventoryItem): void {
    this.closeView();
    this.router.navigate(['/admin/product', item.id, 'edit']);
  }

  // ── Adjust stock modal (delegated to <app-adjust-stock>) ──────────────────
  openAdjust(item: InventoryItem, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.adjustingItem.set(item);
  }

  closeAdjust(): void {
    this.adjustingItem.set(null);
  }

  quickRestock(item: InventoryItem, event?: Event): void {
    // Opens the modal; the "Restock" quick action inside <app-adjust-stock>
    // pre-fills type/quantity from the product's own min/max thresholds.
    this.openAdjust(item, event);
  }

  /** Maps a raw InventoryItem onto the shape <app-adjust-stock> expects. */
  private toAdjustProduct(item: InventoryItem): AdjustStockProduct {
    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      image: item.image,
      category: item.category,
      warehouse: item.warehouse,
      currentStock: item.currentStock,
      reserved: item.reserved,
      incoming: item.incoming,
      minStock: item.minStock,
      maxStock: item.maxStock,
      unitCost: item.unitCost,
      lastUpdated: item.lastUpdated,
      movements: item.movements.map(mv => ({
        id: mv.id,
        date: mv.date,
        type: mv.type,
        quantity: mv.quantity,
        user: mv.user,
        reason: mv.notes,
      })),
    };
  }

  /** Handles the (saved) event emitted by <app-adjust-stock>. */
  onStockAdjusted(payload: StockAdjustmentPayload): void {
    const target = this.items().find(i => i.id === payload.productId);
    if (!target) return;

    const before = target.currentStock;
    const after = payload.resultingStock;

    const movementType: MovementType =
      payload.type === 'transfer' ? 'transfer'
      : payload.difference > 0 ? 'increase'
      : payload.difference < 0 ? 'decrease'
      : 'correction';

    const reasonText = payload.reason.replace(/-/g, ' ')
      .replace(/^\w/, c => c.toUpperCase());

    const movement: StockMovement = {
      id: 'mv-' + Date.now(),
      date: new Date().toISOString(),
      type: movementType,
      quantity: Math.abs(payload.difference) || payload.quantity,
      before,
      after,
      user: payload.performedBy,
      notes: payload.notes || reasonText,
    };

    this.items.update(list => list.map(i =>
      i.id === target.id
        ? { ...i, currentStock: after, lastUpdated: movement.date, movements: [movement, ...i.movements] }
        : i
    ));

    this.showToast(`Stock updated for "${target.name}" (${payload.difference > 0 ? '+' : ''}${payload.difference})`);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  requestDelete(item: InventoryItem, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.pendingDelete.set(item);
  }
  cancelDelete(): void { this.pendingDelete.set(null); }

  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target) return;
    this.items.update(list => list.filter(i => i.id !== target.id));
    this.pendingDelete.set(null);
    this.showToast(`"${target.name}" removed from inventory`);
  }

  adjustStockPrompt(): void { this.showToast('Select a product below to adjust its stock'); }

  // ── Add inventory item modal ─────────────────────────────────────────────
  openAddItem(): void { this.isAddingItem.set(true); }
  closeAddItem(): void { this.isAddingItem.set(false); }

  /** Handles the (created) event emitted by <app-add-inventory-item>. */
  onItemCreated(payload: NewInventoryItemPayload): void {
    const now = new Date().toISOString();

    const openingMovement: StockMovement = {
      id: 'mv-' + Date.now(),
      date: now,
      type: 'increase',
      quantity: payload.initialStock,
      before: 0,
      after: payload.initialStock,
      user: 'You',
      notes: 'Initial stock on creation',
    };

    const newItem: InventoryItem = {
      id: 'inv-' + Date.now(),
      name: payload.name,
      sku: payload.sku,
      barcode: payload.barcode,
      image: payload.image || '/products/headphones.png',
      category: payload.category,
      warehouse: payload.warehouse,
      supplier: payload.supplier,
      currentStock: payload.initialStock,
      reserved: 0,
      incoming: 0,
      outgoing: 0,
      minStock: payload.minStock,
      maxStock: payload.maxStock,
      unitCost: payload.unitCost,
      reorderQty: payload.reorderQty,
      lastUpdated: now,
      movements: payload.initialStock > 0 ? [openingMovement] : [],
    };

    this.items.update(list => [newItem, ...list]);
    this.currentPage.set(1);
    this.showToast(`"${newItem.name}" added to inventory`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatCurrency(v: number): string { return '$' + v.toLocaleString(); }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

