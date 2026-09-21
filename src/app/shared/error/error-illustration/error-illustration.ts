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
        <!-- 'not-found' scene: lost traveler on a broken route, searching
             for a destination that doesn't exist. Modern, minimal, friendly. -->
        <svg
          class="error-illustration"
          viewBox="0 0 320 280"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-hidden="true"
        >
          <!-- Soft backdrop circle -->
          <circle cx="160" cy="140" r="110" class="error-illustration__backdrop" />

          <!-- Faint map grid (background) -->
          <g class="error-illustration__map-grid">
            <line x1="80" y1="80" x2="240" y2="80" />
            <line x1="80" y1="110" x2="240" y2="110" />
            <line x1="80" y1="140" x2="240" y2="140" />
            <line x1="80" y1="170" x2="240" y2="170" />
            
            <line x1="110" y1="50" x2="110" y2="210" />
            <line x1="140" y1="50" x2="140" y2="210" />
            <line x1="160" y1="50" x2="160" y2="210" />
            <line x1="190" y1="50" x2="190" y2="210" />
            <line x1="220" y1="50" x2="220" y2="210" />
          </g>

          <!-- Starting location (start of journey) -->
          <g class="error-illustration__location-start">
            <circle cx="70" cy="75" r="8" class="error-illustration__pin-outer" />
            <circle cx="70" cy="75" r="4" class="error-illustration__pin-inner" />
          </g>

          <!-- Main route path: starts solid, becomes dashed, then BREAKS -->
          <!-- Solid path (confident start) -->
          <path
            d="M 78 75 Q 110 70, 145 95 Q 160 110, 165 140"
            class="error-illustration__route error-illustration__route--solid"
          />

          <!-- Dashed path (uncertain middle) -->
          <path
            d="M 165 140 Q 175 160, 190 175"
            class="error-illustration__route error-illustration__route--dashed"
          />

          <!-- Broken/faded end (dead end) - path just stops -->
          <path
            d="M 190 175 Q 205 185, 215 195"
            class="error-illustration__route error-illustration__route--broken"
          />

          <!-- Destination marker that DOESN'T exist (faded/empty) -->
          <g class="error-illustration__location-missing">
            <circle cx="240" cy="210" r="8" class="error-illustration__pin-empty" />
            <circle cx="240" cy="210" r="4" class="error-illustration__pin-empty-inner" />
            <!-- X through the pin, indicating it's missing -->
            <line x1="235" y1="205" x2="245" y2="215" class="error-illustration__missing-mark" />
            <line x1="245" y1="205" x2="235" y2="215" class="error-illustration__missing-mark" />
          </g>

          <!-- Traveler/shopping bag at broken route (lost) -->
          <g class="error-illustration__traveler" transform="translate(165, 140)">
            <!-- Simplified shopping bag with question mark -->
            <rect x="-12" y="-8" width="24" height="20" rx="3" class="error-illustration__bag-body" />
            <path d="M -8 -8 L -8 -12 M 8 -8 L 8 -12 M -8 -12 Q 0 -16 8 -12" class="error-illustration__bag-handle" />
            <text x="0" y="4" class="error-illustration__bag-mark" text-anchor="middle">?</text>
          </g>

          <!-- Floating search/compass nearby (indicating "searching") -->
          <g class="error-illustration__search" transform="translate(220, 100)">
            <circle r="14" class="error-illustration__search-lens" />
            <line x1="10" y1="10" x2="20" y2="20" class="error-illustration__search-handle" />
            <!-- Compass lines inside search circle -->
            <line x1="-4" y1="0" x2="4" y2="0" class="error-illustration__compass-line" />
            <line x1="0" y1="-4" x2="0" y2="4" class="error-illustration__compass-line" />
          </g>
        </svg>
      }
    }
  `,
  styleUrl: './error-illustration.scss',
})
export class ErrorIllustration {

  readonly code = input<ErrorCode>('not-found');
  
}