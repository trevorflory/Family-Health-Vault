/**
 * Smoke test for MedicalEvents persistence wiring used by OCR confirm flow.
 * Uses an in-memory stand-in matching types/db.ts SaveMedicalEventInput shape.
 */
import type { OcrParsedPayload, SaveMedicalEventInput } from '../types/db';
import { parseOcrDocument } from '../services/ocrTextParsers';

function buildSaveInput(
  patientId: string,
  rawText: string,
  status: SaveMedicalEventInput['status'],
): SaveMedicalEventInput {
  const parsed: OcrParsedPayload = parseOcrDocument(rawText);
  return {
    patientId,
    kind:
      parsed.documentHint === 'lab'
        ? 'LAB_RESULT'
        : parsed.documentHint === 'prescription'
          ? 'PRESCRIPTION'
          : 'UNSTRUCTURED_DOC',
    sourceUri: 'file:///tmp/lab.jpg',
    rawText,
    parsed,
    status,
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
    });

    const confirmed = { ...pending, status: 'CONFIRMED' as const };
    const parsedJson = JSON.stringify(confirmed.parsed);
    expect(JSON.parse(parsedJson).labs[0].value).toBe('55');
    expect(confirmed.rawText).toContain('eGFR');
  });
});
