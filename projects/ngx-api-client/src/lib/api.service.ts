import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { defer, finalize, Observable } from 'rxjs';
import { ApiLoadingService } from './api-loading.service';
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
import { ApiRequestOptions } from './models/api-request-options.model';
import { ResolvedApiVersioning } from './models/api-versioning.model';
import { normalizePrefix, trimTrailingSlash } from './url.util';

/** The versioning settings and the version value that apply to one request. */
interface RequestVersioning {
  config: ResolvedApiVersioning;
  version: string;
}

/**
 * Centralised, generic HTTP client for all API calls.
 *
 * Builds URLs from the configured `baseUrl` and `prefix`, carries the API
 * version using the configured strategy (URL segment, query parameter, header
 * or media type — or not at all), attaches per-request options to the
 * `HttpContext` for interceptors, and tracks loading state.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly prefix = inject(API_PREFIX);
  private readonly version = inject(API_VERSION);
  private readonly versioning = inject(API_VERSIONING);
  private readonly defaultShowLoader = inject(API_DEFAULT_SHOW_LOADER);
  private readonly loadingService = inject(ApiLoadingService);

  /**
   * Performs a `GET` request to the specified API endpoint with optional request options.
   *
   * @param endpoint API endpoint (e.g. `'/resource'`).
   * @param options Additional request options (query params, headers, etc.).
   * @returns An `Observable` of the response body typed as `T`.
   */
  get<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('GET', endpoint, null, options);
  }

  /**
   * Performs a `POST` request to the specified API endpoint with optional request options.
   *
   * @param endpoint API endpoint (e.g. `'/resource'`).
   * @param body Request body.
   * @param options Additional request options (query params, headers, etc.).
   * @returns An `Observable` of the response body typed as `T`.
   */
  post<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('POST', endpoint, body, options);
  }

  /**
   * Performs a `PUT` request to the specified API endpoint with optional request options.
   *
   * @param endpoint API endpoint (e.g. `'/resource/{id}'`).
   * @param body Request body.
   * @param options Additional request options (query params, headers, etc.).
   * @returns An `Observable` of the response body typed as `T`.
   */
  put<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  /**
   * Performs a `PATCH` request to the specified API endpoint with optional request options.
   *
   * @param endpoint API endpoint (e.g. `'/resource/{id}'`).
   * @param body Request body.
   * @param options Additional request options (query params, headers, etc.).
   * @returns An `Observable` of the response body typed as `T`.
   */
  patch<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  /**
   * Performs a `DELETE` request to the specified API endpoint with optional request options.
   *
   * @param endpoint API endpoint (e.g. `'/resource/{id}'`).
   * @param options Additional request options (query params, headers, etc.).
   * @returns An `Observable` of the response body typed as `T`.
   */
  delete<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('DELETE', endpoint, null, options);
  }

  /**
   * Convenience method for paginated `GET` requests.
   *
   * Appends `page` and `size` as query parameters and returns
   * a typed `PaginatedResponse<T>`.
   *
   * @param endpoint  API endpoint (e.g. `'/resource'`)
   * @param page      Zero-based page index
   * @param size      Page size
   * @param options   Additional request options (extra params are merged)
   */
  getPage<T>(
    endpoint: string,
    page: number,
    size: number,
    options?: ApiRequestOptions,
  ): Observable<PaginatedResponse<T>> {
    const paginationParams = { page: page.toString(), size: size.toString() };

    const mergedOptions: ApiRequestOptions = {
      ...options,
      params: this.mergeParams(options?.params, paginationParams),
    };

    return this.request<PaginatedResponse<T>>('GET', endpoint, null, mergedOptions);
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /**
   * Generic method for making API requests. All public methods delegate to this.
   *
   * @param method HTTP method (e.g. 'GET', 'POST', etc.).
   * @param endpoint API endpoint (e.g. `'/resource'`).
   * @param body Request body (for POST, PUT, PATCH).
   * @param options Additional request options (query params, headers, flags for interceptors, etc.).
   * @returns An `Observable` of the response body typed as `T`.
   */
  private request<T>(
    method: string,
    endpoint: string,
    body: unknown,
    options?: ApiRequestOptions,
  ): Observable<T> {
    const showLoader = options?.showLoader ?? this.defaultShowLoader;

    return defer(() => {
      const versioning = this.resolveVersioning(options);
      const url = this.buildUrl(endpoint, options, versioning);
      const context = this.buildContext(options);

      if (showLoader) {
        this.loadingService.start();
      }

      return this.http.request<T>(method, url, {
        body,
        params: this.buildParams(options, versioning),
        headers: this.buildHeaders(options, versioning),
        context,
      });
    }).pipe(
      finalize(() => {
        if (showLoader) {
          this.loadingService.stop();
        }
      }),
    );
  }

  /**
   * Resolves the versioning settings and version value for one request.
   *
   * When versioning is disabled globally there is no strategy to carry a
   * version, so `ApiRequestOptions.version` is ignored rather than guessed at.
   *
   * @param options Request options that may override the global version.
   * @returns `null` when versioning is disabled globally or for this request,
   * otherwise the resolved config paired with the version as a string.
   */
  private resolveVersioning(options?: ApiRequestOptions): RequestVersioning | null {
    if (!this.versioning) return null;

    const version = options?.version ?? this.version;
    if (version === false || version === null || version === undefined || version === '') {
      return null;
    }

    return { config: this.versioning, version: String(version) };
  }

  /**
   * Builds the full URL: `{baseUrl}/{prefix}/{v}{version}{endpoint}`, where the
   * prefix and the version segment are each omitted when not configured.
   *
   * @param endpoint API endpoint path (e.g. `'/resource'`).
   * @param options Request options that may override the prefix.
   * @param versioning Resolved versioning for this request, or `null` if disabled.
   * @returns The full URL for the API request.
   *
   * @example
   * // prefix 'api', 'url' strategy, version 2
   * buildUrl('/resource', …) → 'https://api.example.com/api/v2/resource'
   */
  private buildUrl(
    endpoint: string,
    options?: ApiRequestOptions,
    versioning?: RequestVersioning | null,
  ): string {
    const segments: string[] = [];

    const prefix = normalizePrefix(options?.prefix ?? this.prefix);
    if (prefix) {
      segments.push(prefix);
    }

    if (versioning?.config.strategy === 'url') {
      // The version can come from a route param or user input, so encode it:
      // a raw `/` or `..` would otherwise escape its own path segment.
      segments.push(`${versioning.config.prefix}${encodeURIComponent(versioning.version)}`);
    }

    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const path = segments.length ? `/${segments.join('/')}` : '';

    return `${trimTrailingSlash(this.baseUrl)}${path}${normalizedEndpoint}`;
  }

  /**
   * Builds the query parameters, appending the version under the configured
   * parameter name when the `'query-param'` strategy is active. A parameter the
   * caller set explicitly is never overwritten.
   *
   * @param options Request options that may carry query parameters.
   * @param versioning Resolved versioning for this request, or `null` if disabled.
   * @returns An `HttpParams` instance, or `undefined` when there is nothing to send.
   */
  private buildParams(
    options?: ApiRequestOptions,
    versioning?: RequestVersioning | null,
  ): HttpParams | undefined {
    const params = this.toHttpParams(options?.params);

    if (versioning?.config.strategy !== 'query-param') return params;

    const name = versioning.config.parameterName;
    if (params?.has(name)) return params;

    return (params ?? new HttpParams()).set(name, versioning.version);
  }

  /**
   * Builds the request headers, adding the version header when the `'header'`
   * or `'media-type'` strategy is active. A header the caller set explicitly is
   * never overwritten.
   *
   * @param options Request options that may carry headers.
   * @param versioning Resolved versioning for this request, or `null` if disabled.
   * @returns The headers to send, or `undefined` when there are none.
   */
  private buildHeaders(
    options?: ApiRequestOptions,
    versioning?: RequestVersioning | null,
  ): HttpHeaders | Record<string, string | string[]> | undefined {
    const strategy = versioning?.config.strategy;

    if (!versioning || (strategy !== 'header' && strategy !== 'media-type')) {
      return options?.headers;
    }

    const name = strategy === 'header' ? versioning.config.headerName : 'Accept';
    const value =
      strategy === 'header'
        ? versioning.version
        : versioning.config.mediaType.replace(/\{version\}/g, versioning.version);

    const headers =
      options?.headers instanceof HttpHeaders
        ? options.headers
        : new HttpHeaders(options?.headers ?? {});

    return headers.has(name) ? headers : headers.set(name, value);
  }

  /**
   * Creates an `HttpContext` populated with per-request flags
   * that interceptors read.
   *
   * @param options Request options that may contain flags for interceptors.
   * @returns An `HttpContext` with the appropriate tokens set for this request.
   */
  private buildContext(options?: ApiRequestOptions): HttpContext {
    const ctx = options?.context ?? new HttpContext();

    if (options) {
      ctx.set(API_REQUEST_OPTIONS, options);
    }

    if (options?.skipErrorHandler) {
      ctx.set(SKIP_ERROR_HANDLER, true);
    }

    if (options?.retry === false) {
      ctx.set(SKIP_RETRY, true);
    }

    if (options?.showLoader === false) {
      ctx.set(SKIP_LOADER, true);
    }

    return ctx;
  }

  /**
   * Converts the `params` option into an `HttpParams` instance.
   *
   * @param params Request options may contain query parameters as either an `HttpParams` instance or a plain object.
   * @returns An `HttpParams` instance or `undefined` if no params were provided.
   */
  private toHttpParams(
    params?:
      | HttpParams
      | Record<string, string | number | boolean | readonly (string | number | boolean)[]>,
  ): HttpParams | undefined {
    if (!params) return undefined;
    if (params instanceof HttpParams) return params;

    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((v) => (httpParams = httpParams.append(key, String(v))));
      } else {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }

  /**
   * Merges existing query parameters with additional pagination parameters.
   *
   * @param existing Existing query parameters, either as an `HttpParams` instance or a plain object.
   * @param extra Additional query parameters to merge in as a plain object.
   * @returns A merged plain object of query parameters. If `existing` was an `HttpParams`,
   * its keys and values are extracted and merged with `extra`. If `existing` was already a plain object,
   * it's simply merged with `extra`.
   */
  private mergeParams(
    existing?:
      | HttpParams
      | Record<string, string | number | boolean | readonly (string | number | boolean)[]>,
    extra?: Record<string, string>,
  ): Record<string, string | number | boolean | readonly (string | number | boolean)[]> {
    const base: Record<string, string | number | boolean | readonly (string | number | boolean)[]> =
      existing instanceof HttpParams
        ? existing.keys().reduce(
            (acc, key) => {
              const values = existing.getAll(key);
              acc[key] = values && values.length > 1 ? values : (existing.get(key) ?? '');
              return acc;
            },
            {} as Record<string, string | string[]>,
          )
        : { ...(existing ?? {}) };

    return { ...base, ...(extra ?? {}) };
  }
}
