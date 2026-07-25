import { RetryConfig } from './models/retry-config.model';
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
   * Base URL of the backend API (without trailing slash).
   *
   * @example `'https://api.example.com'`
   */
  baseUrl: string;

  /**
   * Default API version used for URL-prefix versioning.
   * Produces URLs like `/api/v1/...`.
   *
   * Can be overridden per-request via `ApiRequestOptions.version`.
   * @default 1
   */
  version?: number;

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
  version: 1,
  defaultShowLoader: true,
  defaultShowSuccessMessage: true,
} as const;
