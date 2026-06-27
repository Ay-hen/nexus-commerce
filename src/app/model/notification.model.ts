// notification.model.ts
// ─────────────────────────────────────────────────────────────────────────────
// All types consumed by the notification system.
// Designed to map 1:1 to a MongoDB document returned by Spring Boot.
//
// Backend document shape (MongoDB):
// {
//   _id: ObjectId,
//   userId: ObjectId,        ← JWT sub claim
//   type: NotificationType,
//   category: NotificationCategory,
//   title: string,
//   body: string,
//   read: boolean,
//   createdAt: ISOString,
//   actionLabel?: string,
//   actionRoute?: string,
//   productImage?: string,
//   productId?: number,
//   orderId?: string,
//   metadata?: Record<string, unknown>
// }

// ─── Category ─────────────────────────────────────────────────────────────────
export type NotificationCategory =
  | 'cart'
  | 'wishlist'
  | 'order'
  | 'delivery'
  | 'promotion'
  | 'review'
  | 'account'
  | 'warning'
  | 'checkout';

// ─── Full notification model ──────────────────────────────────────────────────
export interface Notification {
  /** Unique identifier — UUID from frontend mock, ObjectId string from backend */
  id: string;

  /** Notification type — drives icon and accent color */
  category: NotificationCategory;

  /** Short headline shown in bold */
  title: string;

  /** Longer description shown below title */
  body: string;

  /** ISO 8601 datetime string — display is humanized client-side */
  createdAt: string;

  /** Whether the user has read this notification */
  read: boolean;

  /** Optional CTA label shown on the action button */
  actionLabel?: string;

  /** Angular router path to navigate on action click */
  actionRoute?: string;

  /** Small product image thumbnail URL */
  productImage?: string;

  /** References Products collection */
  productId?: number;

  /** References Orders collection */
  orderId?: string;

  /** Arbitrary extra data for future extensibility */
  metadata?: Record<string, unknown>;
}

// ─── Category metadata (drives icon + accent in the UI) ───────────────────────
export interface NotificationMeta {
  label: string;
  accentColor: string;         // e.g. '#0066FF'
  bgColor: string;             // soft tint behind icon
  iconColor: string;           // SVG stroke/fill color
}

export const NOTIFICATION_CATEGORY_META: Record<NotificationCategory, NotificationMeta> = {
  cart:      { label: 'Cart',      accentColor: '#0066FF', bgColor: '#EFF5FF', iconColor: '#0066FF' },
  wishlist:  { label: 'Wishlist',  accentColor: '#FF3B30', bgColor: '#FFF1F0', iconColor: '#FF3B30' },
  order:     { label: 'Orders',    accentColor: '#0A0A0B', bgColor: '#F3F4F6', iconColor: '#6B7280' },
  delivery:  { label: 'Delivery',  accentColor: '#00C06B', bgColor: '#EDFFF5', iconColor: '#00C06B' },
  promotion: { label: 'Promotions',accentColor: '#F59E0B', bgColor: '#FFFBEB', iconColor: '#D97706' },
  review:    { label: 'Reviews',   accentColor: '#7C5CFC', bgColor: '#F1EEFF', iconColor: '#7C5CFC' },
  account:   { label: 'Account',   accentColor: '#0A0A0B', bgColor: '#F3F4F6', iconColor: '#6B7280' },
  warning:   { label: 'Warning',   accentColor: '#FF3B30', bgColor: '#FFF1F0', iconColor: '#FF3B30' },
  checkout:  { label: 'Checkout',  accentColor: '#16A34A', bgColor: '#ECFDF5', iconColor: '#16A34A' },
};

// ─── Category filter option ────────────────────────────────────────────────────
export interface CategoryFilter {
  key: NotificationCategory | 'all';
  label: string;
}

export const CATEGORY_FILTERS: CategoryFilter[] = [
  { key: 'all',       label: 'All' },
  { key: 'cart',      label: 'Cart' },
  { key: 'order',     label: 'Orders' },
  { key: 'delivery',  label: 'Delivery' },
  { key: 'promotion', label: 'Promotions' },
  { key: 'account',   label: 'Account' },
];