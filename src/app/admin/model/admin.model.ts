// admin.model.ts

export type AdminRole = 'Super Admin' | 'Admin' | 'Manager' | 'Support';
export type AdminStatus = 'online' | 'offline' | 'busy';

export interface AdminUser {
  id: string;
  avatar: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  role: AdminRole;
  status: AdminStatus;
  lastOnline: string; // ISO timestamp
  createdAt: string;  // ISO date
  permissions: string[];
  twoFactorEnabled: boolean;
  loginCount: number;
  activityCount: number;
}

// ─── Mock data generation ─────────────────────────────────────────────────

const FIRST_NAMES = [
  'Ayoub', 'Sara', 'Karim', 'Leila', 'Youssef', 'Nadia', 'Omar', 'Ines',
  'Hamza', 'Salma', 'Amine', 'Yasmine', 'Reda', 'Zineb', 'Bilal', 'Imane',
  'Othmane', 'Rania', 'Marouane', 'Fatima Zahra', 'Anas', 'Meryem', 'Adil',
  'Hind', 'Soufiane', 'Dounia', 'Yassine', 'Kenza', 'Mehdi', 'Chaimae',
];

const LAST_NAMES = [
  'Hennani', 'Idrissi', 'Mansouri', 'Boudali', 'Alami', 'Cherkaoui', 'Fassi',
  'Bennis', 'Ziani', 'Tazi', 'Berrada', 'Sabir', 'Kabbaj', 'Amrani', 'Ouahbi',
  'Chraibi', 'Naciri', 'Squalli', 'Bouzid', 'Lahlou', 'Benjelloun', 'Ktiri',
  'Belghiti', 'Guessous', 'Skalli', 'Fahmi', 'Bakkali', 'Zniber', 'Rifai', 'Alaoui',
];

const ROLE_CYCLE: AdminRole[] = [
  'Super Admin', 'Admin', 'Admin', 'Manager', 'Manager', 'Support', 'Support', 'Admin',
];

const STATUS_CYCLE: AdminStatus[] = ['online', 'offline', 'offline', 'busy', 'online', 'offline'];

export const ALL_PERMISSIONS = [
  'Manage Products',
  'Manage Orders',
  'Manage Reviews',
  'Manage Customers',
  'Manage Inventory',
  'Manage Categories',
  'Manage Admins',
  'Manage Settings',
  'View Reports',
];

const PERMISSION_SETS: Record<AdminRole, string[]> = {
  'Super Admin': [...ALL_PERMISSIONS],
  'Admin': ['Manage Products', 'Manage Orders', 'Manage Reviews', 'Manage Customers', 'Manage Inventory', 'View Reports'],
  'Manager': ['Manage Products', 'Manage Orders', 'Manage Inventory', 'View Reports'],
  'Support': ['Manage Reviews', 'Manage Customers'],
};

function initials(first: string, last: string): string {
  return (first[0] + last[0]).toUpperCase();
}

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

export function generateMockAdmins(count = 30): AdminUser[] {
  const now = Date.now();
  const admins: AdminUser[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 3 + 1) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;
    const role = ROLE_CYCLE[i % ROLE_CYCLE.length];
    const status: AdminStatus = i === 0 ? 'online' : STATUS_CYCLE[i % STATUS_CYCLE.length];

    const daysAgoCreated = 20 + (i * 17) % 640;
    const createdAt = new Date(now - daysAgoCreated * 86400000).toISOString();

    // last online offset (minutes) — varies so table shows a realistic spread
    const lastOnlineMinutesAgo =
      status === 'online' ? 0 :
      i % 5 === 0 ? 2 + i :
      i % 4 === 0 ? 18 + i * 2 :
      i % 3 === 0 ? 60 * 26 : // ~yesterday
      60 * 24 * (2 + (i % 5)); // n days ago

    const lastOnline = new Date(now - lastOnlineMinutesAgo * 60000).toISOString();

    const loginCount = 12 + (i * 23) % 480;
    const activityCount = 8 + (i * 17) % 310;

    admins.push({
      id: 'admin-' + (i + 1),
      avatar: initials(firstName, lastName),
      firstName,
      lastName,
      fullName,
      email: `${firstName.toLowerCase().replace(/\s+/g, '.')}.${lastName.toLowerCase()}@nexus-admin.com`,
      phone: `+212 6${pad((10 + i) % 100)}${pad((20 + i * 7) % 100)}${pad((30 + i * 3) % 100)}`,
      role,
      status,
      lastOnline,
      createdAt,
      permissions: PERMISSION_SETS[role],
      twoFactorEnabled: i % 3 !== 0,
      loginCount,
      activityCount,
    });
  }

  return admins;
}