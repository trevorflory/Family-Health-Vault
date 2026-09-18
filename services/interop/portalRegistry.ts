/**
 * Mobile-first registry of provincial FILE_IMPORT connectors for portal sync UI.
 */

import { getFacilityById } from '../../data/healthAuthorities';
import type { CanadianJurisdiction } from '../../types/foiPayload';
import type { InteropPullResult } from '../../types/interop';
import {
  getAbExportPlaybook,
  getAbSmartAuthStatus,
  importAbFhirJsonExport,
  syncAbSampleToVault,
} from './abConnector';
import {
  getBcExportPlaybook,
  getBcSmartAuthStatus,
  importBcFhirJsonExport,
  syncBcSampleToVault,
} from './bcConnector';
import { REMAINING_CANADA_CONNECTORS } from './canadaRemainingConnectors';
import {
  getMbExportPlaybook,
  getMbSmartAuthStatus,
  importMbFhirJsonExport,
  syncMbSampleToVault,
} from './mbConnector';
import {
  getNsExportPlaybook,
  getNsSmartAuthStatus,
  importNsFhirJsonExport,
  syncNsSampleToVault,
} from './nsConnector';
import {
  getOnExportPlaybook,
  getOnSmartAuthStatus,
  importOnFhirJsonExport,
  syncOnSampleToVault,
} from './onConnector';
import {
  getQcExportPlaybook,
  getQcSmartAuthStatus,
  importQcFhirJsonExport,
  syncQcSampleToVault,
} from './qcConnector';
import {
  getSkExportPlaybook,
  getSkSmartAuthStatus,
  importSkFhirJsonExport,
  syncSkSampleToVault,
} from './skConnector';

export type PortalSyncMode = 'FILE_IMPORT' | 'MANUAL_ONLY' | 'SMART_FHIR';

export interface PortalPlaybookStep {
  id: string;
  title: string;
  detail: string;
}

export interface PortalConnectorEntry {
  jurisdiction: CanadianJurisdiction;
  authorityId: string;
  regionName: string;
  portalLabel: string;
  syncMode: PortalSyncMode;
  blurb: string;
  getPlaybook: () => PortalPlaybookStep[];
  getSmartMessage: () => string;
  syncSample: (opts: {
    patientId: string;
    now?: Date;
  }) => Promise<{
    auth: { message: string };
    result: InteropPullResult;
  }>;
  importFhirJson: (opts: {
    patientId: string;
    jsonText: string;
  }) => Promise<InteropPullResult & { parseError?: string }>;
}

const REGION_NAMES: Record<CanadianJurisdiction, string> = {
  AB: 'Alberta',
  BC: 'British Columbia',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  ON: 'Ontario',
  PE: 'Prince Edward Island',
  QC: 'Québec',
  SK: 'Saskatchewan',
  YT: 'Yukon',
};

function modeFor(authorityId: string): PortalSyncMode {
  return (
    (getFacilityById(authorityId)?.interop?.syncMode as PortalSyncMode) ??
    'FILE_IMPORT'
  );
}

