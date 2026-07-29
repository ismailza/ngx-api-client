import { inject, Injectable } from '@angular/core';
import {
  ApiLoadingService,
  ApiRequestOptions,
  ApiService,
  isApiError,
} from '@ismailza/ngx-api-client';
import { Observable } from 'rxjs';
import { Order, OrderPage } from './models';

/** Typical consumer service: injects `ApiService` and calls every verb. */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiService);
  private readonly loadingService = inject(ApiLoadingService);

  /** Signal-based derived state — `computed()` output must stay assignable. */
  readonly busy: () => boolean = this.loadingService.loading;

  list(page: number, size: number): Observable<OrderPage> {
    return this.api.getPage<Order>('orders', page, size, { showLoader: true });
  }

  find(id: string): Observable<Order> {
    const options: ApiRequestOptions = {
      version: 2,
      prefix: false,
      retry: { maxRetries: 1, initialDelay: 100 },
      skipErrorHandler: true,
      params: { include: 'lines', expand: ['customer', 'address'] },
      headers: { 'X-Trace': 'fixture' },
    };
    return this.api.get<Order>(`orders/${id}`, options);
  }

  create(order: Omit<Order, 'id'>): Observable<Order> {
    return this.api.post<Order>('orders', order, { successMessage: 'Order created' });
  }

  replace(order: Order): Observable<Order> {
    return this.api.put<Order>(`orders/${order.id}`, order);
  }

  amend(id: string, patch: Partial<Order>): Observable<Order> {
    return this.api.patch<Order>(`orders/${id}`, patch);
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`orders/${id}`, { successMessage: false });
  }

  isKnownFailure(value: unknown): boolean {
    return isApiError(value) && value.status >= 400;
  }
}
