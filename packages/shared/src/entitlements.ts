/**
 * Freemium vs WALLET_PRO (~$20/mo) — unlocks mobile + website + desktop.
 */

import { DomainError } from './DomainError';

export type WalletPlan = 'FREE_FEED' | 'WALLET_PRO';

export type ClientPlatform = 'mobile' | 'web' | 'desktop';

export type WalletFeature =
  | 'FAMILY_TIMELINE_SUMMARY'
  | 'CLINICAL_MEDS'
  | 'CLINICAL_VITALS'
  | 'DOCUMENTS'
  | 'FOI'
  | 'SBAR_EXPORT'
  | 'FULL_CHART';

const FREE_FEATURES: readonly WalletFeature[] = ['FAMILY_TIMELINE_SUMMARY'];

const PRO_FEATURES: readonly WalletFeature[] = [
  'FAMILY_TIMELINE_SUMMARY',
  'CLINICAL_MEDS',
  'CLINICAL_VITALS',
  'DOCUMENTS',
  'FOI',
  'SBAR_EXPORT',
  'FULL_CHART',
];

export const WALLET_PRO_PLATFORMS: readonly ClientPlatform[] = [
  'mobile',
  'web',
  'desktop',
];

/** Canonical post-2022 phone viewports for paid QA on desktop/web. */
export const PHONE_VIEWPORTS_2022 = {
  iphoneStandard: { width: 390, height: 844, label: 'iPhone 14/15 class' },
  iphoneMax: { width: 430, height: 932, label: 'iPhone Plus/Pro Max class' },
  androidLarge: { width: 412, height: 915, label: 'Large Android' },
} as const;

export function platformsForPlan(plan: WalletPlan): readonly ClientPlatform[] {
  return plan === 'WALLET_PRO' ? WALLET_PRO_PLATFORMS : ['mobile'];
}

export function featuresForPlan(plan: WalletPlan): readonly WalletFeature[] {
  return plan === 'WALLET_PRO' ? PRO_FEATURES : FREE_FEATURES;
}

export function assertWalletFeature(plan: WalletPlan, feature: WalletFeature): void {
  if (!featuresForPlan(plan).includes(feature)) {
    throw new DomainError(
      'ENTITLEMENT',
      `Feature ${feature} requires WALLET_PRO ($20/mo multi-platform)`,
      { plan, feature },
    );
  }
}

export function assertPlatform(plan: WalletPlan, platform: ClientPlatform): void {
  if (!platformsForPlan(plan).includes(platform)) {
    throw new DomainError(
      'ENTITLEMENT',
      `Platform ${platform} requires WALLET_PRO`,
      { plan, platform },
    );
  }
}

/** Sandbox / QA — full paid access without Stripe. */
export const DEMO_WALLET_PRO_ENTITLEMENT = {
  plan: 'WALLET_PRO' as const,
  platforms: [...WALLET_PRO_PLATFORMS],
  status: 'ACTIVE' as const,
  source: 'SANDBOX_DEMO' as const,
};
