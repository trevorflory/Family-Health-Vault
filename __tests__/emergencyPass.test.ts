jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(),
  printAsync: jest.fn(),
}));

import {
  decodeEmergencyQR,
  generateEmergencyQR,
  buildEmergencyWalletCardHtml,
} from '../services/emergencyPass';
import {
  decryptAes256Gcm,
  encryptAes256Gcm,
} from '../services/emergencyCrypto';

describe('emergencyPass', () => {
  it('encrypts and decrypts with AES-256-GCM', async () => {
    const token = await encryptAes256Gcm('{"hello":"er"}', 'unit-test-secret');
    expect(token.startsWith('EPv1.')).toBe(true);
    await expect(decryptAes256Gcm(token, 'unit-test-secret')).resolves.toBe(
      '{"hello":"er"}',
    );
  });

  it('generateEmergencyQR includes allergies, meds, contacts, and caregiver phone', async () => {
    const now = new Date('2026-09-14T16:00:00.000Z');
    const pass = await generateEmergencyQR('pt-7801', {
      now,
      ttlMs: 60 * 60 * 1000,
      secret: 'unit-test-secret',
    });

    expect(pass.qrValue).toBe(pass.encryptedPayload);
    expect(pass.context.allergies.join(' ')).toMatch(/Penicillin/i);
    expect(pass.context.activeMedications.some((m) => /Metformin/i.test(m))).toBe(
      true,
    );
    expect(pass.context.primaryCaregiverPhone).toMatch(/306-555-0142/);
    expect(pass.context.emergencyContacts.length).toBeGreaterThan(0);
    expect(pass.expiresAt).toBe('2026-09-14T17:00:00.000Z');

    const decoded = await decodeEmergencyQR(pass.encryptedPayload, {
      secret: 'unit-test-secret',
      now,
    });
    expect(decoded.fullName).toBe('Robert Ellis');
    expect(decoded.allergies).toEqual(pass.context.allergies);
    expect(decoded.primaryCaregiverPhone).toBe(pass.context.primaryCaregiverPhone);
  });

  it('rejects expired emergency passes', async () => {
    const issued = new Date('2026-09-14T12:00:00.000Z');
    const pass = await generateEmergencyQR('pt-7801', {
      now: issued,
      ttlMs: 60_000,
      secret: 'unit-test-secret',
    });
    await expect(
      decodeEmergencyQR(pass.encryptedPayload, {
        secret: 'unit-test-secret',
        now: new Date('2026-09-14T13:00:00.000Z'),
      }),
    ).rejects.toThrow(/expired/i);
  });

  it('builds a printable wallet card with critical alerts', () => {
    const html = buildEmergencyWalletCardHtml({
      patientId: 'pt-7801',
      encryptedPayload: 'EPv1.testtoken',
      expiresAt: '2026-09-14T20:00:00.000Z',
      issuedAt: '2026-09-14T16:00:00.000Z',
      qrValue: 'EPv1.testtoken',
      context: {
        patientId: 'pt-7801',
        fullName: 'Robert Ellis',
        ageYears: 78,
        allergies: ['Penicillin'],
        activeMedications: ['Metformin 500mg BID'],
        emergencyContacts: [
          {
            name: 'Alex Ellis',
            relationship: 'Primary caregiver',
            phone: '+1-306-555-0142',
          },
        ],
        primaryCaregiverPhone: '+1-306-555-0142',
        criticalAlerts: ['Stage 3 CKD'],
      },
    });

    expect(html).toMatch(/EMERGENCY WALLET CARD/);
    expect(html).toMatch(/ALLERGIES: Penicillin/);
    expect(html).toMatch(/Stage 3 CKD/);
    expect(html).toMatch(/Metformin/);
    expect(html).toMatch(/306-555-0142/);
  });
});
