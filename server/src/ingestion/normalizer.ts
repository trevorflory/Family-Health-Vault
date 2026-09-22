/**
 * EHR payload → vault tables. Read-only ingestion only.
 */

import {
  AppointmentRecordSchema,
  DomainError,
  EhrIngestEnvelopeSchema,
  MedicationRecordSchema,
  POAScopeSchema,
  VitalRecordSchema,
  type EhrIngestEnvelope,
} from '@family-health-vault/shared';
import type { LtcMemoryDb } from '../db';
import type { EhrVendor } from '../schema/tables';

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

export function ensureFacilityResident(
  db: LtcMemoryDb,
  input: {
    facilityExternalId: string;
    residentExternalId: string;
    vendor: EhrVendor;
    patientId?: string;
  },
): { facilityId: string; residentId: string } {
  const existingConn = db.ehr_connections.find(
    (c) => c.external_facility_id === input.facilityExternalId,
  );
  let facility = existingConn
    ? db.facilities.find((f) => f.id === existingConn.facility_id)
    : db.facilities.find((f) => f.name === input.facilityExternalId);
  if (!facility) {
    facility = {
      id: `fac-${db.facilities.length + 1}`,
      tenant_id: `tenant-${db.facilities.length + 1}`,
      name: input.facilityExternalId,
      jurisdiction: 'ON',
      created_at: new Date().toISOString(),
    };
    db.facilities.push(facility);
    db.ehr_connections.push({
      id: `ehr-${db.ehr_connections.length + 1}`,
      facility_id: facility.id,
      vendor: input.vendor,
      status: 'ACTIVE',
      token_ciphertext: 'enc:demo',
      external_facility_id: input.facilityExternalId,
      last_sync_at: new Date().toISOString(),
    });
  } else if (
    !db.ehr_connections.some(
      (c) =>
        c.facility_id === facility!.id &&
        c.external_facility_id === input.facilityExternalId,
    )
  ) {
    db.ehr_connections.push({
      id: `ehr-${db.ehr_connections.length + 1}`,
      facility_id: facility.id,
      vendor: input.vendor,
      status: 'ACTIVE',
      token_ciphertext: 'enc:demo',
      external_facility_id: input.facilityExternalId,
      last_sync_at: new Date().toISOString(),
    });
  }
  let resident = db.residents.find(
    (r) =>
      r.facility_id === facility!.id &&
      r.external_resident_id === input.residentExternalId,
  );
  if (!resident) {
    resident = {
      id: `res-${db.residents.length + 1}`,
      facility_id: facility.id,
      patient_id:
        input.patientId ?? 'pt-7801',
      external_resident_id: input.residentExternalId,
      display_name_ciphertext: 'enc:resident',
      status: 'ACTIVE',
    };
    db.residents.push(resident);
  }
  return { facilityId: facility.id, residentId: resident.id };
}

