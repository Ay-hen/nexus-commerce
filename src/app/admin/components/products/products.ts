// products.component.ts  (aka admin-products.component.ts)
// Changes from your original:
//   1. `editProduct()` now opens <app-edit-product-modal> instead of router.navigate.
//   2. `toggleMenu()` computes a viewport-aware FIXED position from the button's
//      real coordinates instead of relying on CSS `position: absolute` + the
//      `:nth-last-child(-n+2)` flip hack — that's what was causing the "more"
//      popup to get clipped by the scrollable table container / cut off at
//      the edge of the screen.
//   3. Menu closes on scroll/resize so it never goes stale.

import {
  Component, signal, computed, OnInit, inject, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminProduct } from '../../model/admin-models.model';
import { EditProductModal } from '../../model/edit-product-modal/edit-product-modal';

type ProductStatus = 'active' | 'draft' | 'archived';
type SortKey =
  | 'nameAsc' | 'nameDesc'
  | 'priceHigh' | 'priceLow'
  | 'stockHigh' | 'stockLow'
  | 'salesHigh' | 'salesLow'
  | 'statusAsc';
type ViewMode = 'table' | 'grid';

interface MenuPosition { top: number; left: number; openUp: boolean; }

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, EditProductModal],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products implements OnInit {

  protected Math = Math;
  private router = inject(Router);

  // ── Loading ──────────────────────────────────────────────────────────────
  isLoading = signal(true);
  skeletons = [1, 2, 3, 4, 5];

  // ── Toast ────────────────────────────────────────────────────────────────
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  // ── Search / filters / sort / view ───────────────────────────────────────
  searchQuery = signal('');
  activeStatus = signal<ProductStatus | 'all'>('all');
  activeCategory = signal('All');
  sortKey = signal<SortKey>('nameAsc');
  viewMode = signal<ViewMode>('table');

  // ── Pagination ───────────────────────────────────────────────────────────
  currentPage = signal(1);
  pageSize = signal(9);

  // ── Modals / menus ───────────────────────────────────────────────────────
  showDeleteConfirm = signal(false);
  deleteTargetId = signal<number | null>(null);
  bulkDeleteCount = signal<number | null>(null);

  openMenuId = signal<number | null>(null);
  menuPosition = signal<MenuPosition | null>(null);
  menuProduct = computed(() => this._products().find(p => p.id === this.openMenuId()) ?? null);

  // Edit modal — holds the full product being edited (null = closed)
  editingProduct = signal<AdminProduct | null>(null);

  categories = ['All', 'Electronics', 'Smartphones', 'Laptops', 'Audio', 'Watches', 'Shoes', 'Accessories', 'Gaming', 'Fashion'];

  statusTabs: { key: ProductStatus | 'all'; label: string }[] = [
    { key: 'all',      label: 'All Products' },
    { key: 'active',   label: 'Active'       },
    { key: 'draft',    label: 'Draft'        },
    { key: 'archived', label: 'Archived'     },
  ];

  sortOptions: { key: SortKey; label: string }[] = [
    { key: 'nameAsc',    label: 'Name (A–Z)' },
    { key: 'nameDesc',   label: 'Name (Z–A)' },
    { key: 'priceHigh',  label: 'Price: High to Low' },
    { key: 'priceLow',   label: 'Price: Low to High' },
    { key: 'stockHigh',  label: 'Stock: High to Low' },
    { key: 'stockLow',   label: 'Stock: Low to High' },
    { key: 'salesHigh',  label: 'Best Selling' },
    { key: 'salesLow',   label: 'Least Selling' },
    { key: 'statusAsc',  label: 'Status' },
  ];

  // ── Mock data ──────────────────────────────────────────────────────────────
  private _products = signal<AdminProduct[]>([
    { id: 1,  name: 'WH-XM6 Wireless ANC',    brand: 'Sony',    category: 'Audio',       price: 249,  stock: 12,  status: 'active',   sales: 284, image: '/products/headphones.png',                     sku: 'SONY-WH-XM6',  featured: true  },
    { id: 2,  name: 'Ultra Watch Series 3',    brand: 'Apple',   category: 'Watches',     price: 189,  stock: 18,  status: 'active',   sales: 87,  image: '/products/appel watch.png',                    sku: 'APL-UW-S3',    featured: false },
    { id: 3,  name: 'AirPods Pro 2nd Gen',     brand: 'Apple',   category: 'Electronics', price: 199,  stock: 25,  status: 'active',   sales: 217, image: '/products/airpods pro w1.png',                 sku: 'APL-APP-2G',   featured: true  },
    { id: 4,  name: 'MacBook Pro M3',          brand: 'Apple',   category: 'Laptops',     price: 1999, stock: 5,   status: 'active',   sales: 98,  image: '/products/macbook pro 13.png',                 sku: 'APL-MBP-M3',   featured: true  },
    { id: 5,  name: 'Galaxy S24 Ultra',        brand: 'Samsung', category: 'Smartphones', price: 1099, stock: 8,   status: 'active',   sales: 143, image: '/products/samsung galxy s24 ultra silver.png', sku: 'SAM-S24U',     featured: false },
    { id: 6,  name: 'Air Max 270',             brand: 'Nike',    category: 'Shoes',       price: 129,  stock: 30,  status: 'active',   sales: 76,  image: '/products/shoes.png',                          sku: 'NIKE-AM270',   featured: false },
    { id: 7,  name: 'iPad Pro 12.9"',          brand: 'Apple',   category: 'Electronics', price: 1099, stock: 0,   status: 'active',   sales: 54,  image: '/products/airpods pro w2.png',                 sku: 'APL-IPD-PRO',  featured: false },
    { id: 8,  name: 'Surface Pro 9',           brand: 'Microsoft', category: 'Laptops',   price: 1299, stock: 7,   status: 'draft',    sales: 0,   image: '/products/macbook pro 13.png',                 sku: 'MS-SP9',       featured: false },
    { id: 9,  name: 'Galaxy Buds Pro 2',       brand: 'Samsung', category: 'Audio',       price: 149,  stock: 22,  status: 'active',   sales: 61,  image: '/products/airpods pro b1.png',                 sku: 'SAM-GBP2',     featured: false },
    { id: 10, name: 'Pixel Watch 2',           brand: 'Google',  category: 'Watches',     price: 299,  stock: 9,   status: 'active',   sales: 38,  image: '/products/appel watch.png',                    sku: 'GOO-PW2',      featured: false },
    { id: 11, name: 'OnePlus 12 Pro',          brand: 'OnePlus', category: 'Smartphones', price: 799,  stock: 14,  status: 'draft',    sales: 0,   image: '/products/samsung galxy s24 ultra silver.png', sku: 'OP-12P',       featured: false },
    { id: 12, name: 'Sony WF-1000XM5',        brand: 'Sony',    category: 'Audio',       price: 279,  stock: 16,  status: 'archived', sales: 112, image: '/products/headphones.png',                     sku: 'SONY-WF1000X', featured: false },
  ]);

  // ══════════════════════════════════════════════════════════════════════
  // Computed pipeline: filter → sort → paginate
  // ══════════════════════════════════════════════════════════════════════

  filtered = computed(() => {
    let list = [...this._products()];

    const s = this.activeStatus();
    if (s !== 'all') list = list.filter(p => p.status === s);

    const c = this.activeCategory();
    if (c !== 'All') list = list.filter(p => p.category === c);

    const q = this.searchQuery().trim().toLowerCase();
    if (q) list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );

    return list;
  });

  sorted = computed(() => {
    const list = [...this.filtered()];
    const key = this.sortKey();

    list.sort((a, b) => {
      switch (key) {
        case 'nameAsc':   return a.name.localeCompare(b.name);
        case 'nameDesc':  return b.name.localeCompare(a.name);
        case 'priceHigh': return b.price - a.price;
        case 'priceLow':  return a.price - b.price;
        case 'stockHigh': return b.stock - a.stock;
        case 'stockLow':  return a.stock - b.stock;
        case 'salesHigh': return b.sales - a.sales;
        case 'salesLow':  return a.sales - b.sales;
        case 'statusAsc': return a.status.localeCompare(b.status);
        default: return 0;
      }
    });

    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.sorted().length / this.pageSize())));

  paginated = computed(() => {
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.sorted().slice(start, start + size);
  });

  pageRangeLabel = computed(() => {
    const total = this.sorted().length;
    if (total === 0) return '0 results';
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return `${start}–${end} of ${total}`;
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const span = 1;
    const range: number[] = [];
    for (let i = Math.max(1, current - span); i <= Math.min(total, current + span); i++) range.push(i);
    return range;
  });

  // Counts for status tabs
  countFor(status: ProductStatus | 'all'): number {
    if (status === 'all') return this._products().length;
    return this._products().filter(p => p.status === status).length;
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  totalProducts    = computed(() => this._products().length);
  activeCount      = computed(() => this._products().filter(p => p.status === 'active').length);
  lowStockCount    = computed(() => this._products().filter(p => p.stock > 0 && p.stock <= 10).length);
  outOfStockCount  = computed(() => this._products().filter(p => p.stock === 0).length);
  featuredCount    = computed(() => this._products().filter(p => p.featured).length);
  inventoryValue   = computed(() => this._products().reduce((sum, p) => sum + p.price * p.stock, 0));

  // ── Multi-select ──────────────────────────────────────────────────────────
  selectedIds = signal<Set<number>>(new Set());
  selectedCount = computed(() => this.selectedIds().size);
  allPageSelected = computed(() =>
    this.paginated().length > 0 &&
    this.paginated().every(p => this.selectedIds().has(p.id))
  );
  somePageSelected = computed(() =>
    this.paginated().some(p => this.selectedIds().has(p.id)) && !this.allPageSelected()
  );

  toggleSelect(id: number, event?: Event): void {
    event?.stopPropagation();
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleSelectAll(): void {
    const shouldSelect = !this.allPageSelected();
    this.selectedIds.update(set => {
      const next = new Set(set);
      this.paginated().forEach(p => shouldSelect ? next.add(p.id) : next.delete(p.id));
      return next;
    });
  }

  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  clearSelection(): void { this.selectedIds.set(new Set()); }

  // ── Sort / view / page size ─────────────────────────────────────────────
  setSort(key: SortKey): void { this.sortKey.set(key); }
  setViewMode(mode: ViewMode): void { this.viewMode.set(mode); }
  setPageSize(size: number): void { this.pageSize.set(size); this.currentPage.set(1); }

  // ── Filters ───────────────────────────────────────────────────────────────
  setStatus(s: ProductStatus | 'all'): void { this.activeStatus.set(s); this.currentPage.set(1); this.clearSelection(); }
  setCategory(c: string): void { this.activeCategory.set(c); this.currentPage.set(1); }

  hasAnyActiveFilter = computed(() =>
    !!this.searchQuery() || this.activeCategory() !== 'All' || this.activeStatus() !== 'all'
  );

  clearFilters(): void {
    this.searchQuery.set('');
    this.activeCategory.set('All');
    this.activeStatus.set('all');
    this.currentPage.set(1);
  }

  onSearch(value: string): void { this.searchQuery.set(value); this.currentPage.set(1); }

  // ── Row menu ─────────────────────────────────────────────────────────────
  // Computes a fixed, viewport-clamped position from the trigger button so the
  // menu is never clipped by the table's scroll container and never runs off
  // the bottom/right edge of the screen.
  toggleMenu(product: AdminProduct, event: Event): void {
    event.stopPropagation();

    if (this.openMenuId() === product.id) {
      this.closeMenu();
      return;
    }

    const btn = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const MENU_WIDTH = 180;
    const MENU_HEIGHT = 176; // approx height for 4 items + divider
    const GAP = 6;

    const spaceBelow = window.innerHeight - btn.bottom;
    const openUp = spaceBelow < MENU_HEIGHT + GAP && btn.top > MENU_HEIGHT + GAP;

    const left = Math.min(
      Math.max(8, btn.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - 8
    );
    const top = openUp ? (btn.top - GAP) : (btn.bottom + GAP);

    this.menuPosition.set({ top, left, openUp });
    this.openMenuId.set(product.id);
  }

  closeMenu(): void {
    this.openMenuId.set(null);
    this.menuPosition.set(null);
  }

  @HostListener('window:resize')
  onWindowResize(): void { this.closeMenu(); }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  addProduct(): void { this.router.navigate(['/admin/products/new']); }

  /** Opens the Edit Product modal for this product instead of navigating away. */
  editProduct(id: number): void {
    this.closeMenu();
    const product = this._products().find(p => p.id === id) ?? null;
    this.editingProduct.set(product);
  }

  closeEditModal(): void {
    this.editingProduct.set(null);
  }

  onProductSaved(updated: AdminProduct): void {
    this._products.update(list => list.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    this.editingProduct.set(null);
    this.showToast(`"${updated.name}" updated`);
    // Spring Boot: PUT /api/admin/products/{id}
  }

  duplicateProduct(product: AdminProduct, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    const copy: AdminProduct = {
      ...product,
      id: Date.now(),
      name: product.name + ' (Copy)',
      status: 'draft',
      sales: 0,
      sku: product.sku + '-COPY',
    };
    this._products.update(list => [copy, ...list]);
    this.showToast(`"${product.name}" duplicated as draft`);
  }

  toggleStatus(product: AdminProduct, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    const next: ProductStatus = product.status === 'active' ? 'archived' : 'active';
    this._products.update(list =>
      list.map(p => p.id === product.id ? { ...p, status: next } : p)
    );
    this.showToast(`"${product.name}" set to ${next}`);
    // Spring Boot: PUT /api/admin/products/{id}/status { status: next }
  }

  confirmDelete(id: number, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    this.deleteTargetId.set(id);
    this.showDeleteConfirm.set(true);
  }

  executeDelete(): void {
    const id = this.deleteTargetId();
    if (id !== null) {
      const product = this._products().find(p => p.id === id);
      this._products.update(list => list.filter(p => p.id !== id));
      this.selectedIds.update(set => { const next = new Set(set); next.delete(id); return next; });
      this.showToast(`"${product?.name}" deleted`);
      this.showDeleteConfirm.set(false);
      this.deleteTargetId.set(null);
      // Spring Boot: DELETE /api/admin/products/{id}
      return;
    }

    if (this.bulkDeleteCount() !== null) {
      const ids = this.selectedIds();
      this._products.update(list => list.filter(p => !ids.has(p.id)));
      this.showToast(`${ids.size} product${ids.size === 1 ? '' : 's'} deleted`);
      this.clearSelection();
      this.bulkDeleteCount.set(null);
      this.showDeleteConfirm.set(false);
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deleteTargetId.set(null);
    this.bulkDeleteCount.set(null);
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────
  bulkDelete(): void {
    const count = this.selectedIds().size;
    if (!count) return;
    this.bulkDeleteCount.set(count);
    this.showDeleteConfirm.set(true);
  }

  bulkSetStatus(status: ProductStatus): void {
    const ids = this.selectedIds();
    if (!ids.size) return;
    this._products.update(list =>
      list.map(p => ids.has(p.id) ? { ...p, status } : p)
    );
    this.showToast(`${ids.size} product${ids.size > 1 ? 's' : ''} set to ${status}`);
    this.clearSelection();
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  // ── Export ────────────────────────────────────────────────────────────────
  private toCsv(rows: AdminProduct[]): string {
    const header = ['Name', 'Brand', 'Category', 'Price', 'Stock', 'Status', 'Sales', 'SKU', 'Featured'];
    const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

    const lines = rows.map(p => [
      p.name, p.brand, p.category, p.price, p.stock, p.status, p.sales, p.sku, p.featured ? 'Yes' : 'No',
    ].map(escape).join(','));

    return [header.map(escape).join(','), ...lines].join('\n');
  }

  private downloadFile(content: string, filename: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportCsv(): void {
    const csv = this.toCsv(this.sorted());
    this.downloadFile(csv, `products-export-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    this.showToast('Products exported');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  stockColor(stock: number): 'green' | 'amber' | 'red' {
    if (stock === 0) return 'red';
    if (stock <= 10) return 'amber';
    return 'green';
  }

  trackById(_: number, p: AdminProduct): number { return p.id; }

  showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMsg.set(msg);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 2800);
  }

  @HostListener('document:click')
  onDocClick(): void { this.closeMenu(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
    this.cancelDelete();
    // Note: the edit modal has its own Escape handler and will close itself
    // first (it stops at the lightbox, then the dialog) — no extra call needed here.
  }

  ngOnInit(): void {
    setTimeout(() => this.isLoading.set(false), 600);
  }
}