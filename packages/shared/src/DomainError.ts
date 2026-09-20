/**
 * Domain errors — fail fast at system boundaries with actionable codes.
 */

export type DomainErrorCode =
  | 'VALIDATION'
  | 'RESIDENCY'
  | 'CONSENT'
  | 'ENTITLEMENT'
  | 'POA_SCOPE'
  | 'EHR_READONLY'
  | 'TLS'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: DomainErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}
