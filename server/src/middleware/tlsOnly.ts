import { DomainError } from '@family-health-vault/shared';

/** Fail closed unless TLS 1.3 (or local/dev bypass). */
export function tlsOnlyMiddleware(input: {
  protocol?: string;
  tlsVersion?: string;
  allowLocalhost?: boolean;
  host?: string;
}): void {
  const host = input.host ?? '';
  if (
    input.allowLocalhost &&
    (host.includes('localhost') || host.includes('127.0.0.1'))
  ) {
    return;
  }
  if (input.protocol !== 'https:') {
    throw new DomainError('TLS', 'TLS 1.3 required for PHI transport', {
      protocol: input.protocol,
    });
  }
  if (input.tlsVersion && !input.tlsVersion.includes('1.3')) {
    throw new DomainError('TLS', 'TLS 1.3 required for PHI transport', {
      tlsVersion: input.tlsVersion,
    });
  }
}
