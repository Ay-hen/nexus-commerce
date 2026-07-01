// admin-dashboard.component.ts
import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  StatCard, Order, AdminProduct, Customer, ChartPoint, RevenuePoint
} from '../../model/admin-models.model';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard implements OnInit {

  isLoading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  constructor(private router : Router){

  }

  // ── Stat cards ────────────────────────────────────────────────────────────
  statCards: StatCard[] = [
    { id: 'revenue',   label: 'Total Revenue',    value: 84320,  change: 12.4,  changeLabel: 'vs last month', icon: 'revenue',   color: 'blue',   prefix: '$' },
    { id: 'orders',    label: 'Total Orders',      value: 1284,   change: 8.1,   changeLabel: 'vs last month', icon: 'orders',    color: 'green'  },
    { id: 'products',  label: 'Products',          value: 1407,   change: 2.3,   changeLabel: 'new this month', icon: 'products',  color: 'purple' },
    { id: 'customers', label: 'Customers',         value: 3281,   change: 15.6,  changeLabel: 'vs last month', icon: 'customers', color: 'amber'  },
    { id: 'pending',   label: 'Pending Orders',    value: 47,     change: -3.2,  changeLabel: 'vs yesterday',  icon: 'pending',   color: 'red'    },
    { id: 'today',     label: 'Sales Today',       value: 2840,   change: 6.8,   changeLabel: 'vs yesterday',  icon: 'today',     color: 'green',  prefix: '$' },
    { id: 'stock',     label: 'Low Stock Items',   value: 12,     change: -1,    changeLabel: 'vs last week',  icon: 'stock',     color: 'red'    },
    { id: 'rating',    label: 'Avg Rating',        value: '4.8',  change: 0.2,   changeLabel: 'vs last month', icon: 'rating',    color: 'amber',  suffix: '★' },
  ];

  // ── Revenue chart data (12 months) ────────────────────────────────────────
  revenueData: RevenuePoint[] = [
    { month: 'Jul', revenue: 38000, orders: 420, profit: 14000 },
    { month: 'Aug', revenue: 42000, orders: 510, profit: 16800 },
    { month: 'Sep', revenue: 39000, orders: 480, profit: 15200 },
    { month: 'Oct', revenue: 51000, orders: 620, profit: 20400 },
    { month: 'Nov', revenue: 63000, orders: 790, profit: 25200 },
    { month: 'Dec', revenue: 78000, orders: 980, profit: 31200 },
    { month: 'Jan', revenue: 55000, orders: 680, profit: 22000 },
    { month: 'Feb', revenue: 48000, orders: 590, profit: 19200 },
    { month: 'Mar', revenue: 62000, orders: 750, profit: 24800 },
    { month: 'Apr', revenue: 71000, orders: 860, profit: 28400 },
    { month: 'May', revenue: 75000, orders: 910, profit: 30000 },
    { month: 'Jun', revenue: 84320, orders: 1040, profit: 33728 },
  ];

  maxRevenue = computed(() => Math.max(...this.revenueData.map(d => d.revenue)));

  barHeight(val: number): number {
    return (val / this.maxRevenue()) * 100;
  }

  // ── Top categories chart ──────────────────────────────────────────────────
  categoryData: ChartPoint[] = [
    { label: 'Electronics', value: 38, color: '#0066FF' },
    { label: 'Smartphones', value: 22, color: '#10B981' },
    { label: 'Laptops',     value: 18, color: '#F59E0B' },
    { label: 'Shoes',       value: 12, color: '#EF4444' },
    { label: 'Watches',     value: 6,  color: '#7C5CFC' },
    { label: 'Other',       value: 4,  color: '#64748B' },
  ];

  // Donut chart: cumulative offsets
  donutSegments = computed(() => {
    const total = 100;
    const r = 42;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    return this.categoryData.map(d => {
      const dashArray = (d.value / total) * circ;
      const dashOffset = circ - dashArray;
      const seg = { ...d, dashArray, dashOffset: circ - offset, circumference: circ };
      offset += dashArray;
      return seg;
    });
  });

  // ── Recent orders ─────────────────────────────────────────────────────────
  recentOrders: Order[] = [
    { id: '1', orderId: '#1284', customer: 'Ayoub Hen',  customerAvatar: 'AH', email: 'ayoub@nexus.com', items: 2, total: 448,  status: 'delivered',  date: '2 min ago',   paymentMethod: 'Visa' },
    { id: '2', orderId: '#1283', customer: 'Sara Idrissi',   customerAvatar: 'SI', email: 'sara@mail.com',   items: 1, total: 1099, status: 'processing', date: '18 min ago',  paymentMethod: 'PayPal' },
    { id: '3', orderId: '#1282', customer: 'Karim Mansouri', customerAvatar: 'KM', email: 'karim@mail.com',  items: 3, total: 376,  status: 'shipped',    date: '1 hr ago',    paymentMethod: 'Mastercard' },
    { id: '4', orderId: '#1281', customer: 'Leila Boudali',  customerAvatar: 'LB', email: 'leila@mail.com',  items: 1, total: 249,  status: 'pending',    date: '2 hr ago',    paymentMethod: 'Visa' },
    { id: '5', orderId: '#1280', customer: 'Youssef Alami',  customerAvatar: 'YA', email: 'youssef@mail.com',items: 2, total: 2248, status: 'cancelled',  date: '5 hr ago',    paymentMethod: 'PayPal' },
    { id: '6', orderId: '#1279', customer: 'Nadia Cherkaoui',customerAvatar: 'NC', email: 'nadia@mail.com',  items: 1, total: 189,  status: 'delivered',  date: 'Yesterday',   paymentMethod: 'Apple Pay' },
  ];

  // ── Top products ──────────────────────────────────────────────────────────
  topProducts: AdminProduct[] = [
    { id: 1, name: 'WH-XM6 Wireless ANC', brand: 'Sony',    category: 'Audio',       price: 249,  stock: 12,  status: 'active', sales: 284, image: '/products/headphones.png',          sku: 'SONY-WH-XM6',  featured: true },
    { id: 3, name: 'AirPods Pro 2nd Gen', brand: 'Apple',   category: 'Electronics', price: 199,  stock: 25,  status: 'active', sales: 217, image: '/products/airpods pro w1.png',      sku: 'APL-APP-2G',   featured: true },
    { id: 5, name: 'Galaxy S24 Ultra',    brand: 'Samsung', category: 'Smartphones', price: 1099, stock: 8,   status: 'active', sales: 143, image: '/products/samsung galxy s24 ultra silver.png', sku: 'SAM-S24U',     featured: false },
    { id: 4, name: 'MacBook Pro M3',      brand: 'Apple',   category: 'Laptops',     price: 1999, stock: 5,   status: 'active', sales: 98,  image: '/products/macbook pro 13.png',      sku: 'APL-MBP-M3',   featured: true },
    { id: 2, name: 'Ultra Watch Series 3',brand: 'Apple',   category: 'Watches',     price: 189,  stock: 18,  status: 'active', sales: 87,  image: '/products/appel watch.png',         sku: 'APL-UW-S3',    featured: false },
  ];

  // ── Low stock ─────────────────────────────────────────────────────────────
  lowStockProducts = computed(() =>
    this.topProducts.filter(p => p.stock <= 10)
  );

  // ── Recent customers ──────────────────────────────────────────────────────
  recentCustomers: Customer[] = [
    { id: 'c1', name: 'Ayoub Hennani',  email: 'ayoub@nexus.com',   avatar: 'AH', joinDate: '2 min ago',   orders: 4,  spent: 1840, status: 'active',   location: 'Casablanca, MA' },
    { id: 'c2', name: 'Sara Idrissi',   email: 'sara@mail.com',      avatar: 'SI', joinDate: '1 hr ago',    orders: 2,  spent: 1390, status: 'active',   location: 'Rabat, MA' },
    { id: 'c3', name: 'Karim Mansouri', email: 'karim@mail.com',     avatar: 'KM', joinDate: '3 hr ago',    orders: 7,  spent: 3240, status: 'active',   location: 'Paris, FR' },
    { id: 'c4', name: 'Leila Boudali',  email: 'leila@mail.com',     avatar: 'LB', joinDate: 'Yesterday',   orders: 1,  spent: 249,  status: 'active',   location: 'Lyon, FR' },
  ];

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatCurrency(val: number): string {
    if (val >= 1000) return '$' + (val / 1000).toFixed(1) + 'k';
    return '$' + val.toLocaleString();
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      delivered: 'green', processing: 'blue', shipped: 'amber',
      pending: 'slate', cancelled: 'red', refunded: 'purple',
    };
    return map[status] ?? 'slate';
  }

  trackById(_: number, item: { id: string | number }): string | number { return item.id; }

  // ── Quick actions ─────────────────────────────────────────────────────────
  quickActions = [
    { label: 'Add Product',      route: '/admin/products/new',  bg: 'rgba(0,102,255,.12)',    color: '#3B82F6', icon: 'M12 5v14M5 12h14' },
    { label: 'New Order',        route: '/admin/orders',        bg: 'rgba(16,185,129,.12)',   color: '#10B981', icon: 'M9 17H5a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2h-4M12 3v14' },
    { label: 'Send Notification', route: '/admin/notifications', bg: 'rgba(245,158,11,.12)',   color: '#F59E0B', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0' },
    { label: 'Create Coupon',    route: '/admin/coupons',       bg: 'rgba(124,92,252,.12)',   color: '#7C5CFC', icon: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' },
    { label: 'View Reports',     route: '/admin/reports',       bg: 'rgba(239,68,68,.12)',    color: '#EF4444', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6' },
    { label: 'Manage Inventory', route: '/admin/inventory',     bg: 'rgba(100,116,139,.12)',  color: '#94A3B8', icon: 'M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 12v.01' },
  ];

  ngOnInit(): void {
    setTimeout(() => this.isLoading.set(false), 700);
  }

  addProduct(): void{
    this.router.navigate(['/admin/products/new'])
  }
}


