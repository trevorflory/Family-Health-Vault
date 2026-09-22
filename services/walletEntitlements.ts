/**
 * Device entitlement + paywall helpers (sandbox WALLET_PRO for QA).
 * Hydrates from walletPlanStore so web reloads keep PRO on.
 */

import {
  DEMO_WALLET_PRO_ENTITLEMENT,
  assertWalletFeature,
  assertPlatform,
  type ClientPlatform,
  type WalletFeature,
  type WalletPlan,
} from '@family-health-vault/shared';
import {
  loadWalletPlan,
  saveWalletPlan,
  __resetWalletPlanStoreForTests,
} from '../db/walletPlanStore';

function platformsFor(plan: WalletPlan): ClientPlatform[] {
  return plan === 'WALLET_PRO'
    ? [...DEMO_WALLET_PRO_ENTITLEMENT.platforms]
    : ['mobile'];
}

let currentPlan: WalletPlan = loadWalletPlan();
let currentPlatforms: ClientPlatform[] = platformsFor(currentPlan);

export function getDeviceWalletPlan(): WalletPlan {
  currentPlan = loadWalletPlan();
  currentPlatforms = platformsFor(currentPlan);
  return currentPlan;
}

export function getDevicePlatforms(): readonly ClientPlatform[] {
  getDeviceWalletPlan();
  return currentPlatforms;
}

export function setDeviceWalletPlan(plan: WalletPlan): void {
  currentPlan = plan;
  currentPlatforms = platformsFor(plan);
  saveWalletPlan(plan);
}

/** Enable full paid QA without Stripe. */
export function enableSandboxWalletPro(): typeof DEMO_WALLET_PRO_ENTITLEMENT {
  setDeviceWalletPlan('WALLET_PRO');
  return DEMO_WALLET_PRO_ENTITLEMENT;
}

export function disableSandboxWalletPro(): void {
  setDeviceWalletPlan('FREE_FEED');
}

export function resetDeviceWalletPlan(): void {
  __resetWalletPlanStoreForTests();
  currentPlan = 'FREE_FEED';
  currentPlatforms = ['mobile'];
}

export function guardPaidFeature(feature: WalletFeature): void {
  assertWalletFeature(getDeviceWalletPlan(), feature);
}

export function guardPaidPlatform(platform: ClientPlatform): void {
  assertPlatform(getDeviceWalletPlan(), platform);
}

export function isUpgradeFeature(feature: WalletFeature): boolean {
  try {
    assertWalletFeature('FREE_FEED', feature);
    return false;
  } catch {
    return true;
  }
}
