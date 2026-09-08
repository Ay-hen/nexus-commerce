// admin-layout.component.ts
import {
  Component, ElementRef, HostListener, computed, inject, signal, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth';
import { NavItem } from '../../model/admin-models.model';
// Adjust this path to wherever notification-dropdown actually lives in your project —
// it mirrors the same relative depth as the model imports above (two levels up to `app/`).
import { NotificationDropdownComponent } from '../notification-dropdown/notification-dropdown';
import { generateMockNotifications } from '../../model/notification-model';
import { LanguageService } from '../../../localization/language.service';
import { TranslatePipe } from '../../../localization/translate.pipe';
import { LanguageCode } from '../../../localization/language.model';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-admin-layout',
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive, NotificationDropdownComponent, TranslatePipe],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  auth = inject(AdminAuthService);
  lang = inject(LanguageService);
  // Single source of truth for Admin theme/appearance — the navbar's
  // dark-mode button and Settings > Appearance both read/write this same
  // service, so they can never fall out of sync with each other again.
  theme = inject(ThemeService);
  private router = inject(Router);

  sidebarCollapsed = signal(false);
  mobileSidebarOpen = signal(false);
  searchQuery = signal('');
  // Was declared but never actually wired to anything — the search input
  // had no value binding, no submit handler, and no mobile collapse
  // behavior despite the layout clearly being designed for one (a bare
  // "⌘K" hint with nothing listening for it). See onGlobalKeydown(),
  // submitGlobalSearch(), and the mobile search toggle below.
  searchOpen = signal(false);
  @ViewChild('globalSearchInput') globalSearchInput?: ElementRef<HTMLInputElement>;

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

  // Every nav item has an optional `badge` field, and the template/CSS for
  // showing it (a count pill, or a dot when the sidebar is collapsed) was
  // already fully built — but nothing in `navSections` ever set a value,
  // so it was permanently dead. The Notifications item (and the bell icon
  // in the top navbar) now reflect the real unread count from the same
  // mock data source the notification bell dropdown uses, so none of the
  // three can ever disagree with each other.
  // (Reuses the existing mock generator rather than introducing a new
  // shared service — swap this for a live count once a NotificationService
  // exists, same note as on NotificationDropdownComponent.)
  unreadNotificationsCount = computed(
    () => generateMockNotifications().filter(n => !n.read).length
  );

  badgeFor(item: NavItem): number | undefined {
    if (item.id === 'notifications') return this.unreadNotificationsCount();
    return item.badge;
  }

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }
  toggleMobileSidebar(): void { this.mobileSidebarOpen.update(v => !v); }
  closeMobileSidebar(): void { this.mobileSidebarOpen.set(false); }
  // Delegates to ThemeService (toggles Light ⇄ Dark). "System" stays an
  // opt-in choice only available from Settings > Appearance.
  toggleDarkMode(): void { this.theme.toggleLightDark(); }

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

  // ⌘K / Ctrl+K focuses the global search — matches the "⌘K" hint already
  // shown in the search box, which previously did nothing when pressed.
  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (!isShortcut) return;
    event.preventDefault();
    this.searchOpen.set(true);
    // Wait a tick for the (possibly just-revealed, on mobile) input to exist.
    setTimeout(() => this.globalSearchInput?.nativeElement.focus());
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  // Global search only has one real destination right now — the Products
  // list, which already supports filtering by name/brand/SKU and now reads
  // a `?search=` query param on load (see products.ts ngOnInit). Widening
  // this to search across Orders/Customers too belongs with those pages'
  // own audit steps, not this one.
  submitGlobalSearch(): void {
    const query = this.searchQuery().trim();
    if (!query) return;
    this.router.navigate(['/admin/products'], { queryParams: { search: query } });
    this.searchOpen.set(false);
    this.closeMobileSidebar();
  }

  toggleMobileSearch(): void {
    this.searchOpen.update(v => !v);
    if (this.searchOpen()) {
      setTimeout(() => this.globalSearchInput?.nativeElement.focus());
    }
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