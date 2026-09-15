/**
 * Smoke test for MedicalEvents persistence wiring used by OCR confirm flow.
 * Uses an in-memory stand-in matching types/db.ts SaveMedicalEventInput shape.
 */
import type { OcrParsedPayload, SaveMedicalEventInput } from '../types/db';
import {
  inferMedicalEventKind,
  parseOcrDocument,
} from '../services/ocrTextParsers';

function buildSaveInput(
  patientId: string,
  rawText: string,
  status: SaveMedicalEventInput['status'],
): SaveMedicalEventInput {
  const parsed: OcrParsedPayload = parseOcrDocument(rawText);
  return {
    patientId,
    kind: inferMedicalEventKind(parsed),
    sourceUri: 'file:///tmp/lab.jpg',
    rawText,
    parsed,
    status,
    sourceType: 'OCR',
  };
}

describe('OCR → MedicalEvents wiring', () => {
  it('builds a PENDING_REVIEW then CONFIRMED payload with raw + parsed JSON', () => {
    const raw = 'eGFR 55 mL/min/1.73m2 (ref 60-120)';
    const pending = buildSaveInput('pt-7801', raw, 'PENDING_REVIEW');
    expect(pending.status).toBe('PENDING_REVIEW');
    expect(pending.kind).toBe('LAB_RESULT');
    expect('labs' in pending.parsed && pending.parsed.labs[0]).toMatchObject({
      testName: 'eGFR',
      value: '55',
      units: 'mL/min/1.73m2',
      code: 'EGFR',
    });

    const confirmed = { ...pending, status: 'CONFIRMED' as const };
    const parsedJson = JSON.stringify(confirmed.parsed);
    expect(JSON.parse(parsedJson).labs[0].value).toBe('55');
    expect(confirmed.rawText).toContain('eGFR');
  });

  it('classifies portal screenshot OCR as PORTAL_SCREENSHOT', () => {
    const raw = `
Patient Lab Report - Portal Screenshot MySaskHealthRecord
eGFR 55 mL/min/1.73m2 (ref 60-120)
`;
    const pending = buildSaveInput('pt-7801', raw, 'PENDING_REVIEW');
    expect(pending.kind).toBe('PORTAL_SCREENSHOT');
    expect(
      'documentHint' in pending.parsed && pending.parsed.documentHint,
    ).toBe('portal');
  });
});
