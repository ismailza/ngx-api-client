import {
  HttpClient,
  HttpContext,
  provideHttpClient,
  withInterceptors,
  withXhr,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_REQUEST_OPTIONS, API_RETRY_CONFIG, SKIP_RETRY } from '../api.tokens';
import { ApiRequestOptions } from '../models/api-request-options.model';
import { RetryConfig } from '../models/retry-config.model';
import { retryInterceptor } from './retry.interceptor';

const URL = '/resources';

/** Small delays keep the timer advances readable; jitter is pinned to 0 below. */
const RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 100,
  multiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

describe('retryInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  const configure = (retryConfig: Required<RetryConfig> | null = RETRY_CONFIG) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptors([retryInterceptor])),
        provideHttpClientTesting(),
        { provide: API_RETRY_CONFIG, useValue: retryConfig },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // Pin the jitter so backoff delays are exactly initialDelay * multiplier^n.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    configure();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /** Fails the single outstanding request with `status`. */
  const failOnce = (status: number, headers?: Record<string, string>) =>
    httpMock.expectOne(URL).flush('', { status, statusText: 'Error', headers });

  describe('transient failures', () => {
    it('retries a retryable status and succeeds on the second attempt', () => {
      const seen: unknown[] = [];
      http.get(URL).subscribe((v) => seen.push(v));

      failOnce(503);
      vi.advanceTimersByTime(100);

      httpMock.expectOne(URL).flush({ ok: true });

      expect(seen).toEqual([{ ok: true }]);
    });

    it.each([408, 429, 500, 502, 503, 504])('retries on %i', (status) => {
      http.get(URL).subscribe({ error: () => undefined });

      failOnce(status);
      vi.advanceTimersByTime(100);

      // A second attempt proves the status was treated as retryable.
      httpMock.expectOne(URL).flush({ ok: true });
    });

    it('gives up after maxRetries and surfaces the last error', () => {
      let status = 0;
      http.get(URL).subscribe({ error: (e) => (status = e.status) });

      failOnce(503); // attempt 1
      vi.advanceTimersByTime(100);
      failOnce(503); // attempt 2
      vi.advanceTimersByTime(200);
      failOnce(503); // attempt 3
      vi.advanceTimersByTime(400);
      failOnce(503); // attempt 4 — maxRetries exhausted

      expect(status).toBe(503);
    });

    it('backs off exponentially between attempts', () => {
      http.get(URL).subscribe({ error: () => undefined });

      failOnce(503);

      // Nothing should be re-issued before the first delay elapses.
      vi.advanceTimersByTime(99);
      httpMock.expectNone(URL);
      vi.advanceTimersByTime(1);
      failOnce(503);

      // Second delay is initialDelay * multiplier.
      vi.advanceTimersByTime(199);
      httpMock.expectNone(URL);
      vi.advanceTimersByTime(1);
      failOnce(503);

      vi.advanceTimersByTime(400);
      failOnce(503);
    });
  });

  describe('non-retryable failures', () => {
    it.each([400, 401, 403, 404, 409, 422])('does not retry on %i', (status) => {
      let seen = 0;
      http.get(URL).subscribe({ error: () => seen++ });

      failOnce(status);
      vi.advanceTimersByTime(1000);

      expect(seen).toBe(1);
      httpMock.expectNone(URL);
    });
  });

  describe('opting out', () => {
    it('does not retry when retry is disabled globally', () => {
      configure(null);

      http.get(URL).subscribe({ error: () => undefined });

      failOnce(503);
      vi.advanceTimersByTime(1000);

      httpMock.expectNone(URL);
    });

    it('does not retry when SKIP_RETRY is set', () => {
      const context = new HttpContext().set(SKIP_RETRY, true);

      http.get(URL, { context }).subscribe({ error: () => undefined });

      failOnce(503);
      vi.advanceTimersByTime(1000);

      httpMock.expectNone(URL);
    });

    it('does not retry when the request opts out', () => {
      http
        .get(URL, { context: withOptions({ retry: false }) })
        .subscribe({ error: () => undefined });

      failOnce(503);
      vi.advanceTimersByTime(1000);

      httpMock.expectNone(URL);
    });
  });

  describe('idempotency', () => {
    it('does not retry a POST by default', () => {
      http.post(URL, {}).subscribe({ error: () => undefined });

      failOnce(503);
      vi.advanceTimersByTime(1000);

      httpMock.expectNone(URL);
    });

    it('retries a POST that explicitly opts in', () => {
      http
        .post(URL, {}, { context: withOptions({ retry: true }) })
        .subscribe({ error: () => undefined });

      failOnce(503);
      vi.advanceTimersByTime(100);

      httpMock.expectOne(URL).flush({ ok: true });
    });

    it.each(['PUT', 'PATCH', 'DELETE'])('retries %s by default', (method) => {
      http.request(method, URL, { body: {} }).subscribe({ error: () => undefined });

      failOnce(503);
      vi.advanceTimersByTime(100);

      httpMock.expectOne(URL).flush({ ok: true });
    });
  });

  describe('per-request configuration', () => {
    it('uses the request-supplied delay and attempt count', () => {
      let status = 0;
      http
        .get(URL, {
          context: withOptions({
            retry: { maxRetries: 1, initialDelay: 50, multiplier: 1 },
          }),
        })
        .subscribe({ error: (e) => (status = e.status) });

      failOnce(503);
      vi.advanceTimersByTime(50);
      failOnce(503); // only one retry allowed

      expect(status).toBe(503);
      httpMock.expectNone(URL);
    });

    it('honours a request-supplied retryableStatuses list', () => {
      http
        .get(URL, {
          context: withOptions({
            retry: { initialDelay: 50, retryableStatuses: [418] },
          }),
        })
        .subscribe({ error: () => undefined });

      failOnce(503); // no longer retryable
      vi.advanceTimersByTime(1000);

      httpMock.expectNone(URL);
    });
  });

  describe('Retry-After', () => {
    it('waits the number of seconds the server asks for', () => {
      http.get(URL).subscribe({ error: () => undefined });

      failOnce(429, { 'Retry-After': '2' });

      // The exponential delay would have been 100ms — the header must win.
      vi.advanceTimersByTime(100);
      httpMock.expectNone(URL);

      vi.advanceTimersByTime(1900);
      httpMock.expectOne(URL).flush({ ok: true });
    });

    it('falls back to exponential backoff for an unparseable value', () => {
      http.get(URL).subscribe({ error: () => undefined });

      failOnce(429, { 'Retry-After': 'soon' });
      vi.advanceTimersByTime(100);

      httpMock.expectOne(URL).flush({ ok: true });
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const withOptions = (options: ApiRequestOptions): HttpContext =>
  new HttpContext().set(API_REQUEST_OPTIONS, options);
