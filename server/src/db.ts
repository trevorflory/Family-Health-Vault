/**
 * In-memory store for tests / local fixture ingestion (no live Postgres required).
 */

import type {
  AccessAuditRow,
  AppointmentRecordRow,
  EhrConnectionRow,
  FacilityRow,
  MedicationRecordRow,
  PoaScopeRow,
  ResidentRow,
  TimelineEventRow,
  VitalRecordRow,
  WalletEntitlementRow,
} from './schema/tables';

export interface MedAdminLogRow {
  id: string;
  facility_id: string;
  resident_id: string;
  external_id: string;
  medication_name: string;
  result: string;
  administered_at: string;
  ingested_at: string;
}

export interface LtcMemoryDb {
  facilities: FacilityRow[];
  ehr_connections: EhrConnectionRow[];
  residents: ResidentRow[];
  poa_scopes: PoaScopeRow[];
  medication_records: MedicationRecordRow[];
  medication_administration_logs: MedAdminLogRow[];
  appointment_records: AppointmentRecordRow[];
  vital_records: VitalRecordRow[];
  resident_timeline_events: TimelineEventRow[];
  wallet_entitlements: WalletEntitlementRow[];
  access_audit: AccessAuditRow[];
}

export function createEmptyLtcMemoryDb(): LtcMemoryDb {
  return {
    facilities: [],
    ehr_connections: [],
    residents: [],
    poa_scopes: [],
    medication_records: [],
    medication_administration_logs: [],
    appointment_records: [],
    vital_records: [],
    resident_timeline_events: [],
    wallet_entitlements: [],
    access_audit: [],
  };
}

let singleton = createEmptyLtcMemoryDb();

export function getLtcMemoryDb(): LtcMemoryDb {
  return singleton;
}

export function resetLtcMemoryDb(): void {
  singleton = createEmptyLtcMemoryDb();
}
