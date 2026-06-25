import {
  Component, signal, computed, inject, effect, HostListener, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, AuthModalReason } from '../../auth/auth';

type ModalView = 'landing' | 'sign-in' | 'sign-up';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  agreeTerms?: string;
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
  firstName = '';
  lastName = '';
  confirmPassword = '';
  agreeTerms = false;
  email    = '';
  password = '';
  showPass = signal(false);
  passwordStrength = signal<'empty' | 'weak' | 'fair' | 'good' | 'strong'>('empty');

  // ── Async state ──────────────────────────────────────────────────────────
  loading  = signal(false);
  errors   = signal<FormErrors>({});
  apiError = signal('');

  constructor() {
  effect(() => {
    const shouldBeOpen = this.auth.modalOpen();
    if (shouldBeOpen && !this.isVisible()) this.open();
    if (!shouldBeOpen && this.isVisible() && !this.isLeaving()) this.animateClose();
  });
}

  // ── Derived from service ────────────────────────────────────────────────
  reason = computed(() => this.auth.modalReason());

  readonly reasonCopy: Record<AuthModalReason, { title: string; sub: string }> = {
    'buy-now':  { title: 'Sign in to complete your purchase', sub: 'Create an account or sign in to access your cart, wishlist, orders, and secure checkout.' },
    'checkout': { title: 'Almost there!',                     sub: 'Sign in to review your order and check out securely.' },
    'wishlist': { title: 'Save to your wishlist',             sub: 'Create an account to keep track of everything you love.' },
    'review':   { title: 'Sign in to leave a review',         sub: 'Verified sign-in helps keep reviews trustworthy for everyone.' },
    'account':  { title: 'Sign in to your account',           sub: 'View your orders, saved addresses, and payment methods.' },
    'generic':  { title: 'Sign in to continue',               sub: 'Create an account or sign in to access your cart, wishlist, orders, and secure checkout.' },
  };

  get copy() { return this.reasonCopy[this.reason()]; }

  /*constructor() {
    // effect() re-runs automatically whenever auth.modalOpen() changes — no
    // timer, no teardown bug, no wasted ticks while the modal is in sync.
    effect(() => {
      const shouldBeOpen = this.auth.modalOpen();
      if (shouldBeOpen && !this.isVisible()) this.open();
      if (!shouldBeOpen && this.isVisible() && !this.isLeaving()) this.animateClose();
    });
  }*/

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

    if (!this.firstName.trim()) {
      e.firstName = 'First name is required.';
    }

    if (!this.lastName.trim()) {
      e.lastName = 'Last name is required.';
    }

    if (!this.email.trim()) {
      e.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      e.email = 'Enter a valid email address.';
    }

    if (!this.password) {
      e.password = 'Password is required.';
    } else if (this.password.length < 8) {
      e.password = 'Password must be at least 8 characters.';
    }

    if (!this.confirmPassword) {
      e.confirmPassword = 'Please confirm your password.';
    } else if (this.password !== this.confirmPassword) {
      e.confirmPassword = 'Passwords do not match.';
    }

    if (!this.agreeTerms) {
      e.agreeTerms = 'You must accept the Terms.';
    }

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
      this.auth.resumePendingAction();
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
      await this.auth.mockSignUp(
        `${this.firstName} ${this.lastName}`,
        this.email,
        this.password
      );
      this.auth.resumePendingAction();
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
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.agreeTerms = false;

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