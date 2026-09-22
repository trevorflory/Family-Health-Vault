/**
 * Read-only EHR connector boundary — never write back to custodian systems.
 */

import { DomainError, type EhrVendor } from '@family-health-vault/shared';

export interface EhrAuthResult {
  ok: boolean;
  message: string;
  /** Encrypted at rest; never log. */
  tokenCiphertext?: string;
}

export interface EhrPullResult {
  envelopes: import('@family-health-vault/shared').EhrIngestEnvelope[];
}

export interface ReadOnlyEhrConnector {
  readonly vendor: EhrVendor;
  readonly readiness: 'FIXTURE' | 'SANDBOX' | 'NOT_LIVE' | 'MARKETPLACE';
  /** Facility marketplace OAuth/SAML — not a floor-nurse login. */
  authenticateFacility(externalFacilityId: string): Promise<EhrAuthResult>;
  /** Read-only pull of clinical + contact resources. */
  pullResources(externalFacilityId: string): Promise<EhrPullResult>;
  /** Hard deny write-back. */
  writeBack(): never;
}

export function denyWriteBack(vendor: EhrVendor): never {
  throw new DomainError(
    'EHR_READONLY',
    `${vendor} connector is read-only — write-back is prohibited`,
    { vendor },
  );
}
