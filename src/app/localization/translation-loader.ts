// app/localization/translation-loader.ts
//
// Thin HTTP loader with an in-memory cache so switching back to a
// previously-loaded language never re-fetches its JSON file.
// Angular 22 serves static files from /public at the app root, so the
// files live at public/i18n/<code>.json and are fetched as /i18n/<code>.json.

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay } from 'rxjs';
import { LanguageCode, TranslationTree } from './language.model';

@Injectable({ providedIn: 'root' })
export class TranslationLoader {
  private http = inject(HttpClient);

  private cache = new Map<LanguageCode, Observable<TranslationTree>>();

  /** Base path for translation JSON files. Files live in public/i18n/. */
  private readonly basePath = '/i18n';

  load(code: LanguageCode): Observable<TranslationTree> {
    const cached = this.cache.get(code);
    if (cached) return cached;

    const request$ = this.http
      .get<TranslationTree>(`${this.basePath}/${code}.json`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));

    this.cache.set(code, request$);
    return request$;
  }

  /** Escape hatch for tests / SSR fallback — returns an empty tree, not a rejected promise. */
  empty(): Observable<TranslationTree> {
    return of({});
  }
}