import type { CanadianJurisdiction } from '../types/foiPayload';
import { ALL_CANADIAN_JURISDICTIONS } from '../types/foiPayload';

/**
 * Display catalog for the FOI wizard — one entry per Canadian province/territory.
 * Act short names must stay aligned with `LEGAL_META` in services/foiTemplate.ts.
 */
export interface FoiJurisdictionOption {
  code: CanadianJurisdiction;
  regionName: string;
  actShortName: string;
  /** Compact chip label: "ON (PHIPA)" */
  label: string;
}

export const FOI_JURISDICTION_OPTIONS: FoiJurisdictionOption[] = [
  { code: 'AB', regionName: 'Alberta', actShortName: 'HIA', label: 'AB (HIA)' },
  {
    code: 'BC',
    regionName: 'British Columbia',
    actShortName: 'FIPPA/PIPA',
    label: 'BC (FIPPA/PIPA)',
  },
  { code: 'MB', regionName: 'Manitoba', actShortName: 'PHIA', label: 'MB (PHIA)' },
  {
    code: 'NB',
    regionName: 'New Brunswick',
    actShortName: 'PHIPAA',
    label: 'NB (PHIPAA)',
  },
  {
    code: 'NL',
    regionName: 'Newfoundland and Labrador',
    actShortName: 'PHIA/ATIPPA',
    label: 'NL (PHIA/ATIPPA)',
  },
  {
    code: 'NS',
    regionName: 'Nova Scotia',
    actShortName: 'PHIA',
    label: 'NS (PHIA)',
  },
  {
    code: 'NT',
    regionName: 'Northwest Territories',
    actShortName: 'HIA/ATIPP',
    label: 'NT (HIA/ATIPP)',
  },
  {
    code: 'NU',
    regionName: 'Nunavut',
    actShortName: 'ATIPP',
    label: 'NU (ATIPP)',
  },
  { code: 'ON', regionName: 'Ontario', actShortName: 'PHIPA', label: 'ON (PHIPA)' },
  {
    code: 'PE',
    regionName: 'Prince Edward Island',
    actShortName: 'HIA/FOIPP',
    label: 'PE (HIA/FOIPP)',
  },
  {
    code: 'QC',
    regionName: 'Quebec',
    actShortName: 'LSSSS/AIPDP',
    label: 'QC (LSSSS/AIPDP)',
  },
  {
    code: 'SK',
    regionName: 'Saskatchewan',
    actShortName: 'HIPA',
    label: 'SK (HIPA)',
  },
  {
    code: 'YT',
    regionName: 'Yukon',
    actShortName: 'HIPMA/ATIPP',
    label: 'YT (HIPMA/ATIPP)',
  },
];

/** Assert catalog covers every typed jurisdiction (compile-time + runtime guard). */
export function assertAllJurisdictionsCatalogued(): void {
  const codes = new Set(FOI_JURISDICTION_OPTIONS.map((j) => j.code));
  for (const code of ALL_CANADIAN_JURISDICTIONS) {
    if (!codes.has(code)) {
      throw new Error(`Missing FOI jurisdiction catalog entry: ${code}`);
    }
  }
}
