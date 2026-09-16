import { DEMO_CAREGIVER_ID } from '../data/caregiverHousehold';
import {
  compileDailyDigest,
  compileWeeklyDigest,
} from '../services/digestEngine';
import { buildHomeAgenda } from '../utils/homeAgenda';

const NOW = new Date('2026-09-14T07:00:00');

describe('homeAgenda', () => {
  it('builds Today / Tomorrow / My Week from digests', async () => {
    const daily = await compileDailyDigest(DEMO_CAREGIVER_ID, NOW);
    const weekly = await compileWeeklyDigest(DEMO_CAREGIVER_ID, NOW);
    const agenda = buildHomeAgenda(daily, weekly, NOW);

    expect(agenda.today.some((i) => /Metformin/i.test(i.label))).toBe(true);
    expect(agenda.today.some((i) => /eye appointment/i.test(i.label))).toBe(
      true,
    );
    expect(agenda.tomorrow.length).toBeGreaterThan(0);
    expect(agenda.week.some((i) => /Refill|Book|FOI|Upload/i.test(i.label))).toBe(
      true,
    );
  });
});
