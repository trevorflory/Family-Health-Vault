jest.mock('../db/medicalEvents', () => ({
  listMedicalEventsForPatient: jest.fn(async () => []),
}));

import { setVisitGoals } from '../db/visitGoals';
import { getMostRecentCaregiverAdvice } from '../services/caregiverAdvice';

describe('caregiverAdvice', () => {
  it('returns the most recently updated visit goals as advice', async () => {
    await setVisitGoals({
      patientId: 'pt-7801',
      appointmentId: 'appt-dad-gp',
      goalsText: 'Older goal',
    });
    await setVisitGoals({
      patientId: 'pt-leo-04',
      appointmentId: 'appt-leo-well',
      goalsText: 'Newest advice about immunization booklet',
    });

    const advice = await getMostRecentCaregiverAdvice({
      caregiverId: 'cg-sandwich-01',
      now: new Date('2026-09-14T12:00:00'),
    });
    expect(advice?.text).toMatch(/Newest advice/i);
    expect(advice?.nickname).toBe('Leo');
    expect(advice?.href).toContain('appointmentPrep');
  });
});
