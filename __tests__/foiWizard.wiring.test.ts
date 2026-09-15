import type { FOIRequestPayload } from '../types/foiPayload';
import { HEALTH_AUTHORITIES } from '../data/healthAuthorities';

/**
 * Smoke test for wizard wiring: mirrors the payload assembly used by
 * app/patient/[id]/foiWizard.tsx without mounting React Native.
 */
function assembleWizardPayload(input: {
  patientId: string;
  jurisdiction: FOIRequestPayload['jurisdiction'];
  facilityId: string;
  scope: FOIRequestPayload['scope'];
  hasPowerOfAttorney: boolean;
}): FOIRequestPayload {
  const facility = HEALTH_AUTHORITIES.find((f) => f.id === input.facilityId);
  if (!facility) throw new Error('Unknown facility');
  if (facility.jurisdiction !== input.jurisdiction) {
    throw new Error('Facility jurisdiction mismatch');
  }
  if (!input.scope.length) throw new Error('Scope required');

  return {
    jurisdiction: input.jurisdiction,
    facility,
    patient: {
      patientId: input.patientId,
      fullName: 'Jordan Okonkwo',
      dateOfBirth: '1975-11-03',
      encryptedPhn: '••••-•••-2290',
    },
    scope: input.scope,
    applicant: {
      fullName: 'Jordan Okonkwo',
      relationship: 'Self',
      email: 'jordan@example.com',
      phone: '604-555-0199',
      mailingAddress: 'Vancouver, BC',
      hasPowerOfAttorney: input.hasPowerOfAttorney,
    },
    attachments: [],
    feeWaiver: { requested: false },
    requestedAt: new Date().toISOString(),
  };
}

describe('foiWizard payload wiring', () => {
  it('builds a BC Fraser Health payload matching selected facility', () => {
    const payload = assembleWizardPayload({
      patientId: 'pt-2044',
      jurisdiction: 'BC',
      facilityId: 'bc-fraser',
      scope: ['FULL_CHART', 'LAB_HISTORY'],
      hasPowerOfAttorney: false,
    });
    expect(payload.facility.name).toMatch(/Fraser Health/);
    expect(payload.jurisdiction).toBe('BC');
    expect(payload.scope).toEqual(['FULL_CHART', 'LAB_HISTORY']);
    expect(payload.patient.encryptedPhn).toContain('•');
  });

  it('builds a Quebec CIUSSS payload under LSSSS/AIPDP', () => {
    const payload = assembleWizardPayload({
      patientId: 'pt-2044',
      jurisdiction: 'QC',
      facilityId: 'qc-ciusss-centresud',
      scope: ['FULL_CHART'],
      hasPowerOfAttorney: true,
    });
    expect(payload.jurisdiction).toBe('QC');
    expect(payload.facility.name).toMatch(/CIUSSS/i);
    expect(payload.applicant.hasPowerOfAttorney).toBe(true);
  });

  it('builds a Manitoba Shared Health PHIA payload', () => {
    const payload = assembleWizardPayload({
      patientId: 'pt-1001',
      jurisdiction: 'MB',
      facilityId: 'mb-shared',
      scope: ['LAB_HISTORY', 'SPECIALIST_NOTES'],
      hasPowerOfAttorney: false,
    });
    expect(payload.facility.jurisdiction).toBe('MB');
    expect(payload.scope).toContain('LAB_HISTORY');
  });

  it('rejects facility/jurisdiction mismatches like the wizard guardrails', () => {
    expect(() =>
      assembleWizardPayload({
        patientId: 'pt-2044',
        jurisdiction: 'ON',
        facilityId: 'bc-fraser',
        scope: ['FULL_CHART'],
        hasPowerOfAttorney: false,
      }),
    ).toThrow(/mismatch/i);
  });
});
