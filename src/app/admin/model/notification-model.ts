// notification.model.ts

export type NotificationType =
  | 'order'
  | 'customer'
  | 'inventory'
  | 'product'
  | 'payment'
  | 'system'
  | 'warning'
  | 'success'
  | 'info';

export type NotificationPriority = 'low' | 'medium' | 'high';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  createdAt: string; // ISO datetime
  readAt?: string;   // ISO datetime, set when marked read
  actionUrl?: string;
  actor?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: {
    orderId?: string;
    customerId?: string;
    productId?: string;
  };
}

export type NotificationSort = 'newest' | 'oldest' | 'unread' | 'priority';
export type NotificationStatusFilter = 'all' | 'read' | 'unread';

// ─── Display helpers (shared across Notifications page, dropdown, and modal) ──

export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  { label: string; color: string; bg: string }
> = {
  order:     { label: 'Order',     color: '#4F46E5', bg: 'rgba(79,70,229,.08)' },
  customer:  { label: 'Customer',  color: '#F59E0B', bg: 'rgba(245,158,11,.08)' },
  inventory: { label: 'Inventory', color: '#7C3AED', bg: 'rgba(124,58,237,.08)' },
  product:   { label: 'Product',   color: '#3B82F6', bg: 'rgba(59,130,246,.08)' },
  payment:   { label: 'Payment',   color: '#10B981', bg: 'rgba(16,185,129,.08)' },
  system:    { label: 'System',    color: '#6B7280', bg: 'rgba(107,114,128,.10)' },
  warning:   { label: 'Warning',   color: '#F59E0B', bg: 'rgba(245,158,11,.08)' },
  success:   { label: 'Success',   color: '#10B981', bg: 'rgba(16,185,129,.08)' },
  info:      { label: 'Info',      color: '#3B82F6', bg: 'rgba(59,130,246,.08)' },
};

export const NOTIFICATION_PRIORITY_META: Record<
  NotificationPriority,
  { label: string; color: string; bg: string }
> = {
  low:    { label: 'Low',    color: '#6B7280', bg: 'rgba(107,114,128,.10)' },
  medium: { label: 'Medium', color: '#F59E0B', bg: 'rgba(245,158,11,.08)' },
  high:   { label: 'High',   color: '#EF4444', bg: 'rgba(239,68,68,.08)' },
};

