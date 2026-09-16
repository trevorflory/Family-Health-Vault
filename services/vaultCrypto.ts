/**
 * Optional AES-256-GCM helpers for sensitive vault string columns (Phase C).
 * Reuses emergencyCrypto Web Crypto packing with a vault-specific key.
 */

import {
  decryptAes256Gcm,
  encryptAes256Gcm,
} from './emergencyCrypto';

/** Built-in demo key — never use in real deployments. */
export const DEMO_VAULT_CRYPTO_KEY =
  'healthcare-app-demo-vault-crypto-key-v1';

export const DEFAULT_VAULT_SECRET =
  process.env.EXPO_PUBLIC_VAULT_CRYPTO_KEY ?? DEMO_VAULT_CRYPTO_KEY;

export function isDemoVaultCryptoKey(
  secret: string = DEFAULT_VAULT_SECRET,
): boolean {
  return secret === DEMO_VAULT_CRYPTO_KEY || !secret.trim();
}

/**
 * Returns whether a deployment-grade vault key is configured.
 * Does not log the key material.
 */
export function getVaultCryptoStatus(secret: string = DEFAULT_VAULT_SECRET): {
  configured: boolean;
  usingDemoKey: boolean;
  message: string;
} {
  const usingDemoKey = isDemoVaultCryptoKey(secret);
  const tooShort = secret.trim().length < 32;
  if (usingDemoKey) {
    return {
      configured: false,
      usingDemoKey: true,
      message:
        'Using built-in demo vault key. Set EXPO_PUBLIC_VAULT_CRYPTO_KEY (≥32 chars) for real deployments.',
    };
  }
  if (tooShort) {
    return {
      configured: false,
      usingDemoKey: false,
      message:
        'EXPO_PUBLIC_VAULT_CRYPTO_KEY is too short — use ≥32 characters.',
    };
  }
  return {
    configured: true,
    usingDemoKey: false,
    message: 'Vault field crypto key is configured.',
  };
}

/**
 * Encrypt a sensitive plaintext field for at-rest storage.
 * Does not replace full-DB encryption — use for PHN / high-sensitivity columns.
 * Never log plaintext or decrypted payloads.
 */
export async function encryptVaultField(
  plaintext: string,
  secret: string = DEFAULT_VAULT_SECRET,
): Promise<string> {
  if (!plaintext) {
    throw new Error('encryptVaultField requires non-empty plaintext');
  }
  return encryptAes256Gcm(plaintext, secret);
}

export async function decryptVaultField(
  token: string,
  secret: string = DEFAULT_VAULT_SECRET,
): Promise<string> {
  if (!token) {
    throw new Error('decryptVaultField requires a ciphertext token');
  }
  return decryptAes256Gcm(token, secret);
}
