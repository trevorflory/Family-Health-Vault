import {
  buildFOIRequestHtml,
  getLegalMeta,
  scopeLabel,
} from '../services/foiTemplate';
import type { FOIRequestPayload } from '../types/foiPayload';
import { HEALTH_AUTHORITIES } from '../data/healthAuthorities';

function samplePayload(
  overrides: Partial<FOIRequestPayload> = {},
): FOIRequestPayload {
  const facility = HEALTH_AUTHORITIES.find((f) => f.id === 'sk-sha')!;
  return {
    jurisdiction: 'SK',
    facility,
    patient: {
      patientId: 'pt-1001',
      fullName: 'Avery Chen',
      dateOfBirth: '1968-04-12',
      encryptedPhn: '••••-•••-8841',
    },
    scope: ['FULL_CHART', 'DICOM_CDS', 'LAB_HISTORY', 'SPECIALIST_NOTES'],
    applicant: {
      fullName: 'Avery Chen',
      relationship: 'Self',
      email: 'avery@example.com',
      phone: '306-555-0100',
      mailingAddress: '123 Prairie Ave, Saskatoon, SK',
      hasPowerOfAttorney: false,
    },
    attachments: [
      {
        uri: 'file:///tmp/license.jpg',
        fileName: 'drivers-license.jpg',
        mimeType: 'image/jpeg',
        kind: 'DRIVERS_LICENSE',
      },
    ],
    feeWaiver: { requested: true, reason: 'Financial hardship' },
    requestedAt: '2026-09-14T15:00:00.000Z',
    ...overrides,
  };
}

describe('foiTemplate legal builders', () => {
  it('maps each Canadian jurisdiction to the correct act', () => {
    expect(getLegalMeta('ON').actShortName).toBe('PHIPA');
    expect(getLegalMeta('SK').actShortName).toBe('HIPA');
    expect(getLegalMeta('AB').actShortName).toBe('HIA');
    expect(getLegalMeta('BC').actShortName).toBe('FIPPA/PIPA');
  });

  it('labels all required scope items', () => {
    expect(scopeLabel('FULL_CHART')).toMatch(/historical/i);
    expect(scopeLabel('DICOM_CDS')).toMatch(/DICOM/i);
    expect(scopeLabel('LAB_HISTORY')).toMatch(/Lab/i);
    expect(scopeLabel('SPECIALIST_NOTES')).toMatch(/Specialist/i);
  });

  it('renders Saskatchewan HIPA template with facility, patient, scope, fee waiver', () => {
    const html = buildFOIRequestHtml(samplePayload());
    expect(html).toContain('Saskatchewan Health Authority');
    expect(html).toContain('Health Information Protection Act');
    expect(html).toContain('Avery Chen');
    expect(html).toContain('••••-•••-8841');
    expect(html).toContain('DICOM medical imaging');
    expect(html).toContain('Fee Waiver Justification');
    expect(html).toContain('Financial hardship');
    expect(html).toContain('drivers-license.jpg');
  });

  it('invokes PHIPA for Ontario UHN requests', () => {
    const uhn = HEALTH_AUTHORITIES.find((f) => f.id === 'on-uhn')!;
    const html = buildFOIRequestHtml(
      samplePayload({ jurisdiction: 'ON', facility: uhn, feeWaiver: { requested: false } }),
    );
    expect(html).toContain('University Health Network');
    expect(html).toContain('Personal Health Information Protection Act');
    expect(html).not.toContain('Fee Waiver Justification');
  });

  it('invokes FIPPA/PIPA for Fraser Health BC', () => {
    const fraser = HEALTH_AUTHORITIES.find((f) => f.id === 'bc-fraser')!;
    const html = buildFOIRequestHtml(
      samplePayload({ jurisdiction: 'BC', facility: fraser }),
    );
    expect(html).toContain('Fraser Health');
    expect(html).toContain('Freedom of Information and Protection of Privacy Act');
  });

  it('invokes HIA for Alberta Health Services', () => {
    const ahs = HEALTH_AUTHORITIES.find((f) => f.id === 'ab-ahs')!;
    const html = buildFOIRequestHtml(
      samplePayload({
        jurisdiction: 'AB',
        facility: ahs,
        applicant: {
          fullName: 'Proxy Person',
          relationship: 'Attorney',
          email: 'proxy@example.com',
          phone: '780-555-0100',
          mailingAddress: 'Edmonton, AB',
          hasPowerOfAttorney: true,
        },
      }),
    );
    expect(html).toContain('Alberta Health Services');
    expect(html).toContain('Health Information Act');
    expect(html).toContain('Power of Attorney / substitute decision-maker:</strong> Yes');
  });
});
