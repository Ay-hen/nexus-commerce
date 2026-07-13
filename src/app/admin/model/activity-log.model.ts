// activity-log.model.ts

export type AdminRole = 'Super Admin' | 'Admin' | 'Manager' | 'Support';

export type ActivityAction =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  | 'EXPORT' | 'IMPORT' | 'VIEW' | 'APPROVE' | 'REJECT';

export type ActivityModule =
  | 'Products' | 'Categories' | 'Orders' | 'Customers' | 'Inventory'
  | 'Reviews' | 'Notifications' | 'Admins' | 'Reports' | 'Settings';

export interface ActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  adminAvatar: string;
  role: AdminRole;
  action: ActivityAction;
  module: ActivityModule;
  entityName: string;
  description: string;
  ipAddress: string;
  browser: string;
  device: string;
  location: string;
  success: boolean;
  createdAt: string; // ISO
}

// ─── Mock data generation ─────────────────────────────────────────────────

const ADMIN_NAMES = [
  'Ayoub Hennani', 'Sara Idrissi', 'Karim Mansouri', 'Leila Boudali', 'Youssef Alami',
  'Nadia Cherkaoui', 'Omar Fassi', 'Ines Bennis', 'Hamza Ziani', 'Salma Tazi',
  'Amine Berrada', 'Yasmine Sabir', 'Reda Kabbaj', 'Zineb Amrani', 'Bilal Ouahbi',
];

const ROLE_BY_ADMIN: AdminRole[] = [
  'Super Admin', 'Admin', 'Admin', 'Manager', 'Manager', 'Support', 'Support', 'Admin',
  'Manager', 'Support', 'Admin', 'Support', 'Manager', 'Admin', 'Support',
];

const ACTIONS: ActivityAction[] = [
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'VIEW', 'APPROVE', 'REJECT',
];

const MODULES: ActivityModule[] = [
  'Products', 'Categories', 'Orders', 'Customers', 'Inventory',
  'Reviews', 'Notifications', 'Admins', 'Reports', 'Settings',
];

const ENTITY_POOL: Record<ActivityModule, string[]> = {
  Products: ['MacBook Pro M4', 'AirPods Pro 2', 'Galaxy S24 Ultra', 'Sony WH-XM6', 'Ultra Watch Series 3', 'iPad Air 11"'],
  Categories: ['Electronics', 'Smartphones', 'Laptops', 'Audio', 'Watches', 'Home & Living'],
  Orders: ['Order #10291', 'Order #10304', 'Order #10318', 'Order #10325', 'Order #10339', 'Order #10344'],
  Customers: ['John Smith', 'Amal Rachidi', 'Pierre Dubois', 'Fatima Zahra', 'Carlos Mendes', 'Julia Weber'],
  Inventory: ['Warehouse Batch #22', 'Inventory Item #4471', 'Stock Adjustment #118', 'Restock Order #77'],
  Reviews: ['Review #5521 (5★)', 'Review #5534 (2★)', 'Review #5560 (4★)', 'Review #5578 (1★)'],
  Notifications: ['Promo Blast #12', 'Order Update Template', 'Welcome Email Template', 'Restock Alert'],
  Admins: ['Sara Idrissi (Admin)', 'Reda Kabbaj (Manager)', 'Bilal Ouahbi (Support)', 'New Admin Account'],
  Reports: ['Monthly Revenue Report', 'Quarterly Sales Report', 'Customer Growth Report', 'Inventory Audit Report'],
  Settings: ['Store Notification Preferences', 'Payment Gateway Config', 'Shipping Zones', 'Tax Settings'],
};

const BROWSERS = ['Chrome 126', 'Safari 17', 'Firefox 127', 'Edge 126', 'Chrome 125 (Mobile)'];
const OS_LIST = ['Windows 11', 'macOS Sonoma', 'macOS Sequoia', 'Ubuntu 24.04', 'iOS 18', 'Android 14'];
const DEVICES = ['Desktop', 'MacBook Pro', 'iPhone 15', 'iPad Pro', 'Windows Laptop', 'Android Phone'];
const LOCATIONS = [
  'Casablanca, Morocco', 'Rabat, Morocco', 'Marrakesh, Morocco', 'Tangier, Morocco',
  'Paris, France', 'Madrid, Spain', 'Dubai, UAE', 'Toronto, Canada', 'Berlin, Germany',
];

function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

function randomIp(seed: number): string {
  return `${(seed * 7) % 223 + 1}.${(seed * 13) % 255}.${(seed * 29) % 255}.${(seed * 41) % 254 + 1}`;
}

function descriptionFor(action: ActivityAction, module: ActivityModule, entity: string, adminName: string): string {
  const verbMap: Record<ActivityAction, string> = {
    CREATE: 'created',
    UPDATE: 'updated',
    DELETE: 'deleted',
    LOGIN: 'signed in from',
    LOGOUT: 'signed out of',
    EXPORT: 'exported data from',
    IMPORT: 'imported data into',
    VIEW: 'viewed',
    APPROVE: 'approved',
    REJECT: 'rejected',
  };

  if (action === 'LOGIN' || action === 'LOGOUT') {
    return `${adminName} ${verbMap[action]} the admin dashboard.`;
  }
  if (action === 'EXPORT' || action === 'IMPORT') {
    return `${adminName} ${verbMap[action]} the ${module} module (${entity}).`;
  }
  return `${adminName} ${verbMap[action]} "${entity}" in ${module}.`;
}

export function generateMockActivityLogs(count = 200): ActivityLog[] {
  const logs: ActivityLog[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const adminIdx = i % ADMIN_NAMES.length;
    const adminName = ADMIN_NAMES[adminIdx];
    const role = ROLE_BY_ADMIN[adminIdx % ROLE_BY_ADMIN.length];
    const avatar = adminName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const action = ACTIONS[(i * 3 + 1) % ACTIONS.length];
    const module = MODULES[(i * 5 + 2) % MODULES.length];
    const entityPool = ENTITY_POOL[module];
    const entityName = entityPool[i % entityPool.length];

    // spread across the last ~45 days, weighted so more entries are recent
    const minutesAgo = i < 15 ? i * 7 : i < 40 ? 100 + i * 25 : (i * 619) % (45 * 24 * 60);
    const createdAt = new Date(now - minutesAgo * 60000).toISOString();

    const success = !(i % 11 === 0 || (action === 'DELETE' && i % 6 === 0));

    logs.push({
      id: 'log-' + (i + 1),
      adminId: 'admin-' + (adminIdx + 1),
      adminName,
      adminAvatar: avatar,
      role,
      action,
      module,
      entityName,
      description: descriptionFor(action, module, entityName, adminName),
      ipAddress: randomIp(i + 1),
      browser: BROWSERS[i % BROWSERS.length],
      device: DEVICES[i % DEVICES.length],
      location: LOCATIONS[i % LOCATIONS.length],
      success,
      createdAt,
    });
  }

  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Exposed for the view modal / detail model to build a realistic OS string per log.
export function osForDevice(device: string, seed: number): string {
  if (device === 'iPhone 15' || device === 'iPad Pro') return seed % 2 === 0 ? 'iOS 18' : 'iPadOS 18';
  if (device === 'Android Phone') return 'Android 14';
  if (device === 'MacBook Pro') return seed % 2 === 0 ? 'macOS Sonoma' : 'macOS Sequoia';
  return seed % 2 === 0 ? 'Windows 11' : 'Ubuntu 24.04';
}