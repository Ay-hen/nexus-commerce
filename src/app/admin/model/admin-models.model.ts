// admin.models.ts
// ─── Admin User ───────────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor' | 'viewer';
  avatar?: string;
  lastLogin: string;
  twoFactorEnabled: boolean;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface StatCard {
  id: string;
  label: string;
  value: string | number;
  change: number;       // % change vs previous period, positive = up
  changeLabel: string;  // e.g. "vs last month"
  icon: string;         // SVG path key
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'slate';
  prefix?: string;
  suffix?: string;
}

// ─── Revenue data point ───────────────────────────────────────────────────────
export interface RevenuePoint {
  month: string;
  revenue: number;
  orders: number;
  profit: number;
}

// ─── Order ────────────────────────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface Order {
  id: string;
  orderId: string;
  customer: string;
  customerAvatar: string;
  email: string;
  items: number;
  total: number;
  status: OrderStatus;
  date: string;
  paymentMethod: string;
}

// ─── Product ──────────────────────────────────────────────────────────────────
export interface AdminProduct {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'draft' | 'archived';
  sales: number;
  image: string;
  sku: string;
  featured: boolean;
}

// ─── Customer ─────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  joinDate: string;
  orders: number;
  spent: number;
  status: 'active' | 'inactive' | 'banned';
  location: string;
}

// ─── Review ───────────────────────────────────────────────────────────────────
export interface AdminReview {
  id: string;
  author: string;
  avatar: string;
  product: string;
  rating: number;
  body: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
}

// ─── Nav item ─────────────────────────────────────────────────────────────────
export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
  section?: string;
}

// ─── Chart point ─────────────────────────────────────────────────────────────
export interface ChartPoint {
  label: string;
  value: number;
  color?: string;
}


