import { DEMO_CAREGIVER_ID } from '../data/caregiverHousehold';
import { getFacilityById } from '../data/healthAuthorities';
import {
  compileDailyDigest,
  compileWeeklyDigest,
} from '../services/digestEngine';
import { resolveOverdueTasks } from '../services/digestOverdue';
import type { MedicalEventRecord } from '../types/db';
import type { FOIRequestRecord } from '../types/foiPayload';

/** Fixed Monday morning so 72h window and weekday alerts are deterministic. */
const NOW = new Date('2026-09-14T07:00:00');

function staleDraftFoi(overrides: Partial<FOIRequestRecord> = {}): FOIRequestRecord {
  const facility = getFacilityById('sk-sha')!;
  const created = new Date(NOW);
  created.setDate(created.getDate() - 40);
  return {
    id: 'foi_test_stale',
    patientId: 'pt-7801',
    jurisdiction: 'SK',
    facilityId: facility.id,
    payloadJson: '{}',
    pdfUri: null,
    status: 'DRAFT',
    createdAt: created.toISOString(),
    updatedAt: created.toISOString(),
    ...overrides,
  };
}

function labEvent(): MedicalEventRecord {
  return {
    id: 'me_lab_dad',
    patientId: 'pt-7801',
    kind: 'LAB_RESULT',
    sourceUri: null,
    rawText: 'eGFR 52',
    parsedJson: JSON.stringify({
      documentHint: 'lab',
      labs: [{ testName: 'eGFR', value: '52', units: 'mL/min/1.73m2', code: 'EGFR' }],
      prescriptions: [],
      parserNotes: [],
    }),
    status: 'CONFIRMED',
    sourceType: 'OCR',
    sourceAuthorityId: null,
    externalId: null,
    lastSyncedAt: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  };
}

