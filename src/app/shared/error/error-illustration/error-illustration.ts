// app/shared/error/error-illustration/error-illustration.ts
//
// Renders a small, on-brand SVG scene for a given ErrorCode. Kept as its
// own component (rather than inline in ErrorPage's template) so later
// steps can add a @switch case per code without ErrorPage's template
// growing into an SVG dumping ground.
//
// Only 'not-found' has real artwork today. Every other code falls through
// to the same scene for now — documented inline below — so ErrorPage never
// renders a blank illustration slot while codes are added incrementally.

import { Component, input } from '@angular/core';
import type { ErrorCode } from '../error.model';

@Component({
  selector: 'app-error-illustration',
  standalone: true,
  template: `
    @switch (code()) {
      @default {
        <!-- 'not-found' scene, also the fallback for any code without
             dedicated artwork yet (see file header). -->
        <svg
          class="error-illustration"
          viewBox="0 0 320 240"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-hidden="true"
        >
          <circle cx="160" cy="120" r="108" class="error-illustration__backdrop" />

          <!-- broken route: a dashed path that stops short, implying a dead end -->
          <path
            d="M 40 178 C 90 178, 100 150, 130 150"
            class="error-illustration__route"
          />
          <path
            d="M 190 150 C 220 150, 230 178, 268 178"
            class="error-illustration__route"
          />

          <!-- tipped-over parcel: the "page" that went missing -->
          <g class="error-illustration__parcel">
            <rect x="112" y="118" width="72" height="52" rx="6" class="error-illustration__parcel-body" />
            <path d="M 112 136 L 184 136" class="error-illustration__parcel-line" />
            <path d="M 148 118 L 148 136" class="error-illustration__parcel-line" />
            <path d="M 112 118 L 148 100 L 184 118" class="error-illustration__parcel-flap" />
          </g>

          <!-- floating magnifying glass, searching for the missing page -->
          <g class="error-illustration__search">
            <circle cx="222" cy="92" r="18" class="error-illustration__search-lens" />
            <line x1="234" y1="104" x2="248" y2="118" class="error-illustration__search-handle" />
          </g>

          <text x="160" y="212" class="error-illustration__mark" text-anchor="middle">?</text>
        </svg>
      }
    }
  `,
  styleUrl: './error-illustration.scss',
})
export class ErrorIllustration {

  readonly code = input<ErrorCode>('not-found');
  
}