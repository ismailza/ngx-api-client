/**
 * Stable, machine-readable error codes returned by the backend.
 * Branch on `code`, never on `detail` (which is a localized, human-readable string).
 *
 * The union is left open (`string & {}`) since the backend may introduce new
 * codes at any time — this only documents the ones apps commonly branch on.
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'ENTITY_NOT_FOUND'
  | 'ACCESS_DENIED'
  | 'EXPIRED_TOKEN'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'INTERNAL_ERROR'
  | (string & NonNullable<unknown>);
