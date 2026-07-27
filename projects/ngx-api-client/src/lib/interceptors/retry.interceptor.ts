import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, retry, throwError, timer } from 'rxjs';
import { API_REQUEST_OPTIONS, API_RETRY_CONFIG, SKIP_RETRY } from '../api.tokens';
import { RETRY_CONFIG_DEFAULTS, RetryConfig } from '../models/retry-config.model';

/** HTTP methods considered non-idempotent — not retried by default. */
const NON_IDEMPOTENT_METHODS = new Set(['POST']);

/**
 * Functional HTTP interceptor that retries failed requests
 * with exponential backoff and jitter on transient errors.
 *
 * Behavior:
 * - Skipped when `SKIP_RETRY` is set in `HttpContext`.
 * - Skips `POST` requests by default (non-idempotent).
 * - Respects `Retry-After` header on 429 responses.
 * - Adds random jitter (0–30% of computed delay) to prevent thundering herd.
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const globalConfig = inject(API_RETRY_CONFIG, { optional: true });

  // Retry disabled globally
  if (globalConfig === null) {
    return next(req);
  }

  // Retry disabled per-request
  if (req.context.get(SKIP_RETRY)) {
    return next(req);
  }

  // Resolve per-request config
  const requestOptions = req.context.get(API_REQUEST_OPTIONS);
  const perRequestRetry = requestOptions.retry;

  let config: Required<RetryConfig>;
  if (perRequestRetry === false) {
    return next(req);
  } else if (perRequestRetry && typeof perRequestRetry === 'object') {
    config = { ...RETRY_CONFIG_DEFAULTS, ...perRequestRetry };
  } else {
    config = globalConfig ? { ...RETRY_CONFIG_DEFAULTS, ...globalConfig } : RETRY_CONFIG_DEFAULTS;
  }

  // Skip non-idempotent methods unless explicitly opted in
  if (NON_IDEMPOTENT_METHODS.has(req.method) && !perRequestRetry) {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: config.maxRetries,
      delay: (error: unknown, retryIndex: number) =>
        shouldRetry(error, config)
          ? computeDelay$(error, retryIndex, config)
          : throwError(() => error),
    }),
  );
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function shouldRetry(error: unknown, config: Required<RetryConfig>): error is HttpErrorResponse {
  if (error instanceof HttpErrorResponse) {
    return config.retryableStatuses.includes(error.status);
  }
  return false;
}

function computeDelay$(
  error: HttpErrorResponse,
  retryIndex: number,
  config: Required<RetryConfig>,
): Observable<0> {
  // Respect Retry-After header (seconds or HTTP-date)
  const retryAfter = error.headers?.get('Retry-After');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!isNaN(seconds)) {
      return timer(seconds * 1000);
    }
    const date = Date.parse(retryAfter);
    if (!isNaN(date)) {
      return timer(Math.max(0, date - Date.now()));
    }
  }

  // Exponential backoff with jitter
  const exponentialDelay = config.initialDelay * Math.pow(config.multiplier, retryIndex - 1);
  const jitter = exponentialDelay * Math.random() * 0.3;

  return timer(exponentialDelay + jitter);
}
