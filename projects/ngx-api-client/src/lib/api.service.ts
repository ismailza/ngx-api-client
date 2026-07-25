import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { defer, finalize, Observable } from 'rxjs';
import { ApiLoadingService } from './api-loading.service';
import {
  API_BASE_URL,
  API_DEFAULT_SHOW_LOADER,
  API_REQUEST_OPTIONS,
  API_VERSION,
  SKIP_ERROR_HANDLER,
  SKIP_LOADER,
  SKIP_RETRY,
} from './api.tokens';
import { PaginatedResponse } from './models';
import { ApiRequestOptions } from './models/api-request-options.model';

/**
 * Centralised, generic HTTP client for all API calls.
 *
 * Builds versioned URLs from the configured `baseUrl` and `version`,
 * attaches per-request options to the `HttpContext` for interceptors,
 * and tracks loading state.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly version = inject(API_VERSION);
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
      const url = this.buildUrl(endpoint, options?.version);
      const context = this.buildContext(options);

      if (showLoader) {
        this.loadingService.start();
      }

      return this.http.request<T>(method, url, {
        body,
        params: this.toHttpParams(options?.params),
        headers: options?.headers,
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
   * Builds the full URL: `{baseUrl}/api/v{version}{endpoint}`
   *
   * @param endpoint API endpoint path (e.g. `'/resource'`).
   * @param versionOverride Optional API version to override the default.
   * @returns The full URL for the API request.
   *
   * @example
   * buildUrl('/resource', 2) → 'https://api.example.com/api/v2/resource'
   */
  private buildUrl(endpoint: string, versionOverride?: number): string {
    const v = versionOverride ?? this.version;
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}/api/v${v}${normalizedEndpoint}`;
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
