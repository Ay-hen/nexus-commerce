// admin-login.component.ts
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminAuthService } from '../../services/admin-auth';

@Component({
  selector: 'app-admin-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
})
export class AdminLogin {
  private auth = inject(AdminAuthService);

  email      = '';
  password   = '';
  rememberMe = false;

  showPassword = signal(false);
  errorMsg     = signal('');
  isLoading    = this.auth.isLoading;

  togglePassword(): void { this.showPassword.update(v => !v); }

  async onSubmit(): Promise<void> {
    this.errorMsg.set('');
    if (!this.email || !this.password) {
      this.errorMsg.set('Please enter your email and password.');
      return;
    }
    try {
      await this.auth.login({ email: this.email, password: this.password, rememberMe: this.rememberMe });
    } catch (err: any) {
      this.errorMsg.set(err.message ?? 'Login failed. Please try again.');
    }
  }
}