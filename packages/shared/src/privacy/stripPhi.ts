/**
 * Zero-PHI helpers for telemetry and structured logs.
 */

const PHI_KEYS = new Set([
  'name',
  'displayName',
  'display_name',
  'phn',
  'hin',
  'dob',
  'dateOfBirth',
  'date_of_birth',
  'note',
  'notes',
  'medication_name',
  'medicationName',
  'payload',
  'plaintext',
  'token',
  'token_ciphertext',
  'rawText',
  'transcript',
]);

/** Salted anonymous id — never reverse to a real account. */
export function hashUserId(
  userId: string,
  salt: string = 'fhv-telemetry-v1',
): string {
  let h = 2166136261;
  const input = `${salt}:${userId}`;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `u_${(h >>> 0).toString(16).padStart(8, '0')}`;
}

/** Deep-ish strip of known PHI keys; replaces values with '[REDACTED]'. */
export function stripPhi<T extends Record<string, unknown>>(
  input: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (PHI_KEYS.has(key) || /phn|hin|dob|ssn|password|secret/i.test(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = stripPhi(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        item && typeof item === 'object'
          ? stripPhi(item as Record<string, unknown>)
          : item,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}
