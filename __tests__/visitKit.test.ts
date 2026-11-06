const printToFileAsync = jest.fn();

jest.mock('expo-print', () => ({
  printToFileAsync: (...args: unknown[]) => printToFileAsync(...args),
}));

jest.mock('../db/medicalEvents', () => ({
  listMedicalEventsForPatient: jest.fn(async () => []),
}));

import {
  compileBiomarkerTrends,
  formatBiomarkerSummaryLines,
} from '../services/biomarkerTrends';
import { compileSBAR } from '../services/sbarEngine';
import {
  buildVisitKitHtml,
  generateVisitKitPDF,
  VISIT_KIT_NOTICE,
} from '../services/visitKitGenerator';
import type { MedicalEventRecord } from '../types/db';

const stamp = '2026-09-14T12:00:00.000Z';
const prior = '2026-03-01T12:00:00.000Z';

function labEvent(
  id: string,
  at: string,
  egfr: string,
): MedicalEventRecord {
  return {
    id,
    patientId: 'pt-7801',
    kind: 'LAB_RESULT',
    sourceUri: null,
    rawText: `eGFR ${egfr}`,
    parsedJson: JSON.stringify({
      documentHint: 'lab',
      labs: [
        {
          testName: 'eGFR',
          value: egfr,
          units: 'mL/min/1.73m2',
          referenceRange: '60-120',
          code: 'EGFR',
          loinc: '33914-3',
        },
      ],
      prescriptions: [],
      parserNotes: [],
    }),
    status: 'CONFIRMED',
    sourceType: 'OCR',
    sourceAuthorityId: 'sk-sha',
    externalId: null,
    lastSyncedAt: at,
    createdAt: at,
    updatedAt: at,
  };
}

describe('visitKit + biomarker summaries', () => {
  beforeEach(() => {
    printToFileAsync.mockReset();
  });

  it('formats multi-point biomarker summary lines', () => {
    const series = compileBiomarkerTrends([
      labEvent('a', prior, '58'),
      labEvent('b', stamp, '55'),
    ]);
    const lines = formatBiomarkerSummaryLines(series);
    expect(lines.join(' ')).toMatch(/eGFR/i);
    expect(lines.join(' ')).toMatch(/55/);
    expect(lines.join(' ')).toMatch(/2 values/);
  });

  it('HTML includes SBAR, labs, and SaMD notices', async () => {
    const sbar = await compileSBAR(
      'pt-7801',
      {
        visitReason: 'Nephrology follow-up',
        includeMedicalEvents: false,
      },
      { now: new Date(stamp) },
    );
    const series = compileBiomarkerTrends([labEvent('b', stamp, '55')]);
    const html = buildVisitKitHtml(sbar, series);
    expect(html).toMatch(/Situation/i);
    expect(html).toMatch(/eGFR/i);
    expect(html).toContain(VISIT_KIT_NOTICE);
    expect(html.toLowerCase()).not.toMatch(
      /you have been diagnosed|prescribe \d/,
    );
  });

  it('generateVisitKitPDF returns expo-print URI', async () => {
    printToFileAsync.mockResolvedValueOnce({ uri: 'file:///tmp/kit.pdf' });
    const sbar = await compileSBAR(
      'pt-7801',
      { visitReason: 'Visit', includeMedicalEvents: false },
      { now: new Date(stamp) },
    );
    const series = compileBiomarkerTrends([labEvent('b', stamp, '55')]);
    await expect(generateVisitKitPDF(sbar, series)).resolves.toBe(
      'file:///tmp/kit.pdf',
    );
  });
});
