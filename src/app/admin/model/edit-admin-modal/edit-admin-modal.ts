// edit-admin-modal.ts
import { Component, EventEmitter, Input, Output, HostListener, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUser, AdminRole, ALL_PERMISSIONS } from '../admin.model';
import { AdminUserDetail } from '../admin-detail.model';
import { TranslatePipe } from '../../localization/translate.pipe';
import { LanguageService } from '../../localization/language.service';

const ROLE_KEY_MAP: Record<AdminRole, string> = {
  'Super Admin': 'superAdmin', 'Admin': 'admin', 'Manager': 'manager', 'Support': 'support',
};

const PERMISSION_KEY_MAP: Record<string, string> = {
  'Manage Products': 'manageProducts', 'Manage Orders': 'manageOrders', 'Manage Reviews': 'manageReviews',
  'Manage Customers': 'manageCustomers', 'Manage Inventory': 'manageInventory', 'Manage Categories': 'manageCategories',
  'Manage Admins': 'manageAdmins', 'Manage Settings': 'manageSettings', 'View Reports': 'viewReports',
};

@Component({
  selector: 'app-edit-admin-modal',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './edit-admin-modal.html',
  styleUrl: './edit-admin-modal.scss',
})
export class EditAdminModal implements OnInit {
  protected lang = inject(LanguageService);

  @Input({ required: true }) admin!: AdminUserDetail;
  @Output() cancelled = new EventEmitter<void>();
  @Output() saved = new EventEmitter<AdminUser>();

  allPermissions = ALL_PERMISSIONS;
  roles: AdminRole[] = ['Super Admin', 'Admin', 'Manager', 'Support'];

  firstName = signal('');
  lastName = signal('');
  email = signal('');
  phone = signal('');
  role = signal<AdminRole>('Support');
  selectedPermissions = signal<Set<string>>(new Set());
  twoFactorEnabled = signal(true);

  saving = signal(false);
  touched = signal(false);

  avatarInitials = computed(() => {
    const f = this.firstName().trim();
    const l = this.lastName().trim();
    if (!f && !l) return '?';
    return ((f[0] ?? '') + (l[0] ?? '')).toUpperCase();
  });

  isValid = computed(() => {
    return !!this.firstName().trim() && !!this.lastName().trim() && !!this.email().trim() && !!this.phone().trim();
  });

  ngOnInit(): void {
    this.firstName.set(this.admin.firstName);
    this.lastName.set(this.admin.lastName);
    this.email.set(this.admin.email);
    this.phone.set(this.admin.phone);
    this.role.set(this.admin.role);
    this.selectedPermissions.set(new Set(this.admin.permissions));
    this.twoFactorEnabled.set(this.admin.twoFactorEnabled);
  }

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

  setRole(role: AdminRole): void { this.role.set(role); }

  formatDate(iso: string): string {
    return this.lang.formatDate(iso, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  save(): void {
    this.touched.set(true);
    if (!this.isValid()) return;

    this.saving.set(true);

    setTimeout(() => {
      const firstName = this.firstName().trim();
      const lastName = this.lastName().trim();
      const updated: AdminUser = {
        ...this.admin,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        avatar: this.avatarInitials(),
        email: this.email().trim(),
        phone: this.phone().trim(),
        role: this.role(),
        permissions: Array.from(this.selectedPermissions()),
        twoFactorEnabled: this.twoFactorEnabled(),
      };

      this.saving.set(false);
      this.saved.emit(updated);
    }, 600);
  }
}