<!--
  The PR title must follow Conventional Commits — release-please derives the
  changelog and the next version from it.

    feat: add request decorator hook          → minor
    fix: keep /v1 out of header-mode URLs     → patch
    docs: clarify prefix defaults             → no release
    feat!: drop ApiConfiguration.version      → breaking

  Other common types: refactor, perf, test, build, ci, chore.
-->

## Summary

<!-- What does this change and why? One or two sentences is usually enough. -->

## Related issues

<!-- e.g. Closes #12 — or "None" for standalone changes. -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (existing behaviour, public API, or types change)
- [ ] Documentation only
- [ ] Internal (refactor, tests, tooling, CI)

## Public API impact

<!--
  Anything exported from `projects/ngx-api-client/src/public-api.ts` is public.
  List additions, changes, and removals; write "None" if the surface is untouched.
-->

## Breaking changes and migration

<!--
  Delete this section if nothing breaks. Otherwise: what breaks, and what a
  consumer has to write instead. Remember the `!` marker in the PR title.
-->

## How was this tested?

<!-- Which specs cover the change, plus any manual verification you did. -->

## Checklist

- [ ] PR title follows Conventional Commits
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] Tests added or updated for the change
- [ ] TSDoc updated on any touched public API
- [ ] README updated if behaviour or configuration changed
- [ ] No `any` introduced; strict type checking still passes
