/**
 * Represents a problem detail object as defined in [RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807).
 *
 * This interface is used to model the error response from the backend when an error occurs.
 * It provides a standardized structure for conveying error information, including the type of error,
 * a human-readable title, the HTTP status code, a detailed message, and optional fields for additional context.
 */
export interface ProblemDetail {
  /** RFC 9457 problem type URI. Backend currently always sends `'about:blank'`. */
  type: string;

  /** Short, human-readable summary of the problem type (e.g. `'Bad Request'`). */
  title?: string;

  /** HTTP status code (e.g. 400, 404, 500). `0` denotes a client-side/network failure. */
  status: number;

  /**
   * Localized, human-readable explanation, already translated server-side
   * based on `Accept-Language` — safe to show directly to the user.
   */
  detail?: string;

  /** Path of the request that produced the error (e.g. `/api/v1/orders/42`). */
  instance?: string;

  /**
   * Application-level, machine-readable error code (e.g. `'VALIDATION_ERROR'`).
   * Use this for branching logic — never parse `detail` text.
   */
  code?: string;

  /** ISO 8601 timestamp of when the error occurred. */
  timestamp: string;

  /**
   * Correlation ID from the backend. Include it in any bug report / support
   * link shown to the user, and log it client-side to correlate with backend logs.
   */
  traceId?: string;

  /**
   * Field-level validation errors.
   */
  errors?: FieldError[];
}

/**
 * Represents a field-level validation error, typically included in the `errors` array of a `ProblemDetail` object.
 * Each `FieldError` provides information about a specific field that failed validation, including the field name and an associated error message.
 *
 * This interface is used to convey detailed validation errors for individual fields in a structured manner.
 */
export interface FieldError {
  field: string;
  message: string;
}
