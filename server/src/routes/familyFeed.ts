import {
  DEMO_WALLET_PRO_ENTITLEMENT,
  DomainError,
  type WalletPlan,
} from '@family-health-vault/shared';
import type { LtcMemoryDb } from '../db';
import {
  appendAccessAudit,
  assertFamilyCanReadClinical,
  assertFamilyCanReadSchedule,
  resolveFamilyAccessLevel,
} from '../rls/familyAccess';

export interface FamilyFeedResult {
  residentId: string;
  accessLevel: 'SCHEDULE_ONLY' | 'CLINICAL';
  timeline: Array<{
    id: string;
    event_type: string;
    summary_non_phi: string;
    occurred_at: string;
  }>;
  appointments: LtcMemoryDb['appointment_records'];
  medications: LtcMemoryDb['medication_records'];
  vitals: LtcMemoryDb['vital_records'];
}

export function getFamilyFeed(
  db: LtcMemoryDb,
  familyAccountId: string,
  residentId: string,
): FamilyFeedResult {
  const level = resolveFamilyAccessLevel(
    db.poa_scopes,
    familyAccountId,
    residentId,
  );
  if (level === 'NONE') {
    appendAccessAudit(db, {
      family_account_id: familyAccountId,
      resident_id: residentId,
      action: 'READ_FAMILY_FEED',
      permitted: false,
    });
    throw new DomainError('UNAUTHORIZED', 'No delivery-enabled POA scope');
  }

  assertFamilyCanReadSchedule(db, familyAccountId, residentId);
  appendAccessAudit(db, {
    family_account_id: familyAccountId,
    resident_id: residentId,
    action: 'READ_FAMILY_FEED',
    permitted: true,
  });

  const appointments = db.appointment_records.filter(
    (a) => a.resident_id === residentId,
  );
  let medications: LtcMemoryDb['medication_records'] = [];
  let vitals: LtcMemoryDb['vital_records'] = [];
  let timeline = db.resident_timeline_events
    .filter((e) => e.resident_id === residentId)
    .filter(
      (e) =>
        level === 'CLINICAL' ||
        e.event_type === 'APPOINTMENT' ||
        e.event_type === 'NOTE_FAMILY' ||
        e.event_type === 'SCHEDULE',
    )
    .map((e) => ({
      id: e.id,
      event_type: e.event_type,
      summary_non_phi: e.summary_non_phi,
      occurred_at: e.occurred_at,
    }));

  if (level === 'CLINICAL') {
    try {
      assertFamilyCanReadClinical(db, familyAccountId, residentId);
      medications = db.medication_records.filter(
        (m) => m.resident_id === residentId,
      );
      vitals = db.vital_records.filter((v) => v.resident_id === residentId);
      appendAccessAudit(db, {
        family_account_id: familyAccountId,
        resident_id: residentId,
        action: 'READ_CLINICAL',
        permitted: true,
      });
    } catch {
      appendAccessAudit(db, {
        family_account_id: familyAccountId,
        resident_id: residentId,
        action: 'READ_CLINICAL',
        permitted: false,
      });
    }
  }

  return {
    residentId,
    accessLevel: level,
    timeline,
    appointments,
    medications,
    vitals,
  };
}

export function getOrCreateEntitlement(
  db: LtcMemoryDb,
  familyAccountId: string,
  patientId: string,
  preferDemoPro = false,
): { plan: WalletPlan; platforms: string[] } {
  let row = db.wallet_entitlements.find(
    (e) =>
      e.family_account_id === familyAccountId && e.patient_id === patientId,
  );
  if (!row && preferDemoPro) {
    row = {
      id: `ent-${db.wallet_entitlements.length + 1}`,
      family_account_id: familyAccountId,
      patient_id: patientId,
      plan: DEMO_WALLET_PRO_ENTITLEMENT.plan,
      platforms: [...DEMO_WALLET_PRO_ENTITLEMENT.platforms],
      status: 'ACTIVE',
    };
    db.wallet_entitlements.push(row);
  }
  if (!row) {
    return { plan: 'FREE_FEED', platforms: ['mobile'] };
  }
  return { plan: row.plan, platforms: row.platforms };
}

export function activateDemoWalletPro(
  db: LtcMemoryDb,
  familyAccountId: string,
  patientId: string,
): void {
  getOrCreateEntitlement(db, familyAccountId, patientId, true);
}
