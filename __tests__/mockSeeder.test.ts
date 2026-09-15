jest.mock('../db/medicalEvents', () => ({
  saveMedicalEvent: jest.fn(async (input: { id: string }) => input),
  listMedicalEventsForPatient: jest.fn(async () => []),
}));

jest.mock('../db/patientProfiles', () => ({
  upsertPatientProfile: jest.fn(async (input: Record<string, unknown>) => ({
    ...input,
    createdAt: '2026-09-14T00:00:00.000Z',
    updatedAt: '2026-09-14T00:00:00.000Z',
  })),
}));

import { compileSBAR } from '../services/sbarEngine';
import { buildSBARHtml } from '../services/sbarTemplate';
import {
  CHILD_SK_VACCINES,
  DAD_MEDICATIONS,
  getChildSeedFixture,
  getDadSandboxMedicalEvents,
  getDadSeedFixture,
  SEED_DAD_ID,
  SHA_LAB_PDF_MOCK,
} from '../utils/mockSeeder';

describe('mockSeeder fixtures', () => {
  it('defines Dad (78) with Stage 3 CKD, T2DM, and 4 active medications', () => {
    const dad = getDadSeedFixture();
    expect(dad.displayName).toMatch(/Dad \(78\)/);
    expect(dad.conditions).toEqual(
      expect.arrayContaining(['Stage 3 CKD', 'Type 2 Diabetes']),
    );
    expect(DAD_MEDICATIONS).toHaveLength(4);
    expect(dad.medications.map((m) => m.name)).toEqual(
      expect.arrayContaining([
        'Metformin',
        'Ramipril',
        'Atorvastatin',
        'Vitamin D',
      ]),
    );
    expect(SHA_LAB_PDF_MOCK).toMatch(/Saskatchewan Health Authority/i);
    expect(SHA_LAB_PDF_MOCK).toMatch(/eGFR/i);
  });

  it('defines Child (4) vaccines aligned to SK provincial schedule', () => {
    const child = getChildSeedFixture();
    expect(child.displayName).toMatch(/Child \(4\)/);
    expect(CHILD_SK_VACCINES.length).toBeGreaterThanOrEqual(2);
    expect(CHILD_SK_VACCINES.map((v) => v.name)).toEqual(
      expect.arrayContaining(['DTaP-IPV', 'MMRV']),
    );
    expect(
      CHILD_SK_VACCINES.every((v) => /Saskatchewan|SK /i.test(v.scheduleNote)),
    ).toBe(true);
  });

  it('exposes seed-equivalent MedicalEvents for SBAR without SQLite', () => {
    const events = getDadSandboxMedicalEvents();
    expect(events.map((e) => e.id)).toEqual([
      'me_seed_sha_lab_dad',
      'me_seed_visit_debrief_dad',
    ]);
    expect(events[0].kind).toBe('LAB_RESULT');
    expect(events[1].kind).toBe('VISIT_DEBRIEF');
  });
});

describe('seed MedicalEvents → compileSBAR', () => {
  it('builds SBAR HTML with Situation/Background/Assessment/Recommendation from seed events', async () => {
    const now = new Date('2026-09-14T07:00:00');
    const doc = await compileSBAR(
      SEED_DAD_ID,
      {
        visitReason: 'Nephrology follow-up — review kidney labs',
        caregiverNotes: 'Preparing handoff after UTI treatment.',
        appointmentId: 'appt-dad-gp',
      },
      { now, medicalEvents: getDadSandboxMedicalEvents(now) },
    );
    const html = buildSBARHtml(doc);
    expect(html).toMatch(/SBAR/i);
    expect(html).toMatch(/Situation/i);
    expect(html).toMatch(/Background/i);
    expect(html).toMatch(/Assessment/i);
    expect(html).toMatch(/Recommendation/i);
    expect(html).toMatch(/Metformin/i);
    expect(html).toMatch(/eGFR/i);
    expect(doc.sourceEventIds).toEqual(
      expect.arrayContaining([
        'me_seed_sha_lab_dad',
        'me_seed_visit_debrief_dad',
      ]),
    );
  });
});
