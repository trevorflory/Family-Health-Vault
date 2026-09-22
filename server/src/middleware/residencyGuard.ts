import { DomainError, MONTREAL_REGION } from '@family-health-vault/shared';
import { assertMontrealResidency } from '@family-health-vault/shared';

export function residencyGuardMiddleware(regionHeader: string | undefined): void {
  const region = regionHeader?.trim() || MONTREAL_REGION;
  assertMontrealResidency(region);
}
