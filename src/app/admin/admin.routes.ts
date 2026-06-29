// admin.routes.ts
import { Routes } from '@angular/router';
import { adminAuthGuard, adminLoginGuard } from './guard/admin-auth-guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [adminLoginGuard],
    loadComponent: () =>
      import('./components/admin-login/admin-login').then(m => m.AdminLogin),
  },
  {
    path: '',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./components/admin-layout/admin-layout').then(m => m.AdminLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard),
      },
      // Phase 2+
      /*
      { path: 'products',    loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'orders',      loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'customers',   loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'analytics',   loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    */
    ],
  },
];