import { Component, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

// ─── Local types (kept inline — promote to model file once approved) ─────────
export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  productCount: number;
  status: 'active' | 'inactive';
  featured: boolean;
  createdAt: string; // ISO
}

type SortKey = 'name' | 'productCount' | 'createdAt';

@Component({
  selector: 'app-categories',
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories implements OnInit {

  // ── Loading ────────────────────────────────────────────────────────────────
  isLoading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6];

  // ── Mock data (replace with CategoryService) ──────────────────────────────
  private allCategories = signal<AdminCategory[]>([
    { id: 'c1', name: 'Electronics',  slug: 'electronics',  image: '/products/headphones.png',              productCount: 412, status: 'active',   featured: true,  createdAt: '2025-11-02' },
    { id: 'c2', name: 'Smartphones',  slug: 'smartphones',  image: '/products/samsung galxy s24 ultra silver.png', productCount: 218, status: 'active',   featured: true,  createdAt: '2025-11-10' },
    { id: 'c3', name: 'Laptops',      slug: 'laptops',      image: '/products/macbook pro 13.png',          productCount: 96,  status: 'active',   featured: false, createdAt: '2025-12-01' },
    { id: 'c4', name: 'Audio',        slug: 'audio',        image: '/products/headphones.png',              productCount: 154, status: 'active',   featured: true,  createdAt: '2025-12-14' },
    { id: 'c5', name: 'Watches',      slug: 'watches',      image: '/products/appel watch.png',             productCount: 67,  status: 'active',   featured: false, createdAt: '2026-01-05' },
    { id: 'c6', name: 'Shoes',        slug: 'shoes',        image: '/products/headphones.png',              productCount: 0,   status: 'inactive', featured: false, createdAt: '2026-01-20' },
    { id: 'c7', name: 'Accessories',  slug: 'accessories',  image: '/products/airpods pro w1.png',          productCount: 289, status: 'active',   featured: false, createdAt: '2026-02-02' },
    { id: 'c8', name: 'Gaming',       slug: 'gaming',       image: '/products/macbook pro 13.png',          productCount: 41,  status: 'inactive', featured: false, createdAt: '2026-02-18' },
    { id: 'c9', name: 'Fashion',      slug: 'fashion',      image: '/products/appel watch.png',             productCount: 178, status: 'active',   featured: true,  createdAt: '2026-03-03' },
    { id: 'c10', name: 'Home & Living', slug: 'home-living', image: '/products/headphones.png',             productCount: 12,  status: 'active',   featured: false, createdAt: '2026-03-22' },
  ]);

  // ── Search / filters ──────────────────────────────────────────────────────
  searchQuery   = signal('');
  statusFilter  = signal<'all' | 'active' | 'inactive'>('all');
  featuredOnly  = signal(false);
  sortKey       = signal<SortKey>('createdAt');
  sortDir       = signal<'asc' | 'desc'>('desc');

  // ── View mode ──────────────────────────────────────────────────────────────
  viewMode = signal<'table' | 'grid'>('table');

  // ── Pagination ────────────────────────────────────────────────────────────
  pageSize    = signal(6);
  currentPage = signal(1);

  // ── Row menu (actions dropdown) ───────────────────────────────────────────
  openMenuId = signal<string | null>(null);

  // ── Delete confirm ────────────────────────────────────────────────────────
  pendingDelete = signal<AdminCategory | null>(null);

  // ── Computed: filtered + sorted list ─────────────────────────────────────
  filteredCategories = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const featured = this.featuredOnly();
    const key = this.sortKey();
    const dir = this.sortDir();

    let list = this.allCategories().filter(c => {
      if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false;
      if (status !== 'all' && c.status !== status) return false;
      if (featured && !c.featured) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (key === 'name') cmp = a.name.localeCompare(b.name);
      else if (key === 'productCount') cmp = a.productCount - b.productCount;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return dir === 'asc' ? cmp : -cmp;
    });

    return list;
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredCategories().length / this.pageSize()))
  );

  pagedCategories = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredCategories().slice(start, start + this.pageSize());
  });

  // ── Stat cards (computed off full dataset) ────────────────────────────────
  totalCategories  = computed(() => this.allCategories().length);
  activeCategories = computed(() => this.allCategories().filter(c => c.status === 'active').length);
  featuredCount    = computed(() => this.allCategories().filter(c => c.featured).length);
  totalProducts    = computed(() => this.allCategories().reduce((sum, c) => sum + c.productCount, 0));

  pageRangeLabel = computed(() => {
    const total = this.filteredCategories().length;
    if (total === 0) return '0 results';
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return `${start}–${end} of ${total}`;
  });

  ngOnInit(): void {
    setTimeout(() => this.isLoading.set(false), 700);
  }

  // ── Search / filter handlers ──────────────────────────────────────────────
  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  toggleFeaturedOnly(): void {
    this.featuredOnly.update(v => !v);
    this.currentPage.set(1);
  }

  setSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  setViewMode(mode: 'table' | 'grid'): void {
    this.viewMode.set(mode);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.featuredOnly.set(false);
    this.currentPage.set(1);
  }

  // ── Pagination handlers ───────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const range: number[] = [];
    const span = 1;
    for (let i = Math.max(1, current - span); i <= Math.min(total, current + span); i++) {
      range.push(i);
    }
    return range;
  }

  // ── Row menu ───────────────────────────────────────────────────────────────
  toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update(cur => cur === id ? null : id);
  }

  closeMenu(): void { this.openMenuId.set(null); }

  @HostListener('document:click')
  onDocClick(): void { this.closeMenu(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
    this.pendingDelete.set(null);
  }

  // ── Delete flow ────────────────────────────────────────────────────────────
  requestDelete(cat: AdminCategory, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.pendingDelete.set(cat);
  }

  cancelDelete(): void { this.pendingDelete.set(null); }

  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target) return;
    // Replace with: this.http.delete(`/api/admin/categories/${target.id}`)
    this.allCategories.update(list => list.filter(c => c.id !== target.id));
    this.pendingDelete.set(null);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  trackById(_: number, item: AdminCategory): string { return item.id; }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  constructor(private router: Router) {}

  editCategory(id: any): void {
    this.router.navigate(['/admin/categories', id, 'edit']);  
  }

  showDetails(id: any): void {
    this.router.navigate(['/admin/categories', id]);  
  }
}