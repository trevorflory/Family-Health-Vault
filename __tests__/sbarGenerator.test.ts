const printToFileAsync = jest.fn();

jest.mock('expo-print', () => ({
  printToFileAsync: (...args: unknown[]) => printToFileAsync(...args),
}));

jest.mock('../db/medicalEvents', () => ({
  listMedicalEventsForPatient: jest.fn(async () => []),
  saveMedicalEvent: jest.fn(),
  getMedicalEventById: jest.fn(async () => null),
}));

import { compileSBAR } from '../services/sbarEngine';
import { generateSBARPDF } from '../services/sbarGenerator';

describe('generateSBARPDF', () => {
  beforeEach(() => {
    printToFileAsync.mockReset();
  });

  it('returns the expo-print file URI', async () => {
    printToFileAsync.mockResolvedValueOnce({ uri: 'file:///tmp/sbar.pdf' });
    const doc = await compileSBAR(
      'pt-7801',
      {
        visitReason: 'Nephrology follow-up',
        appointmentId: 'appt-dad-gp',
        includeMedicalEvents: false,
      },
      { now: new Date('2026-09-14T12:00:00.000Z') },
    );
    await expect(generateSBARPDF(doc)).resolves.toBe('file:///tmp/sbar.pdf');
    expect(printToFileAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Situation'),
        base64: false,
      }),
    );
  });

  it('falls back to base64 data URI when uri is missing', async () => {
    printToFileAsync
      .mockResolvedValueOnce({ uri: '' })
      .mockResolvedValueOnce({ uri: '', base64: 'JVBERi0x' });
    const doc = await compileSBAR(
      'pt-leo-04',
      { visitReason: 'Well-child visit', includeMedicalEvents: false },
      { now: new Date('2026-09-14T12:00:00.000Z') },
    );
    await expect(generateSBARPDF(doc)).resolves.toBe(
      'data:application/pdf;base64,JVBERi0x',
    );
  });

  it('rejects incomplete SBAR documents', async () => {
    const doc = await compileSBAR(
      'pt-7801',
      { visitReason: 'Visit', includeMedicalEvents: false },
      { now: new Date('2026-09-14T12:00:00.000Z') },
    );
    await expect(
      generateSBARPDF({
        ...doc,
        sections: { ...doc.sections, assessment: '' },
      }),
    ).rejects.toThrow(/Assessment/i);
    expect(printToFileAsync).not.toHaveBeenCalled();
  });
});
