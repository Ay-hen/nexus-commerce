// delete-admin-modal.ts
import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminUser } from '../admin-model';

@Component({
  selector: 'app-delete-admin-modal',
  imports: [CommonModule],
  templateUrl: './delete-admin-modal.html',
  styleUrl: './delete-admin-modal.scss',
})
export class DeleteAdminModal {
  @Input({ required: true }) admin!: AdminUser;
  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<AdminUser>();

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cancelled.emit(); }

  cancel(): void { this.cancelled.emit(); }
  confirm(): void { this.confirmed.emit(this.admin); }

  roleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      'Super Admin': 'role-badge--super',
      'Admin': 'role-badge--admin',
      'Manager': 'role-badge--manager',
      'Support': 'role-badge--support',
    };
    return map[role] ?? 'role-badge--admin';
  }
}