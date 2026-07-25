import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SKIP_ERROR_HANDLER } from '../api.tokens';
import { ApiErrorHandler } from '../handlers/api-error-handler';
import { ApiError } from '../models/api-error.model';
import { ProblemDetail } from '../models/problem-detail.model';

/**
 * Functional HTTP interceptor that normalises every `HttpErrorResponse`
 * into an `ApiError` and delegates to the configured `ApiErrorHandler`.
 *
 * Skipped when `SKIP_ERROR_HANDLER` is set in the request's `HttpContext`.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorHandler = inject(ApiErrorHandler);

  return next(req).pipe(
    catchError((response: HttpErrorResponse) => {
      const apiError = normalizeError(response);

      if (!req.context.get(SKIP_ERROR_HANDLER)) {
        errorHandler.handle(apiError);
      }

      return throwError(() => apiError);
    }),
  );
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const isProblemDetail = (value: unknown): value is ProblemDetail =>
  typeof value === 'object' && value !== null && ('detail' in value || 'title' in value);

/**
 * Transforms an `HttpErrorResponse` into a consistent `ApiError`.
 *
 * Handles three cases:
 * 1. Backend returns an RFC 9457 `application/problem+json` `ProblemDetail` body
 * 2. Backend returns a plain string or unrecognised body (e.g. a proxy error page)
 * 3. Network/client error (status 0, no response reached the backend)
 */
function normalizeError(response: HttpErrorResponse): ApiError {
  // Network error or client-side failure — never reached the backend, so there's no ProblemDetail.
  if (response.status === 0) {
    return {
      type: 'about:blank',
      title: 'Network Error',
      status: 0,
      detail: 'A network error occurred. Please check your connection and try again.',
      code: 'NETWORK_ERROR',
      timestamp: new Date().toISOString(),
    };
  }

  const body = response.error;

  // Backend returned a structured ProblemDetail body
  if (isProblemDetail(body)) {
    return {
      type: body.type ?? 'about:blank',
      title: body.title,
      status: body.status ?? response.status,
      detail: body.detail ?? 'An unexpected error occurred. Please try again later.',
      instance: body.instance,
      code: body.code,
      timestamp: new Date().toISOString(),
      traceId: body.traceId ?? response.headers.get('X-Trace-Id') ?? undefined,
      errors: body.errors,
    };
  }

  // Plain string or unexpected shape (e.g. an infrastructure/proxy error page)
  return {
    type: 'about:blank',
    title: 'Unexpected Error',
    status: response.status,
    detail:
      typeof body === 'string' && body
        ? body
        : 'An unexpected error occurred. Please try again later.',
    timestamp: new Date().toISOString(),
    traceId: response.headers.get('X-Trace-Id') ?? undefined,
  };
}
