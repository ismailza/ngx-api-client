import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { API_CONFIGURATION_DEFAULTS, ApiConfiguration } from './api-configuration.model';
import {
  API_BASE_URL,
  API_DEFAULT_SHOW_LOADER,
  API_DEFAULT_SHOW_SUCCESS_MESSAGE,
  API_DEFAULT_SUCCESS_MESSAGES,
  API_RETRY_CONFIG,
  API_VERSION,
} from './api.tokens';
import { ApiErrorHandler } from './handlers/api-error-handler';
import { ApiSuccessHandler } from './handlers/api-success-handler';
import { DefaultApiErrorHandler } from './handlers/default-api-error-handler';
import { DefaultApiSuccessHandler } from './handlers/default-api-success-handler';
import { RETRY_CONFIG_DEFAULTS } from './models/retry-config.model';
import { SUCCESS_MESSAGE_DEFAULTS } from './models/success-message.model';

/**
 * Configures ngx-api-client for an Angular application.
 *
 * Call this once in your `appConfig.providers`.
 * It registers:
 * - DI tokens: `API_BASE_URL`, `API_VERSION`, `API_RETRY_CONFIG`, `API_DEFAULT_SHOW_LOADER`,
 *   `API_DEFAULT_SHOW_SUCCESS_MESSAGE`, `API_DEFAULT_SUCCESS_MESSAGES`
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
 *       version: 1,
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
  const merged = { ...API_CONFIGURATION_DEFAULTS, ...config };

  const retryConfig =
    config.retry === false ? null : { ...RETRY_CONFIG_DEFAULTS, ...(config.retry ?? {}) };

  const successMessages = {
    ...SUCCESS_MESSAGE_DEFAULTS,
    ...(config.defaultSuccessMessages ?? {}),
  };

  return makeEnvironmentProviders([
    { provide: API_BASE_URL, useValue: merged.baseUrl },
    { provide: API_VERSION, useValue: merged.version },
    { provide: API_RETRY_CONFIG, useValue: retryConfig },
    { provide: API_DEFAULT_SHOW_LOADER, useValue: merged.defaultShowLoader },
    {
      provide: API_DEFAULT_SHOW_SUCCESS_MESSAGE,
      useValue: merged.defaultShowSuccessMessage,
    },
    { provide: API_DEFAULT_SUCCESS_MESSAGES, useValue: successMessages },
    { provide: ApiErrorHandler, useClass: DefaultApiErrorHandler },
    { provide: ApiSuccessHandler, useClass: DefaultApiSuccessHandler },
  ]);
};
