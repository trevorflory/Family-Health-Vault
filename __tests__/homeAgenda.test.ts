import { DEMO_CAREGIVER_ID } from '../data/caregiverHousehold';
import {
  compileDailyDigest,
  compileWeeklyDigest,
} from '../services/digestEngine';
import {
  buildHomeAgenda,
  buildWeekViewRows,
  filterWeekViewRows,
  formatWeekWhen,
} from '../utils/homeAgenda';

const NOW = new Date('2026-09-14T07:00:00');

describe('homeAgenda', () => {
  it('builds Today checklist items with kind/done and denser My Week lines', async () => {
    const daily = await compileDailyDigest(DEMO_CAREGIVER_ID, NOW);
    const weekly = await compileWeeklyDigest(DEMO_CAREGIVER_ID, NOW);
    const agenda = buildHomeAgenda(daily, weekly, NOW);

    expect(agenda.today.some((i) => i.kind === 'med' && /Metformin/i.test(i.label))).toBe(
      true,
    );
    expect(agenda.today.every((i) => typeof i.done === 'boolean')).toBe(true);
    expect(
      agenda.today.some(
        (i) =>
          /Ask Dad about their appointment/i.test(i.label) ||
          i.kind === 'prompt' ||
          i.kind === 'task',
      ),
    ).toBe(true);
    expect((agenda as { tomorrow?: unknown }).tomorrow).toBeUndefined();
    expect(
      agenda.week.some((i) =>
        /Sep|Today ·|Refill|Book|FOI|Upload|Nephrology|eye/i.test(i.label),
      ),
    ).toBe(true);
  });

  it('marks non-med Today items done from agendaDoneIds', async () => {
    const daily = await compileDailyDigest(DEMO_CAREGIVER_ID, NOW);
    const weekly = await compileWeeklyDigest(DEMO_CAREGIVER_ID, NOW);
    const task = daily.sections
      .flatMap((s) => s.overdueTasks)
      .map((t) => `task-${t.taskId}`)[0];
    expect(task).toBeTruthy();
    const agenda = buildHomeAgenda(daily, weekly, NOW, {
      agendaDoneIds: [task],
    });
    expect(agenda.today.find((i) => i.id === task)?.done).toBe(true);
  });

  it('formats week timestamps and filters week view by person/priority', async () => {
    const weekly = await compileWeeklyDigest(DEMO_CAREGIVER_ID, NOW);
    const label = formatWeekWhen('2026-09-14T14:00:00', NOW);
    expect(label).toMatch(/Today/);
    const rows = buildWeekViewRows(weekly, NOW);
    expect(rows.length).toBeGreaterThan(0);
    const byPerson = filterWeekViewRows(rows, {
      sort: 'person',
      patientId: 'pt-7801',
    });
    expect(byPerson.every((r) => r.patientId === 'pt-7801')).toBe(true);
    const byPriority = filterWeekViewRows(rows, { sort: 'priority' });
    expect(byPriority[0].priority).toBeLessThanOrEqual(
      byPriority[byPriority.length - 1].priority,
    );
  });
});
