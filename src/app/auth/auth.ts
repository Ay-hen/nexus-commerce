import { Service } from '@angular/core';

import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

export type AuthModalReason = 'buy-now' | 'checkout' | 'wishlist' | 'generic';

export interface MockUser {
  name: string;
  email: string;
}

/**
 * What the user was trying to do when we interrupted them with auth.
 * This is the piece that makes "redirect back after sign-in" possible,
 * and it's the exact shape your real backend flow will need too —
 * when JWT auth lands, only `mockLogin`/`mockSignUp` change, this stays.
 */
interface PendingIntent {
  type: 'buy-now' | 'add-to-cart' | 'wishlist' | 'checkout';
  productId?: number;
  quantity?: number;
  returnUrl: string;
}

const SESSION_KEY = 'mock_session_v1';

@Injectable({ providedIn: 'root' })
export class Auth {
  private router = inject(Router);

  // ── Auth state ──────────────────────────────────────────────────────────
  isLoggedIn   = signal<boolean>(this.readPersistedUser() !== null);
  currentUser  = signal<MockUser | null>(this.readPersistedUser());

  // ── Modal state ─────────────────────────────────────────────────────────
  modalOpen    = signal(false);
  modalReason  = signal<AuthModalReason>('generic');

  private pendingIntent: PendingIntent | null = null;

  /**
   * Call this from any "protected" action (Buy Now, Add to Cart, Add to
   * Wishlist, Checkout). Returns true if the user is already authenticated
   * (caller should proceed immediately). Returns false if the modal was
   * opened instead (caller should stop and let the modal take over).
   */
  requireAuth(
    reason: AuthModalReason,
    intent?: Omit<PendingIntent, 'returnUrl'>
  ): boolean {
    if (this.isLoggedIn()) return true;

    this.pendingIntent = {
      ...(intent ?? { type: 'checkout' }),
      returnUrl: this.router.url,
    };
    this.modalReason.set(reason);
    this.modalOpen.set(true);
    return false;
  }

  closeModal() {
    this.modalOpen.set(false);
    // Closing without authenticating (X button / Esc / backdrop) abandons
    // the intent — don't silently redirect somewhere unexpected later.
    this.pendingIntent = null;
  }

  // ── Mock auth actions (swap these for real HTTP calls later) ────────────
  async mockLogin(email: string, password: string): Promise<void> {
    await this.fakeNetworkDelay();
    if (!email.trim() || password.length < 6) {
      throw new Error('Invalid credentials');
    }
    this.setSession({ name: this.deriveNameFromEmail(email), email });
  }

  async mockSignUp(name: string, email: string, password: string): Promise<void> {
    await this.fakeNetworkDelay();
    if (!name.trim() || !email.trim() || password.length < 6) {
      throw new Error('Invalid sign-up payload');
    }
    this.setSession({ name, email });
  }

  continueAsGuest(): void {
    // For buy-now/checkout intents you may eventually want a distinct
    // "guest checkout" path rather than fully discarding the intent.
    // For this prototype we just close and let the user keep browsing.
    this.modalOpen.set(false);
    this.pendingIntent = null;
  }

  logout(): void {
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  /**
   * Called by the modal right after a successful sign-in/sign-up.
   * This is the "redirect back to product / go to checkout" requirement.
   */
  handlePostAuthRedirect(): void {
    this.modalOpen.set(false);
    const intent = this.pendingIntent;
    this.pendingIntent = null;

    if (!intent) return; // opened generically, no specific destination

    if (intent.type === 'buy-now' || intent.type === 'checkout') {
      this.router.navigate(['/checkout'], {
        queryParams: {
          productId: intent.productId ?? null,
          qty: intent.quantity ?? 1,
        },
      });
      return;
    }

    // add-to-cart / wishlist intents: just send them back where they were
    this.router.navigateByUrl(intent.returnUrl);
  }

  // ── Persistence (swap for real token storage later) ─────────────────────
  private setSession(user: MockUser) {
    this.isLoggedIn.set(true);
    this.currentUser.set(user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  private readPersistedUser(): MockUser | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as MockUser) : null;
    } catch {
      return null;
    }
  }

  private deriveNameFromEmail(email: string): string {
    return email.split('@')[0].replace(/[._-]/g, ' ');
  }

  private fakeNetworkDelay(ms = 700): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}