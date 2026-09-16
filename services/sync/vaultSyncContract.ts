/**
 * Future zero-knowledge sync contract (Canadian residency).
 * No network I/O in this foundation — types + no-op stub only.
 */

export type CanadianSyncRegion =
  | 'ca-central-1'
  | 'northamerica-northeast1';

export type VaultSyncPayloadKind = 'E2EE_JSON';

export interface VaultSyncEnvelope {
  /** Opaque ciphertext — never plaintext PHI. */
  ciphertextBase64: string;
  /** Non-secret metadata for routing. */
  region: CanadianSyncRegion;
  payloadKind: VaultSyncPayloadKind;
  /** Device-held key id reference (not the key material). */
  keyId: string;
  createdAtISO: string;
}

export interface VaultSyncContract {
  readonly region: CanadianSyncRegion;
  /** Push ciphertext envelope to a future CA-resident node. */
  pushEncrypted(envelope: VaultSyncEnvelope): Promise<{ accepted: false; reason: string }>;
  /** Pull ciphertext only — decryption stays on-device. */
  pullEncrypted(keyId: string): Promise<VaultSyncEnvelope[]>;
}

/** Local stub — documents sovereignty intent without shipping network sync. */
export function createVaultSyncStub(
  region: CanadianSyncRegion = 'northamerica-northeast1',
): VaultSyncContract {
  return {
    region,
    async pushEncrypted() {
      return {
        accepted: false,
        reason:
          'Vault sync not implemented — local-first only; E2EE CA-region pipe is future work',
      };
    },
    async pullEncrypted() {
      return [];
    },
  };
}
