import {
  HttpClient,
  HttpContext,
  provideHttpClient,
  withInterceptors,
  withXhr,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SKIP_ERROR_HANDLER } from '../api.tokens';
import { ApiErrorHandler } from '../handlers/api-error-handler';
import { ApiError, isApiError } from '../models/api-error.model';
import { ProblemDetail } from '../models/problem-detail.model';
import { apiErrorInterceptor } from './api-error.interceptor';

@Injectable()
class RecordingErrorHandler extends ApiErrorHandler {
  readonly handled: ApiError[] = [];

  override handle(error: ApiError): void {
    this.handled.push(error);
  }
}

const URL = '/resources';

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let handler: RecordingErrorHandler;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: ApiErrorHandler, useClass: RecordingErrorHandler },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    handler = TestBed.inject(ApiErrorHandler) as RecordingErrorHandler;
  });

  afterEach(() => httpMock.verify());

  /** Fires a GET, fails it with `respond`, and resolves with the thrown value. */
  const failWith = (
    respond: (req: ReturnType<HttpTestingController['expectOne']>) => void,
    context?: HttpContext,
  ): Promise<unknown> => {
    const thrown = new Promise<unknown>((resolve) => {
      http.get(URL, { context }).subscribe({ error: resolve });
    });

    respond(httpMock.expectOne(URL));
    return thrown;
  };

  it('passes a successful response through untouched', async () => {
    const body = { id: 1 };
    const result = new Promise((resolve) => http.get(URL).subscribe(resolve));

    httpMock.expectOne(URL).flush(body);

    await expect(result).resolves.toEqual(body);
    expect(handler.handled).toHaveLength(0);
  });

  describe('RFC 9457 problem+json body', () => {
    const problem: ProblemDetail = {
      type: 'https://example.com/errors/validation',
      title: 'Bad Request',
      status: 400,
      detail: 'Name must not be blank.',
      instance: '/api/v1/resources',
      code: 'VALIDATION_ERROR',
      timestamp: '2026-01-01T00:00:00.000Z',
      traceId: 'trace-1',
      errors: [{ field: 'name', message: 'must not be blank' }],
    };

    it('maps every field onto the ApiError', async () => {
      const error = (await failWith((req) =>
        req.flush(problem, { status: 400, statusText: 'Bad Request' }),
      )) as ApiError;

      expect(error).toMatchObject({
        type: problem.type,
        title: 'Bad Request',
        status: 400,
        detail: 'Name must not be blank.',
        instance: '/api/v1/resources',
        code: 'VALIDATION_ERROR',
        traceId: 'trace-1',
        errors: [{ field: 'name', message: 'must not be blank' }],
      });
      expect(isApiError(error)).toBe(true);
    });

    it('stamps its own timestamp rather than trusting the body', async () => {
      const error = (await failWith((req) =>
        req.flush(problem, { status: 400, statusText: 'Bad Request' }),
      )) as ApiError;

      expect(error.timestamp).not.toBe(problem.timestamp);
      expect(Number.isNaN(Date.parse(error.timestamp))).toBe(false);
    });

    it('falls back to the response status when the body omits one', async () => {
      const error = (await failWith((req) =>
        req.flush({ detail: 'Gone' }, { status: 410, statusText: 'Gone' }),
      )) as ApiError;

      expect(error.status).toBe(410);
    });

    it('defaults the type to about:blank', async () => {
      const error = (await failWith((req) =>
        req.flush({ detail: 'Oops' }, { status: 400, statusText: 'Bad' }),
      )) as ApiError;

      expect(error.type).toBe('about:blank');
    });

    it('reads traceId from the X-Trace-Id header when the body omits it', async () => {
      const error = (await failWith((req) =>
        req.flush(
          { detail: 'Oops' },
          {
            status: 500,
            statusText: 'Server Error',
            headers: { 'X-Trace-Id': 'header-trace' },
          },
        ),
      )) as ApiError;

      expect(error.traceId).toBe('header-trace');
    });

    it('prefers the body traceId over the header', async () => {
      const error = (await failWith((req) =>
        req.flush(
          { detail: 'Oops', traceId: 'body-trace' },
          {
            status: 500,
            statusText: 'Server Error',
            headers: { 'X-Trace-Id': 'header-trace' },
          },
        ),
      )) as ApiError;

      expect(error.traceId).toBe('body-trace');
    });

    it('substitutes a generic detail when the body has only a title', async () => {
      const error = (await failWith((req) =>
        req.flush({ title: 'Bad Request' }, { status: 400, statusText: 'Bad' }),
      )) as ApiError;

      expect(error.detail).toBeTruthy();
      expect(typeof error.detail).toBe('string');
    });
  });

  describe('unrecognised body', () => {
    it('uses a plain-text body as the detail', async () => {
      const error = (await failWith((req) =>
        req.flush('Gateway timed out', {
          status: 504,
          statusText: 'Gateway Timeout',
        }),
      )) as ApiError;

      expect(error.status).toBe(504);
      expect(error.detail).toBe('Gateway timed out');
    });

    it('falls back to a generic detail for an empty body', async () => {
      const error = (await failWith((req) =>
        req.flush('', { status: 502, statusText: 'Bad Gateway' }),
      )) as ApiError;

      expect(error.status).toBe(502);
      expect(error.detail).toBeTruthy();
    });
  });

  describe('network failure', () => {
    it('reports status 0 as a NETWORK_ERROR', async () => {
      const error = (await failWith((req) => req.error(new ProgressEvent('error')))) as ApiError;

      expect(error.status).toBe(0);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.detail).toBeTruthy();
    });
  });

  describe('handler dispatch', () => {
    it('notifies the handler once per failure', async () => {
      await failWith((req) => req.flush({ detail: 'Oops' }, { status: 500, statusText: 'Error' }));

      expect(handler.handled).toHaveLength(1);
      expect(handler.handled[0].detail).toBe('Oops');
    });

    it('still rethrows so the caller can react', async () => {
      const error = await failWith((req) =>
        req.flush({ detail: 'Oops' }, { status: 500, statusText: 'Error' }),
      );

      expect(isApiError(error)).toBe(true);
    });

    it('skips the handler when SKIP_ERROR_HANDLER is set', async () => {
      const context = new HttpContext().set(SKIP_ERROR_HANDLER, true);

      const error = await failWith(
        (req) => req.flush({ detail: 'Oops' }, { status: 500, statusText: 'Error' }),
        context,
      );

      expect(handler.handled).toHaveLength(0);
      // The caller still receives the normalised error.
      expect(isApiError(error)).toBe(true);
    });
  });
});
