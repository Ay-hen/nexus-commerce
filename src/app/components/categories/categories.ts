import {
  Component,
  signal,
  computed,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  desc: string;
  image: string;
  icon: string;          // emoji or SVG path key
  productCount: number;
  accentColor: string;   // card bg tint
  trending?: boolean;
  badge?: 'hot' | 'new' | null;
}

export interface Collection {
  id: number;
  name: string;
  subtitle: string;
  tag: string;
  image: string;
  bgGradient: string;
  cta: string;
  route: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories implements OnInit, OnDestroy {

  // ── Search ──────────────────────────────────────────────────────────────────
  searchQuery = '';
  heroSearchFocused = signal(false);

  // ── Hover state ─────────────────────────────────────────────────────────────
  hoveredFeaturedId = signal<number | null>(null);
  hoveredPopularId  = signal<number | null>(null);

  // ── Loading ─────────────────────────────────────────────────────────────────
  isLoading = signal(true);

  // ── Ticker pause ────────────────────────────────────────────────────────────
  tickerPaused = signal(false);

  // ─── Featured categories (large cards — Section 2) ──────────────────────────
  featuredCategories: Category[] = [
    {
      id: 1,
      name: 'Electronics',
      desc: 'Laptops, phones, headphones & more',
      image: '/categories/electronics.png',
      icon: '/icons/electronics.png',
      productCount: 248,
      accentColor: '#eef0f8',
      trending: true,
      badge: 'hot',
    },
    {
      id: 2,
      name: 'Fashion',
      desc: 'Trendsetting styles for every wardrobe',
      image: '/categories/fashion.png',
      icon: '/icons/fashion.png',
      productCount: 183,
      accentColor: '#f8f5ee',
      trending: false,
      badge: 'new',
    },
    {
      id: 3,
      name: 'Gaming',
      desc: 'Gear up for the ultimate experience',
      image: '/categories/gaming.png',
      icon: '/icons/controller.png',
      productCount: 97,
      accentColor: '#f0eef8',
      trending: true,
      badge: 'hot',
    },
    {
      id: 4,
      name: 'Watches',
      desc: 'Precision crafted for modern life',
      image: '/categories/watches.png',
      icon: '/icons/watches.png',
      productCount: 64,
      accentColor: '#eef8f2',
      trending: false,
      badge: null,
    },
    {
      id: 5,
      name: 'Shoes',
      desc: 'Comfort meets iconic design',
      image: '/categories/shoes.png',
      icon: '/icons/shoes.png',
      productCount: 112,
      accentColor: '#fff3ee',
      trending: true,
      badge: null,
    },
    {
      id: 6,
      name: 'Accessories',
      desc: 'The finishing touch to every look',
      image: '/products/airpods pro w1.png',
      icon: '/icons/accessories.png',
      productCount: 156,
      accentColor: '#f0f8fe',
      trending: false,
      badge: 'new',
    },
  ];

  // ─── Popular categories (compact grid — Section 3) ───────────────────────────
  popularCategories: Category[] = [
    {
      id: 10,
      name: 'Smartphones',
      desc: 'Innovation in your hands',
      image: '/categories/phone.png',
      icon: '/icons/smartphone.png',
      productCount: 74,
      accentColor: '#f0f8fe',
      trending: true,
      badge: 'hot',
    },
    {
      id: 11,
      name: 'Laptops',
      desc: 'High performance for every task',
      image: '/categories/laptop.png',
      icon: '/icons/laptop.png',
      productCount: 59,
      accentColor: '#f8f5ee',
      trending: true,
      badge: null,
    },
    {
      id: 12,
      name: 'Wearables',
      desc: 'Technology that moves with you',
      image: '/categories/watch.png',
      icon: '/icons/wearables.png',
      productCount: 41,
      accentColor: '#eef8f2',
      trending: true,
      badge: null,
    },
    {
      id: 13,
      name: 'Home & Living',
      desc: 'Smart products for modern homes',
      image: '/products/macbook pro 13.png',
      icon: '/icons/living.png',
      productCount: 133,
      accentColor: '#fff3ee',
      trending: false,
      badge: 'new',
    },
    {
      id: 14,
      name: 'Cameras',
      desc: 'Capture every perfect moment',
      image: '/products/samsung galxy s24 ultra silver.png',
      icon: '📷',
      productCount: 37,
      accentColor: '#f0eef8',
      trending: true,
      badge: 'hot',
    },
    {
      id: 15,
      name: 'Tablets',
      desc: 'Work and play without limits',
      image: '/products/macbook pro 13.png',
      icon: '📋',
      productCount: 28,
      accentColor: '#f8f5ee',
      trending: false,
      badge: null,
    },
    {
      id: 16,
      name: 'Gaming Gear',
      desc: 'Level up your setup',
      image: '/products/airpods pro w1.png',
      icon: '/icons/controller.png',
      productCount: 52,
      accentColor: '#f0f8fe',
      trending: true,
      badge: 'hot',
    },
  ];

  // ─── Shop Collections (Section 4) ───────────────────────────────────────────
  collections: Collection[] = [
    {
      id: 1,
      name: 'New Arrivals',
      subtitle: 'Fresh drops every week',
      tag: 'Just In',
      image: '/products/airpods pro w1.png',
      bgGradient: 'linear-gradient(135deg, #001d3d 0%, #003566 100%)',
      cta: 'Discover Now',
      route: '/products',
    },
    {
      id: 2,
      name: 'Best Sellers',
      subtitle: 'Loved by thousands of customers',
      tag: 'Fan Favorites',
      image: '/products/macbook pro 13.png',
      bgGradient: 'linear-gradient(135deg, #0a0a0b 0%, #2d2d2f 100%)',
      cta: 'Shop Now',
      route: '/products',
    },
    {
      id: 3,
      name: 'Flash Sales',
      subtitle: 'Limited time. Unlimited savings.',
      tag: '⚡ 24H Only',
      image: '/products/samsung galxy s24 ultra silver.png',
      bgGradient: 'linear-gradient(135deg, #b01a1a 0%, #d00000 100%)',
      cta: 'Grab the Deal',
      route: '/products',
    },
    {
      id: 4,
      name: 'Premium Collection',
      subtitle: 'Curated for those who demand more',
      tag: 'Exclusive',
      image: '/products/appel watch.png',
      bgGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      cta: 'Explore',
      route: '/products',
    },
  ];

  // ─── Ticker (doubles for seamless loop) ─────────────────────────────────────
  tickerItems: Category[] = [];

  // ─── Computed: filtered featured ────────────────────────────────────────────
  filteredFeatured = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.featuredCategories;
    return this.featuredCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.desc.toLowerCase().includes(q)
    );
  });

  filteredPopular = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.popularCategories;
    return this.popularCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.desc.toLowerCase().includes(q)
    );
  });

  hasResults = computed(
    () =>
      this.filteredFeatured().length > 0 ||
      this.filteredPopular().length > 0
  );

  // ─── Stat counters ───────────────────────────────────────────────────────────
  stats = [
    { value: '1,400+', label: 'Products' },
    { value: '7', label: 'Categories' },
    { value: '4.8★', label: 'Avg Rating' },
    { value: '24h', label: 'Support' },
  ];

  // ─── Private ─────────────────────────────────────────────────────────────────
  private loadingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private router: Router) {}

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Build seamless ticker (triple for wide screens)
    this.tickerItems = [
      ...this.featuredCategories,
      ...this.popularCategories.slice(0, 4),
      ...this.featuredCategories,
      ...this.popularCategories.slice(0, 4),
    ];

    // Simulate skeleton loading
    this.isLoading.set(true);
    this.loadingTimer = setTimeout(() => this.isLoading.set(false), 700);
  }

  ngOnDestroy(): void {
    if (this.loadingTimer) clearTimeout(this.loadingTimer);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────
  onSearch(): void {
    // Signals auto-recompute filteredFeatured / filteredPopular
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  navigateToCategory(cat: Category): void {
    this.router.navigate(['/products/category', cat.name]);
  }

  navigateToCollection(col: Collection): void {
    this.router.navigate([col.route]);
  }

  // ─── Hover helpers ────────────────────────────────────────────────────────────
  setFeaturedHover(id: number | null): void {
    this.hoveredFeaturedId.set(id);
  }

  setPopularHover(id: number | null): void {
    this.hoveredPopularId.set(id);
  }

  // ─── Ticker pause/resume ──────────────────────────────────────────────────────
  pauseTicker(): void {
    this.tickerPaused.set(true);
  }

  resumeTicker(): void {
    this.tickerPaused.set(false);
  }

  // ─── Track functions ─────────────────────────────────────────────────────────
  trackById(_: number, item: Category | Collection): number {
    return (item as any).id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  // ─── Keyboard accessibility ───────────────────────────────────────────────────
  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.searchQuery) this.clearSearch();
  }
}