import {
  Component,
  signal,
  computed,
  OnInit,
  inject,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// ─── Interfaces ───────────────────────────────────────────────────────────────
// FavoriteProduct maps 1:1 to a MongoDB document.
// When Spring Boot is ready, swap mock data for:
//   GET  /api/favorites          → FavoriteProduct[]
//   POST /api/favorites/{id}     → add
//   DELETE /api/favorites/{id}   → remove
//   DELETE /api/favorites        → clear all

export interface FavoriteProduct {
  id: number;
  brand: string;
  name: string;
  rating: number;
  reviewCount: number;
  price: number;
  originalPrice: number;
  discount: number;
  badge?: 'new' | 'sale' | null;
  image: string;
  bgColor: string;
  category: string;
  addedAt: Date;          // drives "Newest Added" sort
  addedToCart?: boolean;
  selected?: boolean;     // multi-select mode
}

export type SortOption =
  | 'Newest Added'
  | 'Oldest Added'
  | 'Price: Low to High'
  | 'Price: High to Low'
  | 'Highest Rating'
  | 'Biggest Discount'
  | 'Brand'
  | 'Category';

// ─── Component ────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-favorites',
  imports: [CommonModule, FormsModule],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class Favorites implements OnInit {
  private router = inject(Router);

  // ── Loading ────────────────────────────────────────────────────────────────
  isLoading = signal(true);
  skeletonItems = [1, 2, 3, 4, 5, 6];

  // ── Search ────────────────────────────────────────────────────────────────
  searchQuery = '';

  // ── Sort ──────────────────────────────────────────────────────────────────
  sortOptions: SortOption[] = [
    'Newest Added',
    'Oldest Added',
    'Price: Low to High',
    'Price: High to Low',
    'Highest Rating',
    'Biggest Discount',
    'Brand',
    'Category',
  ];
  activeSort = signal<SortOption>('Newest Added');
  sortDropdownOpen = signal(false);

  // ── Category filter ────────────────────────────────────────────────────────
  categories = [
    'All',
    'Electronics',
    'Smartphones',
    'Laptops',
    'Audio',
    'Watches',
    'Shoes',
    'Gaming',
    'Fashion',
    'Accessories',
  ];
  activeCategory = signal('All');

  // ── Multi-select ──────────────────────────────────────────────────────────
  multiSelectMode = signal(false);
  showConfirmClear = signal(false);
  showConfirmRemoveSelected = signal(false);

  // ── Remove animation ──────────────────────────────────────────────────────
  removingId = signal<number | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────
  toastMessage = signal<string | null>(null);
  private toastTimer: any;

  // ── Mock data ─────────────────────────────────────────────────────────────
  private allFavorites = signal<FavoriteProduct[]>([
    {
      id: 1,
      brand: 'Sony',
      name: 'WH-XM6 Wireless ANC',
      rating: 4.8,
      reviewCount: 2148,
      price: 249,
      originalPrice: 329,
      discount: 24,
      badge: 'new',
      image: '/products/headphones.png',
      bgColor: '#eef0f8',
      category: 'Audio',
      addedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      id: 3,
      brand: 'Apple',
      name: 'AirPods Pro 2nd Gen',
      rating: 4.9,
      reviewCount: 3412,
      price: 199,
      originalPrice: 249,
      discount: 20,
      badge: 'new',
      image: '/products/airpods pro w1.png',
      bgColor: '#eef8f2',
      category: 'Electronics',
      addedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
      id: 5,
      brand: 'Samsung',
      name: 'Galaxy S24 Ultra',
      rating: 4.7,
      reviewCount: 1890,
      price: 1099,
      originalPrice: 1299,
      discount: 15,
      badge: 'sale',
      image: '/products/samsung galxy s24 ultra silver.png',
      bgColor: '#f0f8fe',
      category: 'Smartphones',
      addedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      id: 2,
      brand: 'Apple',
      name: 'Ultra Watch Series 3',
      rating: 4.7,
      reviewCount: 876,
      price: 189,
      originalPrice: 315,
      discount: 40,
      badge: 'sale',
      image: '/products/appel watch.png',
      bgColor: '#f0eef8',
      category: 'Watches',
      addedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: 4,
      brand: 'Apple',
      name: 'MacBook Pro M3',
      rating: 4.8,
      reviewCount: 513,
      price: 1999,
      originalPrice: 2199,
      discount: 9,
      badge: null,
      image: '/products/macbook pro 13.png',
      bgColor: '#f8f5ee',
      category: 'Laptops',
      addedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 6,
      brand: 'Nike',
      name: 'Air Max 270',
      rating: 4.6,
      reviewCount: 742,
      price: 129,
      originalPrice: 160,
      discount: 19,
      badge: null,
      image: '/products/shoes.png',
      bgColor: '#fff3ee',
      category: 'Shoes',
      addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ]);

  // ── Derived: filtered + sorted ────────────────────────────────────────────
  visibleProducts = computed(() => {
    let list = [...this.allFavorites()];

    // Category filter
    if (this.activeCategory() !== 'All') {
      list = list.filter(p => p.category === this.activeCategory());
    }

    // Search
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (this.activeSort()) {
      case 'Oldest Added':
        list.sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime());
        break;
      case 'Price: Low to High':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'Price: High to Low':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'Highest Rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'Biggest Discount':
        list.sort((a, b) => b.discount - a.discount);
        break;
      case 'Brand':
        list.sort((a, b) => a.brand.localeCompare(b.brand));
        break;
      case 'Category':
        list.sort((a, b) => a.category.localeCompare(b.category));
        break;
      default: // 'Newest Added'
        list.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
    }

    return list;
  });

  totalCount    = computed(() => this.allFavorites().length);
  selectedCount = computed(() => this.allFavorites().filter(p => p.selected).length);
  allSelected   = computed(
    () => this.visibleProducts().length > 0 &&
          this.visibleProducts().every(p => p.selected)
  );

  hasActiveFilters = computed(
    () => this.activeCategory() !== 'All' || !!this.searchQuery.trim()
  );

  // ── Sort ──────────────────────────────────────────────────────────────────
  setSort(opt: SortOption): void {
    this.activeSort.set(opt);
    this.sortDropdownOpen.set(false);
  }

  toggleSortDropdown(): void {
    this.sortDropdownOpen.update(v => !v);
  }

  // ── Category ──────────────────────────────────────────────────────────────
  setCategory(cat: string): void {
    this.activeCategory.set(cat);
  }

  // ── Search ────────────────────────────────────────────────────────────────
  onSearch(): void { /* computed auto-updates */ }

  clearSearch(): void {
    this.searchQuery = '';
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.activeCategory.set('All');
    this.activeSort.set('Newest Added');
  }

  // ── Remove single ─────────────────────────────────────────────────────────
  removeFavorite(product: FavoriteProduct, event: Event): void {
    event.stopPropagation();
    this.removingId.set(product.id);
    setTimeout(() => {
      this.allFavorites.update(list => list.filter(p => p.id !== product.id));
      this.removingId.set(null);
      this.showToast(`${product.name} removed from favorites`);
      // Spring Boot: DELETE /api/favorites/{product.id}
    }, 360);
  }

  // ── Add to cart ───────────────────────────────────────────────────────────
  addToCart(product: FavoriteProduct, event: Event): void {
    event.stopPropagation();
    this.allFavorites.update(list =>
      list.map(p => (p.id === product.id ? { ...p, addedToCart: true } : p))
    );
    setTimeout(() => {
      this.allFavorites.update(list =>
        list.map(p => (p.id === product.id ? { ...p, addedToCart: false } : p))
      );
    }, 2200);
    this.showToast(`${product.name} added to cart`);
    // Spring Boot: POST /api/cart { productId: product.id, quantity: 1 }
  }

  // ── Buy now ───────────────────────────────────────────────────────────────
  buyNow(product: FavoriteProduct, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/checkout'], { queryParams: { productId: product.id } });
  }

  // ── View details ──────────────────────────────────────────────────────────
  viewProduct(product: FavoriteProduct): void {
    this.router.navigate(['/products', product.id]);
  }

  // ── Multi-select ──────────────────────────────────────────────────────────
  toggleMultiSelect(): void {
    this.multiSelectMode.update(v => !v);
    if (!this.multiSelectMode()) {
      // Deselect all on exit
      this.allFavorites.update(list => list.map(p => ({ ...p, selected: false })));
    }
  }

  toggleSelect(product: FavoriteProduct, event: Event): void {
    event.stopPropagation();
    this.allFavorites.update(list =>
      list.map(p => (p.id === product.id ? { ...p, selected: !p.selected } : p))
    );
  }

  toggleSelectAll(): void {
    const allAreSelected = this.allSelected();
    this.allFavorites.update(list =>
      list.map(p => ({ ...p, selected: !allAreSelected }))
    );
  }

  confirmRemoveSelected(): void {
    this.showConfirmRemoveSelected.set(true);
  }

  executeRemoveSelected(): void {
    this.allFavorites.update(list => list.filter(p => !p.selected));
    this.showConfirmRemoveSelected.set(false);
    this.multiSelectMode.set(false);
    this.showToast('Selected items removed from favorites');
    // Spring Boot: DELETE /api/favorites/bulk { ids: [...] }
  }

  moveSelectedToCart(): void {
    const selected = this.allFavorites().filter(p => p.selected);
    selected.forEach(p => {
      this.allFavorites.update(list =>
        list.map(f => (f.id === p.id ? { ...f, addedToCart: true } : f))
      );
    });
    this.showToast(`${selected.length} item${selected.length > 1 ? 's' : ''} added to cart`);
    // Spring Boot: POST /api/cart/bulk { productIds: selected.map(p => p.id) }
    this.multiSelectMode.set(false);
    this.allFavorites.update(list => list.map(p => ({ ...p, selected: false })));
  }

  confirmClearAll(): void {
    this.showConfirmClear.set(true);
  }

  executeClearAll(): void {
    this.allFavorites.set([]);
    this.showConfirmClear.set(false);
    this.multiSelectMode.set(false);
    // Spring Boot: DELETE /api/favorites
  }

  cancelConfirm(): void {
    this.showConfirmClear.set(false);
    this.showConfirmRemoveSelected.set(false);
  }

  // ── Navigate ──────────────────────────────────────────────────────────────
  exploreProducts(): void {
    this.router.navigate(['/products']);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getStars(rating: number): ('full' | 'half' | 'empty')[] {
    return Array.from({ length: 5 }, (_, i) => {
      const pos = i + 1;
      if (rating >= pos) return 'full';
      if (rating >= pos - 0.5) return 'half';
      return 'empty';
    });
  }

  trackById(_: number, p: FavoriteProduct): number {
    return p.id;
  }

  private showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMessage.set(msg);
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 3000);
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.sortDropdownOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.sortDropdownOpen.set(false);
    this.cancelConfirm();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Replace with: this.http.get<FavoriteProduct[]>('/api/favorites').subscribe(...)
    setTimeout(() => this.isLoading.set(false), 650);
  }
}