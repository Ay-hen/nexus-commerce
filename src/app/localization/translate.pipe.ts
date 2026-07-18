// app/localization/translate.pipe.ts
//
// Usage in templates:  {{ 'common.save' | translate }}
//                      {{ 'orders.itemsCount' | translate: { count: 3 } }}
//
// Marked `pure: false` (impure) so it re-evaluates whenever change detection
// runs after currentLanguage() changes — this is what makes every template
// in the app update instantly on language switch with zero manual
// subscriptions in each component. Angular's zone-based CD already runs on
// the signal update (LanguageService.currentLanguage is read inside
// translate()), so this has no measurable cost beyond a plain string pipe.

import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from './language.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private lang = inject(LanguageService);

  transform(key: string | null | undefined, params?: Record<string, string | number>): string {
    if (!key) return '';
    return this.lang.translate(key, params);
  }
}