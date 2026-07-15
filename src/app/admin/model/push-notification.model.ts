// push-notification.model.ts

export type PushNotificationStatus =
  | 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Failed' | 'Cancelled';

export type NotificationAudience =
  | 'All Users' | 'Customers' | 'Admins' | 'Subscribers' | 'VIP' | 'Custom Segment';

export type NotificationPriority = 'Normal' | 'High' | 'Critical';

export interface AdminUser {
  id: string;
  name: string;
  avatar: string;
}

export interface DeliveryStats {
  totalRecipients: number;
  delivered: number;
  opened: number;
  ctr: number;       // click-through rate, percentage
  failed: number;
  pending: number;
}

export interface NotificationTimeline {
  created: string;          // ISO
  scheduled?: string;       // ISO
  startedSending?: string;  // ISO
  completed?: string;       // ISO
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  campaignName: string;
  imageUrl?: string;
  deepLink?: string;
  targetScreen?: string;

  audience: NotificationAudience;
  customSegmentDescription?: string;

  priority: NotificationPriority;
  ttlHours: number;
  silent: boolean;
  badgeCount?: number;
  sound?: string;

  status: PushNotificationStatus;
  scheduledAt?: string; // ISO
  createdAt: string;    // ISO
  createdBy: AdminUser;

  delivery: DeliveryStats;
  timeline: NotificationTimeline;
}

// ─── Mock data generation ─────────────────────────────────────────────────

const ADMINS: AdminUser[] = [
  { id: 'admin-1', name: 'Ayoub Hennani', avatar: 'AH' },
  { id: 'admin-2', name: 'Sara Idrissi', avatar: 'SI' },
  { id: 'admin-3', name: 'Karim Mansouri', avatar: 'KM' },
  { id: 'admin-4', name: 'Leila Boudali', avatar: 'LB' },
  { id: 'admin-5', name: 'Reda Kabbaj', avatar: 'RK' },
  { id: 'admin-6', name: 'Zineb Amrani', avatar: 'ZA' },
];

const STATUS_CYCLE: PushNotificationStatus[] = [
  'Sent', 'Sent', 'Sent', 'Scheduled', 'Draft', 'Sending', 'Failed', 'Sent', 'Cancelled', 'Scheduled',
];

const AUDIENCES: NotificationAudience[] = ['All Users', 'Customers', 'Admins', 'Subscribers', 'VIP', 'Custom Segment'];

const PRIORITIES: NotificationPriority[] = ['Normal', 'Normal', 'High', 'Normal', 'Critical'];

const SOUNDS = ['Default', 'Chime', 'Bell', 'Silent'];

const TARGET_SCREENS = ['Home', 'Product Detail', 'Order Detail', 'Cart', 'Wishlist', 'Promotions', 'Profile'];

const CAMPAIGNS = [
  'Summer Sale Blast', 'Flash Deal Friday', 'New Arrivals Drop', 'Order Shipped Update',
  'Cart Abandonment Reminder', 'VIP Early Access', 'Weekend Discount', 'Restock Alert',
  'Loyalty Points Reminder', 'Welcome Series - Day 3', 'Back in Stock', 'Price Drop Alert',
  'App Update Announcement', 'Holiday Promo', 'Review Request', 'Birthday Offer',
];

const TITLE_TEMPLATES = [
  'Your order has shipped! 📦',
  'Flash Sale: 30% off everything',
  'New arrivals just landed',
  "Don't miss out — items in your cart",
  'Exclusive VIP early access',
  'Your favorite item is back in stock',
  'Price drop on items you viewed',
  'Weekend only: Free shipping',
  "You've earned new loyalty points",
  'Happy Birthday! Here\'s a gift 🎁',
  'App update available',
  'Rate your recent purchase',
];

const BODY_TEMPLATES = [
  'Track your package and see the estimated delivery date.',
  'For a limited time, enjoy massive savings across the entire store.',
  'Check out the latest products added to our catalog this week.',
  'Complete your purchase before your cart items sell out.',
  'Be the first to shop our newest collection before anyone else.',
  'The item you wishlisted is available again — grab it before it sells out.',
  'Prices just dropped on products you were interested in.',
  'Enjoy free shipping on all orders this weekend only.',
  'Redeem your points for exclusive rewards and discounts.',
  'Celebrate with a special discount just for you, this month only.',
  'Update to the latest version for a smoother shopping experience.',
  'Let us know what you think — your feedback helps other shoppers.',
];

const DEEP_LINKS = [
  'app://orders/10291', 'app://sale/summer', 'app://products/new',
  'app://cart', 'app://vip', 'app://wishlist', 'app://products/deals',
  'app://checkout', 'app://rewards', 'app://profile/birthday',
  'app://update', 'app://reviews/write',
];

