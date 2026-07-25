import { HttpContextToken } from '@angular/common/http';
import { InjectionToken } from '@angular/core';

import { ApiRequestOptions } from './models/api-request-options.model';
import { API_VERSIONING_DEFAULTS, ResolvedApiVersioning } from './models/api-versioning.model';
import { RetryConfig } from './models/retry-config.model';
import { ApiDefaultSuccessMessages } from './models/success-message.model';

/**
 * Base URL of the backend API (e.g. `'https://api.example.com'`).
 * Provided automatically by `provideApi()`.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/**
 * Static path segment placed between the base URL and the endpoint,
 * without surrounding slashes (e.g. `'api'`). Empty string means none.
 * Provided automatically by `provideApi()`.
 */
export const API_PREFIX = new InjectionToken<string>('API_PREFIX', {
  providedIn: 'root',
  factory: () => 'api',
});

/**
 * Default API version sent with every request.
 * Provided automatically by `provideApi()`.
 */
export const API_VERSION = new InjectionToken<number | string>('API_VERSION', {
  providedIn: 'root',
  factory: () => 1,
});

/**
 * How the version is carried on each request, with every default resolved.
 * `null` means versioning is disabled globally.
 * Provided automatically by `provideApi()`.
 */
export const API_VERSIONING = new InjectionToken<ResolvedApiVersioning | null>('API_VERSIONING', {
  providedIn: 'root',
  factory: () => API_VERSIONING_DEFAULTS,
});

/**
 * Global retry configuration.
 * `null` means retry is disabled globally.
 */
export const API_RETRY_CONFIG = new InjectionToken<Required<RetryConfig> | null>(
  'API_RETRY_CONFIG',
);

/**
 * Whether requests contribute to the global loading state by default.
 */
export const API_DEFAULT_SHOW_LOADER = new InjectionToken<boolean>('API_DEFAULT_SHOW_LOADER', {
  providedIn: 'root',
  factory: () => true,
});

/**
 * Whether mutating requests (POST/PUT/PATCH/DELETE) show a success toast by default.
 */
export const API_DEFAULT_SHOW_SUCCESS_MESSAGE = new InjectionToken<boolean>(
  'API_DEFAULT_SHOW_SUCCESS_MESSAGE',
  { providedIn: 'root', factory: () => true },
);

/** Default success toast message per HTTP method. */
export const API_DEFAULT_SUCCESS_MESSAGES = new InjectionToken<Required<ApiDefaultSuccessMessages>>(
  'API_DEFAULT_SUCCESS_MESSAGES',
);

// ---------------------------------------------------------------------------
// HttpContext tokens — used to pass per-request options through interceptors
// ---------------------------------------------------------------------------

/** Per-request options attached to the `HttpContext` by `ApiService`. */
export const API_REQUEST_OPTIONS = new HttpContextToken<ApiRequestOptions>(() => ({}));

/** Signals the retry interceptor to skip retrying this request. */
export const SKIP_RETRY = new HttpContextToken<boolean>(() => false);

/** Signals the error interceptor to skip the global error handler. */
export const SKIP_ERROR_HANDLER = new HttpContextToken<boolean>(() => false);

/** Signals the loading tracker to ignore this request. */
export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);
