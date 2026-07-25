import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiConfiguration } from './api-configuration.model';
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

  describe('version', () => {
    it('defaults to 1', () => {
      setup();

      expect(TestBed.inject(API_VERSION)).toBe(1);
    });

    it('uses the configured version', () => {
      setup({ version: 4 });

      expect(TestBed.inject(API_VERSION)).toBe(4);
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
