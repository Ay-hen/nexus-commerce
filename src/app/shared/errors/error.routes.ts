// app/errors/error.routes.ts
//
// Lazy-loaded under /error/** (see app.routes.ts). Each route just names a
// code via `data.code` — ErrorPage does the rest by looking that code up in
// ERROR_CATALOG (src/app/shared/error/error.model.ts).
//
// Only 404 exists today (Step 1). Later steps add one line each, e.g.:
//   { path: '401', loadComponent: () => import('../shared/error/error-page/error-page').then(m => m.ErrorPage), data: { code: 'unauthorized' } },
//   { path: '403', ... data: { code: 'forbidden' } },
//   { path: '500', ... data: { code: 'server-error' } },
//   { path: '503', ... data: { code: 'service-unavailable' } },
//   { path: 'offline', ... data: { code: 'offline' } },

import { Routes } from '@angular/router';

export const ERROR_ROUTES: Routes = [
  {
    path: '404',
    loadComponent: () =>
      import('../error/error-page/error-page').then(m => m.ErrorPage),
    data: { code: 'not-found' },
  },
];