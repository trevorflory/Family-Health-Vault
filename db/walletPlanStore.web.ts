/**
 * Web: sessionStorage-backed WALLET_PRO so paywall survives Expo web reloads.
 */

import type { WalletPlan } from '@family-health-vault/shared';
import {
  clearSessionMap,
  loadSessionMap,
  persistSessionMap,
} from './webSessionMap';

const KEY = 'healthcare.web.walletPlan.v1';
const map = loadSessionMap<WalletPlan>(KEY);

export function loadWalletPlan(): WalletPlan {
  return map.get('plan') ?? 'FREE_FEED';
}

export function saveWalletPlan(next: WalletPlan): void {
  map.set('plan', next);
  persistSessionMap(KEY, map);
}

export function __resetWalletPlanStoreForTests(): void {
  map.clear();
  clearSessionMap(KEY);
}
