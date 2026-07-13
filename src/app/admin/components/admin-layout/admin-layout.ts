// admin-layout.component.ts
import {
  Component, ElementRef, HostListener, computed, inject, signal, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth';
import { NavItem } from '../../model/admin-models.model';
// Adjust this path to wherever notification-dropdown actually lives in your project —
// it mirrors the same relative depth as the model imports above (two levels up to `app/`).
import { NotificationDropdownComponent } from '../notification-dropdown/notification-dropdown';

@Component({
  selector: 'app-admin-layout',
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive, NotificationDropdownComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  auth = inject(AdminAuthService);

  sidebarCollapsed = signal(false);
  mobileSidebarOpen = signal(false);
  darkMode = signal(false);
  searchQuery = signal('');
  searchOpen = signal(false);

  // ── Notification bell / dropdown ──────────────────────────────────────
  notificationsOpen = signal(false);
  @ViewChild('notifWrap') notifWrap?: ElementRef<HTMLElement>;

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

  // Toggle the bell dropdown. stopPropagation keeps the same click from
  // immediately re-triggering the document:click listener below and closing
  // it right after it opens.
  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.notificationsOpen.update(v => !v);
  }

  closeNotifications(): void {
    this.notificationsOpen.set(false);
  }

  // Close the dropdown on any click outside its wrapper (bell button + panel).
  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.notificationsOpen()) return;
    const wrap = this.notifWrap?.nativeElement;
    if (wrap && !wrap.contains(event.target as Node)) {
      this.closeNotifications();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.mobileSidebarOpen.set(false);
    this.searchOpen.set(false);
    this.closeNotifications();
  }

  trackById(_: number, item: NavItem): string { return item.id; }

  // ─── Navigation structure ──────────────────────────────────────────────────
  navSections: { section: string; items: NavItem[] }[] = [
    {
      section: 'Overview',
      items: [
        { id: 'dashboard',  label: 'Dashboard',    route: '/admin/dashboard',  icon: 'dashboard'  },
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
      ],
    },
    {
      section: 'Content',
      items: [
        { id: 'reviews',            label: 'Reviews',             route: '/admin/reviews',             icon: 'reviews' },
        { id: 'notifications',      label: 'Notifications',       route: '/admin/notifications',       icon: 'bell'    },
        { id: 'push-notifications', label: 'Push Notifications',  route: '/admin/push-notifications',  icon: 'push'    },
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