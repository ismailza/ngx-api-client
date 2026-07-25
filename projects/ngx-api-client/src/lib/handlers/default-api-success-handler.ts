import { Injectable } from '@angular/core';
import { ApiSuccessHandler } from './api-success-handler';

/**
 * Fallback used when the application does not provide its own `ApiSuccessHandler`.
 *
 * Does nothing: a success message is purely presentational, and this library has
 * no way to render one without taking on a UI dependency. Resolved messages are
 * dropped until an application supplies an adapter for its UI kit:
 *
 * ```ts
 * { provide: ApiSuccessHandler, useClass: ToastApiSuccessHandler }
 * ```
 */
@Injectable()
export class DefaultApiSuccessHandler extends ApiSuccessHandler {
  override handle(): void {
    // Intentionally empty — see class doc.
  }
}