describe('digestEngine', () => {
  it('compileDailyDigest scans aging parent, child, and self profiles', async () => {
    const digest = await compileDailyDigest(DEMO_CAREGIVER_ID, NOW);
    const names = digest.sections.map((s) => s.dependant.displayName);

    expect(names).toContain('Dad (78) - Saskatoon');
    expect(names).toContain('Leo (4) - Regina');
    expect(names).toContain('You (42) - Regina');
    expect(digest.sections.map((s) => s.dependant.role).sort()).toEqual(
      ['aging_parent', 'child', 'self'].sort(),
    );
  });

  it('extracts meds scheduled for today across the household', async () => {
    const digest = await compileDailyDigest(DEMO_CAREGIVER_ID, NOW);
    const dad = digest.sections.find((s) => s.dependant.patientId === 'pt-7801')!;
    const leo = digest.sections.find((s) => s.dependant.patientId === 'pt-leo-04')!;

    expect(dad.medsToday.some((m) => m.name === 'Metformin')).toBe(true);
    expect(leo.medsToday.some((m) => /multivitamin/i.test(m.name))).toBe(true);
    expect(digest.totalMedsDue).toBeGreaterThanOrEqual(4);
  });

  it('flags appointments within 72 hours with preparation alerts', async () => {
    const digest = await compileDailyDigest(DEMO_CAREGIVER_ID, NOW);
    const dad = digest.sections.find((s) => s.dependant.patientId === 'pt-7801')!;
    expect(dad.appointmentsWithin72h.length).toBeGreaterThan(0);
    expect(dad.appointmentsWithin72h[0].preparationAlert).toMatch(
      /Print SBAR note for Dad's visit/i,
    );

    const leo = digest.sections.find((s) => s.dependant.patientId === 'pt-leo-04')!;
    expect(leo.appointmentsWithin72h[0]?.preparationAlert).toMatch(/Leo/i);
  });

  it('surfaces fixture FOI pending >30 days and missing lab uploads when vault empty', async () => {
    const digest = await compileDailyDigest(DEMO_CAREGIVER_ID, NOW);
    const dad = digest.sections.find((s) => s.dependant.patientId === 'pt-7801')!;
    expect(dad.overdueTasks.some((t) => t.kind === 'FOI_PENDING' && t.ageDays > 30)).toBe(
      true,
    );
    expect(dad.overdueTasks.some((t) => t.kind === 'MISSING_LAB_UPLOAD')).toBe(true);
    expect(digest.totalOverdue).toBeGreaterThan(0);
  });

  it('prefers live DRAFT FOI rows over fixture FOI tasks', async () => {
    const digest = await compileDailyDigest(DEMO_CAREGIVER_ID, NOW, {
      listFoiRequestsForPatient: async (patientId) =>
        patientId === 'pt-7801' ? [staleDraftFoi()] : [],
    });
    const dad = digest.sections.find((s) => s.dependant.patientId === 'pt-7801')!;
    expect(dad.overdueTasks.some((t) => t.taskId.startsWith('foi-live-'))).toBe(
      true,
    );
    expect(dad.overdueTasks.some((t) => t.taskId === 'foi-dad-sha')).toBe(false);
  });

  it('clears MISSING_LAB_UPLOAD when a lab MedicalEvent is on file', async () => {
    const digest = await compileDailyDigest(DEMO_CAREGIVER_ID, NOW, {
      listMedicalEventsForPatient: async (patientId) =>
        patientId === 'pt-7801' ? [labEvent()] : [],
    });
    const dad = digest.sections.find((s) => s.dependant.patientId === 'pt-7801')!;
    expect(dad.overdueTasks.some((t) => t.kind === 'MISSING_LAB_UPLOAD')).toBe(
      false,
    );
    expect(dad.overdueTasks.some((t) => t.kind === 'FOI_PENDING')).toBe(true);
  });

  it('marks meds given from injectable dose store', async () => {
    const digest = await compileDailyDigest(DEMO_CAREGIVER_ID, NOW, {
      listMedDosesGivenForDate: async (patientId) =>
        patientId === 'pt-7801' ? ['med-met-am', 'med-ram-am', 'med-met-pm'] : [],
    });
    const dad = digest.sections.find((s) => s.dependant.patientId === 'pt-7801')!;
    expect(dad.medsToday.every((m) => m.given)).toBe(true);
  });

  it('compileWeeklyDigest synthesizes adherence, vitals, and upcoming week', async () => {
    const weekly = await compileWeeklyDigest(DEMO_CAREGIVER_ID, NOW);
    expect(weekly.weekOf).toBe('2026-09-14');
    expect(weekly.adherence.length).toBe(3);
    expect(weekly.vitalTrends.length).toBeGreaterThan(0);
    expect(weekly.upcomingWeek.length).toBeGreaterThan(0);
    expect(weekly.narrativeSummary).toMatch(/adherence/i);
  });

  it('bumps weekly adherence when med-dose marks exist', async () => {
    const weekly = await compileWeeklyDigest(DEMO_CAREGIVER_ID, NOW, {
      listMedDosesGivenBetween: async (patientId) =>
        patientId === 'pt-7801'
          ? [
              { medicationId: 'med-met-am', dateKey: '2026-09-14' },
              { medicationId: 'med-ram-am', dateKey: '2026-09-14' },
              { medicationId: 'med-met-pm', dateKey: '2026-09-14' },
              { medicationId: 'med-met-am', dateKey: '2026-09-13' },
            ]
          : [],
    });
    const dad = weekly.adherence.find((a) => a.patientId === 'pt-7801')!;
    expect(dad.dosesTaken).toBe(21);
    expect(dad.adherenceRate).toBe(1);
  });

  it('rejects unknown caregivers', async () => {
    await expect(compileDailyDigest('cg-missing', NOW)).rejects.toThrow(
      /Unknown caregiverId/i,
    );
  });
});

describe('resolveOverdueTasks', () => {
  it('ignores DISPATCHED FOI rows for overdue pending', () => {
    const tasks = resolveOverdueTasks({
      fixtureTasks: [
        {
          taskId: 'foi-dad-sha',
          kind: 'FOI_PENDING',
          label: 'fixture',
          ageDays: 34,
        },
      ],
      foiRecords: [staleDraftFoi({ status: 'DISPATCHED', id: 'foi_dispatched' })],
      medicalEvents: [],
      now: NOW,
    });
    expect(tasks.filter((t) => t.kind === 'FOI_PENDING')).toHaveLength(0);
  });
});
