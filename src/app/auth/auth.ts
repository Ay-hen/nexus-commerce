import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActionQueue, PendingAction, PendingActionInput } from './action-queue';

export type AuthModalReason = 'buy-now' | 'checkout' | 'wishlist' | 'review' | 'account' | 'generic';

export interface MockUser {
  name: string;
  email: string;
}

const SESSION_KEY = 'mock_session_v1';

/**
 * A handler resumes exactly one PendingAction variant after login succeeds.
 * Components register handlers for the action types they know how to perform
 * (e.g. ProductDetails registers ADD_TO_CART/BUY_NOW/WISHLIST while it's alive).
 * If no handler is registered for the resumed action's type — e.g. the person
 * navigated away before finishing sign-in — Auth falls back to returnUrl.
 */
type ActionHandler = (action: PendingAction) => void;

@Injectable({ providedIn: 'root' })
export class Auth {
  private router = inject(Router);
  private queue  = inject(ActionQueue);

  // ── Auth state ────────────────────────────────────────────────────────────
  // 🔁 FUTURE JWT SWAP POINT:
  // Replace readPersistedUser()/setSession()/logout() bodies with real HTTP
  // calls to Spring Security endpoints + access/refresh token storage.
  // isLoggedIn, currentUser, requireAuth(), and resumePendingAction() are the
  // PUBLIC CONTRACT the rest of the app depends on — none of that changes.
  isLoggedIn  = signal<boolean>(this.readPersistedUser() !== null);
  currentUser = signal<MockUser | null>(this.readPersistedUser());

  // ── Modal state ───────────────────────────────────────────────────────────
  modalOpen   = signal(false);
  modalReason = signal<AuthModalReason>('generic');

  

  private handlers = new Map<PendingAction['type'], ActionHandler>();

  /**
   * Components call this once (typically in their constructor) to claim
   * responsibility for resuming a given action type once login succeeds.
   * Returns an unregister function — call it in ngOnDestroy / DestroyRef.
   */
  registerHandler(type: PendingAction['type'], handler: ActionHandler): () => void {
    this.handlers.set(type, handler);
    return () => this.handlers.delete(type);
  }

  /**
   * Call from any protected action. Returns true immediately if already
   * authenticated (caller proceeds inline). Returns false if the modal was
   * opened instead — caller should stop; resumption happens automatically.
   */
  requireAuth(reason: AuthModalReason, action: PendingActionInput): boolean {
    if (this.isLoggedIn()) return true;

    this.queue.enqueue(action, this.router.url);
    this.modalReason.set(reason);
    this.modalOpen.set(true);
    return false;
  }

  closeModal(): void {
    this.modalOpen.set(false);
    // Closing without authenticating (X / Esc / backdrop) abandons the
    // intent on purpose — don't silently resume something unexpected later.
    this.queue.clear();
  }

  // ── Mock auth actions (swap for real HTTP calls when Spring Security lands) ─
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
    // Buy Now / Checkout could route to a distinct guest-checkout flow later.
    // For this prototype, guest browsing simply abandons the queued intent.
    this.modalOpen.set(false);
    this.queue.clear();
  }

  logout(): void {
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  /**
   * Called by AuthModal immediately after a successful sign-in/sign-up.
   * Resolves the queued action via whichever component registered a handler
   * for its type; falls back to returnUrl if nothing claims it.
   */
  resumePendingAction(): void {
    this.modalOpen.set(false);
    const action = this.queue.consume();
    if (!action) return; // opened generically, nothing to resume

    const handler = this.handlers.get(action.type);
    if (handler) {
      handler(action);
      return;
    }

    // No live handler (e.g. person navigated away mid-login). Reasonable
    // defaults per action so the redirect still makes sense.
    switch (action.type) {
      case 'BUY_NOW':
      case 'CHECKOUT':
        this.router.navigate(['/checkout'], {
          queryParams: {
            productId: 'productId' in action ? action.productId : null,
            qty: 'quantity' in action ? action.quantity : 1,
          },
        });
        return;
      case 'VIEW_ORDER_HISTORY':
        this.router.navigate(['/account/orders']);
        return;
      default:
        this.router.navigateByUrl(action.returnUrl);
    }
  }

  // ── Persistence (swap for real token storage later) ──────────────────────
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