import {
  Component, signal, computed, inject, effect, HostListener, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, AuthModalReason } from '../../auth/auth';

type ModalView = 'landing' | 'sign-in' | 'sign-up';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
}

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.html',
  styleUrl: './auth-modal.scss',
})
export class AuthModal {
  private auth = inject(Auth);

  @ViewChild('modalPanel') modalPanel!: ElementRef<HTMLElement>;

  // ── Visibility / animation ─────────────────────────────────────────────
  isVisible  = signal(false);  // drives @if so DOM exists before animate-in
  isEntering = signal(false);  // CSS class for scale + fade in
  isLeaving  = signal(false);  // CSS class for scale + fade out

  // ── View state ───────────────────────────────────────────────────────────
  view = signal<ModalView>('landing');

  // ── Form fields ──────────────────────────────────────────────────────────
  name     = '';
  email    = '';
  password = '';
  showPass = signal(false);

  // ── Async state ──────────────────────────────────────────────────────────
  loading  = signal(false);
  errors   = signal<FormErrors>({});
  apiError = signal('');

  // ── Derived from service ────────────────────────────────────────────────
  reason = computed(() => this.auth.modalReason());

  readonly reasonCopy: Record<AuthModalReason, { title: string; sub: string }> = {
    'buy-now':  { title: 'Sign in to complete your purchase', sub: 'Join Nexus for a faster, smarter checkout experience.' },
    'checkout': { title: 'Almost there!',                     sub: 'Sign in to review your order and check out securely.' },
    'wishlist': { title: 'Save to your wishlist',             sub: 'Create an account to keep track of everything you love.' },
    'generic':  { title: 'Sign in to continue',                sub: 'Access your orders, wishlist, and secure checkout.' },
  };

  get copy() { return this.reasonCopy[this.reason()]; }

  constructor() {
    // Replaces the old setInterval(16ms) polling loop. effect() re-runs
    // automatically whenever auth.modalOpen() changes — no timer, no
    // teardown bug, no wasted ticks while the modal is already in sync.
    effect(() => {
      const shouldBeOpen = this.auth.modalOpen();
      if (shouldBeOpen && !this.isVisible()) this.open();
      if (!shouldBeOpen && this.isVisible() && !this.isLeaving()) this.animateClose();
    });
  }

  // ── Open / close ─────────────────────────────────────────────────────────
  open() {
    this.resetForm();
    this.isVisible.set(true);
    this.isLeaving.set(false);
    requestAnimationFrame(() => this.isEntering.set(true));
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.auth.closeModal();
  }

  animateClose() {
    this.isEntering.set(false);
    this.isLeaving.set(true);
    setTimeout(() => {
      this.isVisible.set(false);
      this.isLeaving.set(false);
      document.body.style.overflow = '';
    }, 260);
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('auth-backdrop')) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isVisible()) this.close();
  }

  // ── Navigation between views ──────────────────────────────────────────────
  goTo(v: ModalView) {
    this.errors.set({});
    this.apiError.set('');
    this.view.set(v);
  }

  // ── Form validation ───────────────────────────────────────────────────────
  private validateSignIn(): boolean {
    const e: FormErrors = {};
    if (!this.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) e.email = 'Enter a valid email address.';
    if (!this.password) e.password = 'Password is required.';
    else if (this.password.length < 6) e.password = 'Password must be at least 6 characters.';
    this.errors.set(e);
    return Object.keys(e).length === 0;
  }

  private validateSignUp(): boolean {
    const e: FormErrors = {};
    if (!this.name.trim()) e.name = 'Full name is required.';
    if (!this.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) e.email = 'Enter a valid email address.';
    if (!this.password) e.password = 'Password is required.';
    else if (this.password.length < 6) e.password = 'Must be at least 6 characters.';
    this.errors.set(e);
    return Object.keys(e).length === 0;
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async submitSignIn() {
    if (!this.validateSignIn()) return;
    this.loading.set(true);
    this.apiError.set('');
    try {
      await this.auth.mockLogin(this.email, this.password);
      this.auth.handlePostAuthRedirect();
    } catch {
      this.apiError.set('Incorrect email or password. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async submitSignUp() {
    if (!this.validateSignUp()) return;
    this.loading.set(true);
    this.apiError.set('');
    try {
      await this.auth.mockSignUp(this.name, this.email, this.password);
      this.auth.handlePostAuthRedirect();
    } catch {
      this.apiError.set('Something went wrong. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  continueAsGuest() {
    this.auth.continueAsGuest();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private resetForm() {
    this.name = '';
    this.email = '';
    this.password = '';
    this.showPass.set(false);
    this.errors.set({});
    this.apiError.set('');
    this.view.set('landing');
    this.loading.set(false);
  }

  toggleShowPass() { this.showPass.update(v => !v); }

  hasError(field: keyof FormErrors) { return !!this.errors()[field]; }
  getError(field: keyof FormErrors) { return this.errors()[field] ?? ''; }
}