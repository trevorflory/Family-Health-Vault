const printToFileAsync = jest.fn();

jest.mock('expo-print', () => ({
  printToFileAsync: (...args: unknown[]) => printToFileAsync(...args),
}));

import { generateFOIPDF } from '../services/foiGenerator';
import { HEALTH_AUTHORITIES } from '../data/healthAuthorities';
import type { FOIRequestPayload } from '../types/foiPayload';

const payload: FOIRequestPayload = {
  jurisdiction: 'ON',
  facility: HEALTH_AUTHORITIES.find((f) => f.id === 'on-uhn')!,
  patient: {
    patientId: 'pt-1001',
    fullName: 'Avery Chen',
    dateOfBirth: '1968-04-12',
    encryptedPhn: '••••-•••-8841',
  },
  scope: ['FULL_CHART'],
  applicant: {
    fullName: 'Avery Chen',
    relationship: 'Self',
    email: 'avery@example.com',
    phone: '416-555-0100',
    mailingAddress: 'Toronto, ON',
    hasPowerOfAttorney: false,
  },
  attachments: [],
  feeWaiver: { requested: false },
  requestedAt: '2026-09-14T15:00:00.000Z',
};

describe('generateFOIPDF', () => {
  beforeEach(() => {
    printToFileAsync.mockReset();
  });

  it('returns the expo-print file URI', async () => {
    printToFileAsync.mockResolvedValueOnce({ uri: 'file:///tmp/foi.pdf' });
    await expect(generateFOIPDF(payload)).resolves.toBe('file:///tmp/foi.pdf');
    expect(printToFileAsync).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining('PHIPA'), base64: false }),
    );
  });

  it('falls back to base64 data URI when uri is missing', async () => {
    printToFileAsync
      .mockResolvedValueOnce({ uri: '' })
      .mockResolvedValueOnce({ uri: '', base64: 'JVBERi0x' });
    await expect(generateFOIPDF(payload)).resolves.toBe(
      'data:application/pdf;base64,JVBERi0x',
    );
  });

  it('rejects payloads without scope', async () => {
    await expect(
      generateFOIPDF({ ...payload, scope: [] }),
    ).rejects.toThrow(/scope/i);
    expect(printToFileAsync).not.toHaveBeenCalled();
  });
});
