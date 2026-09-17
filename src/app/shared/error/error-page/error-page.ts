// app/shared/error/error-page/error-page.ts
//
// Single reusable full-page error component. Which error it shows is driven
// entirely by the `code` route data (see src/app/errors/error.routes.ts) —
// so adding a new full-page error state in a later step means adding one
// route + one ERROR_CATALOG entry, never a new component.
//
// Deliberately NOT used for product-unavailable / out-of-stock / payment /
// checkout states — those are inline or modal per the brief's UX rules and
// will get their own small components in later steps.

import { Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { TranslatePipe } from '../../../localization/translate.pipe';
import { ErrorIllustration } from '../error-illustration/error-illustration';
import { ErrorPageAction, getErrorEntry } from '../error.model';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [TranslatePipe, ErrorIllustration],
  templateUrl: './error-page.html',
  styleUrl: './error-page.scss',
})
export class ErrorPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);

  // Resolved once — this component is rendered fresh per route (no reuse
  // across different error codes), so a plain field is enough; no need for
  // a signal that reacts to route data changing under it.
  readonly entry = getErrorEntry(this.route.snapshot.data['code']);

  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  constructor() {
    // SPA route changes don't move focus or get announced the way real page
    // loads do — moving focus to the heading is the standard fix so screen
    // reader users notice they've landed on an error state at all.
    afterNextRender(() => this.heading()?.nativeElement.focus());
  }

  handleAction(action: ErrorPageAction): void {
    if (action.behavior === 'back') {
      this.location.back();
      return;
    }
    if (action.route) {
      this.router.navigateByUrl(action.route);
    }
  }
}