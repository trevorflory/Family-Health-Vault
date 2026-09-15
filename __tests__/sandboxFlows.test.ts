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
  saveMedicalEvent: jest.fn(async (input: Record<string, unknown>) => ({
    id: input.id ?? `me_${Date.now()}`,
    patientId: input.patientId,
    kind: input.kind,
    sourceUri: input.sourceUri ?? null,
    rawText: input.rawText ?? '',
    parsedJson: JSON.stringify(input.parsed ?? {}),
    status: input.status ?? 'PENDING_REVIEW',
    createdAt: '2026-09-14T00:00:00.000Z',
    updatedAt: '2026-09-14T00:00:00.000Z',
  })),
  listMedicalEventsForPatient: jest.fn(async () => []),
  getMedicalEventById: jest.fn(async () => null),
}));

jest.mock('../db/foiRequests', () => ({
  listFOIRequestsForPatient: jest.fn(async () => []),
  saveFOIRequest: jest.fn(),
  getFOIRequestById: jest.fn(async () => null),
}));

jest.mock('../db/medDoses', () => ({
  listMedDosesGiven: jest.fn(async () => []),
  listMedDosesGivenBetween: jest.fn(async () => []),
  markMedDosesGiven: jest.fn(async () => []),
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
  previewDadSbarHtml,
  run811ScriptSandbox,
  runDadEmergencyPassSandbox,
  runDadOcrLabSandbox,
  runDadVoiceDebriefSandbox,
  runDailyDigestSandbox,
  runDadSbarSandbox,
  runLeoAgeOutSandbox,
  runSkHipaFoiSandbox,
  runWeeklyDigestSandbox,
} from '../utils/sandboxFlows';
import { getDadSandboxMedicalEvents } from '../utils/mockSeeder';
import { __resetProxyAccessDbForTests } from '../db/proxyAccess';

/** Fixed Monday morning so household meds/visits are deterministic. */
const NOW = new Date('2026-09-14T07:00:00');

describe('sandboxFlows core loops', () => {
  beforeEach(() => {
    __resetProxyAccessDbForTests();
  });
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

  it('runDadSbarSandbox uses compileSBAR + MedicalEvents (lab + visit debrief)', async () => {
    const result = await runDadSbarSandbox({ now: NOW });
    expect(result.uri).toBe('file:///tmp/sandbox.pdf');
    expect(result.document.sourceEventIds).toEqual(
      expect.arrayContaining([
        'me_seed_sha_lab_dad',
        'me_seed_visit_debrief_dad',
      ]),
    );
    expect(result.document.sourceEventSummaries.join(' ')).toMatch(/eGFR|debrief|lab/i);
    expect(result.document.sections.background).toMatch(/Metformin|CKD|eGFR/i);
    expect(result.document.sections.assessment).toMatch(/ankle|fatigue|caregiver/i);
    expect(result.document.regulatoryNotice).toMatch(/does not diagnose|Educational/i);
    expect(result.html).toMatch(/Situation|Background|Assessment|Recommendation/i);
  });

  it('previewDadSbarHtml is unit-testable without relying on the legacy sbarNote path', async () => {
    const html = await previewDadSbarHtml({
      now: NOW,
      medicalEvents: getDadSandboxMedicalEvents(NOW),
    });
    expect(html).toMatch(/SBAR/i);
    expect(html).toMatch(/Metformin/i);
    expect(html).toMatch(/eGFR/i);
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
    expect(script.dispatcherCueSheet).toHaveLength(4);
    expect(script.questionsToAskNurse).toHaveLength(3);
    expect(script.regulatoryNotice).toMatch(/does not diagnose/i);
  });

  it('runLeoAgeOutSandbox force-ages parental POA and keeps append-only log', async () => {
    const result = await runLeoAgeOutSandbox(NOW);
    expect(result.revokedGrantIds.length).toBe(1);
    expect(result.grantStatuses).toContain('AGED_OUT');
    expect(result.accessLogCount).toBeGreaterThan(0);
    expect(result.handOffNote).toMatch(/hand-off|consent/i);
  });

  it('runDadEmergencyPassSandbox encrypts QR and builds wallet PDF', async () => {
    const result = await runDadEmergencyPassSandbox({
      now: NOW,
      secret: 'unit-test-secret',
    });
    expect(result.pass.qrValue.startsWith('EPv1.')).toBe(true);
    expect(result.decodedName).toBe('Robert Ellis');
    expect(result.pass.context.allergies.join(' ')).toMatch(/Penicillin/i);
    expect(result.html).toMatch(/Robert Ellis|Penicillin|wallet|Emergency/i);
    expect(result.pdfUri).toBe('file:///tmp/sandbox.pdf');
  });

  it('runWeeklyDigestSandbox returns weekly overview + Sunday push payload', async () => {
    const result = await runWeeklyDigestSandbox(DEMO_CAREGIVER_ID, NOW);
    expect(result.digest.weekOf).toBe('2026-09-14');
    expect(result.digest.adherence.length).toBe(3);
    expect(result.pushPayload.data).toMatchObject({
      kind: 'weekly',
      pathname: '/digest/weekly',
      caregiverId: DEMO_CAREGIVER_ID,
    });
    expect(result.pushPayload.body).toMatch(/adherence/i);
  });

  it('runDadOcrLabSandbox parses SHA mock labs and persists PENDING_REVIEW', async () => {
    const result = await runDadOcrLabSandbox();
    expect(result.parsed.labs.some((l) => /eGFR/i.test(l.testName))).toBe(true);
    expect(result.record.kind).toBe('LAB_RESULT');
    expect(result.record.status).toBe('PENDING_REVIEW');
    expect(result.deepLink).toBe('/patient/pt-7801/uploadDoc');
  });

  it('runDadVoiceDebriefSandbox extracts action items and persists VISIT_DEBRIEF', async () => {
    const result = await runDadVoiceDebriefSandbox();
    expect(result.extracted.eventType).toBe('VISIT_DEBRIEF');
    expect(result.extracted.actionItems.join(' ')).toMatch(/blister|ankle/i);
    expect(result.record.kind).toBe('VISIT_DEBRIEF');
    expect(result.record.status).toBe('PENDING_REVIEW');
    expect(result.deepLink).toBe('/patient/pt-7801/voiceDebrief');
  });
});
