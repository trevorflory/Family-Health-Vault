/**
 * AES-256-GCM helpers for short-lived emergency pass payloads.
 * Uses Web Crypto (available in modern Node and Expo JS runtimes).
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function getCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c?.subtle) {
    throw new Error('Web Crypto API is required for AES-256 emergency pass encryption');
  }
  return c;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  // Node / Jest fallback without relying on Buffer typings
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Buffer: NodeBuffer } = require('buffer') as {
    Buffer: { from: (data: string, enc: string) => { toString: (enc: string) => string } };
  };
  return NodeBuffer.from(binary, 'binary').toString('base64');
}

function base64ToBytes(value: string): Uint8Array {
  let binary: string;
  if (typeof atob === 'function') {
    binary = atob(value);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Buffer: NodeBuffer } = require('buffer') as {
      Buffer: { from: (data: string, enc: string) => Uint8Array };
    };
    return new Uint8Array(NodeBuffer.from(value, 'base64'));
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/** Demo passphrase — override with EXPO_PUBLIC_EMERGENCY_PASS_KEY in real deployments. */
export const DEFAULT_EMERGENCY_PASS_SECRET =
  process.env.EXPO_PUBLIC_EMERGENCY_PASS_KEY ??
  'healthcare-app-demo-emergency-pass-key-v1';

export async function deriveAes256Key(
  secret: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const cryptoApi = getCrypto();
  const baseKey = await cryptoApi.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptAes256Gcm(
  plaintext: string,
  secret: string = DEFAULT_EMERGENCY_PASS_SECRET,
): Promise<string> {
  const cryptoApi = getCrypto();
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const key = await deriveAes256Key(secret, salt);
  const cipherBuf = await cryptoApi.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plaintext),
  );
  const cipher = new Uint8Array(cipherBuf);
  const packed = new Uint8Array(salt.length + iv.length + cipher.length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(cipher, salt.length + iv.length);
  return `EPv1.${bytesToBase64(packed)}`;
}

export async function decryptAes256Gcm(
  token: string,
  secret: string = DEFAULT_EMERGENCY_PASS_SECRET,
): Promise<string> {
  if (!token.startsWith('EPv1.')) {
    throw new Error('Unsupported emergency pass token format');
  }
  const packed = base64ToBytes(token.slice('EPv1.'.length));
  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const cipher = packed.slice(28);
  const key = await deriveAes256Key(secret, salt);
  const plainBuf = await getCrypto().subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipher,
  );
  return textDecoder.decode(plainBuf);
}
