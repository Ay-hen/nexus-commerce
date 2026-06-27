import { Service } from '@angular/core';



// notification.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Notification,
  NotificationCategory,
  NOTIFICATION_CATEGORY_META,
  CategoryFilter,
  CATEGORY_FILTERS,
} from './notification.model';

// ─── Mock data ────────────────────────────────────────────────────────────────
// Replace with HTTP calls once Spring Boot is ready.
// Pattern: inject HttpClient, swap mock methods for REST calls,
// and open a WebSocket/SSE channel for real-time pushes.

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-001',
    category: 'delivery',
    title: 'Package arriving tomorrow',
    body: 'Your Sony WH-XM6 order is out for delivery — expected before 9 PM.',
    createdAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    read: false,
    actionLabel: 'Track Order',
    actionRoute: '/orders',
    productImage: '/products/headphones.png',
    orderId: '1042',
  },
  {
    id: 'n-002',
    category: 'promotion',
    title: 'Flash Sale — up to 60% OFF',
    body: 'Weekend flash sale is live. Grab premium tech at record-low prices before it ends.',
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    read: false,
    actionLabel: 'Shop Now',
    actionRoute: '/products',
  },
  {
    id: 'n-003',
    category: 'order',
    title: 'Order #1042 has been shipped',
    body: 'Your AirPods Pro 2nd Gen are on their way. Estimated delivery in 2–3 days.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    actionLabel: 'View Order',
    actionRoute: '/orders',
    productImage: '/products/airpods pro w1.png',
    orderId: '1042',
  },
  {
    id: 'n-004',
    category: 'wishlist',
    title: 'Wishlist item is now on sale',
    body: 'Galaxy S24 Ultra just dropped 15%. Limited stock — act fast!',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    read: false,
    actionLabel: 'View Deal',
    actionRoute: '/products/5',
    productImage: '/products/samsung galxy s24 ultra silver.png',
    productId: 5,
  },
  {
    id: 'n-005',
    category: 'cart',
    title: 'AirPods Pro added to your cart',
    body: 'You added Apple AirPods Pro 2nd Gen to your cart. Ready to check out?',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionLabel: 'Go to Cart',
    actionRoute: '/cart',
    productImage: '/products/airpods pro w1.png',
    productId: 3,
  },
  {
    id: 'n-006',
    category: 'checkout',
    title: 'Checkout complete',
    body: 'Your order for MacBook Pro M3 was placed successfully. Order #1039.',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionLabel: 'View Receipt',
    actionRoute: '/orders',
    productImage: '/products/macbook pro 13.png',
    orderId: '1039',
  },
  {
    id: 'n-007',
    category: 'promotion',
    title: 'MacBook Pro price dropped 10%',
    body: 'The MacBook Pro M3 you viewed is now $1,799 — saving you $200.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionLabel: 'See Price',
    actionRoute: '/products/4',
    productImage: '/products/macbook pro 13.png',
    productId: 4,
  },
  {
    id: 'n-008',
    category: 'review',
    title: 'How was your Sony WH-XM6?',
    body: 'You received your headphones 3 days ago. Share your experience with the community.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionLabel: 'Write Review',
    actionRoute: '/products/1',
    productImage: '/products/headphones.png',
    productId: 1,
  },
  {
    id: 'n-009',
    category: 'warning',
    title: 'Payment method expiring soon',
    body: 'Your Visa card ending in 4242 expires next month. Update it to avoid interruptions.',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionLabel: 'Update Card',
    actionRoute: '/account',
  },
  {
    id: 'n-010',
    category: 'account',
    title: 'Password updated successfully',
    body: 'Your Nexus account password was changed. If this wasn\'t you, contact support immediately.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

@Injectable({ providedIn: 'root' })

// @Service()
export class NotificationService {
  private router = inject(Router);

  // ── Core state ─────────────────────────────────────────────────────────────
  private _notifications = signal<Notification[]>([...MOCK_NOTIFICATIONS]);
  private _isOpen        = signal(false);
  private _isLoading     = signal(false);
  private _activeFilter  = signal<NotificationCategory | 'all'>('all');

  // ── Public read-only signals ───────────────────────────────────────────────
  readonly isOpen       = this._isOpen.asReadonly();
  readonly isLoading    = this._isLoading.asReadonly();
  readonly activeFilter = this._activeFilter.asReadonly();

  readonly allNotifications = computed(() =>
    [...this._notifications()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  );

  readonly filteredNotifications = computed(() => {
    const filter = this._activeFilter();
    const all    = this.allNotifications();
    return filter === 'all' ? all : all.filter(n => n.category === filter);
  });

  readonly unreadCount = computed(() =>
    this._notifications().filter(n => !n.read).length
  );

  readonly hasUnread = computed(() => this.unreadCount() > 0);

  readonly categoryFilters: CategoryFilter[] = CATEGORY_FILTERS;

  // ── Panel toggle ──────────────────────────────────────────────────────────
  open(): void  { this._isOpen.set(true);  }
  close(): void { this._isOpen.set(false); }

  toggle(): void {
    if (this._isOpen()) {
      this.close();
    } else {
      this._isLoading.set(true);
      // Simulate fetch — replace with:
      // this.http.get<Notification[]>('/api/notifications', { headers: authHeaders })
      //   .subscribe(data => { this._notifications.set(data); this._isLoading.set(false); });
      setTimeout(() => {
        this._isLoading.set(false);
        this._isOpen.set(true);
      }, 380);
    }
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  setFilter(filter: NotificationCategory | 'all'): void {
    this._activeFilter.set(filter);
  }

  // ── Mark as read ──────────────────────────────────────────────────────────
  markRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    // Spring Boot: PUT /api/notifications/{id}/read
  }

  markAllRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, read: true })));
    // Spring Boot: PUT /api/notifications/read-all
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  delete(id: string): void {
    this._notifications.update(list => list.filter(n => n.id !== id));
    // Spring Boot: DELETE /api/notifications/{id}
  }

  clearAll(): void {
    this._notifications.set([]);
    // Spring Boot: DELETE /api/notifications
  }

  // ── Action navigation ─────────────────────────────────────────────────────
  handleAction(notification: Notification): void {
    this.markRead(notification.id);
    if (notification.actionRoute) {
      this.router.navigate([notification.actionRoute]);
      this.close();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getCategoryMeta(category: NotificationCategory) {
    return NOTIFICATION_CATEGORY_META[category];
  }

  /**
   * Human-readable relative time: "just now", "5m ago", "2h ago", etc.
   * Replace with a dedicated pipe or date-fns when backend is connected.
   */
  timeAgo(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60)       return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)       return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)         return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7)           return `${days}d ago`;
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ── Push a new notification (called by CartComponent, ProductDetails, etc.) ─
  /**
   * Usage example from cart.component.ts:
   *   this.notificationService.push({
   *     category: 'cart',
   *     title: 'Item added to cart',
   *     body: `${product.name} was added to your cart.`,
   *     actionLabel: 'View Cart',
   *     actionRoute: '/cart',
   *     productImage: product.image,
   *   });
   */
  push(partial: Omit<Notification, 'id' | 'createdAt' | 'read'>): void {
    const notification: Notification = {
      ...partial,
      id: `n-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    this._notifications.update(list => [notification, ...list]);
  }

  // ── WebSocket / SSE integration stub ──────────────────────────────────────
  /**
   * Future: call this in AppComponent.ngOnInit() after authentication.
   *
   * connectWebSocket(token: string): void {
   *   // Option A — native WebSocket
   *   const ws = new WebSocket(`wss://api.nexus.com/ws/notifications?token=${token}`);
   *   ws.onmessage = (event) => {
   *     const notification: Notification = JSON.parse(event.data);
   *     this.push(notification);
   *   };
   *
   *   // Option B — Server-Sent Events (simpler, one-way)
   *   const es = new EventSource(`/api/notifications/stream?token=${token}`);
   *   es.onmessage = (event) => {
   *     const notification: Notification = JSON.parse(event.data);
   *     this.push(notification);
   *   };
   *
   *   // Option C — Firebase Cloud Messaging
   *   // See: https://firebase.google.com/docs/cloud-messaging/js/client
   * }
   */
}