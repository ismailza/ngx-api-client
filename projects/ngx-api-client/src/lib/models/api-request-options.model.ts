import { HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';

import { RetryConfig } from './retry-config.model';

/**
 * Options that can be passed to any `ApiService` method
 * to control per-request behavior.
 *
 * @example
 * ```ts
 * // Override API version for this call only
 * this.api.get<LegacyOrder>('/orders', { version: 1 });
 *
 * // Disable retry and global error handler for a fire-and-forget call
 * this.api.post('/analytics/event', payload, {
 *   retry: false,
 *   skipErrorHandler: true,
 *   showLoader: false,
 * });
 *
 * // Custom success toast message; disable the toast for a DELETE call
 * this.api.put(`/orders/${id}`, order, { successMessage: 'Order updated' });
 * this.api.delete(`/orders/${id}`, { successMessage: false });
 * ```
 */
export interface ApiRequestOptions {
  /** Override the global API version for this request. */
  version?: number;

  /**
   * Configure retry behavior for this request.
   * - `false` — disable retry
   * - `true` — use global defaults
   * - `RetryConfig` — custom retry settings
   *
   * @default uses global config
   */
  retry?: boolean | RetryConfig;

  /**
   * Whether this request should contribute to the global loading state.
   * @default true
   */
  showLoader?: boolean;

  /**
   * Bypass the global `ApiErrorHandler` for this request.
   * Useful when the component handles the error itself.
   * @default false
   */
  skipErrorHandler?: boolean;

  /**
   * Show a success toast when this request completes.
   * - `true` — show the configured default message for this HTTP method
   *   (`ApiConfiguration.defaultSuccessMessages`)
   * - `string` — show this custom message instead of the default
   * - `false` — never show one, even if enabled globally
   *
   * @default enabled for mutating requests (POST/PUT/PATCH/DELETE) per
   * `ApiConfiguration.defaultShowSuccessMessage`; `GET` never shows one
   * unless set to `true` or a custom string.
   */
  successMessage?: boolean | string;

  /** Additional query parameters. */
  params?:
    HttpParams | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;

  /** Additional HTTP headers. */
  headers?: HttpHeaders | Record<string, string | string[]>;

  /** Angular `HttpContext` for passing metadata to interceptors. */
  context?: HttpContext;
}
