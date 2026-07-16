// settings.model.ts

export type SettingsCategory =
  | 'general' | 'profile' | 'security' | 'store' | 'payments'
  | 'email' | 'notifications' | 'appearance' | 'system';

// ─── General ────────────────────────────────────────────────────────────────
export interface GeneralSettings {
  storeName: string;
  storeDescription: string;
  storeEmail: string;
  supportEmail: string;
  phoneNumber: string;
  website: string;
  businessAddress: string;
  country: string;
  currency: string;
  timezone: string;
  language: string;
  dateFormat: string;
}

// ─── Profile ────────────────────────────────────────────────────────────────
export interface ProfileSettings {
  avatar: string;
  name: string;
  email: string;
  username: string;
  jobTitle: string;
  phone: string;
  bio: string;
}

// ─── Security ───────────────────────────────────────────────────────────────
export interface AdminSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActivity: string; // ISO
  current: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeoutMinutes: number;
  rememberLogin: boolean;
  loginAlerts: boolean;
  sessions: AdminSession[];
}

// ─── Store ──────────────────────────────────────────────────────────────────
export type StoreStatus = 'Open' | 'Closed' | 'Coming Soon';

export interface StoreSettings {
  logoUrl: string;
  faviconUrl: string;
  bannerUrl: string;
  maintenanceMode: boolean;
  storeStatus: StoreStatus;
  taxPercentage: number;
  shippingFee: number;
  freeShippingThreshold: number;
  defaultWarehouse: string;
}

// ─── Payments ───────────────────────────────────────────────────────────────
export type PaymentGatewayId = 'stripe' | 'paypal' | 'cod' | 'bank_transfer';

export interface PaymentGateway {
  id: PaymentGatewayId;
  name: string;
  enabled: boolean;
  apiKey: string;
  secretKey: string;
  testMode: boolean;
  webhookUrl: string;
  requiresKeys: boolean;
}

// ─── Email ──────────────────────────────────────────────────────────────────
export type SmtpEncryption = 'None' | 'SSL' | 'TLS';

export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  encryption: SmtpEncryption;
  senderName: string;
  senderEmail: string;
}

// ─── Notifications ──────────────────────────────────────────────────────────
export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  orderNotifications: boolean;
  customerNotifications: boolean;
  inventoryAlerts: boolean;
  lowStockAlerts: boolean;
  reviewAlerts: boolean;
  adminLoginAlerts: boolean;
  activityLogAlerts: boolean;
}

// ─── Appearance ─────────────────────────────────────────────────────────────
export type ThemeMode = 'Light' | 'Dark' | 'System';
export type SidebarStyle = 'Compact' | 'Normal';
export type FontSize = 'Small' | 'Medium' | 'Large';

export interface AppearanceSettings {
  theme: ThemeMode;
  primaryColor: string;
  sidebarStyle: SidebarStyle;
  roundedCards: boolean;
  animations: boolean;
  reducedMotion: boolean;
  fontSize: FontSize;
}

// ─── System ─────────────────────────────────────────────────────────────────
export type Environment = 'Production' | 'Development';
export type ServiceStatus = 'Operational' | 'Degraded' | 'Down';

export interface SystemSettings {
  applicationVersion: string;
  angularVersion: string;
  backendVersion: string;
  databaseStatus: ServiceStatus;
  storageUsedGb: number;
  storageTotalGb: number;
  serverStatus: ServiceStatus;
  environment: Environment;
}

// ─── Root model ─────────────────────────────────────────────────────────────
export interface SettingsModel {
  general: GeneralSettings;
  profile: ProfileSettings;
  security: SecuritySettings;
  store: StoreSettings;
  payments: PaymentGateway[];
  email: EmailSettings;
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  system: SystemSettings;
}

