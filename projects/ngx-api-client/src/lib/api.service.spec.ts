import { HttpParams, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiLoadingService } from './api-loading.service';
import { ApiService } from './api.service';
import {
  API_BASE_URL,
  API_DEFAULT_SHOW_LOADER,
  API_PREFIX,
  API_REQUEST_OPTIONS,
  API_VERSION,
  API_VERSIONING,
  SKIP_ERROR_HANDLER,
  SKIP_LOADER,
  SKIP_RETRY,
} from './api.tokens';
import { PaginatedResponse } from './models';
import { API_VERSIONING_DEFAULTS, ApiVersioningConfig } from './models/api-versioning.model';
import { provideApi } from './provide-api';

const BASE_URL = 'https://api.example.com';

describe('ApiService', () => {
  let api: ApiService;
  let httpMock: HttpTestingController;
  let loading: ApiLoadingService;

  // Re-callable from inside a test so a case can swap in its own global config.
  const configure = (providers: unknown[] = []) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE_URL },
        ...(providers as never[]),
      ],
    });

    api = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(ApiLoadingService);
  };

  beforeEach(() => configure());

  afterEach(() => httpMock.verify());

  describe('URL building', () => {
    it('prefixes the base URL and the default version', () => {
      api.get('/resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/api/v1/resources`).flush({});
    });

    it('adds the missing leading slash on an endpoint', () => {
      api.get('resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/api/v1/resources`).flush({});
    });

    it('uses the globally configured version', () => {
      configure([{ provide: API_VERSION, useValue: 3 }]);

      api.get('/resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/api/v3/resources`).flush({});
    });

    it('lets a request override the global version', () => {
      configure([{ provide: API_VERSION, useValue: 3 }]);

      api.get('/resources', { version: 1 }).subscribe();

      httpMock.expectOne(`${BASE_URL}/api/v1/resources`).flush({});
    });

    it('trims a trailing slash from the base URL', () => {
      configure([{ provide: API_BASE_URL, useValue: `${BASE_URL}/` }]);

      api.get('/resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/api/v1/resources`).flush({});
    });
  });

  describe('path prefix', () => {
    it('uses the globally configured prefix', () => {
      configure([{ provide: API_PREFIX, useValue: 'gateway' }]);

      api.get('/resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/gateway/v1/resources`).flush({});
    });

    it('omits the segment when the prefix is empty', () => {
      configure([{ provide: API_PREFIX, useValue: '' }]);

      api.get('/resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/v1/resources`).flush({});
    });

    it('strips surrounding slashes from a multi-segment prefix', () => {
      configure([{ provide: API_PREFIX, useValue: '/public/api/' }]);

      api.get('/resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/public/api/v1/resources`).flush({});
    });

    it('lets a request override the prefix', () => {
      api.get('/resources', { prefix: 'internal' }).subscribe();

      httpMock.expectOne(`${BASE_URL}/internal/v1/resources`).flush({});
    });

    it('lets a request drop the prefix', () => {
      api.get('/health', { prefix: false, version: false }).subscribe();

      httpMock.expectOne(`${BASE_URL}/health`).flush({});
    });
  });

  describe('versioning strategies', () => {
    const withVersioning = (versioning: ApiVersioningConfig | null, version: number | string = 1) =>
      configure([
        {
          provide: API_VERSIONING,
          useValue: versioning && { ...API_VERSIONING_DEFAULTS, ...versioning },
        },
        { provide: API_VERSION, useValue: version },
      ]);

    it('drops the version segment when versioning is disabled', () => {
      withVersioning(null);

      api.get('/resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/api/resources`).flush({});
    });

    it('sends no version param or header when disabled', () => {
      withVersioning(null);

      api.get('/resources').subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/resources`);
      expect(req.request.params.keys()).toEqual([]);
      expect(req.request.headers.keys()).toEqual([]);
      req.flush({});
    });

    it('honours a custom url version prefix', () => {
      withVersioning({ strategy: 'url', prefix: 'version-' }, 2);

      api.get('/resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/api/version-2/resources`).flush({});
    });

    it('supports a bare version segment', () => {
      withVersioning({ strategy: 'url', prefix: '' }, 2);

      api.get('/resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/api/2/resources`).flush({});
    });

    it('sends the version as a query parameter', () => {
      withVersioning({ strategy: 'query-param' }, 3);

      api.get('/resources').subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/api/resources`);
      expect(req.request.params.get('v')).toBe('3');
      req.flush({});
    });

    it('honours a custom query parameter name and keeps caller params', () => {
      withVersioning({ strategy: 'query-param', parameterName: 'api-version' }, 3);

      api.get('/resources', { params: { active: true } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/api/resources`);
      expect(req.request.params.get('api-version')).toBe('3');
      expect(req.request.params.get('active')).toBe('true');
      req.flush({});
    });

    it('does not overwrite a version param the caller set explicitly', () => {
      withVersioning({ strategy: 'query-param' }, 3);

      api.get('/resources', { params: { v: 9 } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/api/resources`);
      expect(req.request.params.getAll('v')).toEqual(['9']);
      req.flush({});
    });

    it('sends the version as a header', () => {
      withVersioning({ strategy: 'header' }, 2);

      api.get('/resources').subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/resources`);
      expect(req.request.headers.get('X-API-Version')).toBe('2');
      req.flush({});
    });

    it('honours a custom header name and keeps caller headers', () => {
      withVersioning({ strategy: 'header', headerName: 'Api-Version' }, 2);

      api.get('/resources', { headers: { 'X-Custom': 'value' } }).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/resources`);
      expect(req.request.headers.get('Api-Version')).toBe('2');
      expect(req.request.headers.get('X-Custom')).toBe('value');
      req.flush({});
    });

    it('sends the version as an Accept media type', () => {
      withVersioning({ strategy: 'media-type' }, 2);

      api.get('/resources').subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/resources`);
      expect(req.request.headers.get('Accept')).toBe('application/vnd.api.v2+json');
      req.flush({});
    });

    it('renders every placeholder of a custom media type template', () => {
      withVersioning(
        { strategy: 'media-type', mediaType: 'application/v{version}+json;v={version}' },
        5,
      );

      api.get('/resources').subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/resources`);
      expect(req.request.headers.get('Accept')).toBe('application/v5+json;v=5');
      req.flush({});
    });

    it('does not overwrite a header the caller set explicitly', () => {
      withVersioning({ strategy: 'header' }, 2);

      api.get('/resources', { headers: { 'X-API-Version': 'pinned' } }).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/resources`);
      expect(req.request.headers.get('X-API-Version')).toBe('pinned');
      req.flush({});
    });

    it('accepts a non-numeric version', () => {
      withVersioning({ strategy: 'url' }, '2024-01-01');

      api.get('/resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/api/v2024-01-01/resources`).flush({});
    });

    it('lets a request opt out of versioning entirely', () => {
      withVersioning({ strategy: 'query-param' }, 3);

      api.get('/health', { version: false }).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/health`);
      expect(req.request.params.keys()).toEqual([]);
      req.flush({});
    });

    it('ignores a per-request version when versioning is disabled globally', () => {
      withVersioning(null);

      api.get('/resources', { version: 2 }).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/resources`);
      expect(req.request.params.keys()).toEqual([]);
      req.flush({});
    });

    it('encodes a version that would otherwise escape its url segment', () => {
      withVersioning({ strategy: 'url' });

      api.get('/resources', { version: '../admin' }).subscribe();

      httpMock.expectOne(`${BASE_URL}/api/v..%2Fadmin/resources`).flush({});
    });
  });

  describe('configured through provideApi', () => {
    it('applies the documented defaults', () => {
      configure([provideApi({ baseUrl: BASE_URL })]);

      api.get('/resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/api/v1/resources`).flush({});
    });

    it('keeps the defaults when optional config fields are undefined', () => {
      // The shape an app gets from `environment.ts` when the fields are unset.
      configure([
        provideApi({
          baseUrl: BASE_URL,
          prefix: undefined,
          version: undefined,
          versioning: undefined,
        }),
      ]);

      api.get('/resources').subscribe();

      httpMock.expectOne(`${BASE_URL}/api/v1/resources`).flush({});
    });

    it('sends a header version even when the header name is left undefined', () => {
      configure([
        provideApi({
          baseUrl: BASE_URL,
          version: 2,
          versioning: { strategy: 'header', headerName: undefined },
        }),
      ]);

      api.get('/resources').subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/resources`);
      expect(req.request.headers.get('X-API-Version')).toBe('2');
      req.flush({});
    });
  });

  describe('HTTP methods', () => {
    it('issues a GET without a body', () => {
      api.get('/resources').subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/v1/resources`);
      expect(req.request.method).toBe('GET');
      expect(req.request.body).toBeNull();
      req.flush({});
    });

    it.each([
      ['post', 'POST'],
      ['put', 'PUT'],
      ['patch', 'PATCH'],
    ] as const)('sends the body on %s', (method, verb) => {
      const body = { name: 'first' };

      api[method]('/resources', body).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/v1/resources`);
      expect(req.request.method).toBe(verb);
      expect(req.request.body).toEqual(body);
      req.flush({});
    });

    it('issues a DELETE without a body', () => {
      api.delete('/resources/1').subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/v1/resources/1`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toBeNull();
      req.flush({});
    });

    it('returns the parsed response body', async () => {
      const expected = { id: 1, name: 'first' };
      const result = firstValue(api.get<typeof expected>('/resources/1'));

      httpMock.expectOne(`${BASE_URL}/api/v1/resources/1`).flush(expected);

      await expect(result).resolves.toEqual(expected);
    });
  });

  describe('query parameters', () => {
    it('serialises a plain object', () => {
      api.get('/resources', { params: { active: true, size: 10 } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/api/v1/resources`);
      expect(req.request.params.get('active')).toBe('true');
      expect(req.request.params.get('size')).toBe('10');
      req.flush({});
    });

    it('repeats an array value once per entry', () => {
      api.get('/resources', { params: { tag: ['a', 'b'] } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/api/v1/resources`);
      expect(req.request.params.getAll('tag')).toEqual(['a', 'b']);
      req.flush({});
    });

    it('passes an HttpParams instance through untouched', () => {
      const params = new HttpParams().set('active', 'true');

      api.get('/resources', { params }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/api/v1/resources`);
      expect(req.request.params.get('active')).toBe('true');
      req.flush({});
    });

    it('forwards custom headers', () => {
      api.get('/resources', { headers: { 'X-Custom': 'value' } }).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/v1/resources`);
      expect(req.request.headers.get('X-Custom')).toBe('value');
      req.flush({});
    });
  });

  describe('getPage', () => {
    it('appends page and size', () => {
      api.getPage('/resources', 2, 25).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/api/v1/resources`);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('size')).toBe('25');
      req.flush(emptyPage());
    });

    it('keeps caller-supplied object params alongside pagination', () => {
      api.getPage('/resources', 0, 10, { params: { active: true } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/api/v1/resources`);
      expect(req.request.params.get('active')).toBe('true');
      expect(req.request.params.get('page')).toBe('0');
      req.flush(emptyPage());
    });

    it('keeps caller-supplied HttpParams alongside pagination', () => {
      const params = new HttpParams().set('active', 'true');

      api.getPage('/resources', 0, 10, { params }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/api/v1/resources`);
      expect(req.request.params.get('active')).toBe('true');
      expect(req.request.params.get('size')).toBe('10');
      req.flush(emptyPage());
    });

    it('preserves every value of a repeated HttpParams key', () => {
      const params = new HttpParams().append('tag', 'a').append('tag', 'b');

      api.getPage('/resources', 0, 10, { params }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/api/v1/resources`);
      expect(req.request.params.getAll('tag')).toEqual(['a', 'b']);
      req.flush(emptyPage());
    });

    it('lets pagination win over a conflicting caller param', () => {
      api.getPage('/resources', 3, 50, { params: { page: 99 } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/api/v1/resources`);
      expect(req.request.params.getAll('page')).toEqual(['3']);
      req.flush(emptyPage());
    });
  });

  describe('loading state', () => {
    it('does not start until the caller subscribes', () => {
      api.get('/resources');

      expect(loading.loading()).toBe(false);
      httpMock.expectNone(`${BASE_URL}/api/v1/resources`);
    });

    it('is active while the request is in flight and clears on success', () => {
      api.get('/resources').subscribe();
      expect(loading.loading()).toBe(true);

      httpMock.expectOne(`${BASE_URL}/api/v1/resources`).flush({});
      expect(loading.loading()).toBe(false);
    });

    it('clears when the request fails', () => {
      api.get('/resources').subscribe({ error: () => undefined });
      expect(loading.loading()).toBe(true);

      httpMock
        .expectOne(`${BASE_URL}/api/v1/resources`)
        .flush('nope', { status: 500, statusText: 'Server Error' });

      expect(loading.loading()).toBe(false);
    });

    it('skips tracking when showLoader is false', () => {
      api.get('/resources', { showLoader: false }).subscribe();

      expect(loading.loading()).toBe(false);
      httpMock.expectOne(`${BASE_URL}/api/v1/resources`).flush({});
    });

    it('skips tracking when the global default is off', () => {
      configure([{ provide: API_DEFAULT_SHOW_LOADER, useValue: false }]);

      api.get('/resources').subscribe();

      expect(loading.loading()).toBe(false);
      httpMock.expectOne(`${BASE_URL}/api/v1/resources`).flush({});
    });

    it('tracks a request that opts in against a disabled global default', () => {
      configure([{ provide: API_DEFAULT_SHOW_LOADER, useValue: false }]);

      api.get('/resources', { showLoader: true }).subscribe();

      expect(loading.loading()).toBe(true);
      httpMock.expectOne(`${BASE_URL}/api/v1/resources`).flush({});
    });
  });

  describe('interceptor context', () => {
    it('exposes the request options to interceptors', () => {
      api.get('/resources', { successMessage: 'Saved' }).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/v1/resources`);
      expect(req.request.context.get(API_REQUEST_OPTIONS).successMessage).toBe('Saved');
      req.flush({});
    });

    it('defaults every skip flag to false', () => {
      api.get('/resources').subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/v1/resources`);
      expect(req.request.context.get(SKIP_ERROR_HANDLER)).toBe(false);
      expect(req.request.context.get(SKIP_RETRY)).toBe(false);
      expect(req.request.context.get(SKIP_LOADER)).toBe(false);
      req.flush({});
    });

    it('sets the skip flags the options ask for', () => {
      api
        .get('/resources', {
          skipErrorHandler: true,
          retry: false,
          showLoader: false,
        })
        .subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/v1/resources`);
      expect(req.request.context.get(SKIP_ERROR_HANDLER)).toBe(true);
      expect(req.request.context.get(SKIP_RETRY)).toBe(true);
      expect(req.request.context.get(SKIP_LOADER)).toBe(true);
      req.flush({});
    });

    it('does not set SKIP_RETRY when retry is a config object', () => {
      api.get('/resources', { retry: { maxRetries: 5 } }).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/api/v1/resources`);
      expect(req.request.context.get(SKIP_RETRY)).toBe(false);
      req.flush({});
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const emptyPage = (): PaginatedResponse<unknown> => ({
  content: [],
  page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
});

const firstValue = <T>(source: {
  subscribe: (o: { next: (v: T) => void; error: (e: unknown) => void }) => unknown;
}): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    source.subscribe({ next: resolve, error: reject });
  });
