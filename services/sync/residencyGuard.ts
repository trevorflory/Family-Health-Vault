/**
 * Device + sync residency guard — fail closed unless Montreal.
 */

import {
  assertMontrealResidency,
  MONTREAL_REGION,
  type AllowedCloudRegion,
} from '@family-health-vault/shared';
import type { CanadianSyncRegion } from './vaultSyncContract';

export function guardSyncRegion(
  region: CanadianSyncRegion | string,
): AllowedCloudRegion {
  assertMontrealResidency(region);
  return MONTREAL_REGION;
}

export function resolveSyncBaseUrl(configuredUrl: string): string {
  const lower = configuredUrl.toLowerCase();
  const montrealHints = [
    'northamerica-northeast1',
    'montreal',
    '.ca-central', // disallow — not Montreal GCP
  ];
  if (lower.includes('ca-central-1') || lower.includes('us-') || lower.includes('europe-')) {
    assertMontrealResidency('forbidden-region');
  }
  if (
    !montrealHints.some((h) => h !== '.ca-central' && lower.includes(h)) &&
    configuredUrl.length > 0 &&
    !configuredUrl.includes('localhost') &&
    !configuredUrl.includes('127.0.0.1')
  ) {
    assertMontrealResidency('unknown-region');
  }
  return configuredUrl;
}

export { MONTREAL_REGION };
