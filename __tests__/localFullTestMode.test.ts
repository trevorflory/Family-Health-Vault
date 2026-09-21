jest.mock('../db/medicalEvents', () => ({
  saveMedicalEvent: jest.fn(async (input: Record<string, unknown>) => ({
    id: String(input.id ?? 'me_test'),
    patientId: input.patientId,
    kind: input.kind,
    sourceUri: null,
    rawText: input.rawText,
    parsedJson: JSON.stringify(input.parsed ?? {}),
    status: input.status,
    sourceType: input.sourceType ?? 'MANUAL',
    sourceAuthorityId: null,
    externalId: null,
    lastSyncedAt: null,
    createdAt: '2026-09-20T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z',
  })),
  getMedicalEventById: jest.fn(),
  listMedicalEventsForPatient: jest.fn(async () => []),
}));

jest.mock('../db/careObservations', () => ({
  saveObservation: jest.fn(async (row: unknown) => row),
  listObservationsForPatient: jest.fn(async () => []),
}));

jest.mock('../db/client', () => ({
  getHealthcareDb: jest.fn(),
}));

import { mergeAppointments } from '../services/digestEngine';
import { getEffectiveVaultProfile } from '../services/effectiveVault';
import {
  enableSandboxWalletPro,
  disableSandboxWalletPro,
  getDeviceWalletPlan,
  resetDeviceWalletPlan,
} from '../services/walletEntitlements';
import {
  presetPrimaryPoaClinical,
  runSimulatorIngest,
} from '../services/ehr/simulator';
import { setProfileOverride } from '../db/profileOverrides';
import type { DigestAppointment } from '../types/digest';

describe('local full-test mode', () => {
  beforeEach(() => {
    resetDeviceWalletPlan();
  });

  it('merges live appointments over fixtures by id', () => {
    const fixture: DigestAppointment[] = [
      {
        appointmentId: 'a1',
        title: 'Old',
        startsAt: '2026-09-21T10:00:00.000Z',
        location: 'A',
        preparationAlert: 'x',
      },
    ];
    const live: DigestAppointment[] = [
      {
        appointmentId: 'a1',
        title: 'Edited',
        startsAt: '2026-09-21T11:00:00.000Z',
        location: 'B',
        preparationAlert: 'y',
        source: 'VAULT',
      },
      {
        appointmentId: 'a2',
        title: 'New',
        startsAt: '2026-09-22T11:00:00.000Z',
        location: 'C',
        preparationAlert: 'z',
        source: 'VAULT',
      },
    ];
    const merged = mergeAppointments(fixture, live);
    expect(merged).toHaveLength(2);
    expect(merged.find((a) => a.appointmentId === 'a1')?.title).toBe('Edited');
  });

  it('persists WALLET_PRO enable/disable in plan store', () => {
    enableSandboxWalletPro();
    expect(getDeviceWalletPlan()).toBe('WALLET_PRO');
    disableSandboxWalletPro();
    expect(getDeviceWalletPlan()).toBe('FREE_FEED');
  });

  it('applies profile overrides via effective vault', async () => {
    await setProfileOverride({
      patientId: 'pt-7801',
      preferredName: 'Bobby QA',
      conditionsText: 'CKD, T2DM',
      allergiesText: 'Penicillin',
    });
    const profile = await getEffectiveVaultProfile('pt-7801');
    expect(profile?.preferredName).toBe('Bobby QA');
    expect(profile?.chronicConditions).toEqual(['CKD', 'T2DM']);
    expect(profile?.historicalMarkers?.[0]).toMatch(/Allergies/);
  });

  it('runs EHR simulator presets into normalizer', async () => {
    const out = await runSimulatorIngest(presetPrimaryPoaClinical(), {
      reset: true,
      bridgeToVault: true,
      patientId: 'pt-7801',
    });
    expect(out.ingested).toBeGreaterThan(0);
    expect(out.vaultSaved).toBeGreaterThan(0);
  });
});
