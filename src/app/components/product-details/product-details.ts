import {
  Component, signal, computed, OnInit, OnDestroy, inject, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

export interface ProductColor {
  label: string;
  hex: string;
}

export interface ProductDetail {
  id: number;
  brand: string;
  name: string;
  rating: number;
  reviewCount: number;
  price: number;
  originalPrice: number;
  discount: number;
  badge?: 'new' | 'sale' | null;
  stock: number;
  bgColor: string;
  images: string[];
  colors: ProductColor[];
  category: string;
}

export interface RelatedProduct {
  id: number;
  brand: string;
  name: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  badge?: 'new' | 'sale' | null;
  discount?: number;
  image: string;
  bgColor: string;
}

export interface Review {
  id: number;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  helpful: number;
  verified: boolean;
}

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
})
export class ProductDetails implements OnInit, OnDestroy {

  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  // ── Loading state ───────────────────────────────────────────────────────────
  // True while a product is being "fetched". Drives skeleton UI everywhere.
  loading = signal(true);

  // Minimum time the skeleton stays visible so it doesn't just flash on fast
  // loads (real APIs would replace this with the actual request latency).
  private readonly SIMULATED_LOAD_MS = 700;
  private loadToken = 0;

  // ── All products data ────────────────────────────────────────────────────────
  private allProducts: ProductDetail[] = [
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
      stock: 12,
      bgColor: '#eef0f8',
      images: [
        '/products/headphones.png',
        '/products/headphones-side.png',
        '/products/headphones-case.png',
        '/products/headphones-box.png',
      ],
      colors: [
        { label: 'Black',  hex: '#1a1a1a' },
        { label: 'Navy',   hex: '#1e3a6e' },
        { label: 'Red',    hex: '#c0392b' },
        { label: 'Silver', hex: '#c8c8c8' },
      ],
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
      stock: 8,
      bgColor: '#f0eef8',
      images: ['/products/appel watch.png'],
      colors: [
        { label: 'Midnight',  hex: '#1a1a1a' },
        { label: 'Starlight', hex: '#e8e3d8' },
      ],
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
      stock: 25,
      bgColor: '#eef8f2',
      images: ['/products/airpods pro.png'],
      colors: [{ label: 'White', hex: '#f5f5f5' }],
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
      stock: 5,
      bgColor: '#f8f5ee',
      images: ['/products/macbook pro 13.png'],
      colors: [
        { label: 'Space Gray', hex: '#5f5f5f' },
        { label: 'Silver',     hex: '#e3e3e3' },
      ],
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
      stock: 14,
      bgColor: '#f0f8fe',
      images: ['/products/phone.png'],
      colors: [
        { label: 'Titanium Black', hex: '#2b2b2b' },
        { label: 'Titanium Gray',  hex: '#8a8a8a' },
      ],
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
      stock: 30,
      bgColor: '#fff3ee',
      images: ['/products/shoes.png'],
      colors: [
        { label: 'Black', hex: '#1a1a1a' },
        { label: 'White', hex: '#f5f5f5' },
      ],
      category: 'Shoes',
    },
  ];

  // ── Active product ───────────────────────────────────────────────────────────
  product!: ProductDetail;

  // ── Gallery ─────────────────────────────────────────────────────────────────
  activeImageIndex = signal(0);
  isFading         = signal(false);

  activeImage = computed(() => this.product?.images[this.activeImageIndex()] ?? '');

  selectImage(i: number) {
    if (i === this.activeImageIndex()) return;
    this.isFading.set(true);
    setTimeout(() => {
      this.activeImageIndex.set(i);
      this.isFading.set(false);
    }, 180);
  }

  // ── Colour ───────────────────────────────────────────────────────────────────
  selectedColor = signal<ProductColor>({ label: '', hex: '' });

  selectColor(c: ProductColor) {
    this.selectedColor.set(c);
  }

  // ── Quantity ─────────────────────────────────────────────────────────────────
  quantity = signal(1);

  decreaseQty() { if (this.quantity() > 1) this.quantity.update(n => n - 1); }
  increaseQty() {
    if (this.quantity() < this.product.stock) this.quantity.update(n => n + 1);
  }

  // ── Wishlist + Cart ──────────────────────────────────────────────────────────
  isWishlisted = signal(false);
  cartAdded    = signal(false);

  toggleWishlist() { this.isWishlisted.update(v => !v); }

  addToCart() {
    if (this.cartAdded()) return;
    this.cartAdded.set(true);
    setTimeout(() => this.cartAdded.set(false), 2500);
  }

  buyNow() {
    // In a real app, go to checkout with this item pre-loaded
    this.router.navigate(['/checkout'], {
      queryParams: { productId: this.product.id, qty: this.quantity() },
    });
  }

  // ── Sticky bar (show after scrolling past the CTA area) ──────────────────────
  stickyBarVisible = signal(false);

  @HostListener('window:scroll')
  onScroll() {
    this.stickyBarVisible.set(window.scrollY > 480);
  }

  // ── Related products ─────────────────────────────────────────────────────────
  related: RelatedProduct[] = [];

  private buildRelated() {
    const sameCategory = this.allProducts
      .filter(p => p.id !== this.product.id && p.category === this.product.category)
      .slice(0, 4);

    const extras = this.allProducts
      .filter(p => p.id !== this.product.id && !sameCategory.some(r => r.id === p.id))
      .slice(0, 4 - sameCategory.length);

    this.related = [...sameCategory, ...extras].map(p => ({
      id: p.id,
      brand: p.brand,
      name: p.name,
      price: p.price,
      originalPrice: p.originalPrice,
      rating: p.rating,
      reviewCount: p.reviewCount,
      badge: p.badge,
      discount: p.discount,
      image: p.images[0],
      bgColor: p.bgColor,
    }));
  }

  /**
   * Navigating to a related product should feel like a fresh page load:
   * scroll to top, show skeletons, then populate with the new product's data.
   * We navigate via the Router so the URL/history updates correctly; the
   * actual reload-and-skeleton behavior is driven by the paramMap subscription
   * in ngOnInit, which calls loadProduct() whenever the :id changes.
   */
  goToProduct(id: number) {
    if (this.product && id === this.product.id) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.router.navigate(['/products', id]);
  }

  // ── Reviews ──────────────────────────────────────────────────────────────────
  reviews: Review[] = [
    {
      id: 1,
      author: 'Alex Morgan',
      avatar: 'AM',
      rating: 5,
      date: 'May 18, 2025',
      title: "Best headphones I've ever owned",
      body: 'The noise cancellation is absolutely incredible. I use these daily on my commute and they block out everything. Sound quality is warm and detailed without being overly bass-heavy. Battery easily lasts a full work week.',
      helpful: 42,
      verified: true,
    },
    {
      id: 2,
      author: 'Jamie Lee',
      avatar: 'JL',
      rating: 4,
      date: 'Apr 30, 2025',
      title: 'Excellent ANC, slightly tight fit',
      body: 'Sound and noise cancellation are top-tier. My only gripe is that after 2–3 hours of continuous wear they get a little snug. That said, build quality feels premium and the carrying case is compact.',
      helpful: 28,
      verified: true,
    },
    {
      id: 3,
      author: 'Sam Rivera',
      avatar: 'SR',
      rating: 5,
      date: 'Apr 12, 2025',
      title: 'Worth every penny',
      body: 'I compared these against Bose QC45 and Sony simply wins. The transparency mode is natural and the touch controls are responsive. LDAC support is a bonus for Android users.',
      helpful: 19,
      verified: false,
    },
    {
      id: 4,
      author: 'Taylor Kim',
      avatar: 'TK',
      rating: 4,
      date: 'Mar 5, 2025',
      title: 'Great upgrade from XM4',
      body: 'If you already own the XM4, the jump feels incremental but real — better mid-range clarity and a tighter soundstage. Multipoint connection finally works flawlessly.',
      helpful: 15,
      verified: true,
    },
  ];

  ratingBreakdown = [
    { stars: 5, pct: 72 },
    { stars: 4, pct: 18 },
    { stars: 3, pct: 6  },
    { stars: 2, pct: 2  },
    { stars: 1, pct: 2  },
  ];

  newReview = { author: '', title: '', body: '', rating: 0 };
  hoverRating    = signal(0);
  submitted      = signal(false);
  showAllReviews = signal(false);

  starLabels = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  visibleReviews = computed(() =>
    this.showAllReviews() ? this.reviews : this.reviews.slice(0, 2)
  );

  setNewRating(r: number)   { this.newReview.rating = r; }
  setHoverRating(r: number) { this.hoverRating.set(r); }
  clearHover()              { this.hoverRating.set(0); }

  submitReview() {
    if (!this.newReview.author || !this.newReview.body || !this.newReview.rating) return;
    this.reviews.unshift({
      id: Date.now(),
      author: this.newReview.author,
      avatar: this.newReview.author
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      rating: this.newReview.rating,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      }),
      title: this.newReview.title || 'My Review',
      body: this.newReview.body,
      helpful: 0,
      verified: false,
    });
    this.newReview = { author: '', title: '', body: '', rating: 0 };
    this.submitted.set(true);
    setTimeout(() => this.submitted.set(false), 4000);
  }

  markHelpful(review: Review) { review.helpful++; }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  getStars(rating: number): ('full' | 'half' | 'empty')[] {
    return Array.from({ length: 5 }, (_, i) => {
      const pos = i + 1;
      if (rating >= pos) return 'full';
      if (rating >= pos - 0.5) return 'half';
      return 'empty';
    });
  }

  // ── Load logic ────────────────────────────────────────────────────────────────
  private loadProduct(id: number) {
    // Invalidate any in-flight simulated load so a rapid second navigation
    // (e.g. clicking through several related products quickly) can't let an
    // older timeout overwrite newer data.
    const token = ++this.loadToken;

    this.loading.set(true);

    // Reset interactive state immediately so stale values never show once
    // the skeleton clears, even before the new product data has arrived.
    this.activeImageIndex.set(0);
    this.isFading.set(false);
    this.quantity.set(1);
    this.isWishlisted.set(false);
    this.cartAdded.set(false);
    this.showAllReviews.set(false);
    this.stickyBarVisible.set(false);

    setTimeout(() => {
      if (token !== this.loadToken) return; // a newer load superseded this one

      const found = this.allProducts.find(p => p.id === id);
      this.product = found ?? this.allProducts[0];

      this.selectedColor.set(this.product.colors[0] ?? { label: '', hex: '' });
      this.buildRelated();

      this.loading.set(false);
    }, this.SIMULATED_LOAD_MS);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  private routeSub: any;

  ngOnInit() {
    const initialId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct(initialId);

    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id && (!this.product || id !== this.product.id)) {
        this.loadProduct(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }
}