export function normalizeAndUpsert(
  db: LtcMemoryDb,
  raw: unknown,
): { ok: true; resource_type: string } {
  const parsed = EhrIngestEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DomainError('VALIDATION', 'Invalid EHR ingest envelope', {
      issues: parsed.error.issues.map((i) => i.message),
    });
  }
  const env: EhrIngestEnvelope = parsed.data;
  const { facilityId, residentId } = ensureFacilityResident(db, {
    facilityExternalId: env.facility_external_id,
    residentExternalId: env.resident_external_id,
    vendor: env.vendor,
  });
  const p = env.payload;

  switch (env.resource_type) {
    case 'CONTACT': {
      const scope = POAScopeSchema.parse({
        contact_id: str(p.contact_id) ?? env.external_id,
        resident_id: residentId,
        is_legal_poa: bool(p.is_legal_poa, false),
        clinical_access_granted: bool(p.clinical_access_granted, false),
        delivery_enabled: bool(p.delivery_enabled, true),
        family_account_id: str(p.family_account_id),
        raw_relationship: str(p.raw_relationship),
      });
      const existing = db.poa_scopes.findIndex(
        (s) =>
          s.facility_id === facilityId &&
          s.resident_id === residentId &&
          s.contact_id === scope.contact_id,
      );
      const row = {
        id: existing >= 0 ? db.poa_scopes[existing].id : `poa-${db.poa_scopes.length + 1}`,
        facility_id: facilityId,
        resident_id: residentId,
        contact_id: scope.contact_id,
        family_account_id: scope.family_account_id ?? null,
        is_legal_poa: scope.is_legal_poa,
        clinical_access_granted: scope.clinical_access_granted,
        delivery_enabled: scope.delivery_enabled,
        raw_relationship: scope.raw_relationship ?? null,
        synced_at: new Date().toISOString(),
      };
      if (existing >= 0) db.poa_scopes[existing] = row;
      else db.poa_scopes.push(row);
      break;
    }
    case 'MEDICATION': {
      const med = MedicationRecordSchema.parse({
        id: env.external_id,
        resident_id: residentId,
        medication_name: str(p.medication_name) ?? 'Unknown',
        dosage: str(p.dosage),
        schedule: str(p.schedule),
        last_administered_at: str(p.last_administered_at),
      });
      const idx = db.medication_records.findIndex(
        (m) => m.facility_id === facilityId && m.external_id === env.external_id,
      );
      const row = {
        id: idx >= 0 ? db.medication_records[idx].id : `med-${db.medication_records.length + 1}`,
        facility_id: facilityId,
        resident_id: residentId,
        external_id: env.external_id,
        medication_name: med.medication_name,
        dosage: med.dosage ?? null,
        schedule: med.schedule ?? null,
        last_administered_at: med.last_administered_at ?? null,
        source_vendor: env.vendor,
      };
      if (idx >= 0) db.medication_records[idx] = row;
      else db.medication_records.push(row);
      db.resident_timeline_events.push({
        id: `tl-${db.resident_timeline_events.length + 1}`,
        facility_id: facilityId,
        resident_id: residentId,
        event_type: 'MEDICATION',
        summary_non_phi: 'Medication list updated from facility eMAR',
        payload_ciphertext: null,
        occurred_at: env.observed_at,
      });
      break;
    }
    case 'MED_ADMIN': {
      db.medication_administration_logs.push({
        id: `mal-${db.medication_administration_logs.length + 1}`,
        facility_id: facilityId,
        resident_id: residentId,
        external_id: env.external_id,
        medication_name: str(p.medication_name) ?? 'Unknown',
        result: str(p.result) ?? 'GIVEN',
        administered_at: str(p.administered_at) ?? env.observed_at,
        ingested_at: new Date().toISOString(),
      });
      db.resident_timeline_events.push({
        id: `tl-${db.resident_timeline_events.length + 1}`,
        facility_id: facilityId,
        resident_id: residentId,
        event_type: 'MED_ADMIN',
        summary_non_phi: 'Medication administration recorded in facility eMAR',
        payload_ciphertext: null,
        occurred_at: str(p.administered_at) ?? env.observed_at,
      });
      break;
    }
    case 'APPOINTMENT': {
      const appt = AppointmentRecordSchema.parse({
        id: env.external_id,
        resident_id: residentId,
        title: str(p.title) ?? 'Appointment',
        category: str(p.category),
        start_time: str(p.start_time) ?? env.observed_at,
        end_time: str(p.end_time),
        provider: str(p.provider),
      });
      db.appointment_records.push({
        id: `appt-${db.appointment_records.length + 1}`,
        facility_id: facilityId,
        resident_id: residentId,
        external_id: env.external_id,
        title: appt.title,
        category: appt.category ?? null,
        start_time: appt.start_time,
        end_time: appt.end_time ?? null,
        provider: appt.provider ?? null,
      });
      db.resident_timeline_events.push({
        id: `tl-${db.resident_timeline_events.length + 1}`,
        facility_id: facilityId,
        resident_id: residentId,
        event_type: 'APPOINTMENT',
        summary_non_phi: 'Facility schedule event added',
        payload_ciphertext: null,
        occurred_at: appt.start_time,
      });
      break;
    }
    case 'VITAL': {
      const vital = VitalRecordSchema.parse({
        id: env.external_id,
        resident_id: residentId,
        type: str(p.type) ?? 'UNKNOWN',
        value: str(p.value) ?? '',
        unit: str(p.unit),
        recorded_at: str(p.recorded_at) ?? env.observed_at,
      });
      db.vital_records.push({
        id: `vit-${db.vital_records.length + 1}`,
        facility_id: facilityId,
        resident_id: residentId,
        external_id: env.external_id,
        type: vital.type,
        value: vital.value,
        unit: vital.unit ?? null,
        recorded_at: vital.recorded_at,
      });
      db.resident_timeline_events.push({
        id: `tl-${db.resident_timeline_events.length + 1}`,
        facility_id: facilityId,
        resident_id: residentId,
        event_type: 'VITAL',
        summary_non_phi: 'Vital signs charted at point of care',
        payload_ciphertext: null,
        occurred_at: vital.recorded_at,
      });
      break;
    }
    default:
      throw new DomainError('VALIDATION', `Unknown resource_type`);
  }

  return { ok: true, resource_type: env.resource_type };
}

export function ingestEnvelopes(
  db: LtcMemoryDb,
  envelopes: readonly unknown[],
): { ingested: number } {
  let ingested = 0;
  for (const env of envelopes) {
    normalizeAndUpsert(db, env);
    ingested += 1;
  }
  return { ingested };
}
