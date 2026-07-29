# Angular compatibility fixture

The workspace builds on the newest Angular, but `@ismailza/ngx-api-client`
supports a range of majors. This directory is the consumer project used to check
that claim against every version in the range.

`scripts/check-angular-compat.mjs` copies these files into a throwaway project
outside the repo, installs one Angular major plus the packed tarball, and runs
three checks — each covering something the previous one cannot:

| Check                                 | Catches                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ngc -p tsconfig.json`                | type-level breaks between the shipped `.d.ts` and that version's Angular types                   |
| `ng build --configuration production` | Angular **linker** failures over the shipped partial declarations, plus bundler/AOT breakage     |
| `node smoke.mjs`                      | JIT compilation, injector behaviour and `exports` map resolution — none of which a build reaches |

The supported majors are derived from the library's `@angular/core` peer range,
so the matrix cannot drift from what is published.

## Running it

```bash
npm run build
npm run compat            # every supported major
npm run compat -- 17 22   # selected majors
npm run compat -- --list  # the derived matrix, as JSON
```

## Layout

| File                | Role                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| `src/models.ts`     | domain types standing in for a consumer's own                          |
| `src/handlers.ts`   | `ApiErrorHandler` / `ApiSuccessHandler` subclasses                     |
| `src/services.ts`   | a service injecting `ApiService`, calling every verb                   |
| `src/providers.ts`  | `appConfig` wiring `provideApi()` and the interceptors                 |
| `src/index.ts`      | barrel — the `ngc` entry point                                         |
| `src/browser.ts`    | the `ng build` entry point                                             |
| `tsconfig.json`     | `ngc` config (`skipLibCheck: false`, so the shipped types are checked) |
| `tsconfig.app.json` | `ng build` config                                                      |

## Editing the fixture

These sources must stay valid on **all** supported majors, so they declare no
components: standalone semantics changed between v17 and v19, and the library
ships no declarables anyway. Keep to DI, the public types and the interceptors.

`browser.ts` parks the fixture on `globalThis` deliberately — the application
builder tree-shakes aggressively, and without a live reference the library would
be dropped from the bundle, leaving the linker with nothing to do and the build
proving nothing. `assertBundleLinked()` in the runner guards both directions.

When a public export is added, reference it here — an export that no fixture
touches is an export the matrix does not cover.