/** Relative time formatter shared by every notification surface. */
export function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}w ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear}y ago`;
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─── Mock data generation ──────────────────────────────────────────────────

interface MockSeed {
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  actor?: { id: string; name: string };
  metadata?: AdminNotification['metadata'];
  actionUrl?: string;
}

const MOCK_SEEDS: MockSeed[] = [
  { title: 'New order received', message: 'Order #1284 was placed by Ayoub Hennani for $448.00.', type: 'order', priority: 'high', actor: { id: 'c1', name: 'Ayoub Hennani' }, metadata: { orderId: '#1284', customerId: 'c1' }, actionUrl: '/admin/orders' },
  { title: 'Payment failed', message: 'Payment attempt for order #1279 failed due to insufficient funds.', type: 'payment', priority: 'high', metadata: { orderId: '#1279' }, actionUrl: '/admin/orders' },
  { title: 'Product out of stock', message: '"Air Max 270" has reached zero units across all warehouses.', type: 'inventory', priority: 'high', metadata: { productId: 'p6' }, actionUrl: '/admin/inventory' },
  { title: 'Inventory adjusted', message: 'Stock for "MacBook Pro M3" was corrected after a cycle count.', type: 'inventory', priority: 'low', metadata: { productId: 'p4' }, actionUrl: '/admin/inventory' },
  { title: 'Customer registered', message: 'Sara Idrissi created a new account.', type: 'customer', priority: 'low', actor: { id: 'c2', name: 'Sara Idrissi' }, metadata: { customerId: 'c2' }, actionUrl: '/admin/customers' },
  { title: 'Customer deleted', message: 'An admin removed the account for Karim Mansouri.', type: 'customer', priority: 'medium', actor: { id: 'c3', name: 'Karim Mansouri' }, metadata: { customerId: 'c3' }, actionUrl: '/admin/customers' },
  { title: 'Order cancelled', message: 'Order #1280 was cancelled by the customer before shipment.', type: 'order', priority: 'medium', metadata: { orderId: '#1280' }, actionUrl: '/admin/orders' },
  { title: 'Order refunded', message: 'A refund of $189.00 was issued for order #1279.', type: 'payment', priority: 'medium', metadata: { orderId: '#1279' }, actionUrl: '/admin/orders' },
  { title: 'New review', message: 'Leila Boudali left a 5-star review on "AirPods Pro 2nd Gen".', type: 'product', priority: 'low', actor: { id: 'c4', name: 'Leila Boudali' }, metadata: { productId: 'p3' }, actionUrl: '/admin/reviews' },
  { title: 'Product updated', message: 'Pricing for "Galaxy S24 Ultra" was updated to $1,099.00.', type: 'product', priority: 'low', metadata: { productId: 'p5' }, actionUrl: '/admin/products' },
  { title: 'Low stock warning', message: '"Ultra Watch Series 3" has only 6 units remaining.', type: 'warning', priority: 'medium', metadata: { productId: 'p2' }, actionUrl: '/admin/inventory' },
  { title: 'Shipment delivered', message: 'Order #1276 was marked as delivered by the carrier.', type: 'success', priority: 'low', metadata: { orderId: '#1276' }, actionUrl: '/admin/orders' },
  { title: 'System backup completed', message: 'Nightly database backup finished successfully in 4m 12s.', type: 'system', priority: 'low' },
  { title: 'Security alert', message: 'Multiple failed login attempts were detected on your admin account.', type: 'warning', priority: 'high', actionUrl: '/admin/settings' },
  { title: 'Login detected', message: 'A new sign-in was detected from Casablanca, Morocco.', type: 'system', priority: 'medium' },
  { title: 'Discount campaign started', message: 'The "Summer Sale" coupon campaign is now live storewide.', type: 'success', priority: 'medium', actionUrl: '/admin/coupons' },
  { title: 'New order received', message: 'Order #1283 was placed by Youssef Alami for $2,248.00.', type: 'order', priority: 'high', actor: { id: 'c5', name: 'Youssef Alami' }, metadata: { orderId: '#1283', customerId: 'c5' }, actionUrl: '/admin/orders' },
  { title: 'Payment succeeded', message: 'Payment for order #1282 was captured successfully.', type: 'payment', priority: 'low', metadata: { orderId: '#1282' }, actionUrl: '/admin/orders' },
  { title: 'Product out of stock', message: '"Sony WF-1000XM5" is now out of stock in North DC.', type: 'inventory', priority: 'high', metadata: { productId: 'p7' }, actionUrl: '/admin/inventory' },
  { title: 'Customer registered', message: 'Nadia Cherkaoui created a new account.', type: 'customer', priority: 'low', actor: { id: 'c6', name: 'Nadia Cherkaoui' }, metadata: { customerId: 'c6' }, actionUrl: '/admin/customers' },
  { title: 'Order shipped', message: 'Order #1281 has left the warehouse and is on its way.', type: 'order', priority: 'medium', metadata: { orderId: '#1281' }, actionUrl: '/admin/orders' },
  { title: 'Inventory adjusted', message: 'Incoming stock of 40 units logged for "iPad Pro 12.9".', type: 'inventory', priority: 'low', metadata: { productId: 'p8' }, actionUrl: '/admin/inventory' },
  { title: 'New review', message: 'Karim Mansouri left a 2-star review on "Galaxy Buds Pro 2".', type: 'warning', priority: 'medium', actor: { id: 'c3', name: 'Karim Mansouri' }, metadata: { productId: 'p9' }, actionUrl: '/admin/reviews' },
  { title: 'Product updated', message: '"Surface Pro 9" description and gallery images were updated.', type: 'product', priority: 'low', metadata: { productId: 'p10' }, actionUrl: '/admin/products' },
  { title: 'Low stock warning', message: '"Pixel Watch 2" has dropped below its minimum threshold.', type: 'warning', priority: 'medium', metadata: { productId: 'p11' }, actionUrl: '/admin/inventory' },
  { title: 'Shipment delivered', message: 'Order #1270 was delivered to Sara Idrissi.', type: 'success', priority: 'low', actor: { id: 'c2', name: 'Sara Idrissi' }, metadata: { orderId: '#1270' }, actionUrl: '/admin/orders' },
  { title: 'System backup completed', message: 'Weekly full backup archived to cold storage.', type: 'system', priority: 'low' },
  { title: 'Security alert', message: 'A new admin device was authorized for this account.', type: 'warning', priority: 'high', actionUrl: '/admin/settings' },
  { title: 'Login detected', message: 'A new sign-in was detected from Rabat, Morocco.', type: 'system', priority: 'low' },
  { title: 'Discount campaign started', message: 'The "Back to School" campaign is scheduled to start tomorrow.', type: 'info', priority: 'low', actionUrl: '/admin/coupons' },
  { title: 'New order received', message: 'Order #1285 was placed by Nadia Cherkaoui for $189.00.', type: 'order', priority: 'medium', actor: { id: 'c6', name: 'Nadia Cherkaoui' }, metadata: { orderId: '#1285', customerId: 'c6' }, actionUrl: '/admin/orders' },
  { title: 'Payment failed', message: 'Payment attempt for order #1285 was declined by the card issuer.', type: 'payment', priority: 'high', metadata: { orderId: '#1285' }, actionUrl: '/admin/orders' },
  { title: 'Customer deleted', message: 'Account for Youssef Alami was permanently deleted per request.', type: 'customer', priority: 'medium', actor: { id: 'c5', name: 'Youssef Alami' }, metadata: { customerId: 'c5' }, actionUrl: '/admin/customers' },
  { title: 'Order cancelled', message: 'Order #1265 was cancelled due to an out-of-stock item.', type: 'order', priority: 'low', metadata: { orderId: '#1265' }, actionUrl: '/admin/orders' },
  { title: 'New review', message: 'Leila Boudali left a 4-star review on "WH-XM6 Wireless ANC".', type: 'product', priority: 'low', actor: { id: 'c4', name: 'Leila Boudali' }, metadata: { productId: 'p1' }, actionUrl: '/admin/reviews' },
  { title: 'Product updated', message: 'Stock keeping unit renamed for "OnePlus 12 Pro".', type: 'product', priority: 'low', metadata: { productId: 'p12' }, actionUrl: '/admin/products' },
  { title: 'Low stock warning', message: '"Air Max 270" is nearing its reorder threshold.', type: 'warning', priority: 'low', metadata: { productId: 'p6' }, actionUrl: '/admin/inventory' },
  { title: 'Shipment delivered', message: 'Order #1260 was delivered to Karim Mansouri.', type: 'success', priority: 'low', actor: { id: 'c3', name: 'Karim Mansouri' }, metadata: { orderId: '#1260' }, actionUrl: '/admin/orders' },
  { title: 'System backup completed', message: 'Media asset backup finished with no errors.', type: 'system', priority: 'low' },
  { title: 'Security alert', message: 'Two-factor authentication was disabled on your account.', type: 'warning', priority: 'high', actionUrl: '/admin/settings' },
];

function idFor(index: number): string {
  return 'ntf-' + (index + 1).toString().padStart(3, '0');
}

/** Generates 40 realistic mock notifications with descending, staggered timestamps. */
export function generateMockNotifications(): AdminNotification[] {
  const now = Date.now();
  const notifications: AdminNotification[] = [];

  for (let i = 0; i < 40; i++) {
    const seed = MOCK_SEEDS[i % MOCK_SEEDS.length];
    // Stagger timestamps across the last ~30 days, newest first.
    const minutesAgo = i === 0 ? 2 : Math.round(Math.pow(i, 2.15) * 3 + i * 7);
    const createdAt = new Date(now - minutesAgo * 60000).toISOString();

    // Roughly 40% read, weighted toward older notifications being read.
    const read = i > 3 && (i % 5 !== 0);

    notifications.push({
      id: idFor(i),
      title: seed.title,
      message: seed.message,
      type: seed.type,
      priority: seed.priority,
      read,
      createdAt,
      readAt: read ? new Date(now - Math.max(0, minutesAgo - 5) * 60000).toISOString() : undefined,
      actor: seed.actor ? { ...seed.actor } : undefined,
      metadata: seed.metadata ? { ...seed.metadata } : undefined,
      actionUrl: seed.actionUrl,
    });
  }

  return notifications;
}