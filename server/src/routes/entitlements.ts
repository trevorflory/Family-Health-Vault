import { DEMO_WALLET_PRO_ENTITLEMENT } from '@family-health-vault/shared';
import type { LtcMemoryDb } from '../db';
import { activateDemoWalletPro, getOrCreateEntitlement } from './familyFeed';

export function getEntitlementRoute(
  db: LtcMemoryDb,
  familyAccountId: string,
  patientId: string,
) {
  return getOrCreateEntitlement(db, familyAccountId, patientId, false);
}

export function enableSandboxWalletProRoute(
  db: LtcMemoryDb,
  familyAccountId: string,
  patientId: string,
) {
  activateDemoWalletPro(db, familyAccountId, patientId);
  return {
    ...DEMO_WALLET_PRO_ENTITLEMENT,
    familyAccountId,
    patientId,
  };
}
