// admin-detail.model.ts
import { AdminUser } from './admin.model';

export type ActivityKind =
  | 'login'
  | 'product'
  | 'order'
  | 'review'
  | 'category'
  | 'customer'
  | 'inventory'
  | 'report'
  | 'settings'
  | 'security';

export interface AdminActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  date: string; // ISO
}

export interface AdminUserDetail extends AdminUser {
  activity: AdminActivityEvent[];
}

const ACTIVITY_TEMPLATES: { kind: ActivityKind; title: string; description: string }[] = [
  { kind: 'login', title: 'Logged in', description: 'Signed in from a new session.' },
  { kind: 'product', title: 'Edited Product', description: 'Updated pricing and stock for a catalog item.' },
  { kind: 'review', title: 'Approved Review', description: 'Approved a customer review for publishing.' },
  { kind: 'category', title: 'Created Category', description: 'Added a new product category to the catalog.' },
  { kind: 'product', title: 'Deleted Product', description: 'Removed a discontinued product listing.' },
  { kind: 'customer', title: 'Updated Customer', description: 'Edited a customer profile\'s contact details.' },
  { kind: 'report', title: 'Viewed Analytics', description: 'Reviewed the monthly sales performance report.' },
  { kind: 'order', title: 'Changed Order Status', description: 'Marked an order as shipped.' },
  { kind: 'inventory', title: 'Updated Inventory', description: 'Adjusted stock counts for a warehouse batch.' },
  { kind: 'report', title: 'Exported Report', description: 'Exported the quarterly revenue report to CSV.' },
  { kind: 'security', title: 'Changed Password', description: 'Updated account password.' },
  { kind: 'settings', title: 'Updated Settings', description: 'Modified store notification preferences.' },
];

function buildActivity(seed: number): AdminActivityEvent[] {
  const now = Date.now();
  const events: AdminActivityEvent[] = [];
  const count = 8 + (seed % 6);

  for (let i = 0; i < count; i++) {
    const template = ACTIVITY_TEMPLATES[(seed + i) % ACTIVITY_TEMPLATES.length];
    // spread across today, yesterday, and the last few days
    const dayOffset = i < 3 ? 0 : i < 6 ? 1 : 2 + (i % 3);
    const hourOffset = (seed + i * 3) % 20;
    const date = new Date(now - dayOffset * 86400000 - hourOffset * 3600000 - (i * 60000));

    events.push({
      id: `act-${seed}-${i}`,
      kind: template.kind,
      title: template.title,
      description: template.description,
      date: date.toISOString(),
    });
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function toAdminDetail(admin: AdminUser): AdminUserDetail {
  const seed = admin.id.split('-').pop();
  const seedNum = seed ? parseInt(seed, 10) || 0 : 0;
  return {
    ...admin,
    activity: buildActivity(seedNum),
  };
}