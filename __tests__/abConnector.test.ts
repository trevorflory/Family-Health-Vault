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

import { MYHEALTH_AB_EXPORT_PLAYBOOK } from '../data/abInterop';
import {
  AB_SAMPLE_FHIR_BUNDLE_JSON,
  getAbSmartAuthStatus,
  importAbFhirJsonExport,
  importAbMyHealthLabText,
  syncAbSampleToVault,
} from '../services/interop/abConnector';
import { getFacilityById } from '../data/healthAuthorities';
import { saveMedicalEvent } from '../db/medicalEvents';

describe('Alberta MyHealth connector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mocked = jest.requireMock('../db/medicalEvents') as {
      __store: Map<string, unknown>;
    };
    mocked.__store.clear();
  });

  it('documents Print Lab Results playbook and non-public SMART', () => {
    expect(MYHEALTH_AB_EXPORT_PLAYBOOK.length).toBeGreaterThanOrEqual(4);
    expect(getAbSmartAuthStatus().ok).toBe(false);
    expect(getFacilityById('ab-ahs')?.interop?.syncMode).toBe('FILE_IMPORT');
  });

  it('imports AB sample FHIR with AHS provenance', async () => {
    const { result, smart } = await syncAbSampleToVault({
      patientId: 'pt-ab-01',
      now: new Date('2026-09-15T12:00:00.000Z'),
    });
    expect(smart.ok).toBe(false);
    expect(result.authorityId).toBe('ab-ahs');
    expect(result.jurisdiction).toBe('AB');
    expect(result.importedCount).toBeGreaterThanOrEqual(4);
    expect(saveMedicalEvent).toHaveBeenCalled();
  });

  it('imports AB FHIR JSON bundle string', async () => {
    const pull = await importAbFhirJsonExport({
      patientId: 'pt-ab-01',
      jsonText: AB_SAMPLE_FHIR_BUNDLE_JSON,
    });
    expect(pull.parseError).toBeUndefined();
    expect(pull.importedCount).toBeGreaterThanOrEqual(4);
  });

  it('imports MyHealth lab text as portal FILE_IMPORT', async () => {
    const { record, parsed } = await importAbMyHealthLabText({
      patientId: 'pt-ab-01',
      rawText: 'eGFR 58 mL/min/1.73m2\nHbA1c 6.9 %',
    });
    expect(record.sourceType).toBe('FILE_IMPORT');
    expect(record.sourceAuthorityId).toBe('ab-ahs');
    expect(record.kind).toBe('PORTAL_SCREENSHOT');
    expect(parsed.labs.length).toBeGreaterThanOrEqual(1);
    expect(parsed.portalLabel).toMatch(/MyHealth/i);
  });
});
