/**
 * Browser entry for the `ng build` leg of the matrix.
 *
 * The application builder tree-shakes aggressively: without a live reference the
 * library would be dropped from the bundle and the Angular linker would never
 * run over its partial declarations, making the build a vacuous check.
 */
import { appConfig, OrderService, publicTokens } from './index';

(globalThis as Record<string, unknown>)['__compatFixture'] = {
  appConfig,
  OrderService,
  publicTokens,
};
