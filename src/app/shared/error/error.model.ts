// app/shared/error/error.model.ts
//
// Central catalog for the storefront's error / exception UI system.
// One place decides: which codes exist, what each one says (via i18n keys,
// never hardcoded text), and what its recovery actions are.
//
// Deliberately NOT a class hierarchy — a discriminated union + lookup table
// is enough for this app's scale, and keeps every consumer (ErrorPage,
// future ErrorModal, future ToastService) reading from the same source
// instead of re-deciding "what does 404 say" in five different places.
//
// Only 'not-found' has a catalog entry today (Step 1). Later steps add one
// entry per code below — each addition is a few lines, nothing else in this
// file or in ErrorPage needs to change.

/** Every error/exception state the storefront can present, page or otherwise. */
export type ErrorCode =
  | 'not-found'
  | 'unauthorized'
  | 'forbidden'
  | 'server-error'
  | 'service-unavailable'
  | 'offline'
  | 'timeout'
  | 'session-expired'
  | 'product-unavailable'
  | 'out-of-stock'
  | 'order-not-found'
  | 'unknown';

/** A single recovery action rendered as a button on an error page. */
export interface ErrorPageAction {
  /** i18n key resolved through the `translate` pipe — never raw text. */
  labelKey: string;
  /** Router path to navigate to. Omit when `behavior` is 'back'. */
  route?: string;
  /** 'back' triggers browser history back instead of a fixed route. */
  behavior?: 'back';
  style: 'primary' | 'secondary';
}

/** Everything ErrorPage (and later ErrorModal) needs to render one error state. */
export interface ErrorCatalogEntry {
  code: ErrorCode;
  /** Numeric status shown above the title, e.g. 404. Omitted for non-HTTP states like 'offline'. */
  statusCode?: number;
  /** Dot-notation prefix into the i18n tree — `${i18nPrefix}.title` / `.message`. */
  i18nPrefix: string;
  primaryAction: ErrorPageAction;
  secondaryAction?: ErrorPageAction;
}

// ── Catalog ──────────────────────────────────────────────────────────────
// Add one entry per new ErrorCode as later steps implement it. Nothing else
// needs to change — ErrorPage, ErrorIllustration's @switch, and the i18n
// files are the only other touch points, and each is additive.
const ERROR_CATALOG: Partial<Record<ErrorCode, ErrorCatalogEntry>> = {
  'not-found': {
    code: 'not-found',
    statusCode: 404,
    i18nPrefix: 'errors.notFound',
    primaryAction: { labelKey: 'errors.actions.goHome', route: '/home', style: 'primary' },
    secondaryAction: { labelKey: 'errors.actions.goBack', behavior: 'back', style: 'secondary' },
  },
};

/**
 * Resolves a catalog entry for any code, including ones without an entry
 * yet — falls back to 'not-found' so an unimplemented code never renders a
 * blank page. Once every ErrorCode has a real entry, this fallback becomes
 * dead code but stays as a safety net for unexpected values (e.g. a bad
 * route param).
 */
export function getErrorEntry(code: ErrorCode | string | null | undefined): ErrorCatalogEntry {
  const key = (code ?? 'not-found') as ErrorCode;
  return ERROR_CATALOG[key] ?? ERROR_CATALOG['not-found']!;
}