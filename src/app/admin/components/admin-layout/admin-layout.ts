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
import { LanguageService } from '../../../localization/language.service';
import { TranslatePipe } from '../../../localization/translate.pipe';
import { LanguageCode } from '../../../localization/language.model';

@Component({
  selector: 'app-admin-layout',
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive, NotificationDropdownComponent, TranslatePipe],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  auth = inject(AdminAuthService);
  lang = inject(LanguageService);

  sidebarCollapsed = signal(false);
  mobileSidebarOpen = signal(false);
  darkMode = signal(false);
  searchQuery = signal('');
  searchOpen = signal(false);

  // ── Notification bell / dropdown ──────────────────────────────────────
  notificationsOpen = signal(false);
  @ViewChild('notifWrap') notifWrap?: ElementRef<HTMLElement>;

  // ── Language switcher ────────────────────────────────────────────────
  languageMenuOpen = signal(false);
  @ViewChild('langWrap') langWrap?: ElementRef<HTMLElement>;

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

  // Same pattern as the notification bell — stopPropagation so the opening
  // click doesn't immediately trigger onDocClick and close the menu.
  toggleLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.languageMenuOpen.update(v => !v);
  }

  closeLanguageMenu(): void {
    this.languageMenuOpen.set(false);
  }

  selectLanguage(code: LanguageCode): void {
    this.lang.changeLanguage(code);
    this.closeLanguageMenu();
  }

  // Close the dropdowns on any click outside their wrapper.
  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (this.notificationsOpen()) {
      const wrap = this.notifWrap?.nativeElement;
      if (wrap && !wrap.contains(event.target as Node)) {
        this.closeNotifications();
      }
    }
    if (this.languageMenuOpen()) {
      const wrap = this.langWrap?.nativeElement;
      if (wrap && !wrap.contains(event.target as Node)) {
        this.closeLanguageMenu();
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.mobileSidebarOpen.set(false);
    this.searchOpen.set(false);
    this.closeNotifications();
    this.closeLanguageMenu();
  }

  trackById(_: number, item: NavItem): string { return item.id; }

  // ─── Navigation structure ──────────────────────────────────────────────────
  // section / label now hold translation keys instead of literal English text.
  navSections: { section: string; items: NavItem[] }[] = [
    {
      section: 'navigation.sections.overview',
      items: [
        { id: 'dashboard',  label: 'navigation.dashboard',    route: '/admin/dashboard',  icon: 'dashboard'  },
        { id: 'reports',    label: 'navigation.reports',       route: '/admin/reports',    icon: 'reports'    },
      ],
    },
    {
      section: 'navigation.sections.catalog',
      items: [
        { id: 'products',   label: 'navigation.products',     route: '/admin/products',   icon: 'products' },
        { id: 'categories', label: 'navigation.categories',   route: '/admin/categories', icon: 'categories' },
        { id: 'inventory',  label: 'navigation.inventory',    route: '/admin/inventory',  icon: 'inventory' },
      ],
    },
    {
      section: 'navigation.sections.commerce',
      items: [
        { id: 'orders',     label: 'navigation.orders',       route: '/admin/orders',     icon: 'orders' },
        { id: 'customers',  label: 'navigation.customers',    route: '/admin/customers',  icon: 'customers'  },
      ],
    },
    {
      section: 'navigation.sections.content',
      items: [
        { id: 'reviews',            label: 'navigation.reviews',             route: '/admin/reviews',             icon: 'reviews' },
        { id: 'notifications',      label: 'navigation.notifications',       route: '/admin/notifications',       icon: 'bell'    },
        { id: 'push-notifications', label: 'navigation.pushNotifications',  route: '/admin/push-notifications',  icon: 'push'    },
      ],
    },
    {
      section: 'navigation.sections.system',
      items: [
        { id: 'admins',    label: 'navigation.admins',       route: '/admin/admins',     icon: 'admins'    },
        { id: 'logs',      label: 'navigation.activityLogs', route: '/admin/logs',       icon: 'logs'      },
        { id: 'settings',  label: 'navigation.settings',     route: '/admin/settings',   icon: 'settings'  },
      ],
    },
  ];
}