import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

/**
 * For pages that cannot render anything meaningful without a session —
 * Order History, Saved Addresses, Saved Payment Methods. Unlike the
 * requireAuth() interrupt-and-resume pattern (used for Buy Now / Add to
 * Cart / Wishlist / Checkout, where there's a page underneath worth staying
 * on), there's no "page underneath" here, so we open the modal AND bounce
 * to home. After login, Auth's VIEW_ORDER_HISTORY fallback in
 * resumePendingAction() sends them back to the page they wanted.
 *
 * Usage in routes:
 *   { path: 'account/orders', component: OrderHistory, canActivate: [authGuard] }
 *
 * 🔁 FUTURE JWT SWAP POINT: once real tokens exist, isLoggedIn() will reflect
 * actual token validity (including refresh-token silent renewal) instead of
 * a sessionStorage flag — this guard's logic does not need to change.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth   = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  auth.requireAuth('account', {
    type: 'VIEW_ORDER_HISTORY',
  } as any); // VIEW_ORDER_HISTORY carries no extra payload beyond returnUrl

  // Send them somewhere sane immediately; the modal renders on top of
  // whatever page is active, so home is a safe default landing spot.
  return router.createUrlTree(['/']);
};