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

import { getFacilityById } from '../data/healthAuthorities';
import {
  REMAINING_CANADA_CONNECTORS,
  syncAllRemainingCanadaSamples,
} from '../services/interop/canadaRemainingConnectors';

describe('Remaining Canada FILE_IMPORT connectors (NB–NU)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mocked = jest.requireMock('../db/medicalEvents') as {
      __store: Map<string, unknown>;
    };
    mocked.__store.clear();
  });

  it('covers six jurisdictions with FILE_IMPORT facilities and non-public SMART', () => {
    expect(REMAINING_CANADA_CONNECTORS).toHaveLength(6);
    for (const kit of REMAINING_CANADA_CONNECTORS) {
      expect(kit.getSmartAuthStatus().ok).toBe(false);
      expect(kit.getExportPlaybook().length).toBeGreaterThanOrEqual(4);
      expect(getFacilityById(kit.authorityId)?.interop?.syncMode).toBe(
        'FILE_IMPORT',
      );
    }
  });

  it('imports sample FHIR for every remaining jurisdiction', async () => {
    const results = await syncAllRemainingCanadaSamples({
      patientId: 'pt-ca-rest-01',
      now: new Date('2026-09-15T12:00:00.000Z'),
    });
    expect(results).toHaveLength(6);
    const jurisdictions = results.map((r) => r.result.jurisdiction).sort();
    expect(jurisdictions).toEqual(['NB', 'NL', 'NT', 'NU', 'PE', 'YT']);
    for (const row of results) {
      expect(row.smart.ok).toBe(false);
      expect(row.result.importedCount).toBeGreaterThanOrEqual(4);
    }
  });

  it('imports lab text with provincial provenance for each kit', async () => {
    for (const kit of REMAINING_CANADA_CONNECTORS) {
      const { record, parsed } = await kit.importLabText({
        patientId: 'pt-ca-rest-01',
        rawText: 'eGFR 55 mL/min/1.73m2\nHbA1c 7.0 %',
      });
      expect(record.sourceType).toBe('FILE_IMPORT');
      expect(record.sourceAuthorityId).toBe(kit.authorityId);
      expect(record.kind).toBe('PORTAL_SCREENSHOT');
      expect(parsed.labs.length).toBeGreaterThanOrEqual(1);
    }
  });
});
