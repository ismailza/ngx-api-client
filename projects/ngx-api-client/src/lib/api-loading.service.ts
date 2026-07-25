import { computed, Injectable, signal } from '@angular/core';

/**
 * Tracks the number of in-flight API requests and exposes
 * a reactive `loading` signal.
 *
 * Used by `ApiService` internally, and by shell components
 * to display a global progress indicator.
 *
 * @example
 * ```ts
 * @Component({
 *   template: `@if (loadingService.loading()) { <mat-progress-bar mode="indeterminate" /> }`,
 * })
 * export class AppShellComponent {
 *   protected readonly loadingService = inject(ApiLoadingService);
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ApiLoadingService {
  private readonly activeRequests = signal(0);

  /** `true` when at least one tracked API request is in flight. */
  readonly loading = computed(() => this.activeRequests() > 0);

  /** @internal Called by `ApiService` when a tracked request starts. */
  start(): void {
    this.activeRequests.update((n) => n + 1);
  }

  /** @internal Called by `ApiService` when a tracked request completes or errors. */
  stop(): void {
    this.activeRequests.update((n) => Math.max(0, n - 1));
  }
}
