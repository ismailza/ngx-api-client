/**
 * Configuration for automatic retry on transient HTTP failures.
 *
 * Applied globally via `provideApi()` or overridden per-request
 * through `ApiRequestOptions.retry`.
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts before giving up.
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial delay (ms) before the first retry.
   * @default 1000
   */
  initialDelay?: number;

  /**
   * Multiplier applied to the delay after each retry (exponential backoff).
   * @default 2
   */
  multiplier?: number;

  /**
   * HTTP status codes that should trigger a retry.
   * @default [408, 429, 500, 502, 503, 504]
   */
  retryableStatuses?: number[];
}

/** Internal defaults merged when consumer omits values. */
export const RETRY_CONFIG_DEFAULTS: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  multiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};
