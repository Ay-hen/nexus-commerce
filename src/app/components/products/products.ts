import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';

export interface Product {
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
  liked: boolean;
  category: string;
  addedToCart?: boolean;
}

type SortOption = 'Popular' | 'Price: Low to High' | 'Price: High to Low' | 'Newest' | 'Top Rated';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products implements OnInit {
  // ── Constants ──────────────────────────────────────────────────────────────
  categories = ['All', 'Electronics', 'Fashion', 'Gaming', 'Shoes', 'Watches'];
  sortOptions: SortOption[] = [
    'Popular',
    'Price: Low to High',
    'Price: High to Low',
    'Newest',
    'Top Rated',
  ];
  skeletonItems = [1, 2, 3, 4];
  maxPossiblePrice = 2500;

  // ── State signals ───────────────────────────────────────────────────────────
  activeCategory  = signal<string>('All');
  activeSort      = signal<SortOption>('Popular');
  visibleCount    = signal(6);
  sortDropdownOpen  = signal(false);
  priceFilterOpen   = signal(false);
  ratingFilterOpen  = signal(false);
  maxPrice          = signal(this.maxPossiblePrice);
  minRating         = signal(0);
  isLoading         = signal(false);
  searchQuery       = '';

  // ── Derived ─────────────────────────────────────────────────────────────────
  priceFilterActive = computed(() => this.maxPrice() < this.maxPossiblePrice);

  hasActiveFilters = computed(() =>
    this.activeCategory() !== 'All' ||
    this.priceFilterActive() ||
    this.minRating() > 0 ||
    !!this.searchQuery
  );

  // ── Data ────────────────────────────────────────────────────────────────────
  allProducts: Product[] = [
    {
      id: 1,
      brand: 'Sony',
      name: 'WH-XM6 Wireless ANC',
      rating: 4.5,
      reviewCount: 2148,
      price: 249,
      originalPrice: 350,
      discount: Math.round(((350 - 249) / 350) * 100),
      badge: 'new',
      image: '/products/headphones.png',
      bgColor: 'rgb(238, 240, 248)',
      liked: false,
      category: 'Electronics',
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
      liked: false,
      category: 'Watches',
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
      image: '/products/airpods pro.png',
      bgColor: '#eef8f2',
      liked: false,
      category: 'Electronics',
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
      liked: false,
      category: 'Electronics',
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
      image: '/products/phone.png',
      bgColor: '#f0f8fe',
      liked: false,
      category: 'Electronics',
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
      liked: false,
      category: 'Shoes',
    },
  ];

  // ── Computed lists ───────────────────────────────────────────────────────────
  filteredProducts = computed(() => {
    let list = [...this.allProducts];

    // Category
    if (this.activeCategory() !== 'All') {
      list = list.filter(p => p.category === this.activeCategory());
    }
    // Price
    if (this.priceFilterActive()) {
      list = list.filter(p => p.price <= this.maxPrice());
    }
    // Rating
    if (this.minRating() > 0) {
      list = list.filter(p => p.rating >= this.minRating());
    }
    // Search
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (this.activeSort()) {
      case 'Price: Low to High':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'Price: High to Low':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'Top Rated':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'Newest':
        list = [
          ...list.filter(p => p.badge === 'new'),
          ...list.filter(p => p.badge !== 'new'),
        ];
        break;
      default:
        list.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return list;
  });

  visibleProducts = computed(() =>
    this.filteredProducts().slice(0, this.visibleCount())
  );

  hasMore = computed(() =>
    this.visibleCount() < this.filteredProducts().length
  );

  // ── Actions ─────────────────────────────────────────────────────────────────
  setCategory(cat: string) {
    this.activeCategory.set(cat);
    this.visibleCount.set(6);
    this.closeAllDropdowns();
  }

  setSort(option: SortOption) {
    this.activeSort.set(option);
    this.sortDropdownOpen.set(false);
    this.visibleCount.set(6);
  }

  toggleSort() {
    const open = this.sortDropdownOpen();
    this.closeAllDropdowns();
    this.sortDropdownOpen.set(!open);
  }

  togglePriceFilter() {
    const open = this.priceFilterOpen();
    this.closeAllDropdowns();
    this.priceFilterOpen.set(!open);
  }

  toggleRatingFilter() {
    const open = this.ratingFilterOpen();
    this.closeAllDropdowns();
    this.ratingFilterOpen.set(!open);
  }

  onPriceChange(event: Event) {
    const val = +(event.target as HTMLInputElement).value;
    this.maxPrice.set(val);
    this.visibleCount.set(6);
  }

  resetPrice() {
    this.maxPrice.set(this.maxPossiblePrice);
    this.visibleCount.set(6);
  }

  setRating(r: number) {
    this.minRating.set(r);
    this.visibleCount.set(6);
    this.ratingFilterOpen.set(false);
  }

  onSearch() {
    this.visibleCount.set(6);
  }

  clearSearch() {
    this.searchQuery = '';
    this.visibleCount.set(6);
  }

  clearAllFilters() {
    this.activeCategory.set('All');
    this.maxPrice.set(this.maxPossiblePrice);
    this.minRating.set(0);
    this.searchQuery = '';
    this.visibleCount.set(6);
    this.closeAllDropdowns();
  }

  loadMore() {
    this.visibleCount.update(n => n + 6);
  }

  toggleLike(product: Product, event: Event) {
    event.stopPropagation();
    product.liked = !product.liked;
  }

  addToCart(product: Product, event: Event) {
    event.stopPropagation();
    product.addedToCart = true;
    setTimeout(() => (product.addedToCart = false), 2000);
  }

  openProduct(product: Product) {
    this.router.navigate(['/products', product.id]);
  }

  onPageClick() {
    this.closeAllDropdowns();
  }

  private closeAllDropdowns() {
    this.sortDropdownOpen.set(false);
    this.priceFilterOpen.set(false);
    this.ratingFilterOpen.set(false);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  getStars(rating: number): ('full' | 'half' | 'empty')[] {
    return Array.from({ length: 5 }, (_, i) => {
      const pos = i + 1;
      if (rating >= pos) return 'full';
      if (rating >= pos - 0.5) return 'half';
      return 'empty';
    });
  }

  getMiniStars(threshold: number): ('full' | 'empty')[] {
    return Array.from({ length: 5 }, (_, i) => (i < Math.floor(threshold) ? 'full' : 'empty'));
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  constructor(private router: Router) {}

  ngOnInit() {
    // Simulate a brief loading state on first mount
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 600);
  }
}