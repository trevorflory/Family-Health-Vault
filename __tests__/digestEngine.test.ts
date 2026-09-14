import { DEMO_CAREGIVER_ID } from '../data/caregiverHousehold';
import {
  compileDailyDigest,
  compileWeeklyDigest,
} from '../services/digestEngine';

/** Fixed Monday morning so 72h window and weekday alerts are deterministic. */
const NOW = new Date('2026-09-14T07:00:00');

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

  it('surfaces FOI pending >30 days and missing lab uploads as overdue', async () => {
    const digest = await compileDailyDigest(DEMO_CAREGIVER_ID, NOW);
    const dad = digest.sections.find((s) => s.dependant.patientId === 'pt-7801')!;
    expect(dad.overdueTasks.some((t) => t.kind === 'FOI_PENDING' && t.ageDays > 30)).toBe(
      true,
    );
    expect(dad.overdueTasks.some((t) => t.kind === 'MISSING_LAB_UPLOAD')).toBe(true);
    expect(digest.totalOverdue).toBeGreaterThan(0);
  });

  it('compileWeeklyDigest synthesizes adherence, vitals, and upcoming week', async () => {
    const weekly = await compileWeeklyDigest(DEMO_CAREGIVER_ID, NOW);
    expect(weekly.weekOf).toBe('2026-09-14');
    expect(weekly.adherence.length).toBe(3);
    expect(weekly.vitalTrends.length).toBeGreaterThan(0);
    expect(weekly.upcomingWeek.length).toBeGreaterThan(0);
    expect(weekly.narrativeSummary).toMatch(/adherence/i);
  });

  it('rejects unknown caregivers', async () => {
    await expect(compileDailyDigest('cg-missing', NOW)).rejects.toThrow(
      /Unknown caregiverId/i,
    );
  });
});
