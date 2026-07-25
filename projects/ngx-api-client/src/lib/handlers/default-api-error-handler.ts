import { ErrorHandler, inject, Injectable } from '@angular/core';
import { ApiError } from '../models/api-error.model';
import { ApiErrorHandler } from './api-error-handler';

/**
 * Fallback used when the application does not provide its own `ApiErrorHandler`.
 *
 * Delegates to Angular's built-in `ErrorHandler` so the failure surfaces through
 * whatever reporting the application already has wired up, and deliberately does
 * no presentation of its own — this library has no opinion about toasts,
 * dialogs or redirects.
 *
 * Applications are expected to override it with an adapter for their UI kit:
 *
 * ```ts
 * { provide: ApiErrorHandler, useClass: ToastApiErrorHandler }
 * ```
 */
@Injectable()
export class DefaultApiErrorHandler extends ApiErrorHandler {
  private readonly errorHandler = inject(ErrorHandler);

  override handle(error: ApiError): void {
    this.errorHandler.handleError(error);
  }
}
