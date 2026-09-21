/**
 * Persist sandbox WALLET_PRO across web reloads (sessionStorage).
 * Native keeps in-memory for the process lifetime.
 */

import type { WalletPlan } from '@family-health-vault/shared';

let plan: WalletPlan = 'FREE_FEED';

export function loadWalletPlan(): WalletPlan {
  return plan;
}

export function saveWalletPlan(next: WalletPlan): void {
  plan = next;
}

export function __resetWalletPlanStoreForTests(): void {
  plan = 'FREE_FEED';
}
