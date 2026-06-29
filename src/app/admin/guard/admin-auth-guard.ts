// admin-auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth';

export const adminAuthGuard: CanActivateFn = () => {
  const auth   = inject(AdminAuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  router.navigate(['/admin/login']);
  return false;
};

// Redirect already-logged-in admins away from /admin/login
export const adminLoginGuard: CanActivateFn = () => {
  const auth   = inject(AdminAuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return true;

  router.navigate(['/admin/dashboard']);
  return false;
};