jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async () => ({ uri: 'file:///tmp/sandbox.pdf' })),
}));

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  IosAuthorizationStatus: { PROVISIONAL: 2 },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
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

import { DEMO_CAREGIVER_ID } from '../data/caregiverHousehold';
import {
  run811ScriptSandbox,
  runDailyDigestSandbox,
  runSkHipaFoiSandbox,
} from '../utils/sandboxFlows';

/** Fixed Monday morning so household meds/visits are deterministic. */
const NOW = new Date('2026-09-14T07:00:00');

describe('sandboxFlows core loops', () => {
  it('runDailyDigestSandbox returns a push payload with digest deep link', async () => {
    const result = await runDailyDigestSandbox(DEMO_CAREGIVER_ID, NOW);
    expect(result.headline).toMatch(/Good morning|meds|visits/i);
    expect(result.pushPayload.title).toMatch(/Daily Morning Digest/i);
    expect(result.pushPayload.data).toMatchObject({
      kind: 'daily',
      pathname: '/digest/daily',
      caregiverId: DEMO_CAREGIVER_ID,
    });
    expect(result.totalMedsDue).toBeGreaterThan(0);
  });

  it('runSkHipaFoiSandbox builds a Saskatchewan HIPA FOI PDF', async () => {
    const result = await runSkHipaFoiSandbox();
    expect(result.uri).toBe('file:///tmp/sandbox.pdf');
    expect(result.payload.jurisdiction).toBe('SK');
    expect(result.payload.facility.id).toBe('sk-sha');
    expect(result.payload.facility.name).toMatch(/Saskatchewan/i);
    expect(result.payload.scope).toContain('FULL_CHART');
    expect(result.payload.applicant.hasPowerOfAttorney).toBe(true);
  });

  it('run811ScriptSandbox returns a teleprompter script for Dad', async () => {
    const script = await run811ScriptSandbox();
    expect(script.spokenIntroScript).toMatch(
      /78-year-old|father|confusion|fever/i,
    );
    expect(script.questionsToAskNurse).toHaveLength(3);
    expect(script.regulatoryNotice).toMatch(/does not diagnose/i);
  });
});
