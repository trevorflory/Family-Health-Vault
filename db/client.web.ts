/**
 * Web stub for the shared healthcare DB client.
 * Platform-specific modules (`*.web.ts`) should avoid importing this;
 * it exists so accidental imports do not pull expo-sqlite WASM.
 */
export async function getHealthcareDb(): Promise<never> {
  throw new Error(
    'SQLite is unavailable on web. Use db/*.web.ts memory repositories.',
  );
}

export function __resetHealthcareDbForTests(): void {
  // no-op
}
