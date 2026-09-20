/**
 * Canadian cloud residency — GCP Montreal is the only allowed sync target.
 */

import { DomainError } from './DomainError';

export const MONTREAL_REGION = 'northamerica-northeast1' as const;

export type AllowedCloudRegion = typeof MONTREAL_REGION;

export const LEGACY_REGIONS = ['ca-central-1'] as const;

export function assertMontrealResidency(
  region: string,
): asserts region is AllowedCloudRegion {
  if (region !== MONTREAL_REGION) {
    throw new DomainError(
      'RESIDENCY',
      `Cloud PHI must use ${MONTREAL_REGION} (GCP Montreal); got ${region}`,
      { region },
    );
  }
}

export function isAllowedCloudRegion(region: string): region is AllowedCloudRegion {
  return region === MONTREAL_REGION;
}