// ─── Mock data ──────────────────────────────────────────────────────────────
export function generateMockSettings(): SettingsModel {
  const now = Date.now();

  return {
    general: {
      storeName: 'Nexus Commerce',
      storeDescription: 'Premium electronics and lifestyle products for the modern shopper.',
      storeEmail: 'contact@nexus-commerce.com',
      supportEmail: 'support@nexus-commerce.com',
      phoneNumber: '+212 522 000 111',
      website: 'https://nexus-commerce.com',
      businessAddress: '128 Boulevard Zerktouni, Casablanca, Morocco',
      country: 'Morocco',
      currency: 'MAD',
      timezone: 'GMT+1 (Casablanca)',
      language: 'English',
      dateFormat: 'DD/MM/YYYY',
    },

    profile: {
      avatar: 'AH',
      name: 'Ayoub Hennani',
      email: 'ayoub.hennani@nexus-admin.com',
      username: 'ayoub.hennani',
      jobTitle: 'Super Admin',
      phone: '+212 661 234 567',
      bio: 'Full-stack developer and store administrator, managing the Nexus platform end to end.',
    },

    security: {
      twoFactorEnabled: true,
      sessionTimeoutMinutes: 60,
      rememberLogin: true,
      loginAlerts: true,
      sessions: [
        { id: 'sess-1', device: 'MacBook Pro', browser: 'Chrome 126', ip: '105.157.42.19', location: 'Casablanca, Morocco', lastActivity: new Date(now).toISOString(), current: true },
        { id: 'sess-2', device: 'iPhone 15', browser: 'Safari 17', ip: '105.157.42.87', location: 'Casablanca, Morocco', lastActivity: new Date(now - 3 * 3600000).toISOString(), current: false },
        { id: 'sess-3', device: 'Windows Laptop', browser: 'Edge 126', ip: '41.87.201.5', location: 'Rabat, Morocco', lastActivity: new Date(now - 26 * 3600000).toISOString(), current: false },
        { id: 'sess-4', device: 'iPad Pro', browser: 'Safari 17', ip: '196.200.11.3', location: 'Marrakesh, Morocco', lastActivity: new Date(now - 4 * 86400000).toISOString(), current: false },
      ],
    },

    store: {
      logoUrl: '/products/headphones.png',
      faviconUrl: '/products/headphones.png',
      bannerUrl: '/products/macbook pro 13.png',
      maintenanceMode: false,
      storeStatus: 'Open',
      taxPercentage: 8.5,
      shippingFee: 5.99,
      freeShippingThreshold: 75,
      defaultWarehouse: 'Casablanca Central Warehouse',
    },

    payments: [
      { id: 'stripe', name: 'Stripe', enabled: true, apiKey: '', secretKey: '', testMode: false, webhookUrl: 'https://nexus-commerce.com/api/webhooks/stripe', requiresKeys: true },
      { id: 'paypal', name: 'PayPal', enabled: true, apiKey: '', secretKey: '', testMode: true, webhookUrl: 'https://nexus-commerce.com/api/webhooks/paypal', requiresKeys: true },
      { id: 'cod', name: 'Cash on Delivery', enabled: true, apiKey: '', secretKey: '', testMode: false, webhookUrl: '', requiresKeys: false },
      { id: 'bank_transfer', name: 'Bank Transfer', enabled: false, apiKey: '', secretKey: '', testMode: false, webhookUrl: '', requiresKeys: false },
    ],

    email: {
      smtpHost: 'smtp.sendgrid.net',
      smtpPort: 587,
      username: 'apikey',
      password: 'SG.xxxxxxxxxxxxxxxxxxxxxxxx',
      encryption: 'TLS',
      senderName: 'Nexus Commerce',
      senderEmail: 'no-reply@nexus-commerce.com',
    },

    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      orderNotifications: true,
      customerNotifications: true,
      inventoryAlerts: true,
      lowStockAlerts: true,
      reviewAlerts: false,
      adminLoginAlerts: true,
      activityLogAlerts: false,
    },

    appearance: {
      theme: 'Light',
      primaryColor: '#4F46E5',
      sidebarStyle: 'Normal',
      roundedCards: true,
      animations: true,
      reducedMotion: false,
      fontSize: 'Medium',
    },

    system: {
      applicationVersion: '3.4.1',
      angularVersion: '22.0.2',
      backendVersion: '2.1.8',
      databaseStatus: 'Operational',
      storageUsedGb: 42.7,
      storageTotalGb: 100,
      serverStatus: 'Operational',
      environment: 'Production',
    },
  };
}

export const COUNTRY_OPTIONS = ['Morocco', 'France', 'Spain', 'United Arab Emirates', 'Canada', 'Germany', 'United States'];
export const CURRENCY_OPTIONS = ['USD', 'EUR', 'MAD', 'AED', 'GBP', 'CAD'];
export const TIMEZONE_OPTIONS = ['GMT+1 (Casablanca)', 'GMT+0 (London)', 'GMT+1 (Paris)', 'GMT+4 (Dubai)', 'GMT-5 (New York)'];
export const LANGUAGE_OPTIONS = ['English', 'French', 'Arabic', 'Spanish'];
export const DATE_FORMAT_OPTIONS = ['MMM D, YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
export const WAREHOUSE_OPTIONS = ['Casablanca Central Warehouse', 'Rabat Distribution Hub', 'Tangier Port Facility'];