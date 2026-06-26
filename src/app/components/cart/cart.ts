import {
  Component,
  signal,
  computed,
  OnInit,
  inject,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// ─── Interfaces ───────────────────────────────────────────────────────────────
// Designed for future Spring Boot/MongoDB integration.
// When the backend is ready, CartItem will be hydrated from GET /api/cart
// and mutations will call POST/DELETE /api/cart/{itemId}.

export interface CartItemColor {
  label: string;
  hex: string;
}

export interface CartItem {
  id: string;           // Cart line-item ID (UUID from backend, mock string here)
  productId: number;    // References MongoDB product _id
  brand: string;
  name: string;
  image: string;
  bgColor: string;
  color: CartItemColor;
  size?: string;        // Optional — applicable for shoes/apparel
  price: number;        // Unit price at time of adding
  originalPrice: number;
  stock: number;
  quantity: number;
  badge?: 'new' | 'sale' | null;
  discount?: number;
  savedForLater?: boolean;
}

export interface RecommendedProduct {
  id: number;
  brand: string;
  name: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  image: string;
  bgColor: string;
  badge?: 'new' | 'sale' | null;
  discount?: number;
}

export interface PromoResult {
  valid: boolean;
  label: string;
  discountAmount: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-cart',
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart implements OnInit {
  private router = inject(Router);

  // ── Loading / notification state ──────────────────────────────────────────
  isLoading = signal(true);
  removingItemId = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  private successTimer: any;

  // ── Cart items ────────────────────────────────────────────────────────────
  // Mock data; replace with: this.http.get<CartItem[]>('/api/cart').subscribe(...)
  cartItems: WritableSignal<CartItem[]> = signal([
    {
      id: 'ci-001',
      productId: 1,
      brand: 'Sony',
      name: 'WH-XM6 Wireless ANC',
      image: '/products/headphones.png',
      bgColor: '#eef0f8',
      color: { label: 'Midnight Black', hex: '#1a1a1a' },
      price: 249,
      originalPrice: 329,
      stock: 12,
      quantity: 1,
      badge: 'new',
      discount: 24,
    },
    {
      id: 'ci-002',
      productId: 3,
      brand: 'Apple',
      name: 'AirPods Pro 2nd Gen',
      image: '/products/airpods pro w1.png',
      bgColor: '#eef8f2',
      color: { label: 'White', hex: '#f5f5f5' },
      price: 199,
      originalPrice: 249,
      stock: 25,
      quantity: 2,
      badge: 'new',
      discount: 20,
    },
    {
      id: 'ci-003',
      productId: 6,
      brand: 'Nike',
      name: 'Air Max 270',
      image: '/products/shoes.png',
      bgColor: '#fff3ee',
      color: { label: 'Black / White', hex: '#1a1a1a' },
      size: 'US 10',
      price: 129,
      originalPrice: 160,
      stock: 30,
      quantity: 1,
      badge: null,
      discount: 19,
    },
  ]);

  // ── Saved-for-later items (separate list) ─────────────────────────────────
  savedItems: WritableSignal<CartItem[]> = signal([]);

  // ── Promo code ────────────────────────────────────────────────────────────
  promoCode = signal('');
  promoResult = signal<PromoResult | null>(null);
  promoLoading = signal(false);

  private readonly VALID_PROMOS: Record<string, PromoResult> = {
    NEXUS10: { valid: true, label: 'NEXUS10 — 10% off', discountAmount: 0.10 },
    SAVE20:  { valid: true, label: 'SAVE20 — $20 off',  discountAmount: 20 },
  };

  // ── Recommended products ──────────────────────────────────────────────────
  recommended: RecommendedProduct[] = [
    {
      id: 2,
      brand: 'Apple',
      name: 'Ultra Watch Series 3',
      price: 189,
      originalPrice: 315,
      rating: 4.7,
      reviewCount: 876,
      image: '/products/appel watch.png',
      bgColor: '#f0eef8',
      badge: 'sale',
      discount: 40,
    },
    {
      id: 4,
      brand: 'Apple',
      name: 'MacBook Pro M3',
      price: 1999,
      originalPrice: 2199,
      rating: 4.8,
      reviewCount: 513,
      image: '/products/macbook pro 13.png',
      bgColor: '#f8f5ee',
      badge: null,
    },
    {
      id: 5,
      brand: 'Samsung',
      name: 'Galaxy S24 Ultra',
      price: 1099,
      originalPrice: 1299,
      rating: 4.7,
      reviewCount: 1890,
      image: '/products/samsung galxy s24 ultra silver.png',
      bgColor: '#f0f8fe',
      badge: 'sale',
      discount: 15,
    },
    {
      id: 7,
      brand: 'Apple',
      name: 'iPad Pro 12.9"',
      price: 1099,
      originalPrice: 1199,
      rating: 4.8,
      reviewCount: 2041,
      image: '/products/airpods pro w2.png',
      bgColor: '#f0f4ff',
      badge: 'new',
      discount: 8,
    },
  ];

  // ── Derived totals (computed signals) ─────────────────────────────────────
  activeItems = computed(() => this.cartItems().filter(i => !i.savedForLater));

  itemCount = computed(() =>
    this.activeItems().reduce((sum, i) => sum + i.quantity, 0)
  );

  subtotal = computed(() =>
    this.activeItems().reduce((sum, i) => sum + i.price * i.quantity, 0)
  );

  /**
   * Per-item savings (price difference × qty) — shown as inline "you save" line
   */
  itemSavings = computed(() =>
    this.activeItems().reduce(
      (sum, i) => sum + (i.originalPrice - i.price) * i.quantity,
      0
    )
  );

  /**
   * Promo discount resolves to either a flat amount or a percentage of subtotal.
   * Backend equivalent: POST /api/cart/promo { code } → { discountAmount }
   */
  promoDiscount = computed<number>(() => {
    const result = this.promoResult();
    if (!result?.valid) return 0;
    const d = result.discountAmount;
    // If < 1 it's a percentage; otherwise flat dollar amount
    return d < 1 ? this.subtotal() * d : Math.min(d, this.subtotal());
  });

  shippingCost = computed(() => (this.subtotal() >= 50 ? 0 : 9.99));

  estimatedTax = computed(() => this.subtotal() * 0.08);

  orderTotal = computed(
    () =>
      this.subtotal() -
      this.promoDiscount() +
      this.shippingCost() +
      this.estimatedTax()
  );

  // ── Quantity mutations ────────────────────────────────────────────────────
  increaseQty(item: CartItem): void {
    if (item.quantity >= item.stock) return;
    this.cartItems.update(items =>
      items.map(i => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
    );
    // Spring Boot: PUT /api/cart/{item.id} { quantity: item.quantity + 1 }
  }

  decreaseQty(item: CartItem): void {
    if (item.quantity <= 1) return;
    this.cartItems.update(items =>
      items.map(i => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i))
    );
    // Spring Boot: PUT /api/cart/{item.id} { quantity: item.quantity - 1 }
  }

  // ── Remove item ───────────────────────────────────────────────────────────
  removeItem(item: CartItem): void {
    this.removingItemId.set(item.id);
    // Animate out, then remove after transition duration
    setTimeout(() => {
      this.cartItems.update(items => items.filter(i => i.id !== item.id));
      this.removingItemId.set(null);
      this.showSuccess(`${item.name} removed from cart`);
      // Spring Boot: DELETE /api/cart/{item.id}
    }, 380);
  }

  // ── Save for later ────────────────────────────────────────────────────────
  saveForLater(item: CartItem): void {
    this.cartItems.update(items =>
      items.map(i => (i.id === item.id ? { ...i, savedForLater: true } : i))
    );
    this.savedItems.update(s => [...s, { ...item, savedForLater: true }]);
    this.cartItems.update(items => items.filter(i => i.id !== item.id));
    this.showSuccess(`${item.name} saved for later`);
    // Spring Boot: PUT /api/cart/{item.id} { savedForLater: true }
  }

  moveToCart(item: CartItem): void {
    this.savedItems.update(s => s.filter(i => i.id !== item.id));
    this.cartItems.update(items => [...items, { ...item, savedForLater: false }]);
    this.showSuccess(`${item.name} moved back to cart`);
  }

  // ── Clear cart ────────────────────────────────────────────────────────────
  clearCart(): void {
    this.cartItems.set([]);
    // Spring Boot: DELETE /api/cart
  }

  // ── Promo code ────────────────────────────────────────────────────────────
  applyPromo(): void {
    const code = this.promoCode().trim().toUpperCase();
    if (!code) return;
    this.promoLoading.set(true);
    this.promoResult.set(null);

    // Simulated async call — replace with:
    // this.http.post<PromoResult>('/api/cart/promo', { code }).subscribe(...)
    setTimeout(() => {
      const result = this.VALID_PROMOS[code] ?? {
        valid: false,
        label: `"${code}" is not a valid promo code`,
        discountAmount: 0,
      };
      this.promoResult.set(result);
      this.promoLoading.set(false);
      if (result.valid) this.showSuccess('Promo code applied!');
    }, 900);
  }

  removePromo(): void {
    this.promoResult.set(null);
    this.promoCode.set('');
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  continueShopping(): void {
    this.router.navigate(['/products']);
  }

  proceedToCheckout(): void {
    // Future: validate JWT, then navigate to /checkout
    // this.auth.requireAuth('checkout', { type: 'CHECKOUT' });
    this.router.navigate(['/checkout']);
  }

  viewProduct(id: number): void {
    this.router.navigate(['/products', id]);
  }

  addRecommendedToCart(product: RecommendedProduct, event: Event): void {
    event.stopPropagation();
    (product as any).addedToCart = true;
    setTimeout(() => ((product as any).addedToCart = false), 2000);
    this.showSuccess(`${product.name} added to cart`);
    // Spring Boot: POST /api/cart { productId: product.id, quantity: 1 }
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

  trackById(_: number, item: CartItem): string {
    return item.id;
  }

  trackByProductId(_: number, p: RecommendedProduct): number {
    return p.id;
  }

  private showSuccess(msg: string): void {
    clearTimeout(this.successTimer);
    this.successMessage.set(msg);
    this.successTimer = setTimeout(() => this.successMessage.set(null), 3000);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Simulate network fetch — replace with:
    // this.http.get<CartItem[]>('/api/cart').subscribe(items => {
    //   this.cartItems.set(items);
    //   this.isLoading.set(false);
    // });
    setTimeout(() => this.isLoading.set(false), 700);
  }
}