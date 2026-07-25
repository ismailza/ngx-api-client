/**
 * Internal URL helpers shared by `provideApi()` and `ApiService`.
 * Not part of the public API.
 */

/** Removes a trailing slash so the base URL never doubles up on joins. */
export const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

/**
 * Normalizes a path prefix into a bare segment with no surrounding slashes.
 * `false`, `undefined` and blank values all collapse to `''` (no segment).
 *
 * @example normalizePrefix('/api/') → 'api'
 */
export const normalizePrefix = (prefix?: string | false | null): string =>
  prefix ? prefix.replace(/^\/+|\/+$/g, '') : '';
