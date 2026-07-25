import { RetryConfig } from './models/retry-config.model';
import { ApiVersioningConfig, ApiVersioningStrategy } from './models/api-versioning.model';
import { ApiDefaultSuccessMessages } from './models/success-message.model';

/**
 * Configuration for the shared API management library.
 *
 * Consumed by `provideApi()` to set up the API base URL,
 * versioning, retry strategy, and loading behavior.
 *
 * @example
 * ```ts
 * // environment.ts
 * export const apiConfig: ApiConfiguration = {
 *   baseUrl: 'https://api.example.com',
 *   version: 1,
 *   retry: { maxRetries: 3, initialDelay: 1000 },
 * };
 * ```
 */
export interface ApiConfiguration {
  /**
   * Base URL of the backend API (a trailing slash is trimmed).
   *
   * @example `'https://api.example.com'`
   */
  baseUrl: string;

  /**
   * Static path segment inserted between the base URL and the endpoint,
   * whatever the versioning strategy: `{baseUrl}/{prefix}/...`.
   *
   * Set to `''` or `false` when the API is served from the root.
   * Can be overridden per-request via `ApiRequestOptions.prefix`.
   *
   * @default 'api'
   */
  prefix?: string | false;

  /**
   * Default API version sent with every request, carried according to
   * `versioning`. Strings are allowed for date- or label-based schemes
   * (e.g. `'2024-01-01'`, `'beta'`).
   *
   * Can be overridden per-request via `ApiRequestOptions.version`.
   * @default 1
   */
  version?: number | string;

  /**
   * How the version is carried on each request.
   *
   * - a strategy name — shorthand for `{ strategy }` with default naming
   * - an `ApiVersioningConfig` — full control over parameter/header names
   * - `false` — versioning disabled; URLs are `{baseUrl}/{prefix}{endpoint}`
   *   and no version param or header is sent
   *
   * @default `{ strategy: 'url', prefix: 'v' }` → `/api/v1/...`
   *
   * @example
   * ```ts
   * versioning: 'query-param'                             // /api/orders?v=1
   * versioning: { strategy: 'header' }                    // X-API-Version: 1
   * versioning: false                                     // /api/orders
   * ```
   */
  versioning?: ApiVersioningStrategy | ApiVersioningConfig | false;

  /**
   * Global retry configuration for transient failures.
   * Set to `false` to disable retry globally.
   *
   * @default `{ maxRetries: 3, initialDelay: 1000, multiplier: 2 }`
   */
  retry?: RetryConfig | false;

  /**
   * Whether requests contribute to the global loading state by default.
   * @default true
   */
  defaultShowLoader?: boolean;

  /**
   * Whether mutating requests (POST/PUT/PATCH/DELETE) show a success toast
   * by default. `GET` never shows one unless requested per-call.
   * Can be overridden per-request via `ApiRequestOptions.successMessage`.
   * @default true
   */
  defaultShowSuccessMessage?: boolean;

  /**
   * Default success toast message per HTTP method, shown when a mutating
   * request succeeds and isn't overridden via `ApiRequestOptions.successMessage`.
   * Merged over built-in defaults.
   */
  defaultSuccessMessages?: ApiDefaultSuccessMessages;
}

/** Internal defaults applied when the consumer omits values. */
export const API_CONFIGURATION_DEFAULTS = {
  prefix: 'api',
  version: 1,
  defaultShowLoader: true,
  defaultShowSuccessMessage: true,
} as const;
