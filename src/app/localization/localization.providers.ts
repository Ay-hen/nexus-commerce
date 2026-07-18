// app/localization/localization.providers.ts
//
// Wire this into app.config.ts's `providers` array:
//
//   import { provideHttpClient } from '@angular/common/http';
//   import { provideLocalization } from './app/localization/localization.providers';
//
//   export const appConfig: ApplicationConfig = {
//     providers: [
//       provideHttpClient(),
//       ...provideLocalization(),
//       // ...your other providers
//     ],
//   };
//
// This guarantees translations are loaded (saved language, or browser-
// detected, or English) BEFORE the app renders, so there's never a flash
// of untranslated / key-path content on first paint.

import { APP_INITIALIZER, Provider } from '@angular/core';
import { LanguageService } from './language.service';

export function provideLocalization(): Provider[] {
  return [
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [LanguageService],
      useFactory: (lang: LanguageService) => () => lang.init(),
    },
  ];
}