/**
 * Paywall navigation helper for FOI / SBAR / documents.
 */

import { DomainError } from '@family-health-vault/shared';
import {
  guardPaidFeature,
  getDeviceWalletPlan,
  isUpgradeFeature,
} from './walletEntitlements';
import type { WalletFeature } from '@family-health-vault/shared';

export type PaywallDecision =
  | { allowed: true }
  | { allowed: false; upgradeHref: '/family-feed/upgrade'; feature: WalletFeature };

export function decidePaywall(feature: WalletFeature): PaywallDecision {
  if (!isUpgradeFeature(feature)) {
    return { allowed: true };
  }
  try {
    guardPaidFeature(feature);
    return { allowed: true };
  } catch (e) {
    if (e instanceof DomainError && e.code === 'ENTITLEMENT') {
      return {
        allowed: false,
        upgradeHref: '/family-feed/upgrade',
        feature,
      };
    }
    throw e;
  }
}

export function paidHrefOrUpgrade(
  feature: WalletFeature,
  paidHref: string,
): string {
  const d = decidePaywall(feature);
  return d.allowed ? paidHref : d.upgradeHref;
}

export function currentPlanLabel(): string {
  return getDeviceWalletPlan();
}
