import { extractVisitDebrief } from '../services/visitDebriefExtract';

const SAMPLE = `
We discussed Dad's kidney function and the recent eGFR trend.
The doctor decreased Metformin to 500 mg once daily.
Schedule follow-up ultrasound in 2 weeks.
Pick up the new prescription at the pharmacy tomorrow.
They also prescribed Vitamin D 1000 IU.
`;

describe('extractVisitDebrief', () => {
  it('extracts discussion summary, dosage changes, and action items', () => {
    const result = extractVisitDebrief(SAMPLE);
    expect(result.eventType).toBe('VISIT_DEBRIEF');
    expect(result.discussionSummary.toLowerCase()).toMatch(/kidney|egfr|discuss/);
    expect(
      result.dosageChanges.some((d) => /Metformin/i.test(d.medicationName)),
    ).toBe(true);
    expect(
      result.actionItems.some((a) => /ultrasound/i.test(a)),
    ).toBe(true);
    expect(
      result.actionItems.some((a) => /prescription|pharmacy/i.test(a)),
    ).toBe(true);
  });

  it('handles empty transcript without throwing', () => {
    const result = extractVisitDebrief('');
    expect(result.eventType).toBe('VISIT_DEBRIEF');
    expect(result.dosageChanges).toEqual([]);
    expect(result.actionItems).toEqual([]);
    expect(result.discussionSummary).toMatch(/No discussion summary/i);
  });
});
