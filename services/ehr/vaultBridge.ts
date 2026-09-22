/**
 * Bridge LTC EHR memory tables → local MedicalEvents (read-only provenance).
 * SaMD-safe educational import — caregiver still confirms before CONFIRMED.
 */

import type { LtcMemoryDb } from '../../server/src/db';
import type {
  MedicalEventRecord,
  OcrParsedPayload,
  SaveMedicalEventInput,
} from '../../types/db';
import { saveMedicalEvent } from '../../db/medicalEvents';

export const LTC_PCC_AUTHORITY_ID = 'ltc-pointclickcare';

export interface VaultBridgeResult {
  patientId: string;
  savedIds: string[];
  medicationCount: number;
  vitalCount: number;
  appointmentNoteCount: number;
}

function medExternalId(facilityId: string, externalId: string): string {
  return `ehr-ltc-med:${facilityId}:${externalId}`;
}

function vitalExternalId(facilityId: string, externalId: string): string {
  return `ehr-ltc-vital:${facilityId}:${externalId}`;
}

function apptExternalId(facilityId: string, externalId: string): string {
  return `ehr-ltc-appt:${facilityId}:${externalId}`;
}

/**
 * Upsert PRESCRIPTION / lab-style / schedule note events from an ingested LTC db.
 */
export async function syncLtcDbToVaultMedicalEvents(
  db: LtcMemoryDb,
  options: {
    /** Wallet patient id override (default: first resident.patient_id). */
    patientId?: string;
    status?: SaveMedicalEventInput['status'];
    now?: Date;
    saveMedicalEvent?: typeof saveMedicalEvent;
  } = {},
): Promise<VaultBridgeResult> {
  const saver = options.saveMedicalEvent ?? saveMedicalEvent;
  const resident = db.residents[0];
  if (!resident) {
    return {
      patientId: options.patientId ?? '',
      savedIds: [],
      medicationCount: 0,
      vitalCount: 0,
      appointmentNoteCount: 0,
    };
  }
  const patientId = options.patientId ?? resident.patient_id;
  const nowISO = (options.now ?? new Date()).toISOString();
  const status = options.status ?? 'PENDING_REVIEW';
  const savedIds: string[] = [];

  for (const med of db.medication_records.filter(
    (m) => m.resident_id === resident.id,
  )) {
    const parsed: OcrParsedPayload = {
      documentHint: 'prescription',
      labs: [],
      prescriptions: [
        {
          medicationName: med.medication_name,
          dosage: med.dosage ?? '',
          frequency: med.schedule ?? '',
          prescribingDoctor: 'Facility eMAR (read-only ingest)',
        },
      ],
      parserNotes: [
        'Imported from LTC EHR eMAR (read-only). Confirm before CONFIRMED.',
        'Zero staff workload — sourced from facility charting, not app entry.',
      ],
      sourceAuthorityId: LTC_PCC_AUTHORITY_ID,
      portalLabel: 'PointClickCare (fixture)',
    };
    const record = await saver({
      id: medExternalId(med.facility_id, med.external_id),
      patientId,
      kind: 'PRESCRIPTION',
      sourceUri: null,
      rawText: [
        med.medication_name,
        med.dosage ?? '',
        med.schedule ?? '',
        med.last_administered_at ?? '',
      ]
        .filter(Boolean)
        .join('\n'),
      parsed,
      status,
      sourceType: 'EHR_LTC',
      sourceAuthorityId: LTC_PCC_AUTHORITY_ID,
      externalId: med.external_id,
      lastSyncedAt: nowISO,
    });
    savedIds.push(record.id);
  }

  const vitalsForResident = db.vital_records.filter(
    (v) => v.resident_id === resident.id,
  );
  if (vitalsForResident.length > 0) {
    const labs = vitalsForResident.map((v) => ({
      testName: v.type,
      value: v.value,
      units: v.unit ?? '',
    }));
    const parsed: OcrParsedPayload = {
      documentHint: 'lab',
      labs,
      prescriptions: [],
      parserNotes: [
        'Point-of-care vitals mirrored from LTC EHR (educational context only).',
      ],
      sourceAuthorityId: LTC_PCC_AUTHORITY_ID,
      portalLabel: 'PointClickCare (fixture)',
    };
    const first = vitalsForResident[0]!;
    const record = await saver({
      id: vitalExternalId(first.facility_id, 'vitals-bundle'),
      patientId,
      kind: 'LAB_RESULT',
      sourceUri: null,
      rawText: labs.map((l) => `${l.testName}: ${l.value} ${l.units}`).join('\n'),
      parsed,
      status,
      sourceType: 'EHR_LTC',
      sourceAuthorityId: LTC_PCC_AUTHORITY_ID,
      externalId: 'vitals-bundle',
      lastSyncedAt: nowISO,
    });
    savedIds.push(record.id);
  }

  let appointmentNoteCount = 0;
  for (const appt of db.appointment_records.filter(
    (a) => a.resident_id === resident.id,
  )) {
    const parsed: OcrParsedPayload = {
      documentHint: 'unknown',
      labs: [],
      prescriptions: [],
      parserNotes: [
        `Facility schedule: ${appt.title}`,
        appt.provider ? `Provider: ${appt.provider}` : '',
        'Read-only calendar ingest from LTC EHR.',
      ].filter(Boolean),
      sourceAuthorityId: LTC_PCC_AUTHORITY_ID,
      portalLabel: 'PointClickCare (fixture)',
    };
    const record = await saver({
      id: apptExternalId(appt.facility_id, appt.external_id),
      patientId,
      kind: 'UNSTRUCTURED_DOC',
      sourceUri: null,
      rawText: `${appt.title} @ ${appt.start_time}`,
      parsed,
      status,
      sourceType: 'EHR_LTC',
      sourceAuthorityId: LTC_PCC_AUTHORITY_ID,
      externalId: appt.external_id,
      lastSyncedAt: nowISO,
    });
    savedIds.push(record.id);
    appointmentNoteCount += 1;
  }

  return {
    patientId,
    savedIds,
    medicationCount: db.medication_records.filter(
      (m) => m.resident_id === resident.id,
    ).length,
    vitalCount: vitalsForResident.length > 0 ? 1 : 0,
    appointmentNoteCount,
  };
}

export type { MedicalEventRecord };
