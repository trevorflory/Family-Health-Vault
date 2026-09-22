/**
 * Local vitals for full-test mode (CareObservations + optional MedicalEvent).
 */

import type { CareObservation } from '../types/careObservation';
import { saveObservation, listObservationsForPatient } from './careObservations';
import { saveMedicalEvent } from './medicalEvents';
import type { OcrParsedPayload } from '../types/db';

export type LocalVitalType = 'BP_SYS' | 'BP_DIA' | 'WEIGHT' | 'GLUCOSE' | 'HR';

const LOINC: Record<LocalVitalType, { loinc?: string; unit: string; category: CareObservation['category'] }> = {
  BP_SYS: { loinc: '8480-6', unit: 'mm[Hg]', category: 'VITALS' },
  BP_DIA: { loinc: '8462-4', unit: 'mm[Hg]', category: 'VITALS' },
  WEIGHT: { loinc: '29463-7', unit: 'kg', category: 'WEIGHT' },
  GLUCOSE: { loinc: '2339-0', unit: 'mmol/L', category: 'VITALS' },
  HR: { loinc: '8867-4', unit: '/min', category: 'VITALS' },
};

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function addLocalVital(input: {
  patientId: string;
  type: LocalVitalType;
  value: number;
  recordedAtISO?: string;
  alsoMedicalEvent?: boolean;
}): Promise<{ observation: CareObservation; eventId?: string }> {
  const meta = LOINC[input.type];
  const at = input.recordedAtISO ?? new Date().toISOString();
  const observation: CareObservation = {
    id: newId('obs'),
    patientId: input.patientId,
    performerId: 'local-caregiver',
    effectiveDateTimeISO: at,
    category: meta.category,
    loincCode: meta.loinc,
    display: input.type,
    numericValue: input.value,
    unit: meta.unit,
    source: 'MANUAL',
    status: 'CONFIRMED',
    dataResidency: 'DEVICE',
    createdAt: Date.now(),
  };
  await saveObservation(observation);

  let eventId: string | undefined;
  if (input.alsoMedicalEvent !== false) {
    const parsed: OcrParsedPayload = {
      documentHint: 'lab',
      labs: [
        {
          testName: input.type,
          value: String(input.value),
          units: meta.unit,
          loinc: meta.loinc,
        },
      ],
      prescriptions: [],
      parserNotes: [
        'Local full-test vital entry (caregiver-entered). Educational context only.',
      ],
    };
    const record = await saveMedicalEvent({
      id: newId('me_vital'),
      patientId: input.patientId,
      kind: 'LAB_RESULT',
      rawText: `${input.type}: ${input.value} ${meta.unit} @ ${at}`,
      parsed,
      status: 'CONFIRMED',
      sourceType: 'MANUAL',
      lastSyncedAt: at,
    });
    eventId = record.id;
  }

  return { observation, eventId };
}

export async function listLocalVitals(
  patientId: string,
): Promise<CareObservation[]> {
  const rows = await listObservationsForPatient(patientId);
  return rows.filter((r) => r.category === 'VITALS' || r.category === 'WEIGHT');
}
