import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import {
  API_BASE_URL,
  API_DEFAULT_SHOW_LOADER,
  API_PREFIX,
  API_REQUEST_OPTIONS,
  API_RETRY_CONFIG,
  API_VERSION,
  API_VERSIONING,
  apiErrorInterceptor,
  ApiErrorHandler,
  apiSuccessInterceptor,
  ApiSuccessHandler,
  ApiVersioningConfig,
  provideApi,
  RetryConfig,
  retryInterceptor,
} from '@ismailza/ngx-api-client';
import { FixtureErrorHandler, FixtureSuccessHandler } from './handlers';

const retry: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  multiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

const versioning: ApiVersioningConfig = { strategy: 'url', prefix: 'v' };

export const appConfig: ApplicationConfig = {
  providers: [
    provideApi({
      baseUrl: 'https://api.example.com',
      prefix: 'api',
      version: 1,
      versioning,
      retry,
      defaultShowLoader: true,
      defaultShowSuccessMessage: true,
      defaultSuccessMessages: { post: 'Created', put: 'Updated', delete: 'Deleted' },
    }),
    { provide: ApiErrorHandler, useClass: FixtureErrorHandler },
    { provide: ApiSuccessHandler, useClass: FixtureSuccessHandler },
    provideHttpClient(
      withInterceptors([retryInterceptor, apiErrorInterceptor, apiSuccessInterceptor]),
    ),
  ],
};

/** The DI tokens are public surface — keep them referenced so removals break the build. */
export const publicTokens = [
  API_BASE_URL,
  API_PREFIX,
  API_VERSION,
  API_VERSIONING,
  API_RETRY_CONFIG,
  API_DEFAULT_SHOW_LOADER,
  API_REQUEST_OPTIONS,
] as const;
