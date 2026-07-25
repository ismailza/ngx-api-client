import { Injectable } from '@angular/core';

/**
 * Abstract strategy for presenting a request's success message.
 *
 * `provideApi()` registers `DefaultApiSuccessHandler`, which discards the
 * message. Provide an adapter for your UI kit to actually present it:
 *
 * @example
 * ```ts
 * @Injectable()
 * export class ResourceApiSuccessHandler extends ApiSuccessHandler {
 *   private readonly alertService = inject(AlertService);
 *
 *   override handle(message: string): void {
 *     this.alertService.success(message, { life: 3000 });
 *   }
 * }
 *
 * // Register in app.config.ts
 * { provide: ApiSuccessHandler, useClass: ResourceApiSuccessHandler }
 * ```
 */
@Injectable()
export abstract class ApiSuccessHandler {
  /**
   * Present a resolved success message.
   * Called by the success interceptor when a request's `successMessage` resolves to a string.
   */
  abstract handle(message: string): void;
}
