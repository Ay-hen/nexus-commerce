// admin-layout.component.ts
import {
  Component, signal, computed, inject, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth';
import { NavItem } from '../../model/admin-models.model';

@Component({
  selector: 'app-admin-layout',
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  auth = inject(AdminAuthService);

  sidebarCollapsed = signal(false);
  mobileSidebarOpen = signal(false);
  darkMode = signal(true); // admin is dark by default
  searchQuery = signal('');
  searchOpen = signal(false);

  currentAdmin = this.auth.currentAdmin;

  adminInitials = computed(() => {
    const name = this.currentAdmin()?.name ?? 'Admin';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  });

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }
  toggleMobileSidebar(): void { this.mobileSidebarOpen.update(v => !v); }
  closeMobileSidebar(): void { this.mobileSidebarOpen.set(false); }
  toggleDarkMode(): void { this.darkMode.update(v => !v); }

  logout(): void { this.auth.logout(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.mobileSidebarOpen.set(false); this.searchOpen.set(false); }

  trackById(_: number, item: NavItem): string { return item.id; }

  // ─── Navigation structure ──────────────────────────────────────────────────
  navSections: { section: string; items: NavItem[] }[] = [
    {
      section: 'Overview',
      items: [
        { id: 'dashboard',  label: 'Dashboard',    route: '/admin/dashboard',  icon: 'dashboard'  },
        { id: 'analytics',  label: 'Analytics',    route: '/admin/analytics',  icon: 'analytics'  },
        { id: 'reports',    label: 'Reports',       route: '/admin/reports',    icon: 'reports'    },
      ],
    },
    {
      section: 'Catalog',
      items: [
        { id: 'products',   label: 'Products',     route: '/admin/products',   icon: 'products',   badge: 0 },
        { id: 'categories', label: 'Categories',   route: '/admin/categories', icon: 'categories' },
        { id: 'inventory',  label: 'Inventory',    route: '/admin/inventory',  icon: 'inventory',  badge: 3 },
      ],
    },
    {
      section: 'Commerce',
      items: [
        { id: 'orders',     label: 'Orders',       route: '/admin/orders',     icon: 'orders',     badge: 12 },
        { id: 'customers',  label: 'Customers',    route: '/admin/customers',  icon: 'customers'  },
        { id: 'coupons',    label: 'Coupons',      route: '/admin/coupons',    icon: 'coupons'    },
        { id: 'payments',   label: 'Payments',     route: '/admin/payments',   icon: 'payments'   },
      ],
    },
    {
      section: 'Content',
      items: [
        { id: 'reviews',      label: 'Reviews',      route: '/admin/reviews',      icon: 'reviews',   badge: 5 },
        { id: 'notifications',label: 'Notifications',route: '/admin/notifications',icon: 'bell'       },
        { id: 'messages',     label: 'Messages',     route: '/admin/messages',     icon: 'messages',  badge: 2 },
      ],
    },
    {
      section: 'System',
      items: [
        { id: 'admins',    label: 'Admins',       route: '/admin/admins',     icon: 'admins'    },
        { id: 'logs',      label: 'Activity Logs',route: '/admin/logs',       icon: 'logs'      },
        { id: 'settings',  label: 'Settings',     route: '/admin/settings',   icon: 'settings'  },
      ],
    },
  ];
}