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
    listMedicalEventsForPatient: jest.fn(async (patientId?: string) =>
      [...store.values()].filter(
        (r) => !patientId || r.patientId === patientId,
      ),
    ),
    getMedicalEventById: jest.fn(async () => null),
    __store: store,
  };
});

import {
  BC_SAMPLE_HEALTH_GATEWAY_CSV,
  parseBcHealthGatewayCsv,
} from '../services/interop/bcCsv';
import {
  importBcHealthGatewayCsv,
} from '../services/interop/bcConnector';
import {
  NS_SAMPLE_PATIENT_SUMMARY_TEXT,
  parseNsPatientSummaryText,
} from '../services/interop/nsPatientSummary';
import { importNsPatientSummaryText } from '../services/interop/nsConnector';
import {
  getVaultCryptoStatus,
  isDemoVaultCryptoKey,
} from '../services/vaultCrypto';
import { askMyVault } from '../services/askVault';
import { resetProxyAccessStore } from '../services/proxyAccessEngine';
import { DEMO_CAREGIVER_ID } from '../data/caregiverHousehold';
import { NS_YOURHEALTH_EXPORT_PLAYBOOK } from '../data/nsInterop';
import { BC_HEALTH_GATEWAY_EXPORT_PLAYBOOK } from '../data/bcInterop';

describe('Phase B pilot fidelity (BC CSV + NS Patient Summary)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mocked = jest.requireMock('../db/medicalEvents') as {
      __store: Map<string, unknown>;
    };
    mocked.__store.clear();
  });

  it('parses Health Gateway CSV columns into LOINC-enriched labs', () => {
    const parsed = parseBcHealthGatewayCsv(BC_SAMPLE_HEALTH_GATEWAY_CSV);
    expect(parsed.labs.length).toBeGreaterThanOrEqual(3);
    expect(parsed.labs.some((l) => /egfr/i.test(l.testName))).toBe(true);
  });

  it('imports BC CSV as FILE_IMPORT portal event', async () => {
    const { record, parsed } = await importBcHealthGatewayCsv({
      patientId: 'pt-7801',
      csvText: BC_SAMPLE_HEALTH_GATEWAY_CSV,
    });
    expect(record.sourceType).toBe('FILE_IMPORT');
    expect(record.sourceAuthorityId).toBe('bc-health-gateway');
    expect(parsed.labs.length).toBeGreaterThanOrEqual(3);
  });

  it('parses YourHealthNS Patient Summary laboratory section', () => {
    const parsed = parseNsPatientSummaryText(NS_SAMPLE_PATIENT_SUMMARY_TEXT);
    expect(parsed.sectionsSeen).toEqual(
      expect.arrayContaining(['patient summary', 'laboratory', 'medications']),
    );
    expect(parsed.labs.length).toBeGreaterThanOrEqual(2);
  });

  it('imports NS Patient Summary text with ns-nsha provenance', async () => {
    const { record } = await importNsPatientSummaryText({
      patientId: 'pt-7801',
      rawText: NS_SAMPLE_PATIENT_SUMMARY_TEXT,
    });
    expect(record.sourceAuthorityId).toBe('ns-nsha');
    expect(record.sourceType).toBe('FILE_IMPORT');
  });

  it('documents deepened BC/NS playbooks', () => {
    expect(
      BC_HEALTH_GATEWAY_EXPORT_PLAYBOOK.some((s) => /csv/i.test(s.detail)),
    ).toBe(true);
    expect(
      NS_YOURHEALTH_EXPORT_PLAYBOOK.some((s) => /patient summary/i.test(s.title)),
    ).toBe(true);
  });
});

describe('Phase C vault crypto + proxy ask-vault', () => {
  beforeEach(async () => {
    await resetProxyAccessStore(new Date('2026-09-15T12:00:00.000Z'));
  });

  it('reports demo vault key status without logging secrets', () => {
    expect(isDemoVaultCryptoKey()).toBe(true);
    expect(getVaultCryptoStatus().usingDemoKey).toBe(true);
    expect(getVaultCryptoStatus().configured).toBe(false);
  });

  it('denies ask-vault without READ_VAULT grant and allows primary POA', async () => {
    const events = [
      {
        id: 'me_lab',
        patientId: 'pt-7801',
        kind: 'LAB_RESULT' as const,
        sourceUri: null,
        rawText: 'eGFR 55',
        parsedJson: JSON.stringify({
          labs: [{ testName: 'eGFR', value: '55', units: 'mL/min/1.73m2' }],
          prescriptions: [],
          parserNotes: [],
        }),
        status: 'CONFIRMED' as const,
        sourceType: 'OCR' as const,
        sourceAuthorityId: null,
        externalId: null,
        lastSyncedAt: null,
        createdAt: '2026-09-15T12:00:00.000Z',
        updatedAt: '2026-09-15T12:00:00.000Z',
      },
    ];

    await expect(
      askMyVault({
        question: 'What is eGFR?',
        events,
        proxy: {
          actorId: 'cg-no-grant',
          patientId: 'pt-7801',
          now: new Date('2026-09-15T12:00:00.000Z'),
        },
      }),
    ).rejects.toThrow(/READ_VAULT/i);

    const ok = await askMyVault({
      question: 'What is eGFR?',
      events,
      proxy: {
        actorId: DEMO_CAREGIVER_ID,
        patientId: 'pt-7801',
        now: new Date('2026-09-15T12:00:00.000Z'),
      },
    });
    expect(ok.accessLog?.action).toBe('ASK_MY_VAULT');
    expect(ok.accessLog?.permitted).toBe(true);
    expect(ok.citations.length).toBeGreaterThan(0);
  });
});
