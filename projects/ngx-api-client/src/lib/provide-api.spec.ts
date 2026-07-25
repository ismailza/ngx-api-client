import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiConfiguration } from './api-configuration.model';
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
import { API_VERSIONING_DEFAULTS } from './models/api-versioning.model';
import { RETRY_CONFIG_DEFAULTS } from './models/retry-config.model';
import { SUCCESS_MESSAGE_DEFAULTS } from './models/success-message.model';
import { provideApi } from './provide-api';

const BASE_URL = 'https://api.example.com';

const setup = (config: Partial<ApiConfiguration> = {}) => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideApi({ baseUrl: BASE_URL, ...config })],
  });
};

describe('provideApi', () => {
  it('provides the base URL verbatim', () => {
    setup();

    expect(TestBed.inject(API_BASE_URL)).toBe(BASE_URL);
  });

  it('trims a trailing slash from the base URL', () => {
    setup({ baseUrl: `${BASE_URL}/` });

    expect(TestBed.inject(API_BASE_URL)).toBe(BASE_URL);
  });

  describe('prefix', () => {
    it("defaults to 'api'", () => {
      setup();

      expect(TestBed.inject(API_PREFIX)).toBe('api');
    });

    it('normalises away surrounding slashes', () => {
      setup({ prefix: '/gateway/' });

      expect(TestBed.inject(API_PREFIX)).toBe('gateway');
    });

    it.each([['' as const], [false as const]])('is empty when set to %s', (prefix) => {
      setup({ prefix });

      expect(TestBed.inject(API_PREFIX)).toBe('');
    });

    it('falls back to the default when passed explicitly as undefined', () => {
      setup({ prefix: undefined });

      expect(TestBed.inject(API_PREFIX)).toBe('api');
    });
  });

  describe('version', () => {
    it('defaults to 1', () => {
      setup();

      expect(TestBed.inject(API_VERSION)).toBe(1);
    });

    it('uses the configured version', () => {
      setup({ version: 4 });

      expect(TestBed.inject(API_VERSION)).toBe(4);
    });

    it('accepts a non-numeric version', () => {
      setup({ version: '2024-01-01' });

      expect(TestBed.inject(API_VERSION)).toBe('2024-01-01');
    });

    it('falls back to the default when passed explicitly as undefined', () => {
      setup({ version: undefined });

      expect(TestBed.inject(API_VERSION)).toBe(1);
    });
  });

  describe('versioning', () => {
    it('defaults to url versioning', () => {
      setup();

      expect(TestBed.inject(API_VERSIONING)).toEqual(API_VERSIONING_DEFAULTS);
    });

    it('accepts a strategy name as shorthand', () => {
      setup({ versioning: 'query-param' });

      expect(TestBed.inject(API_VERSIONING)).toEqual({
        ...API_VERSIONING_DEFAULTS,
        strategy: 'query-param',
      });
    });

    it('merges a partial config over the defaults', () => {
      setup({ versioning: { strategy: 'header', headerName: 'Api-Version' } });

      expect(TestBed.inject(API_VERSIONING)).toEqual({
        ...API_VERSIONING_DEFAULTS,
        strategy: 'header',
        headerName: 'Api-Version',
      });
    });

    it('is null when disabled', () => {
      setup({ versioning: false });

      expect(TestBed.inject(API_VERSIONING)).toBeNull();
    });

    it('keeps every default when fields are passed explicitly as undefined', () => {
      setup({
        versioning: {
          strategy: 'header',
          headerName: undefined,
          parameterName: undefined,
          prefix: undefined,
          mediaType: undefined,
        },
      });

      expect(TestBed.inject(API_VERSIONING)).toEqual({
        ...API_VERSIONING_DEFAULTS,
        strategy: 'header',
      });
    });
  });

  describe('retry', () => {
    it('falls back to the built-in defaults', () => {
      setup();

      expect(TestBed.inject(API_RETRY_CONFIG)).toEqual(RETRY_CONFIG_DEFAULTS);
    });

    it('is null when disabled', () => {
      setup({ retry: false });

      expect(TestBed.inject(API_RETRY_CONFIG)).toBeNull();
    });

    it('merges a partial config over the defaults', () => {
      setup({ retry: { maxRetries: 5 } });

      expect(TestBed.inject(API_RETRY_CONFIG)).toEqual({
        ...RETRY_CONFIG_DEFAULTS,
        maxRetries: 5,
      });
    });

    it('keeps a default when a field is passed explicitly as undefined', () => {
      setup({ retry: { maxRetries: undefined, initialDelay: 500 } });

      expect(TestBed.inject(API_RETRY_CONFIG)).toEqual({
        ...RETRY_CONFIG_DEFAULTS,
        initialDelay: 500,
      });
    });
  });

  describe('success messages', () => {
    it('falls back to the built-in defaults', () => {
      setup();

      expect(TestBed.inject(API_DEFAULT_SUCCESS_MESSAGES)).toEqual(SUCCESS_MESSAGE_DEFAULTS);
    });

    it('overrides only the methods it names', () => {
      setup({ defaultSuccessMessages: { post: 'Created the thing.' } });

      expect(TestBed.inject(API_DEFAULT_SUCCESS_MESSAGES)).toEqual({
        ...SUCCESS_MESSAGE_DEFAULTS,
        post: 'Created the thing.',
      });
    });

    it('is enabled by default and can be turned off', () => {
      setup();
      expect(TestBed.inject(API_DEFAULT_SHOW_SUCCESS_MESSAGE)).toBe(true);

      setup({ defaultShowSuccessMessage: false });
      expect(TestBed.inject(API_DEFAULT_SHOW_SUCCESS_MESSAGE)).toBe(false);
    });

    it('keeps a default message when one is passed explicitly as undefined', () => {
      setup({ defaultSuccessMessages: { post: undefined } });

      expect(TestBed.inject(API_DEFAULT_SUCCESS_MESSAGES)).toEqual(SUCCESS_MESSAGE_DEFAULTS);
    });
  });

  describe('loader', () => {
    it('is enabled by default and can be turned off', () => {
      setup();
      expect(TestBed.inject(API_DEFAULT_SHOW_LOADER)).toBe(true);

      setup({ defaultShowLoader: false });
      expect(TestBed.inject(API_DEFAULT_SHOW_LOADER)).toBe(false);
    });
  });

  describe('handlers', () => {
    it('registers the presentation-free fallbacks', () => {
      setup();

      expect(TestBed.inject(ApiErrorHandler)).toBeInstanceOf(DefaultApiErrorHandler);
      expect(TestBed.inject(ApiSuccessHandler)).toBeInstanceOf(DefaultApiSuccessHandler);
    });

    it('lets an application override them', () => {
      @Injectable()
      class CustomErrorHandler extends ApiErrorHandler {
        override handle(): void {
          /* no-op */
        }
      }

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideApi({ baseUrl: BASE_URL }),
          { provide: ApiErrorHandler, useClass: CustomErrorHandler },
        ],
      });

      expect(TestBed.inject(ApiErrorHandler)).toBeInstanceOf(CustomErrorHandler);
    });
  });
});
