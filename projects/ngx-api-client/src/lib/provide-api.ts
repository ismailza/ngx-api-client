import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { API_CONFIGURATION_DEFAULTS, ApiConfiguration } from './api-configuration.model';
import {
  API_BASE_URL,
  API_DEFAULT_SHOW_LOADER,
  API_DEFAULT_SHOW_SUCCESS_MESSAGE,
  API_DEFAULT_SUCCESS_MESSAGES,
  API_PREFIX,
  API_RETRY_CONFIG,
  API_VERSION,
  API_VERSIONING,
} from './api.tokens';
import { ApiErrorHandler } from './handlers/api-error-handler';
import { ApiSuccessHandler } from './handlers/api-success-handler';
import { DefaultApiErrorHandler } from './handlers/default-api-error-handler';
import { DefaultApiSuccessHandler } from './handlers/default-api-success-handler';
import { API_VERSIONING_DEFAULTS, ResolvedApiVersioning } from './models/api-versioning.model';
import { RETRY_CONFIG_DEFAULTS } from './models/retry-config.model';
import { SUCCESS_MESSAGE_DEFAULTS } from './models/success-message.model';
import { normalizePrefix, trimTrailingSlash } from './url.util';

/**
 * Configures ngx-api-client for an Angular application.
 *
 * Call this once in your `appConfig.providers`.
 * It registers:
 * - DI tokens: `API_BASE_URL`, `API_PREFIX`, `API_VERSION`, `API_VERSIONING`,
 *   `API_RETRY_CONFIG`, `API_DEFAULT_SHOW_LOADER`, `API_DEFAULT_SHOW_SUCCESS_MESSAGE`,
 *   `API_DEFAULT_SUCCESS_MESSAGES`
 * - Fallback `ApiErrorHandler` (`DefaultApiErrorHandler` — forwards to Angular's
 *   `ErrorHandler`) and `ApiSuccessHandler` (`DefaultApiSuccessHandler` — discards
 *   the message)
 *
 * Both fallbacks are deliberately presentation-free: this library has no UI
 * dependency and no opinion about toasts, dialogs or redirects. Provide your own
 * handlers to surface errors and success messages — see `ApiErrorHandler`.
 *
 * The interceptors (`apiErrorInterceptor`, `apiSuccessInterceptor`, `retryInterceptor`)
 * must be registered separately via `withInterceptors()` so you control ordering.
 *
 * @example
 * ```ts
 * import {
 *   provideApi,
 *   apiErrorInterceptor,
 *   apiSuccessInterceptor,
 *   retryInterceptor,
 * } from '@ismailza/ngx-api-client';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideApi({
 *       baseUrl: 'https://api.example.com',
 *       prefix: 'api',              // {baseUrl}/api/...  ('' or false to omit)
 *       version: 1,
 *       versioning: 'url',          // 'query-param' | 'header' | 'media-type' | false
 *       retry: { maxRetries: 3, initialDelay: 1000 },
 *       defaultSuccessMessages: { post: 'Record created' },
 *     }),
 *     { provide: ApiErrorHandler, useClass: ToastApiErrorHandler },
 *     provideHttpClient(
 *       withInterceptors([
 *         // your auth library's bearer-token interceptor goes first
 *         bearerTokenInterceptor,
 *         retryInterceptor,
 *         apiErrorInterceptor,
 *         apiSuccessInterceptor,
 *       ]),
 *     ),
 *   ],
 * };
 * ```
 */
export const provideApi = (config: ApiConfiguration): EnvironmentProviders => {
  const retryConfig =
    config.retry === false ? null : { ...RETRY_CONFIG_DEFAULTS, ...defined(config.retry) };

  const successMessages = {
    ...SUCCESS_MESSAGE_DEFAULTS,
    ...defined(config.defaultSuccessMessages),
  };

  return makeEnvironmentProviders([
    { provide: API_BASE_URL, useValue: trimTrailingSlash(config.baseUrl) },
    {
      provide: API_PREFIX,
      useValue: normalizePrefix(config.prefix ?? API_CONFIGURATION_DEFAULTS.prefix),
    },
    { provide: API_VERSION, useValue: config.version ?? API_CONFIGURATION_DEFAULTS.version },
    { provide: API_VERSIONING, useValue: resolveVersioning(config.versioning) },
    { provide: API_RETRY_CONFIG, useValue: retryConfig },
    {
      provide: API_DEFAULT_SHOW_LOADER,
      useValue: config.defaultShowLoader ?? API_CONFIGURATION_DEFAULTS.defaultShowLoader,
    },
    {
      provide: API_DEFAULT_SHOW_SUCCESS_MESSAGE,
      useValue:
        config.defaultShowSuccessMessage ?? API_CONFIGURATION_DEFAULTS.defaultShowSuccessMessage,
    },
    { provide: API_DEFAULT_SUCCESS_MESSAGES, useValue: successMessages },
    { provide: ApiErrorHandler, useClass: DefaultApiErrorHandler },
    { provide: ApiSuccessHandler, useClass: DefaultApiSuccessHandler },
  ]);
};

/**
 * Expands the `versioning` option into a fully resolved config.
 *
 * Accepts a strategy shorthand (`'query-param'`), a partial config merged over
 * the defaults, or `false` to disable versioning entirely (`null`).
 */
const resolveVersioning = (
  versioning: ApiConfiguration['versioning'],
): ResolvedApiVersioning | null => {
  if (versioning === false) return null;

  const overrides = typeof versioning === 'string' ? { strategy: versioning } : defined(versioning);

  return { ...API_VERSIONING_DEFAULTS, ...overrides };
};

/**
 * Drops keys whose value is `undefined`, so that a config assembled from
 * optional sources — `{ prefix: environment.apiPrefix }` with the field unset —
 * falls back to the default instead of spreading `undefined` over it.
 */
const defined = <T extends object>(source: T | undefined): Partial<T> =>
  Object.fromEntries(
    Object.entries(source ?? {}).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
