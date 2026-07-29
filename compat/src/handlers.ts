import { ErrorHandler, inject, Injectable } from '@angular/core';
import {
  ApiError,
  ApiErrorCode,
  ApiErrorHandler,
  ApiSuccessHandler,
  ProblemDetail,
} from '@ismailza/ngx-api-client';

/** Custom error handler — the documented extension point. */
@Injectable()
export class FixtureErrorHandler extends ApiErrorHandler {
  private readonly fallback = inject(ErrorHandler);

  override handle(error: ApiError): void {
    const code: ApiErrorCode | undefined = error.code;
    const problem: ProblemDetail = error;

    if (code === 'VALIDATION_ERROR') {
      for (const fieldError of error.errors ?? []) {
        this.fallback.handleError(`${fieldError.field}: ${fieldError.message}`);
      }
      return;
    }

    this.fallback.handleError(`${problem.status}:${problem.title ?? ''}:${error.detail}`);
  }
}

/** Custom success handler — the documented extension point. */
@Injectable()
export class FixtureSuccessHandler extends ApiSuccessHandler {
  override handle(message: string): void {
    void message;
  }
}
