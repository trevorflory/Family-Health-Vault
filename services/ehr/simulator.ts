/**
 * QA-only EHR ingest simulator helpers — feed the same normalizer as production.
 */

import type { EhrIngestEnvelope } from '@family-health-vault/shared';
import {
  getLtcMemoryDb,
  resetLtcMemoryDb,
} from '../../server/src/db';
import { ingestEnvelopes } from '../../server/src/ingestion/normalizer';
import { syncLtcDbToVaultMedicalEvents } from './vaultBridge';

const SEED_DAD_ID = 'pt-7801';
const FACILITY = 'pcc-facility-demo-01';
const RESIDENT = 'pcc-res-dad-78';

function nowISO(): string {
  return new Date().toISOString();
}

function envBase(
  resource_type: EhrIngestEnvelope['resource_type'],
  external_id: string,
  payload: Record<string, unknown>,
): EhrIngestEnvelope {
  return {
    vendor: 'POINTCLICKCARE',
    facility_external_id: FACILITY,
    resource_type,
    external_id,
    resident_external_id: RESIDENT,
    observed_at: nowISO(),
    payload,
  };
}

export function presetPrimaryPoaClinical(): EhrIngestEnvelope[] {
  return [
    envBase('CONTACT', 'sim-contact-primary', {
      contact_id: 'sim-contact-primary',
      family_account_id: '11111111-1111-4111-8111-111111111111',
      is_legal_poa: true,
      clinical_access_granted: true,
      delivery_enabled: true,
      raw_relationship: 'Primary Legal POA',
    }),
    envBase('MEDICATION', `sim-med-${Date.now()}`, {
      medication_name: 'Ramipril',
      dosage: '5 mg',
      schedule: 'daily morning',
      last_administered_at: nowISO(),
    }),
    envBase('MED_ADMIN', `sim-emar-${Date.now()}`, {
      medication_name: 'Ramipril',
      result: 'GIVEN',
      administered_at: nowISO(),
    }),
    envBase('APPOINTMENT', `sim-appt-${Date.now()}`, {
      title: 'Care conference',
      category: 'CARE_PLAN',
      start_time: new Date(Date.now() + 48 * 3600_000).toISOString(),
      provider: 'Care team',
    }),
    envBase('VITAL', `sim-vital-${Date.now()}`, {
      type: 'WEIGHT',
      value: '81.2',
      unit: 'kg',
      recorded_at: nowISO(),
    }),
  ];
}

export function presetSecondaryScheduleOnly(): EhrIngestEnvelope[] {
  return [
    envBase('CONTACT', 'sim-contact-secondary', {
      contact_id: 'sim-contact-secondary',
      family_account_id: '22222222-2222-4222-8222-222222222222',
      is_legal_poa: false,
      clinical_access_granted: false,
      delivery_enabled: true,
      raw_relationship: 'Secondary Family',
    }),
    envBase('APPOINTMENT', `sim-appt-sec-${Date.now()}`, {
      title: 'Family visit window',
      category: 'SCHEDULE',
      start_time: new Date(Date.now() + 24 * 3600_000).toISOString(),
      provider: 'Recreation',
    }),
  ];
}

export function presetDeliveryRevoked(): EhrIngestEnvelope[] {
  return [
    envBase('CONTACT', 'sim-contact-primary', {
      contact_id: 'sim-contact-primary',
      family_account_id: '11111111-1111-4111-8111-111111111111',
      is_legal_poa: true,
      clinical_access_granted: true,
      delivery_enabled: false,
      raw_relationship: 'Primary Legal POA (unsubscribed)',
    }),
  ];
}

export async function runSimulatorIngest(
  envelopes: EhrIngestEnvelope[],
  options?: { reset?: boolean; bridgeToVault?: boolean; patientId?: string },
): Promise<{ ingested: number; vaultSaved: number; residentId: string | null }> {
  if (options?.reset !== false) {
    resetLtcMemoryDb();
  }
  const db = getLtcMemoryDb();
  const { ingested } = ingestEnvelopes(db, envelopes);
  if (db.residents[0] && options?.patientId) {
    db.residents[0].patient_id = options.patientId;
  } else if (db.residents[0]) {
    db.residents[0].patient_id = SEED_DAD_ID;
  }
  let vaultSaved = 0;
  if (options?.bridgeToVault !== false) {
    const bridge = await syncLtcDbToVaultMedicalEvents(db, {
      patientId: options?.patientId ?? SEED_DAD_ID,
    });
    vaultSaved = bridge.savedIds.length;
  }
  return {
    ingested,
    vaultSaved,
    residentId: db.residents[0]?.id ?? null,
  };
}

export function buildCustomEnvelope(input: {
  resource_type: EhrIngestEnvelope['resource_type'];
  medication_name?: string;
  dosage?: string;
  schedule?: string;
  title?: string;
  vital_type?: string;
  vital_value?: string;
  vital_unit?: string;
  is_legal_poa?: boolean;
  clinical_access_granted?: boolean;
  delivery_enabled?: boolean;
  family_account_id?: string;
}): EhrIngestEnvelope {
  const id = `custom-${Date.now()}`;
  switch (input.resource_type) {
    case 'MEDICATION':
      return envBase('MEDICATION', id, {
        medication_name: input.medication_name ?? 'Custom med',
        dosage: input.dosage ?? '',
        schedule: input.schedule ?? '',
        last_administered_at: nowISO(),
      });
    case 'MED_ADMIN':
      return envBase('MED_ADMIN', id, {
        medication_name: input.medication_name ?? 'Custom med',
        result: 'GIVEN',
        administered_at: nowISO(),
      });
    case 'APPOINTMENT':
      return envBase('APPOINTMENT', id, {
        title: input.title ?? 'Custom appointment',
        category: 'CARE',
        start_time: new Date(Date.now() + 36 * 3600_000).toISOString(),
        provider: 'Simulator',
      });
    case 'VITAL':
      return envBase('VITAL', id, {
        type: input.vital_type ?? 'BP_SYS',
        value: input.vital_value ?? '120',
        unit: input.vital_unit ?? 'mm[Hg]',
        recorded_at: nowISO(),
      });
    case 'CONTACT':
    default:
      return envBase('CONTACT', id, {
        contact_id: id,
        family_account_id:
          input.family_account_id ??
          '11111111-1111-4111-8111-111111111111',
        is_legal_poa: input.is_legal_poa ?? true,
        clinical_access_granted: input.clinical_access_granted ?? true,
        delivery_enabled: input.delivery_enabled ?? true,
        raw_relationship: 'Simulator contact',
      });
  }
}
