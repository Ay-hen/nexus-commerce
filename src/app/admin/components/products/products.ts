// admin-products.component.ts
import {
  Component, signal, computed, OnInit, inject, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminProduct } from '../../model/admin-models.model';

type ProductStatus = 'active' | 'draft' | 'archived';
type SortField = 'name' | 'price' | 'stock' | 'sales' | 'status';

@Component({
  selector: 'app-products',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products implements OnInit {

  protected Math = Math;
  private router = inject(Router);

  // ── State ──────────────────────────────────────────────────────────────────
  isLoading = signal(true);
  searchQuery = signal('');
  activeStatus = signal<ProductStatus | 'all'>('all');
  activeCategory = signal('All');
  sortField = signal<SortField>('name');
  sortDir = signal<'asc' | 'desc'>('asc');
  currentPage = signal(1);
  pageSize = 10;

  showDeleteConfirm = signal(false);
  deleteTargetId = signal<number | null>(null);
  sortDropdownOpen = signal(false);
  bulkActionOpen = signal(false);

  // Toast
  toastMsg = signal<string | null>(null);
  private toastTimer: any;

  categories = ['All', 'Electronics', 'Smartphones', 'Laptops', 'Audio', 'Watches', 'Shoes', 'Accessories', 'Gaming', 'Fashion'];

  statusTabs: { key: ProductStatus | 'all'; label: string }[] = [
    { key: 'all',      label: 'All Products' },
    { key: 'active',   label: 'Active'       },
    { key: 'draft',    label: 'Draft'        },
    { key: 'archived', label: 'Archived'     },
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

  // ── Computed: filtered + sorted + paginated ────────────────────────────────
  filtered = computed(() => {
    let list = [...this._products()];

    // Status filter
    const s = this.activeStatus();
    if (s !== 'all') list = list.filter(p => p.status === s);

    // Category filter
    const c = this.activeCategory();
    if (c !== 'All') list = list.filter(p => p.category === c);

    // Search
    const q = this.searchQuery().trim().toLowerCase();
    if (q) list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );

    // Sort
    const field = this.sortField();
    const dir   = this.sortDir() === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const av = a[field as keyof AdminProduct] as any;
      const bv = b[field as keyof AdminProduct] as any;
      return av < bv ? -dir : av > bv ? dir : 0;
    });

    return list;
  });

  totalPages = computed(() => Math.ceil(this.filtered().length / this.pageSize));

  paginated = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  // Counts for tabs
  countFor(status: ProductStatus | 'all'): number {
    if (status === 'all') return this._products().length;
    return this._products().filter(p => p.status === status).length;
  }

  // ── Multi-select ──────────────────────────────────────────────────────────
  selectedIds = signal<Set<number>>(new Set());
  selectedCount = computed(() => this.selectedIds().size);
  allPageSelected = computed(() =>
    this.paginated().length > 0 &&
    this.paginated().every(p => this.selectedIds().has(p.id))
  );

  toggleSelect(id: number): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleSelectAll(): void {
    if (this.allPageSelected()) {
      this.selectedIds.update(set => {
        const next = new Set(set);
        this.paginated().forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      this.selectedIds.update(set => {
        const next = new Set(set);
        this.paginated().forEach(p => next.add(p.id));
        return next;
      });
    }
  }

  isSelected(id: number): boolean { return this.selectedIds().has(id); }

  // ── Sort ──────────────────────────────────────────────────────────────────
  setSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
    this.currentPage.set(1);
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  setStatus(s: ProductStatus | 'all'): void { this.activeStatus.set(s); this.currentPage.set(1); this.selectedIds.set(new Set()); }
  setCategory(c: string): void { this.activeCategory.set(c); this.currentPage.set(1); }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  editProduct(id: number): void { this.router.navigate(['/admin/products', id, 'edit']); }
  addProduct():            void { this.router.navigate(['/admin/products/new']); }

  duplicateProduct(product: AdminProduct): void {
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

  toggleStatus(product: AdminProduct): void {
    const next: ProductStatus = product.status === 'active' ? 'archived' : 'active';
    this._products.update(list =>
      list.map(p => p.id === product.id ? { ...p, status: next } : p)
    );
    this.showToast(`"${product.name}" set to ${next}`);
    // Spring Boot: PUT /api/admin/products/{id}/status { status: next }
  }

  confirmDelete(id: number): void {
    this.deleteTargetId.set(id);
    this.showDeleteConfirm.set(true);
  }

  executeDelete(): void {
    const id = this.deleteTargetId();
    if (!id) return;
    const product = this._products().find(p => p.id === id);
    this._products.update(list => list.filter(p => p.id !== id));
    this.showDeleteConfirm.set(false);
    this.deleteTargetId.set(null);
    this.showToast(`"${product?.name}" deleted`);
    // Spring Boot: DELETE /api/admin/products/{id}
  }

  cancelDelete(): void { this.showDeleteConfirm.set(false); this.deleteTargetId.set(null); }

  // ── Bulk actions ──────────────────────────────────────────────────────────
  bulkDelete(): void {
    const ids = this.selectedIds();
    this._products.update(list => list.filter(p => !ids.has(p.id)));
    this.showToast(`${ids.size} product${ids.size > 1 ? 's' : ''} deleted`);
    this.selectedIds.set(new Set());
    this.bulkActionOpen.set(false);
  }

  bulkSetStatus(status: ProductStatus): void {
    const ids = this.selectedIds();
    this._products.update(list =>
      list.map(p => ids.has(p.id) ? { ...p, status } : p)
    );
    this.showToast(`${ids.size} product${ids.size > 1 ? 's' : ''} set to ${status}`);
    this.selectedIds.set(new Set());
    this.bulkActionOpen.set(false);
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.selectedIds.set(new Set());
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
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 3000);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancelDelete();
    this.sortDropdownOpen.set(false);
    this.bulkActionOpen.set(false);
  }

  ngOnInit(): void {
    setTimeout(() => this.isLoading.set(false), 600);
  }
}