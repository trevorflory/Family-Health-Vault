jest.mock('../db/medicalEvents', () => {
  const store = new Map<string, Record<string, unknown>>();
  return {
    saveMedicalEvent: jest.fn(async (input: Record<string, unknown>) => {
      const id =
        (input.id as string | undefined) ??
        `me_${String(store.size + 1)}_${String(input.externalId ?? 'x')}`;
      const record = {
        id,
        patientId: input.patientId,
        kind: input.kind,
        sourceUri: input.sourceUri ?? null,
        rawText: input.rawText,
        parsedJson: JSON.stringify(input.parsed),
        status: input.status,
        sourceType: input.sourceType ?? 'OCR',
        sourceAuthorityId: input.sourceAuthorityId ?? null,
        externalId: input.externalId ?? null,
        lastSyncedAt: input.lastSyncedAt ?? null,
        createdAt: '2026-09-15T12:00:00.000Z',
        updatedAt: '2026-09-15T12:00:00.000Z',
      };
      store.set(id, record);
      return record;
    }),
    findMedicalEventByExternalId: jest.fn(
      async (patientId: string, externalId: string) => {
        for (const row of store.values()) {
          if (row.patientId === patientId && row.externalId === externalId) {
            return row;
          }
        }
        return null;
      },
    ),
    listMedicalEventsForPatient: jest.fn(async () => [...store.values()]),
    getMedicalEventById: jest.fn(async () => null),
    __store: store,
  };
});

import { ON_EXPORT_PLAYBOOK } from '../data/onInterop';
import { getFacilityById } from '../data/healthAuthorities';
import {
  getOnSmartAuthStatus,
  importOnFhirJsonExport,
  importOnMyChartLabText,
  ON_SAMPLE_FHIR_BUNDLE_JSON,
  syncOnSampleToVault,
} from '../services/interop/onConnector';
import { saveMedicalEvent } from '../db/medicalEvents';

describe('Ontario MyChart/OLIS connector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mocked = jest.requireMock('../db/medicalEvents') as {
      __store: Map<string, unknown>;
    };
    mocked.__store.clear();
  });

  it('documents fragmented portal playbook and non-public SMART', () => {
    expect(ON_EXPORT_PLAYBOOK.length).toBeGreaterThanOrEqual(4);
    expect(getOnSmartAuthStatus().ok).toBe(false);
    expect(getFacilityById('on-patient-portals')?.interop?.syncMode).toBe(
      'FILE_IMPORT',
    );
  });

  it('imports ON sample FHIR with portal-path provenance', async () => {
    const { result, smart } = await syncOnSampleToVault({
      patientId: 'pt-on-01',
      now: new Date('2026-09-15T12:00:00.000Z'),
    });
    expect(smart.ok).toBe(false);
    expect(result.authorityId).toBe('on-patient-portals');
    expect(result.jurisdiction).toBe('ON');
    expect(result.importedCount).toBeGreaterThanOrEqual(4);
    expect(saveMedicalEvent).toHaveBeenCalled();
  });

  it('imports ON FHIR JSON bundle string', async () => {
    const pull = await importOnFhirJsonExport({
      patientId: 'pt-on-01',
      jsonText: ON_SAMPLE_FHIR_BUNDLE_JSON,
    });
    expect(pull.parseError).toBeUndefined();
    expect(pull.importedCount).toBeGreaterThanOrEqual(4);
  });

  it('imports MyChart/OLIS lab text as portal FILE_IMPORT', async () => {
    const { record, parsed } = await importOnMyChartLabText({
      patientId: 'pt-on-01',
      rawText: 'eGFR 49 mL/min/1.73m2\nHbA1c 7.5 %',
    });
    expect(record.sourceType).toBe('FILE_IMPORT');
    expect(record.sourceAuthorityId).toBe('on-patient-portals');
    expect(record.kind).toBe('PORTAL_SCREENSHOT');
    expect(parsed.labs.length).toBeGreaterThanOrEqual(1);
    expect(parsed.portalLabel).toMatch(/MyChart|OLIS/i);
  });
});
