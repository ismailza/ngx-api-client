/**
 * Default success toast message per mutating HTTP method.
 *
 * Applied globally via `provideApi()` or overridden per-request
 * through `ApiRequestOptions.successMessage`.
 */
export interface ApiDefaultSuccessMessages {
  post?: string;
  put?: string;
  patch?: string;
  delete?: string;
}

/** Internal defaults merged when consumer omits values. */
export const SUCCESS_MESSAGE_DEFAULTS: Required<ApiDefaultSuccessMessages> = {
  post: 'Created successfully.',
  put: 'Updated successfully.',
  patch: 'Updated successfully.',
  delete: 'Deleted successfully.',
};

/**
 * Fallback message shown when `successMessage: true` is set on a request
 * whose method has no configured default (e.g. `GET`).
 */
export const GENERIC_SUCCESS_MESSAGE = 'Operation completed successfully.';
