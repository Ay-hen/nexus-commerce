// account-data.ts
// Per-user data shown in the navbar (favorites + cart counts).
// It loads when a session starts and is cleared when the user signs out, so
// nothing is fetched (or shown) for guests.
//
// BACKEND STATUS: no storefront endpoints exist yet, so load() is a stub that
// returns the values the navbar used to hard-code. Swap the marked lines for
// the HttpClient call when Spring Boot is ready — the navbar won't change.

import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Auth } from '../auth/auth';

export interface AccountSummary {
  favorites: number;
  cart: number;
}

@Injectable({ providedIn: 'root' })
export class AccountData {
  private auth = inject(Auth);
  // private http = inject(HttpClient);   // + provideHttpClient() is already in app.config.ts

  readonly favCount  = signal(0);
  readonly cartCount = signal(0);
  readonly isLoading = signal(false);

  /** Incremented per request so a slow response can't overwrite a newer state (e.g. after sign-out). */
  private requestId = 0;

  constructor() {
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();
      untracked(() => (loggedIn ? this.load() : this.reset()));
    });
  }

  async load(): Promise<void> {
    const id = ++this.requestId;
    this.isLoading.set(true);
    try {
      // Replace with:
      // const summary = await firstValueFrom(
      //   this.http.get<AccountSummary>('/api/account/summary', { headers: authHeaders }));
      await new Promise(r => setTimeout(r, 500));
      const summary: AccountSummary = { favorites: 0, cart: 2 };

      if (id !== this.requestId || !this.auth.isLoggedIn()) return;   // signed out / superseded
      this.favCount.set(summary.favorites);
      this.cartCount.set(summary.cart);
    } catch {
      if (id === this.requestId) this.reset();
    } finally {
      if (id === this.requestId) this.isLoading.set(false);
    }
  }

  private reset(): void {
    this.requestId++;
    this.favCount.set(0);
    this.cartCount.set(0);
    this.isLoading.set(false);
  }
}