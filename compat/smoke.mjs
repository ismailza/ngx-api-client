/**
 * Runtime smoke test: the published package ships partial (unlinked) Angular
 * declarations, so importing it under an older runtime exercises that runtime's
 * JIT compiler. Type-checking alone would not catch a linker/runtime break.
 *
 * Also asserts the `exports` map resolves the way consumers rely on it.
 */
import '@angular/compiler';
import { ErrorHandler, Injector } from '@angular/core';
import {
  API_BASE_URL,
  API_PREFIX,
  API_RETRY_CONFIG,
  API_VERSION,
  API_VERSIONING,
  ApiErrorHandler,
  ApiLoadingService,
  ApiSuccessHandler,
  provideApi,
} from '@ismailza/ngx-api-client';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const injector = Injector.create({
  providers: [
    { provide: ErrorHandler, useValue: new ErrorHandler() },
    provideApi({
      baseUrl: 'https://api.example.com/',
      prefix: 'api',
      version: 2,
      versioning: 'url',
      retry: { maxRetries: 5 },
    }),
    ApiLoadingService,
  ],
});

assert.equal(injector.get(API_BASE_URL), 'https://api.example.com');
assert.equal(injector.get(API_PREFIX), 'api');
assert.equal(injector.get(API_VERSION), 2);
assert.equal(injector.get(API_VERSIONING).strategy, 'url');
assert.equal(injector.get(API_RETRY_CONFIG).maxRetries, 5);

// Fallback handlers registered by provideApi() must be constructible.
assert.ok(injector.get(ApiErrorHandler) instanceof ApiErrorHandler);
assert.ok(injector.get(ApiSuccessHandler) instanceof ApiSuccessHandler);

// Signal-based loading state.
const loading = injector.get(ApiLoadingService);
assert.equal(loading.loading(), false);
loading.start();
assert.equal(loading.loading(), true);
loading.stop();
assert.equal(loading.loading(), false);

// --- exports map -----------------------------------------------------------

// `./package.json` is exported so tooling can read the manifest.
const require = createRequire(import.meta.url);
const manifest = require('@ismailza/ngx-api-client/package.json');
assert.equal(manifest.name, '@ismailza/ngx-api-client');

// Deep imports must stay blocked: reaching past the entry point would let
// consumers depend on paths that are free to change between releases.
await assert.rejects(
  () => import('@ismailza/ngx-api-client/lib/api.service'),
  (error) => error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  'deep imports should be blocked by the exports map',
);

console.log('runtime smoke ok');
