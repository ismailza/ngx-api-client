/**
 * How the API version is carried on each request.
 *
 * - `'url'` — a path segment after the base prefix: `/api/v1/orders`
 * - `'query-param'` — a query parameter: `/api/orders?v=1`
 * - `'header'` — a custom request header: `X-API-Version: 1`
 * - `'media-type'` — an `Accept` header built from a template:
 *   `Accept: application/vnd.api.v1+json`
 *
 * Set `ApiConfiguration.versioning` to `false` to send no version at all.
 */
export type ApiVersioningStrategy = 'url' | 'query-param' | 'header' | 'media-type';

/**
 * Fine-grained versioning settings.
 *
 * Only the fields relevant to the chosen `strategy` are used; the rest are
 * ignored, so switching strategies never requires rewriting the config.
 *
 * @example
 * ```ts
 * provideApi({
 *   baseUrl: 'https://api.example.com',
 *   version: 2,
 *   versioning: { strategy: 'query-param', parameterName: 'api-version' },
 * });
 * // → https://api.example.com/api/orders?api-version=2
 * ```
 */
export interface ApiVersioningConfig {
  /**
   * Where the version is placed on the request.
   * @default 'url'
   */
  strategy?: ApiVersioningStrategy;

  /**
   * `'url'` strategy only — text placed before the version in the path segment.
   * Use `''` for a bare number (`/api/1/orders`).
   * @default 'v'
   */
  prefix?: string;

  /**
   * `'query-param'` strategy only — name of the query parameter.
   * @default 'v'
   */
  parameterName?: string;

  /**
   * `'header'` strategy only — name of the request header.
   * @default 'X-API-Version'
   */
  headerName?: string;

  /**
   * `'media-type'` strategy only — `Accept` header value; every `{version}`
   * placeholder is replaced with the resolved version.
   * @default 'application/vnd.api.v{version}+json'
   */
  mediaType?: string;
}

/** An `ApiVersioningConfig` with every default filled in. */
export type ResolvedApiVersioning = Required<ApiVersioningConfig>;

/** Internal defaults merged when the consumer omits values. */
export const API_VERSIONING_DEFAULTS: ResolvedApiVersioning = {
  strategy: 'url',
  prefix: 'v',
  parameterName: 'v',
  headerName: 'X-API-Version',
  mediaType: 'application/vnd.api.v{version}+json',
};
