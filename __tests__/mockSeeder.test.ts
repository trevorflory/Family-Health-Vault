jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async () => ({ uri: 'file:///tmp/sbar.pdf' })),
}));

jest.mock('../db/medicalEvents', () => ({
  saveMedicalEvent: jest.fn(async (input: { id: string }) => input),
}));

jest.mock('../db/patientProfiles', () => ({
  upsertPatientProfile: jest.fn(async (input: Record<string, unknown>) => ({
    ...input,
    createdAt: '2026-09-14T00:00:00.000Z',
    updatedAt: '2026-09-14T00:00:00.000Z',
  })),
}));

import { buildDadSbarHtml } from '../services/sbarNote';
import {
  CHILD_SK_VACCINES,
  DAD_MEDICATIONS,
  getChildSeedFixture,
  getDadSeedFixture,
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
});

describe('sandboxFlows SBAR preview', () => {
  it('builds a 1-page SBAR HTML with Situation/Background/Assessment/Recommendation', () => {
    const html = buildDadSbarHtml();
    expect(html).toMatch(/SBAR/i);
    expect(html).toMatch(/Situation/i);
    expect(html).toMatch(/Background/i);
    expect(html).toMatch(/Assessment/i);
    expect(html).toMatch(/Recommendation/i);
    expect(html).toMatch(/Metformin/i);
    expect(html).toMatch(/eGFR/i);
  });
});
