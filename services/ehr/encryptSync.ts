/**
 * Consent-gated encrypt-before-sync for LTC / wallet envelopes.
 */

import {
  assertConsentGranted,
  MONTREAL_REGION,
  type ConsentRecord,
} from '@family-health-vault/shared';
import { encryptVaultField } from '../vaultCrypto';
import {
  createVaultSyncStub,
  type VaultSyncEnvelope,
} from '../sync/vaultSyncContract';
import { guardSyncRegion } from '../sync/residencyGuard';
import { requireConsent, listConsents } from '../../db/consentRegistry';

export async function buildEncryptedSyncEnvelope(input: {
  plaintextJson: string;
  keyId: string;
  consents?: readonly ConsentRecord[];
}): Promise<VaultSyncEnvelope> {
  const consents = input.consents ?? listConsents();
  assertConsentGranted(consents, 'CARE_HOME_SYNC');
  assertConsentGranted(consents, 'EHR_LTC_INGEST_DELIVERY');
  const region = guardSyncRegion(MONTREAL_REGION);
  const ciphertextBase64 = await encryptVaultField(input.plaintextJson);
  return {
    ciphertextBase64,
    region,
    payloadKind: 'E2EE_JSON',
    keyId: input.keyId,
    createdAtISO: new Date().toISOString(),
  };
}

export async function pushEncryptedIfConsented(
  envelope: VaultSyncEnvelope,
): Promise<{ accepted: boolean; reason: string }> {
  requireConsent('CARE_HOME_SYNC');
  guardSyncRegion(envelope.region);
  const stub = createVaultSyncStub(MONTREAL_REGION);
  const result = await stub.pushEncrypted(envelope);
  return { accepted: result.accepted, reason: result.reason };
}
