import { Injectable } from '@angular/core';
import { ApiError } from '../models/api-error.model';

/**
 * Abstract strategy for handling API errors globally.
 *
 * `provideApi()` registers `DefaultApiErrorHandler`, which only forwards the
 * error to Angular's `ErrorHandler`. Presentation is the application's job —
 * provide an adapter for your UI kit:
 *
 * @example
 * ```ts
 * @Injectable()
 * export class ResourceApiErrorHandler extends ApiErrorHandler {
 *   private readonly alertService = inject(AlertService);
 *   private readonly router = inject(Router);
 *
 *   override handle(error: ApiError): void {
 *     if (error.status === 403) {
 *       this.router.navigate(['/forbidden']);
 *       return;
 *     }
 *
 *     this.alertService.error(error.detail, {
 *       title: error.title,
 *     });
 *   }
 * }
 *
 * // Register in app.config.ts
 * { provide: ApiErrorHandler, useClass: ResourceApiErrorHandler }
 * ```
 */
@Injectable()
export abstract class ApiErrorHandler {
  /**
   * Handle a normalised API error.
   * Called by the error interceptor unless `skipErrorHandler` is set.
   */
  abstract handle(error: ApiError): void;
}
