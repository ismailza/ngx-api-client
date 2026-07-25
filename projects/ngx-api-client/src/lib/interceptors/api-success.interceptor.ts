import { HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import {
  API_DEFAULT_SHOW_SUCCESS_MESSAGE,
  API_DEFAULT_SUCCESS_MESSAGES,
  API_REQUEST_OPTIONS,
} from '../api.tokens';
import { ApiSuccessHandler } from '../handlers/api-success-handler';
import { GENERIC_SUCCESS_MESSAGE } from '../models/success-message.model';

/** HTTP methods considered mutating — eligible for a default success toast. */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Functional HTTP interceptor that shows a success toast for requests
 * whose `successMessage` option resolves to a message.
 *
 * Behavior, resolved from `ApiRequestOptions.successMessage`:
 * - `string` — shows that custom message
 * - `false` — never shows one
 * - `true` / omitted — shows the configured default message for the request's
 *   HTTP method (`ApiConfiguration.defaultSuccessMessages`), but only for
 *   mutating methods (POST/PUT/PATCH/DELETE) and only when
 *   `ApiConfiguration.defaultShowSuccessMessage` is enabled
 */
export const apiSuccessInterceptor: HttpInterceptorFn = (req, next) => {
  const successHandler = inject(ApiSuccessHandler);
  const defaultShow = inject(API_DEFAULT_SHOW_SUCCESS_MESSAGE);
  const defaultMessages = inject(API_DEFAULT_SUCCESS_MESSAGES);

  return next(req).pipe(
    tap((event) => {
      if (event.type !== HttpEventType.Response) {
        return;
      }

      const successMessage = req.context.get(API_REQUEST_OPTIONS).successMessage;
      const message = resolveMessage(req.method, successMessage, defaultShow, defaultMessages);

      if (message) {
        successHandler.handle(message);
      }
    }),
  );
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resolveMessage(
  method: string,
  successMessage: boolean | string | undefined,
  defaultShow: boolean,
  defaultMessages: Record<string, string>,
): string | undefined {
  if (successMessage === false) {
    return undefined;
  }

  if (typeof successMessage === 'string') {
    return successMessage;
  }

  const isMutating = MUTATING_METHODS.has(method);
  const shouldShow = successMessage === true || (isMutating && defaultShow);

  if (!shouldShow) {
    return undefined;
  }

  return defaultMessages[method.toLowerCase()] ?? GENERIC_SUCCESS_MESSAGE;
}
