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
      
      { path: 'products',    loadComponent: () => import('./components/products/products').then(m => m.Products) },
      { path: 'products/new',    loadComponent: () => import('./components/add-product/add-product').then(m => m.AddProduct) },
      { path: 'product/:id/edit',    loadComponent: () => import('./components/edit-product/edit-product').then(m => m.EditProduct) },
      { path: 'categories', loadComponent: () => import('./components/categories/categories').then(m => m.Categories) },
      { path: 'categories/new', loadComponent: () => import('./components/add-category/add-category').then(m => m.AddCategory) },
      { path: 'reports',   loadComponent: () => import('./components/reports/reports').then(m => m.Reports) },
      { path: 'inventory',   loadComponent: () => import('./components/inventory/inventory').then(m => m.Inventory) },
      { path: 'orders',      loadComponent: () => import('./components/orders/orders').then(m => m.Orders) },
      { path: 'customers',   loadComponent: () => import('./components/customers/customers').then(m => m.Customers) },
      { path: 'notifications',   loadComponent: () => import('./components/notifications/notifications').then(m => m.Notifications) },
      { path: 'reviews',   loadComponent: () => import('./components/reviews/reviews').then(m => m.Reviews) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    
    ],
  },
];