const IMAGE_POOL = [
  '/products/headphones.png', '/products/macbook pro 13.png', '/products/samsung galxy s24 ultra silver.png',
  '/products/airpods pro w1.png', '/products/appel watch.png',
];

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function buildDelivery(status: PushNotificationStatus, seed: number): DeliveryStats {
  if (status === 'Draft' || status === 'Scheduled' || status === 'Cancelled') {
    const totalRecipients = 500 + (seed * 137) % 4500;
    return { totalRecipients, delivered: 0, opened: 0, ctr: 0, failed: 0, pending: totalRecipients };
  }

  const totalRecipients = 800 + (seed * 211) % 6000;

  if (status === 'Failed') {
    const delivered = Math.round(totalRecipients * (0.1 + (seed % 10) / 100));
    const failed = totalRecipients - delivered;
    return { totalRecipients, delivered, opened: Math.round(delivered * 0.12), ctr: 2.1, failed, pending: 0 };
  }

  if (status === 'Sending') {
    const delivered = Math.round(totalRecipients * (0.35 + (seed % 30) / 100));
    const pending = totalRecipients - delivered;
    return { totalRecipients, delivered, opened: Math.round(delivered * 0.28), ctr: 6.4, failed: 0, pending };
  }

  // Sent
  const failed = Math.round(totalRecipients * ((seed % 4) / 100));
  const delivered = totalRecipients - failed;
  const opened = Math.round(delivered * (0.32 + (seed % 25) / 100));
  const ctr = +((opened / delivered) * (0.35 + (seed % 20) / 100) * 100).toFixed(1);

  return { totalRecipients, delivered, opened, ctr, failed, pending: 0 };
}

function buildTimeline(status: PushNotificationStatus, createdAt: Date, scheduledAt: Date | null): NotificationTimeline {
  const timeline: NotificationTimeline = { created: createdAt.toISOString() };

  if (scheduledAt) {
    timeline.scheduled = scheduledAt.toISOString();
  }

  if (status === 'Sending' || status === 'Sent' || status === 'Failed') {
    const start = scheduledAt ?? new Date(createdAt.getTime() + 5 * 60000);
    timeline.startedSending = start.toISOString();

    if (status === 'Sent' || status === 'Failed') {
      timeline.completed = new Date(start.getTime() + 8 * 60000).toISOString();
    }
  }

  return timeline;
}

export function generateMockNotifications(count = 42): PushNotification[] {
  const notifications: PushNotification[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    const admin = pick(ADMINS, i);
    const audience = pick(AUDIENCES, i + 2);
    const priority = pick(PRIORITIES, i + 3);
    const campaignName = pick(CAMPAIGNS, i);
    const titleIdx = i % TITLE_TEMPLATES.length;

    const daysAgoCreated = i < 20 ? i * 1.5 : 15 + (i * 17) % 60;
    const createdAt = new Date(now - daysAgoCreated * 86400000);

    let scheduledAt: Date | null = null;
    if (status === 'Scheduled') {
      scheduledAt = new Date(now + (2 + i % 12) * 86400000);
    } else if (status === 'Sending' || status === 'Sent' || status === 'Failed' || status === 'Cancelled') {
      scheduledAt = i % 3 === 0 ? new Date(createdAt.getTime() + 3600000) : null;
    }

    const hasImage = i % 3 === 0;
    const targetScreen = pick(TARGET_SCREENS, i + 1);

    notifications.push({
      id: 'push-' + (i + 1),
      title: TITLE_TEMPLATES[titleIdx],
      body: BODY_TEMPLATES[titleIdx],
      campaignName,
      imageUrl: hasImage ? pick(IMAGE_POOL, i) : undefined,
      deepLink: pick(DEEP_LINKS, i + titleIdx),
      targetScreen,

      audience,
      customSegmentDescription: audience === 'Custom Segment'
        ? 'Users who purchased in the last 30 days and opened the app 5+ times'
        : undefined,

      priority,
      ttlHours: priority === 'Critical' ? 1 : priority === 'High' ? 6 : 24,
      silent: i % 9 === 0,
      badgeCount: i % 4 === 0 ? 1 + (i % 5) : undefined,
      sound: pick(SOUNDS, i),

      status,
      scheduledAt: scheduledAt ? scheduledAt.toISOString() : undefined,
      createdAt: createdAt.toISOString(),
      createdBy: admin,

      delivery: buildDelivery(status, i + 1),
      timeline: buildTimeline(status, createdAt, scheduledAt),
    });
  }

  return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}