# ngx-api-client

A typed, interceptor-driven HTTP layer for Angular.

`HttpClient` gives you a request. It doesn't give you a _policy_ — where the base
URL comes from, how a failed response becomes something your components can
render, which requests are safe to retry, or how a loading indicator knows
anything is in flight. Most apps end up re-solving all four in an ad-hoc
`ApiService`. This is that service, extracted and made configurable.

- **Versioned URLs** — `{baseUrl}/api/v{version}{endpoint}`, overridable per request
- **RFC 9457 `problem+json` errors** normalised into one `ApiError` shape, whatever the backend returns
- **Retry with exponential backoff**, jitter and `Retry-After`, skipping non-idempotent methods
- **Per-request options** carried to interceptors through `HttpContext`, not globals
- **Pluggable presentation** — the library never renders anything; you decide what an error looks like
- **Loading signal** for a global progress bar
- **No UI dependency.** Peers are `@angular/core`, `@angular/common` and `rxjs`. That's it.

## Install

```bash
npm install @ismailza/ngx-api-client
```

## Setup

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  provideApi,
  apiErrorInterceptor,
  apiSuccessInterceptor,
  retryInterceptor,
} from '@ismailza/ngx-api-client';

export const appConfig: ApplicationConfig = {
  providers: [
    provideApi({
      baseUrl: 'https://api.example.com',
      version: 1,
      retry: { maxRetries: 3, initialDelay: 1000 },
    }),
    provideHttpClient(
      withInterceptors([retryInterceptor, apiErrorInterceptor, apiSuccessInterceptor]),
    ),
  ],
};
```

Interceptors are registered by you, not by `provideApi()`, because **order
matters** and only you know what else is in the chain. Put an auth/bearer-token
interceptor first so retried requests get a fresh token; keep `retryInterceptor`
before `apiErrorInterceptor` so the error handler only sees failures that
survived every retry.

## Usage

```ts
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiService);

  list(page: number, size: number): Observable<PaginatedResponse<Order>> {
    return this.api.getPage<Order>('/orders', page, size);
  }

  get(id: string): Observable<Order> {
    return this.api.get<Order>(`/orders/${id}`);
  }

  create(order: OrderRequest): Observable<Order> {
    return this.api.post<Order>('/orders', order);
  }
}
```

`GET /orders` with `version: 1` resolves to
`https://api.example.com/api/v1/orders?page=0&size=20`.

### Per-request options

Every method takes an optional `ApiRequestOptions`:

```ts
// Pin this call to an older API version
this.api.get<LegacyOrder>('/orders', { version: 1 });

// Fire-and-forget: no retry, no global error handler, no loading indicator
this.api.post('/analytics/event', payload, {
  retry: false,
  skipErrorHandler: true,
  showLoader: false,
});

// Custom success message; or none at all
this.api.put(`/orders/${id}`, order, { successMessage: 'Order updated' });
this.api.delete(`/orders/${id}`, { successMessage: false });
```

These travel to the interceptors via `HttpContext`, so they stay scoped to the
one request instead of mutating shared state.

## Error handling

Every failure — a `problem+json` body, a plain-text proxy error page, or a
network drop that never reached the server — arrives as the same `ApiError`:

```ts
interface ApiError {
  type: string; // RFC 9457 problem type URI
  title?: string; // 'Bad Request'
  status: number; // 0 for a network failure
  detail: string; // safe to show the user
  instance?: string; // path that produced it
  code?: string; // machine-readable, e.g. 'VALIDATION_ERROR'
  timestamp: string;
  traceId?: string; // body, else the X-Trace-Id header
  errors?: { field: string; message: string }[];
}
```

Branch on `code`, never on `detail` text.

The library will not render this for you. `provideApi()` registers a fallback
that forwards to Angular's `ErrorHandler` and nothing more. To show something,
provide your own:

```ts
@Injectable()
export class ToastApiErrorHandler extends ApiErrorHandler {
  private readonly toast = inject(MyToastService);
  private readonly router = inject(Router);

  override handle(error: ApiError): void {
    this.toast.error(error.detail, { title: error.title });

    if (error.status === 403) {
      this.router.navigate(['/forbidden']);
    }
  }
}

// in appConfig.providers
{ provide: ApiErrorHandler, useClass: ToastApiErrorHandler }
```

> **Note:** the fallback hands the whole `ApiError` to `ErrorHandler`, which
> logs it. If your API puts sensitive data in `detail` or `instance`, register
> your own handler rather than relying on the default.

`ApiSuccessHandler` works the same way and defaults to discarding the message.

## Retry

Applied only to responses whose status is in `retryableStatuses`
(`408, 429, 500, 502, 503, 504` by default):

| Behaviour     | Detail                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| Backoff       | `initialDelay * multiplier^(attempt-1)`, plus 0–30% jitter             |
| `Retry-After` | Honoured on 429, in seconds or as an HTTP date — overrides the backoff |
| `POST`        | Not retried unless the request opts in, since it isn't idempotent      |
| Opt out       | `retry: false` per request, or globally in `provideApi()`              |

## Loading state

`ApiLoadingService` counts in-flight requests and exposes a signal, so
concurrent calls don't flicker the indicator off early:

```ts
@Component({
  template: `@if (loading.loading()) {
    <my-progress-bar />
  }`,
})
export class AppShell {
  protected readonly loading = inject(ApiLoadingService);
}
```

Exclude a request with `showLoader: false`.

## Configuration

| Option                      | Default                                                | Description                          |
| --------------------------- | ------------------------------------------------------ | ------------------------------------ |
| `baseUrl`                   | _required_                                             | API root, no trailing slash          |
| `version`                   | `1`                                                    | URL-prefix version                   |
| `retry`                     | `{ maxRetries: 3, initialDelay: 1000, multiplier: 2 }` | `false` disables retry globally      |
| `defaultShowLoader`         | `true`                                                 | Whether requests track loading state |
| `defaultShowSuccessMessage` | `true`                                                 | Success message on mutating methods  |
| `defaultSuccessMessages`    | per-method English defaults                            | Merged over the built-ins            |

Success messages are plain strings so the package carries no i18n dependency —
pass translated values into `defaultSuccessMessages`, or handle wording in your
own `ApiSuccessHandler`.

## Compatibility

Developed and tested against **Angular 21**. The declared floor of `>=17` reflects
the APIs used — signals and functional interceptors — rather than a range the CI
matrix currently covers.

## Contributing

```bash
npm install
npm test     # 102 specs, vitest
npm run build
```

Issues and pull requests are welcome.

## License

[MIT](../../LICENSE) © Ismail ZAHIR
