import {
  parseLabResults,
  parseOcrDocument,
  parsePrescription,
  inferMedicalEventKind,
} from '../services/ocrTextParsers';

const LAB_SAMPLE = `
Patient Lab Report - Portal Screenshot
Collected: 2026-09-10

eGFR 55 mL/min/1.73m2 (ref 60-120)
Creatinine: 1.4 mg/dL reference range 0.7-1.3
HbA1c 7.2 % (ref <5.7)
Potassium 4.1 mmol/L
`;

const RX_SAMPLE = `
Rx
Medication: Metformin
Dosage: 500 mg
Frequency: twice daily
Prescribing Doctor: Dr. Sarah Nguyen
`;

const BOTTLE_SAMPLE = `
Metformin 500 mg
Take twice daily with meals
Dr. James Patel
`;

describe('ocrParser structured extractors', () => {
  it('parses lab test names, values, units, and reference ranges', () => {
    const labs = parseLabResults(LAB_SAMPLE);
    const egfr = labs.find((l) => l.testName === 'eGFR');
    expect(egfr).toMatchObject({
      testName: 'eGFR',
      value: '55',
      units: 'mL/min/1.73m2',
    });
    expect(egfr?.referenceRange).toMatch(/60/);

    const creat = labs.find((l) => l.testName === 'Creatinine');
    expect(creat?.value).toBe('1.4');
    expect(creat?.units).toMatch(/mg\/dL/i);

    const a1c = labs.find((l) => l.testName === 'HbA1c');
    expect(a1c?.value).toBe('7.2');
  });

  it('parses prescription medication, dosage, frequency, and doctor', () => {
    const rx = parsePrescription(RX_SAMPLE);
    expect(rx).toHaveLength(1);
    expect(rx[0]).toMatchObject({
      medicationName: expect.stringMatching(/Metformin/i),
      dosage: expect.stringMatching(/500\s*mg/i),
      frequency: expect.stringMatching(/twice daily/i),
      prescribingDoctor: expect.stringMatching(/Sarah Nguyen/i),
    });
  });

  it('parses compact prescription bottle OCR text', () => {
    const rx = parsePrescription(BOTTLE_SAMPLE);
    expect(rx[0].medicationName).toMatch(/Metformin/i);
    expect(rx[0].dosage).toMatch(/500\s*mg/i);
    expect(rx[0].prescribingDoctor).toMatch(/James Patel/i);
  });

  it('parseOcrDocument classifies lab vs prescription payloads', () => {
    const labDoc = parseOcrDocument(LAB_SAMPLE);
    expect(labDoc.documentHint).toBe('portal');
    expect(labDoc.labs.length).toBeGreaterThan(0);
    expect(labDoc.labs[0]?.code).toBe('EGFR');
    expect(labDoc.prescriptions).toHaveLength(0);

    const rxDoc = parseOcrDocument(RX_SAMPLE);
    expect(rxDoc.documentHint).toBe('prescription');
    expect(rxDoc.prescriptions.length).toBeGreaterThan(0);
  });

  it('infers PORTAL_SCREENSHOT kind for portal chrome with labs', () => {
    const parsed = parseOcrDocument(LAB_SAMPLE);
    expect(inferMedicalEventKind(parsed)).toBe('PORTAL_SCREENSHOT');
  });

  it('does not throw on empty or noisy OCR text', () => {
    expect(parseLabResults('')).toEqual([]);
    expect(parsePrescription('')).toEqual([]);
    expect(parseOcrDocument('lorem ipsum toolbar')).toMatchObject({
      documentHint: 'unknown',
      labs: [],
      prescriptions: [],
    });
  });
});
