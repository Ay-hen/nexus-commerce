// admin-auth.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AdminUser } from '../model/admin-models.model';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly TOKEN_KEY = 'nexus_admin_token';
  private readonly USER_KEY  = 'nexus_admin_user';

  // ── State ──────────────────────────────────────────────────────────────────
  private _currentAdmin = signal<AdminUser | null>(this.loadFromStorage());
  private _isLoading    = signal(false);

  readonly currentAdmin = this._currentAdmin.asReadonly();
  readonly isLoading    = this._isLoading.asReadonly();
  readonly isLoggedIn   = computed(() => !!this._currentAdmin());
  readonly adminName    = computed(() => this._currentAdmin()?.name ?? '');
  readonly adminRole    = computed(() => this._currentAdmin()?.role ?? 'viewer');

  constructor(private router: Router) {}

  // ── Login ──────────────────────────────────────────────────────────────────
  // Replace mock with:
  // this.http.post<{ token: string; admin: AdminUser }>('/api/admin/auth/login', creds)
  async login(creds: LoginCredentials): Promise<void> {
    this._isLoading.set(true);

    await new Promise(r => setTimeout(r, 1200)); // simulate network

    // Mock validation — replace with real HTTP call
    if (creds.email === 'admin@nexus.com' && creds.password === 'Admin@123') {
      const mockAdmin: AdminUser = {
        id: 'adm-001',
        name: 'Ayoub hen',
        email: creds.email,
        role: 'super_admin',
        avatar: '',
        lastLogin: new Date().toISOString(),
        twoFactorEnabled: false,
      };

      const mockToken = 'mock.jwt.token';

      if (creds.rememberMe) {
        localStorage.setItem(this.TOKEN_KEY, mockToken);
        localStorage.setItem(this.USER_KEY, JSON.stringify(mockAdmin));
      } else {
        sessionStorage.setItem(this.TOKEN_KEY, mockToken);
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(mockAdmin));
      }

      this._currentAdmin.set(mockAdmin);
      this._isLoading.set(false);
      this.router.navigate(['/admin/dashboard']);
    } else {
      this._isLoading.set(false);
      throw new Error('Invalid email or password.');
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    this._currentAdmin.set(null);
    this.router.navigate(['/admin/login']);
  }

  // ── Token ──────────────────────────────────────────────────────────────────
  getToken(): string | null {
    return (
      localStorage.getItem(this.TOKEN_KEY) ??
      sessionStorage.getItem(this.TOKEN_KEY)
    );
  }

  // ── Restore on page refresh ────────────────────────────────────────────────
  private loadFromStorage(): AdminUser | null {
    try {
      const raw =
        localStorage.getItem(this.USER_KEY) ??
        sessionStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}