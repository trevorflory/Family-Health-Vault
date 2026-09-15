import {
  assertAllJurisdictionsCatalogued,
  FOI_JURISDICTION_OPTIONS,
} from '../data/foiJurisdictions';
import {
  HEALTH_AUTHORITIES,
  jurisdictionsMissingFacilities,
} from '../data/healthAuthorities';
import {
  buildFOIRequestHtml,
  getLegalMeta,
  scopeLabel,
} from '../services/foiTemplate';
import {
  ALL_CANADIAN_JURISDICTIONS,
  type CanadianJurisdiction,
  type FOIRequestPayload,
} from '../types/foiPayload';

const ACT_BY_JURISDICTION: Record<CanadianJurisdiction, string> = {
  ON: 'PHIPA',
  SK: 'HIPA',
  AB: 'HIA',
  BC: 'FIPPA/PIPA',
  MB: 'PHIA',
  NB: 'PHIPAA',
  NS: 'PHIA',
  NL: 'PHIA/ATIPPA',
  PE: 'HIA/FOIPP',
  QC: 'LSSSS/AIPDP',
  YT: 'HIPMA/ATIPP',
  NT: 'HIA/ATIPP',
  NU: 'ATIPP',
};

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
  it('covers all 13 Canadian jurisdictions with correct act short names', () => {
    expect(ALL_CANADIAN_JURISDICTIONS).toHaveLength(13);
    for (const code of ALL_CANADIAN_JURISDICTIONS) {
      expect(getLegalMeta(code).actShortName).toBe(ACT_BY_JURISDICTION[code]);
      expect(getLegalMeta(code).declaration.length).toBeGreaterThan(40);
      expect(getLegalMeta(code).actFullName.length).toBeGreaterThan(10);
    }
  });

  it('catalogues every jurisdiction for the wizard picker', () => {
    expect(() => assertAllJurisdictionsCatalogued()).not.toThrow();
    expect(FOI_JURISDICTION_OPTIONS).toHaveLength(13);
    for (const opt of FOI_JURISDICTION_OPTIONS) {
      expect(opt.actShortName).toBe(getLegalMeta(opt.code).actShortName);
    }
  });

  it('provides at least one facility template per jurisdiction', () => {
    expect(jurisdictionsMissingFacilities()).toEqual([]);
    for (const code of ALL_CANADIAN_JURISDICTIONS) {
      const facilities = HEALTH_AUTHORITIES.filter((f) => f.jurisdiction === code);
      expect(facilities.length).toBeGreaterThanOrEqual(1);
    }
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
      samplePayload({
        jurisdiction: 'ON',
        facility: uhn,
        feeWaiver: { requested: false },
      }),
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
    expect(html).toContain(
      'Power of Attorney / substitute decision-maker:</strong> Yes',
    );
  });

  it.each([
    ['MB', 'mb-shared', 'Personal Health Information Act'],
    ['NB', 'nb-horizon', 'Personal Health Information Privacy and Access Act'],
    ['NS', 'ns-nsha', 'Personal Health Information Act'],
    ['NL', 'nl-nlhs', 'Access to Information and Protection of Privacy Act'],
    ['PE', 'pe-healthpei', 'Health Information Act'],
    ['QC', 'qc-ciusss-centresud', 'Loi sur les services de santé'],
    ['YT', 'yt-hss', 'Health Information Privacy and Management Act'],
    ['NT', 'nt-nthssa', 'Northwest Territories'],
    ['NU', 'nu-health', 'Access to Information and Protection of Privacy Act'],
  ] as const)(
    'renders %s facility template with matching statute language',
    (code, facilityId, statuteSnippet) => {
      const facility = HEALTH_AUTHORITIES.find((f) => f.id === facilityId)!;
      expect(facility.jurisdiction).toBe(code);
      const html = buildFOIRequestHtml(
        samplePayload({ jurisdiction: code, facility }),
      );
      expect(html).toContain(facility.name);
      expect(html).toContain(statuteSnippet);
      expect(html).toContain(getLegalMeta(code).actShortName);
    },
  );
});
