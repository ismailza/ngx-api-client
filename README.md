# ngx-api-client

[![npm](https://img.shields.io/npm/v/@ismailza/ngx-api-client.svg)](https://www.npmjs.com/package/@ismailza/ngx-api-client)
[![CI](https://github.com/ismailza/ngx-api-client/actions/workflows/ci.yml/badge.svg)](https://github.com/ismailza/ngx-api-client/actions/workflows/ci.yml)
[![Release](https://github.com/ismailza/ngx-api-client/actions/workflows/release.yml/badge.svg)](https://github.com/ismailza/ngx-api-client/actions/workflows/release.yml)
[![license](https://img.shields.io/npm/l/@ismailza/ngx-api-client.svg)](./LICENSE)

A typed, interceptor-driven HTTP layer for Angular.

`HttpClient` gives you a request. It doesn't give you a _policy_ — where the base
URL comes from, how a failed response becomes something your components can
render, which requests are safe to retry, or how a loading indicator knows
anything is in flight. Most apps end up re-solving all four in an ad-hoc
`ApiService`. This is that service, extracted and made configurable.

- **Configurable versioning** — URL segment, query parameter, header or media type; or turned off entirely — overridable per request
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
      prefix: 'api', // {baseUrl}/api/...  — '' or false to omit
      version: 1,
      versioning: 'url', // 'query-param' | 'header' | 'media-type' | false
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

## URL shape and versioning

A URL is `{baseUrl}` + an optional `{prefix}` segment + an optional version
segment + `{endpoint}`. Both middle pieces are yours to configure — or remove.

```ts
provideApi({ baseUrl: 'https://api.example.com', prefix: 'api', version: 2 });
// → https://api.example.com/api/v2/orders
```

`prefix` is a static path segment (default `'api'`); set it to `''` or `false`
when the API is served from the root. `versioning` picks how the version
travels:

| `versioning`                                        | Result for `GET /orders`              |
| --------------------------------------------------- | ------------------------------------- |
| `'url'` _(default)_                                 | `/api/v2/orders`                      |
| `{ strategy: 'url', prefix: '' }`                   | `/api/2/orders`                       |
| `'query-param'`                                     | `/api/orders?v=2`                     |
| `{ strategy: 'query-param', parameterName: 'ver' }` | `/api/orders?ver=2`                   |
| `'header'`                                          | `/api/orders` + `X-API-Version: 2`    |
| `{ strategy: 'header', headerName: 'Api-Version' }` | `/api/orders` + `Api-Version: 2`      |
| `'media-type'`                                      | `Accept: application/vnd.api.v2+json` |
| `false`                                             | `/api/orders`, no version sent        |

For `'media-type'`, `mediaType` is a template whose `{version}` placeholders are
substituted — default `'application/vnd.api.v{version}+json'`.

`version` accepts strings too, for date- or label-based schemes:

```ts
provideApi({
  baseUrl: 'https://api.example.com',
  version: '2024-01-01',
  versioning: { strategy: 'header', headerName: 'Api-Version' },
});
```

A header or query parameter the caller sets explicitly is never overwritten by
the versioning strategy, and a version placed in the URL is percent-encoded.
With `versioning: false` there is no strategy to carry a version, so a
per-request `version` is ignored.

### Per-request options

Every method takes an optional `ApiRequestOptions`:

```ts
// Pin this call to an older API version
this.api.get<LegacyOrder>('/orders', { version: 1 });

// Hit an unversioned endpoint outside the API prefix: /health
this.api.get<Health>('/health', { prefix: false, version: false });

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

| Option                      | Default                                                | Description                                         |
| --------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| `baseUrl`                   | _required_                                             | API root; a trailing slash is trimmed               |
| `prefix`                    | `'api'`                                                | Static path segment; `''`/`false` omits it          |
| `version`                   | `1`                                                    | Version value, `number` or `string`                 |
| `versioning`                | `'url'`                                                | Strategy name, config object, or `false` to disable |
| `retry`                     | `{ maxRetries: 3, initialDelay: 1000, multiplier: 2 }` | `false` disables retry globally                     |
| `defaultShowLoader`         | `true`                                                 | Whether requests track loading state                |
| `defaultShowSuccessMessage` | `true`                                                 | Success message on mutating methods                 |
| `defaultSuccessMessages`    | per-method English defaults                            | Merged over the built-ins                           |

Every option falls back to its default when omitted _or_ when passed explicitly
as `undefined`, so building the config from optional sources
(`prefix: environment.apiPrefix`) is safe.

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
npm test
npm run build
```

Issues and pull requests are welcome.

## License

[MIT](./LICENSE) © Ismail ZAHIR
