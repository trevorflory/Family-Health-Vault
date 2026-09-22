/**
 * Honest marketplace readiness for LTC EHR vendors (like SK_SMART_READINESS).
 */

export type EhrMarketplaceReadiness =
  | 'FIXTURE'
  | 'SANDBOX'
  | 'NOT_LIVE'
  | 'MARKETPLACE';

export interface EhrPlaybook {
  vendor: 'POINTCLICKCARE' | 'MEDITECH_EXPANSE' | 'YARDI_LTC';
  label: string;
  readiness: EhrMarketplaceReadiness;
  authMode: 'OAUTH2_MARKETPLACE' | 'SAML2_MARKETPLACE';
  writeBack: false;
  notes: string;
}

export const EHR_PLAYBOOKS: readonly EhrPlaybook[] = [
  {
    vendor: 'POINTCLICKCARE',
    label: 'PointClickCare',
    readiness: 'FIXTURE',
    authMode: 'OAUTH2_MARKETPLACE',
    writeBack: false,
    notes:
      'Read-only ingest via marketplace OAuth. Local fixtures exercise meds, eMAR, calendar, vitals, and contacts. Live certification pending.',
  },
  {
    vendor: 'MEDITECH_EXPANSE',
    label: 'MEDITECH Expanse',
    readiness: 'NOT_LIVE',
    authMode: 'OAUTH2_MARKETPLACE',
    writeBack: false,
    notes: 'Connector stub only — do not claim a live marketplace launch.',
  },
  {
    vendor: 'YARDI_LTC',
    label: 'Yardi LTC',
    readiness: 'NOT_LIVE',
    authMode: 'SAML2_MARKETPLACE',
    writeBack: false,
    notes: 'Connector stub only — do not claim a live marketplace launch.',
  },
] as const;
