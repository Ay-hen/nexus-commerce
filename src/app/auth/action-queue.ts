import { Injectable, signal } from '@angular/core';

/**
 * Every protected action in the app is one of these. Adding a new protected
 * action later (e.g. "LEAVE_REVIEW", "SAVE_ADDRESS") means adding one variant
 * here — nothing else in the queue/service layer changes.
 *
 * `returnUrl` is stamped on automatically by ActionQueue.enqueue(), so callers
 * never set it themselves.
 */
export type PendingAction =
  | { type: 'ADD_TO_CART';      productId: number; quantity: number; returnUrl: string }
  | { type: 'BUY_NOW';          productId: number; quantity: number; returnUrl: string }
  | { type: 'WISHLIST';         productId: number; returnUrl: string }
  | { type: 'CHECKOUT';         returnUrl: string }
  | { type: 'SAVE_ADDRESS';     payload: unknown; returnUrl: string }
  | { type: 'LEAVE_REVIEW';     productId: number; payload: unknown; returnUrl: string }
  | { type: 'VIEW_ORDER_HISTORY'; returnUrl: string }
  | { type: 'SAVE_PAYMENT_METHOD'; payload: unknown; returnUrl: string };

export type PendingActionInput =
  PendingAction extends infer A
    ? A extends { returnUrl: string }
      ? Omit<A, 'returnUrl'>
      : never
    : never;

/**
 * Holds exactly one in-flight protected action — the one that triggered the
 * auth modal. A real multi-step checkout flow could extend this to a true
 * FIFO queue later (rename array, push/shift) without touching call sites,
 * since callers only ever use enqueue() / consume() / peek().
 */
@Injectable({ providedIn: 'root' })
export class ActionQueue {
  private current = signal<PendingAction | null>(null);

  peek(): PendingAction | null {
    return this.current();
  }

  hasPending(): boolean {
    return this.current() !== null;
  }

  enqueue(action: PendingActionInput, returnUrl: string): void {
    this.current.set({ ...action, returnUrl } as PendingAction);
  }

  /** Removes and returns the pending action. Call once you're about to act on it. */
  consume(): PendingAction | null {
    const action = this.current();
    this.current.set(null);
    return action;
  }

  clear(): void {
    this.current.set(null);
  }
}