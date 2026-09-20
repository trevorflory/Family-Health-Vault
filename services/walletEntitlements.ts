/**
 * Device entitlement + paywall helpers (sandbox WALLET_PRO for QA).
 */

import {
  DEMO_WALLET_PRO_ENTITLEMENT,
  assertWalletFeature,
  assertPlatform,
  type ClientPlatform,
  type WalletFeature,
  type WalletPlan,
} from '@family-health-vault/shared';

let currentPlan: WalletPlan = 'FREE_FEED';
let currentPlatforms: ClientPlatform[] = ['mobile'];

export function getDeviceWalletPlan(): WalletPlan {
  return currentPlan;
}

export function getDevicePlatforms(): readonly ClientPlatform[] {
  return currentPlatforms;
}

export function setDeviceWalletPlan(plan: WalletPlan): void {
  currentPlan = plan;
  currentPlatforms =
    plan === 'WALLET_PRO'
      ? [...DEMO_WALLET_PRO_ENTITLEMENT.platforms]
      : ['mobile'];
}

/** Enable full paid QA without Stripe. */
export function enableSandboxWalletPro(): typeof DEMO_WALLET_PRO_ENTITLEMENT {
  setDeviceWalletPlan('WALLET_PRO');
  return DEMO_WALLET_PRO_ENTITLEMENT;
}

export function resetDeviceWalletPlan(): void {
  currentPlan = 'FREE_FEED';
  currentPlatforms = ['mobile'];
}

export function guardPaidFeature(feature: WalletFeature): void {
  assertWalletFeature(currentPlan, feature);
}

export function guardPaidPlatform(platform: ClientPlatform): void {
  assertPlatform(currentPlan, platform);
}

export function isUpgradeFeature(feature: WalletFeature): boolean {
  try {
    assertWalletFeature('FREE_FEED', feature);
    return false;
  } catch {
    return true;
  }
}
