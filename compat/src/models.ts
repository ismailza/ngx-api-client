import { PaginatedResponse } from '@ismailza/ngx-api-client';

/** Domain type standing in for a consumer's own models. */
export interface Order {
  id: string;
  total: number;
}

/** The generic response wrapper must stay usable in a consumer's own aliases. */
export type OrderPage = PaginatedResponse<Order>;
