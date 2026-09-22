/**
 * Drizzle-oriented table mirrors (SQL migrations remain source of truth).
 * Lightweight types for the Node ingestion layer without requiring a live DB.
 */

export type EhrVendor = 'POINTCLICKCARE' | 'MEDITECH_EXPANSE' | 'YARDI_LTC';

export interface FacilityRow {
  id: string;
  tenant_id: string;
  name: string;
  jurisdiction: string;
  created_at: string;
}

export interface EhrConnectionRow {
  id: string;
  facility_id: string;
  vendor: EhrVendor;
  status: 'PENDING' | 'ACTIVE' | 'REVOKED' | 'ERROR';
  token_ciphertext: string | null;
  external_facility_id: string | null;
  last_sync_at: string | null;
}

export interface ResidentRow {
  id: string;
  facility_id: string;
  patient_id: string;
  external_resident_id: string;
  display_name_ciphertext: string;
  status: 'ACTIVE' | 'DISCHARGED';
}

export interface PoaScopeRow {
  id: string;
  facility_id: string;
  resident_id: string;
  contact_id: string;
  family_account_id: string | null;
  is_legal_poa: boolean;
  clinical_access_granted: boolean;
  delivery_enabled: boolean;
  raw_relationship: string | null;
  synced_at: string;
}

export interface MedicationRecordRow {
  id: string;
  facility_id: string;
  resident_id: string;
  external_id: string;
  medication_name: string;
  dosage: string | null;
  schedule: string | null;
  last_administered_at: string | null;
  source_vendor: EhrVendor;
}

export interface AppointmentRecordRow {
  id: string;
  facility_id: string;
  resident_id: string;
  external_id: string;
  title: string;
  category: string | null;
  start_time: string;
  end_time: string | null;
  provider: string | null;
}

export interface VitalRecordRow {
  id: string;
  facility_id: string;
  resident_id: string;
  external_id: string;
  type: string;
  value: string;
  unit: string | null;
  recorded_at: string;
}

export interface TimelineEventRow {
  id: string;
  facility_id: string;
  resident_id: string;
  event_type: string;
  summary_non_phi: string;
  payload_ciphertext: string | null;
  occurred_at: string;
}

export interface WalletEntitlementRow {
  id: string;
  family_account_id: string;
  patient_id: string;
  plan: 'FREE_FEED' | 'WALLET_PRO';
  platforms: string[];
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
}

export interface AccessAuditRow {
  id: string;
  family_account_id: string | null;
  resident_id: string | null;
  action: string;
  permitted: boolean;
  at: string;
}

export const TABLE_NAMES = [
  'facilities',
  'ehr_connections',
  'residents',
  'poa_scopes',
  'medication_records',
  'medication_administration_logs',
  'appointment_records',
  'vital_records',
  'resident_timeline_events',
  'wallet_entitlements',
  'access_audit',
] as const;
