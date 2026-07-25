import { ApiErrorCode } from '../types/api-error-code.type';
import { ProblemDetail } from './problem-detail.model';

/**
 * Normalised error returned by the API error interceptor.
 *
 * Mirrors the backend's RFC 9457 (`application/problem+json`) `ProblemDetail`
 * response 1:1, so every failed HTTP response — from every endpoint — is
 * transformed into this same shape and your components never deal with a
 * raw `HttpErrorResponse` or backend-specific error format.
 */
export interface ApiError extends ProblemDetail {
  /**
   * Localized, human-readable explanation, already translated server-side
   * based on `Accept-Language` — safe to show directly to the user.
   */
  detail: string;

  /**
   * Application-level, machine-readable error code (e.g. `'VALIDATION_ERROR'`).
   * Use this for branching logic — never parse `detail` text.
   */
  code?: ApiErrorCode;

  /**
   * Field-level validation errors.
   * Present only when `code === 'VALIDATION_ERROR'`; omitted otherwise.
   */
  errors?: ApiFieldError[];
}

/** Field-level validation error, present only when `code === 'VALIDATION_ERROR'`. */
export interface ApiFieldError {
  /** Name of the invalid field (e.g. `'email'`). */
  field: string;
  /** Localized, human-readable validation message for this field. */
  message: string;
}

/** Type guard to check if an unknown value is an `ApiError`. */
export const isApiError = (value: unknown): value is ApiError =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  'detail' in value &&
  'timestamp' in value;
