/**
 * Optional AES-256-GCM helpers for sensitive vault string columns (Phase C).
 * Reuses emergencyCrypto Web Crypto packing with a vault-specific demo key.
 */

import {
  decryptAes256Gcm,
  encryptAes256Gcm,
} from './emergencyCrypto';

export const DEFAULT_VAULT_SECRET =
  process.env.EXPO_PUBLIC_VAULT_CRYPTO_KEY ??
  'healthcare-app-demo-vault-crypto-key-v1';

/**
 * Encrypt a sensitive plaintext field for at-rest storage.
 * Does not replace full-DB encryption — use for PHN / high-sensitivity columns.
 */
export async function encryptVaultField(
  plaintext: string,
  secret: string = DEFAULT_VAULT_SECRET,
): Promise<string> {
  return encryptAes256Gcm(plaintext, secret);
}

export async function decryptVaultField(
  token: string,
  secret: string = DEFAULT_VAULT_SECRET,
): Promise<string> {
  return decryptAes256Gcm(token, secret);
}
