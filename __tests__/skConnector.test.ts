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

import {
  MYSASK_EXPORT_PLAYBOOK,
  SK_SMART_READINESS,
} from '../data/skInterop';
import { parseFhirExportJson } from '../services/interop/fhirJson';
import {
  getSkSmartAuthStatus,
  importSkFhirJsonExport,
  importSkMySaskLabText,
  SK_SAMPLE_FHIR_BUNDLE_JSON,
  syncSkSampleToVault,
} from '../services/interop/skConnector';
import {
  findMedicalEventByExternalId,
  saveMedicalEvent,
} from '../db/medicalEvents';

describe('Saskatchewan connector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mocked = jest.requireMock('../db/medicalEvents') as {
      __store: Map<string, unknown>;
    };
    mocked.__store.clear();
  });

  it('documents MySask PDF export playbook and non-public SMART status', () => {
    expect(MYSASK_EXPORT_PLAYBOOK.length).toBeGreaterThanOrEqual(4);
    expect(SK_SMART_READINESS.availability).toBe('NOT_PUBLIC');
    expect(getSkSmartAuthStatus().ok).toBe(false);
  });

  it('parses FHIR Bundle JSON exports', () => {
    const parsed = parseFhirExportJson(SK_SAMPLE_FHIR_BUNDLE_JSON);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.format).toBe('bundle');
      expect(parsed.resources.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('rejects invalid FHIR JSON', () => {
    expect(parseFhirExportJson('not-json').ok).toBe(false);
    expect(parseFhirExportJson('{"foo":1}').ok).toBe(false);
  });

  it('imports sample FHIR into vault with SHA provenance', async () => {
    const { result, smart } = await syncSkSampleToVault({
      patientId: 'pt-7801',
      now: new Date('2026-09-15T12:00:00.000Z'),
    });
    expect(smart.ok).toBe(false);
    expect(result.authorityId).toBe('sk-sha');
    expect(result.importedCount).toBeGreaterThanOrEqual(4);
    expect(saveMedicalEvent).toHaveBeenCalled();
    const egfr = await findMedicalEventByExternalId(
      'pt-7801',
      'Observation/sha-egfr-1',
    );
    expect(egfr).toBeTruthy();
    expect(egfr?.sourceAuthorityId).toBe('sk-sha');
  });

  it('re-imports by externalId without creating a second row', async () => {
    await syncSkSampleToVault({ patientId: 'pt-7801' });
    const callsAfterFirst = (saveMedicalEvent as jest.Mock).mock.calls.length;
    await syncSkSampleToVault({ patientId: 'pt-7801' });
    const callsAfterSecond = (saveMedicalEvent as jest.Mock).mock.calls.length;
    expect(callsAfterSecond).toBeGreaterThan(callsAfterFirst);
    const store = (
      jest.requireMock('../db/medicalEvents') as {
        __store: Map<string, { externalId?: string }>;
      }
    ).__store;
    const egfrRows = [...store.values()].filter(
      (r) => r.externalId === 'Observation/sha-egfr-1',
    );
    expect(egfrRows).toHaveLength(1);
  });

  it('imports FHIR JSON export string via file-import path', async () => {
    const pull = await importSkFhirJsonExport({
      patientId: 'pt-7801',
      jsonText: SK_SAMPLE_FHIR_BUNDLE_JSON,
    });
    expect(pull.parseError).toBeUndefined();
    expect(pull.importedCount).toBeGreaterThanOrEqual(4);
  });

  it('imports MySask lab text as portal-sourced FILE_IMPORT event', async () => {
    const { record, parsed } = await importSkMySaskLabText({
      patientId: 'pt-7801',
      rawText: 'eGFR 55 mL/min/1.73m2\nHbA1c 7.2 %',
    });
    expect(record.sourceType).toBe('FILE_IMPORT');
    expect(record.sourceAuthorityId).toBe('sk-sha');
    expect(record.kind).toBe('PORTAL_SCREENSHOT');
    expect(parsed.labs.length).toBeGreaterThanOrEqual(1);
    expect(parsed.portalLabel).toMatch(/MySask/i);
  });
});
