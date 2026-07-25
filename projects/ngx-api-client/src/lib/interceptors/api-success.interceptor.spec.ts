import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  API_DEFAULT_SHOW_SUCCESS_MESSAGE,
  API_DEFAULT_SUCCESS_MESSAGES,
  API_REQUEST_OPTIONS,
} from '../api.tokens';
import { ApiSuccessHandler } from '../handlers/api-success-handler';
import { ApiRequestOptions } from '../models/api-request-options.model';
import { GENERIC_SUCCESS_MESSAGE } from '../models/success-message.model';
import { apiSuccessInterceptor } from './api-success.interceptor';

@Injectable()
class RecordingSuccessHandler extends ApiSuccessHandler {
  readonly messages: string[] = [];

  override handle(message: string): void {
    this.messages.push(message);
  }
}

const MESSAGES = {
  post: 'Created.',
  put: 'Updated.',
  patch: 'Updated.',
  delete: 'Deleted.',
};

const URL = '/resources';

describe('apiSuccessInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let handler: RecordingSuccessHandler;

  const configure = (providers: unknown[] = []) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiSuccessInterceptor])),
        provideHttpClientTesting(),
        { provide: ApiSuccessHandler, useClass: RecordingSuccessHandler },
        { provide: API_DEFAULT_SUCCESS_MESSAGES, useValue: MESSAGES },
        ...(providers as never[]),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    handler = TestBed.inject(ApiSuccessHandler) as RecordingSuccessHandler;
  };

  beforeEach(() => configure());

  afterEach(() => httpMock.verify());

  /** Issues `method` with the given per-request options and flushes a 200. */
  const send = (method: string, options?: ApiRequestOptions) => {
    const context = new HttpContext();
    if (options) {
      context.set(API_REQUEST_OPTIONS, options);
    }

    http.request(method, URL, { body: {}, context }).subscribe();
    httpMock.expectOne(URL).flush({});
  };

  describe('default behaviour', () => {
    it.each([
      ['POST', MESSAGES.post],
      ['PUT', MESSAGES.put],
      ['PATCH', MESSAGES.patch],
      ['DELETE', MESSAGES.delete],
    ])('shows the configured %s message', (method, expected) => {
      send(method);

      expect(handler.messages).toEqual([expected]);
    });

    it('stays silent on GET', () => {
      send('GET');

      expect(handler.messages).toEqual([]);
    });

    it('stays silent when disabled globally', () => {
      configure([{ provide: API_DEFAULT_SHOW_SUCCESS_MESSAGE, useValue: false }]);

      send('POST');

      expect(handler.messages).toEqual([]);
    });
  });

  describe('per-request override', () => {
    it('shows a custom string', () => {
      send('POST', { successMessage: 'Order placed' });

      expect(handler.messages).toEqual(['Order placed']);
    });

    it('suppresses the default when false', () => {
      send('POST', { successMessage: false });

      expect(handler.messages).toEqual([]);
    });

    it('opts a GET in with true, using the generic fallback', () => {
      send('GET', { successMessage: true });

      expect(handler.messages).toEqual([GENERIC_SUCCESS_MESSAGE]);
    });

    it('shows a custom string on GET', () => {
      send('GET', { successMessage: 'Export ready' });

      expect(handler.messages).toEqual(['Export ready']);
    });

    it('wins over a disabled global default', () => {
      configure([{ provide: API_DEFAULT_SHOW_SUCCESS_MESSAGE, useValue: false }]);

      send('POST', { successMessage: true });

      expect(handler.messages).toEqual([MESSAGES.post]);
    });

    it('suppresses the message even when the global default is on', () => {
      send('DELETE', { successMessage: false });

      expect(handler.messages).toEqual([]);
    });
  });

  describe('failures', () => {
    it('shows nothing when the request errors', () => {
      http.post(URL, {}).subscribe({ error: () => undefined });

      httpMock.expectOne(URL).flush('nope', { status: 500, statusText: 'Server Error' });

      expect(handler.messages).toEqual([]);
    });
  });
});
