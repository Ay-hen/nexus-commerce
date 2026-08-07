// add-admin-modal.ts
import { Component, EventEmitter, Output, HostListener, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUser, AdminRole, ALL_PERMISSIONS } from '../admin.model';
import { TranslatePipe } from '../../../localization/translate.pipe';
import { LanguageService } from '../../../localization/language.service';

const ROLE_KEY_MAP: Record<AdminRole, string> = {
  'Super Admin': 'superAdmin', 'Admin': 'admin', 'Manager': 'manager', 'Support': 'support',
};

const PERMISSION_KEY_MAP: Record<string, string> = {
  'Manage Products': 'manageProducts', 'Manage Orders': 'manageOrders', 'Manage Reviews': 'manageReviews',
  'Manage Customers': 'manageCustomers', 'Manage Inventory': 'manageInventory', 'Manage Categories': 'manageCategories',
  'Manage Admins': 'manageAdmins', 'Manage Settings': 'manageSettings', 'View Reports': 'viewReports',
};

@Component({
  selector: 'app-add-admin-modal',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './add-admin-modal.html',
  styleUrl: './add-admin-modal.scss',
})
export class AddAdminModal {
  protected lang = inject(LanguageService);

  @Output() cancelled = new EventEmitter<void>();
  @Output() created = new EventEmitter<AdminUser>();

  allPermissions = ALL_PERMISSIONS;
  roles: AdminRole[] = ['Super Admin', 'Admin', 'Manager', 'Support'];

  firstName = signal('');
  lastName = signal('');
  email = signal('');
  phone = signal('');
  role = signal<AdminRole>('Support');
  password = signal('');
  confirmPassword = signal('');
  selectedPermissions = signal<Set<string>>(new Set());
  twoFactorEnabled = signal(true);

  submitting = signal(false);
  touched = signal(false);

  avatarInitials = computed(() => {
    const f = this.firstName().trim();
    const l = this.lastName().trim();
    if (!f && !l) return '?';
    return ((f[0] ?? '') + (l[0] ?? '')).toUpperCase();
  });

  passwordsMatch = computed(() => this.password() === this.confirmPassword());

  isValid = computed(() => {
    return !!this.firstName().trim()
      && !!this.lastName().trim()
      && !!this.email().trim()
      && !!this.phone().trim()
      && this.password().length >= 8
      && this.passwordsMatch();
  });

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cancel(); }

  cancel(): void { this.cancelled.emit(); }

  togglePermission(p: string): void {
    this.selectedPermissions.update(set => {
      const next = new Set(set);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  }

  isPermissionSelected(p: string): boolean {
    return this.selectedPermissions().has(p);
  }

  roleLabel(role: AdminRole): string {
    return this.lang.translate('admins.roles.' + ROLE_KEY_MAP[role]);
  }

  permissionLabel(p: string): string {
    return this.lang.translate('admins.permissionLabels.' + PERMISSION_KEY_MAP[p]);
  }

  setRole(role: AdminRole): void {
    this.role.set(role);
    // Pre-fill sensible defaults for the role, still editable afterwards
    const defaults: Record<AdminRole, string[]> = {
      'Super Admin': [...ALL_PERMISSIONS],
      'Admin': ['Manage Products', 'Manage Orders', 'Manage Reviews', 'Manage Customers', 'Manage Inventory', 'View Reports'],
      'Manager': ['Manage Products', 'Manage Orders', 'Manage Inventory', 'View Reports'],
      'Support': ['Manage Reviews', 'Manage Customers'],
    };
    this.selectedPermissions.set(new Set(defaults[role]));
  }

  submit(): void {
    this.touched.set(true);
    if (!this.isValid()) return;

    this.submitting.set(true);

    setTimeout(() => {
      const firstName = this.firstName().trim();
      const lastName = this.lastName().trim();
      const admin: AdminUser = {
        id: 'admin-' + Date.now(),
        avatar: this.avatarInitials(),
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        email: this.email().trim(),
        phone: this.phone().trim(),
        role: this.role(),
        status: 'offline',
        lastOnline: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        permissions: Array.from(this.selectedPermissions()),
        twoFactorEnabled: this.twoFactorEnabled(),
        loginCount: 0,
        activityCount: 0,
      };

      this.submitting.set(false);
      this.created.emit(admin);
    }, 600);
  }
}