const CORE: PortalConnectorEntry[] = [
  {
    jurisdiction: 'SK',
    authorityId: 'sk-sha',
    regionName: REGION_NAMES.SK,
    portalLabel: 'MySaskHealthRecord',
    syncMode: modeFor('sk-sha'),
    blurb: 'PDF/lab export from MySask — FOI via SHA when incomplete.',
    getPlaybook: getSkExportPlaybook,
    getSmartMessage: () => getSkSmartAuthStatus().message,
    syncSample: syncSkSampleToVault,
    importFhirJson: importSkFhirJsonExport,
  },
  {
    jurisdiction: 'AB',
    authorityId: 'ab-ahs',
    regionName: REGION_NAMES.AB,
    portalLabel: 'MyHealth Records',
    syncMode: modeFor('ab-ahs'),
    blurb: 'Print Lab Results from Alberta MyHealth.',
    getPlaybook: getAbExportPlaybook,
    getSmartMessage: () => getAbSmartAuthStatus().message,
    syncSample: syncAbSampleToVault,
    importFhirJson: importAbFhirJsonExport,
  },
  {
    jurisdiction: 'BC',
    authorityId: 'bc-health-gateway',
    regionName: REGION_NAMES.BC,
    portalLabel: 'Health Gateway',
    syncMode: modeFor('bc-health-gateway'),
    blurb: 'Download records PDF or CSV from Health Gateway (desktop).',
    getPlaybook: getBcExportPlaybook,
    getSmartMessage: () => getBcSmartAuthStatus().message,
    syncSample: syncBcSampleToVault,
    importFhirJson: importBcFhirJsonExport,
  },
  {
    jurisdiction: 'ON',
    authorityId: 'on-patient-portals',
    regionName: REGION_NAMES.ON,
    portalLabel: 'MyChart / OLIS',
    syncMode: modeFor('on-patient-portals'),
    blurb: 'Hospital MyChart + OLIS — no single provincial portal.',
    getPlaybook: getOnExportPlaybook,
    getSmartMessage: () => getOnSmartAuthStatus().message,
    syncSample: syncOnSampleToVault,
    importFhirJson: importOnFhirJsonExport,
  },
  {
    jurisdiction: 'QC',
    authorityId: 'qc-carnet-sante',
    regionName: REGION_NAMES.QC,
    portalLabel: 'Carnet santé Québec',
    syncMode: modeFor('qc-carnet-sante'),
    blurb: 'View/print prélèvements in Carnet santé; FOI via CIUSSS.',
    getPlaybook: getQcExportPlaybook,
    getSmartMessage: () => getQcSmartAuthStatus().message,
    syncSample: syncQcSampleToVault,
    importFhirJson: importQcFhirJsonExport,
  },
  {
    jurisdiction: 'MB',
    authorityId: 'mb-shared',
    regionName: REGION_NAMES.MB,
    portalLabel: 'eChart / Shared Health',
    syncMode: modeFor('mb-shared'),
    blurb: 'eChart is clinician-facing — PHI form or care-org portal OCR.',
    getPlaybook: getMbExportPlaybook,
    getSmartMessage: () => getMbSmartAuthStatus().message,
    syncSample: syncMbSampleToVault,
    importFhirJson: importMbFhirJsonExport,
  },
  {
    jurisdiction: 'NS',
    authorityId: 'ns-nsha',
    regionName: REGION_NAMES.NS,
    portalLabel: 'YourHealthNS',
    syncMode: modeFor('ns-nsha'),
    blurb: 'Records + Patient Summary via My NS Account.',
    getPlaybook: getNsExportPlaybook,
    getSmartMessage: () => getNsSmartAuthStatus().message,
    syncSample: syncNsSampleToVault,
    importFhirJson: importNsFhirJsonExport,
  },
];

const REMAINING: PortalConnectorEntry[] = REMAINING_CANADA_CONNECTORS.map(
  (kit) => ({
    jurisdiction: kit.jurisdiction,
    authorityId: kit.authorityId,
    regionName: REGION_NAMES[kit.jurisdiction],
    portalLabel: kit.portal.label,
    syncMode: modeFor(kit.authorityId),
    blurb:
      kit.jurisdiction === 'NB' ||
      kit.jurisdiction === 'NL' ||
      kit.jurisdiction === 'PE'
        ? `${kit.portal.label} consumer portal — print/OCR into the vault.`
        : 'No general consumer portal — care-team copies or ATIPP first.',
    getPlaybook: () => kit.getExportPlaybook(),
    getSmartMessage: () => kit.getSmartAuthStatus().message,
    syncSample: async (opts) => {
      const { auth, result } = await kit.syncSampleToVault(opts);
      return { auth, result };
    },
    importFhirJson: (opts) => kit.importFhirJsonExport(opts),
  }),
);

/** All 13 subdivisions, A–Z by region name for the picker. */
export const PORTAL_CONNECTOR_REGISTRY: PortalConnectorEntry[] = [
  ...CORE,
  ...REMAINING,
].sort((a, b) => a.regionName.localeCompare(b.regionName));

export function getPortalConnector(
  jurisdiction: string | undefined,
): PortalConnectorEntry | undefined {
  if (!jurisdiction) return undefined;
  const code = jurisdiction.toUpperCase();
  return PORTAL_CONNECTOR_REGISTRY.find((e) => e.jurisdiction === code);
}
