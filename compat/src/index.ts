/**
 * Consumer fixture for the Angular compatibility matrix.
 *
 * Type-checked with `ngc` and bundled with `ng build` against every Angular
 * major covered by the published package's `peerDependencies`. It deliberately
 * declares no components: standalone semantics changed between v17 and v19, and
 * the library ships no declarables, so DI, the public types and the
 * interceptors are the entire compatibility surface.
 */
export * from './handlers';
export * from './models';
export * from './providers';
export * from './services';
