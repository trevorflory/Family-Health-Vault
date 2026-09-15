import type {
  LabResultParsed,
  MedicalEventKind,
  OcrParsedPayload,
  PrescriptionParsed,
} from '../types/db';
import { enrichLabWithCode } from './labCodes';

const LAB_LINE =
  /(?<test>eGFR|EGFR|Creatinine|Creat|HbA1c|A1C|Hemoglobin|WBC|RBC|Platelets|Sodium|Potassium|Chloride|Glucose|ALT|AST|ALP|Bilirubin|TSH|Cholesterol|LDL|HDL|Triglycerides)[^\d\n]{0,40}?(?<value>\d+(?:\.\d+)?)\s*(?<units>mL\/min\/1\.73m2|mL\/min|mg\/dL|mmol\/L|g\/dL|g\/L|U\/L|x10\^9\/L|x10\^12\/L|%|IU\/L)?(?:[^\n]{0,40}?(?:ref(?:erence)?(?:\s*range)?|range|normal)[:\s]*(?<ref>[\d.<>=\-\s\/\.]+))?/gi;

const PORTAL_CHROME =
  /\b(portal\s*screenshot|patient\s*portal|mychart|mysask(?:healthrecord)?|my\s*health\s*records|myhealth|ehealth|care\s*connect|health\s*viewer|alberta\s*myhealth|ontario\s*health|telus\s*health|connectingontario|netcare|health\s*gateway|healthgateway|carnet\s*sant[eé]|carnetsante|echart|shared\s*health|mycare\s*noona)\b/i;

/**
 * True when OCR text looks like a provincial / vendor patient-portal capture.
 */
export function detectPortalScreenshot(rawText: string): boolean {
  return PORTAL_CHROME.test(rawText ?? '');
}

/**
 * Extract lab test name / value / units / reference range from OCR text.
 * Example: eGFR 55 mL/min/1.73m2
 */
export function parseLabResults(rawText: string): LabResultParsed[] {
  const labs: LabResultParsed[] = [];
  const seen = new Set<string>();
  const text = rawText ?? '';

  for (const match of text.matchAll(LAB_LINE)) {
    const testName = normalizeLabName(match.groups?.test ?? '');
    const value = (match.groups?.value ?? '').trim();
    if (!testName || !value) continue;

    let units = (match.groups?.units ?? '').trim();
    if (!units && /egfr/i.test(testName)) {
      units = 'mL/min/1.73m2';
    }

    const referenceRange = cleanReference(match.groups?.ref);
    const key = `${testName}|${value}|${units}`;
    if (seen.has(key)) continue;
    seen.add(key);

    labs.push(
      enrichLabWithCode({
        testName,
        value,
        units,
        ...(referenceRange ? { referenceRange } : {}),
      }),
    );
  }

  const compact =
    /\b(eGFR|Creatinine|HbA1c|Glucose|Potassium|Sodium|LDL|HDL)\b\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*([A-Za-zµuμ\/\^0-9\.]+)?(?:\s*\((?:ref(?:erence)?(?:\s*range)?)?[:\s]*([^)]+)\))?/gi;
  for (const match of text.matchAll(compact)) {
    const testName = normalizeLabName(match[1]);
    const value = match[2];
    const units = (
      match[3] ?? (/egfr/i.test(testName) ? 'mL/min/1.73m2' : '')
    ).trim();
    const referenceRange = cleanReference(match[4]);
    const key = `${testName}|${value}|${units}`;
    if (seen.has(key)) continue;
    seen.add(key);
    labs.push(
      enrichLabWithCode({
        testName,
        value,
        units,
        ...(referenceRange ? { referenceRange } : {}),
      }),
    );
  }

  return labs;
}

function normalizeLabName(name: string): string {
  const n = name.trim();
  if (/^egfr$/i.test(n)) return 'eGFR';
  if (/^a1c|hba1c$/i.test(n)) return 'HbA1c';
  if (/^creat$/i.test(n)) return 'Creatinine';
  return n;
}

function cleanReference(ref: string | undefined): string | undefined {
  if (!ref) return undefined;
  const cleaned = ref
    .replace(/\s+/g, ' ')
    .replace(/[^\d.<>=\-\s\/\.]/g, '')
    .trim();
  return cleaned || undefined;
}

const KNOWN_LAB_NAMES =
  /^(eGFR|EGFR|Creatinine|Creat|HbA1c|A1C|Hemoglobin|WBC|RBC|Platelets|Sodium|Potassium|Chloride|Glucose|ALT|AST|ALP|Bilirubin|TSH|Cholesterol|LDL|HDL|Triglycerides)$/i;

const RX_MEDICATION =
  /(?:Rx|Medication|Drug)\s*[:\-]\s*([A-Za-z][A-Za-z0-9\-\s\/]{1,40}?)(?:\n|,|$)/i;
const RX_DOSAGE =
  /(?:Dose|Dosage|Strength)\s*[:\-]\s*(\d+(?:\.\d+)?\s*(?:mg|mcg|g|mL|IU|units?)\b)/i;
const RX_DOSAGE_INLINE =
  /\b([A-Za-z][A-Za-z\-]+)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|IU))\b/;
const RX_FREQUENCY =
  /(?:Freq(?:uency)?|Sig|Directions?)\s*[:\-]\s*([^\n]+)|(once|twice|three times)\s+(daily|a day|weekly)|every\s+\d+\s+hours|\b(BID|TID|QID|QHS|PRN)\b|as needed|with meals/i;
const RX_DOCTOR =
  /(?:Dr\.?|Doctor|Prescriber|Prescribing\s+Physician)\s*[:\-]?\s*([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+){0,3})/;

/**
 * Extract prescription fields: medication, dosage, frequency, prescribing doctor.
 */
export function parsePrescription(rawText: string): PrescriptionParsed[] {
  const text = rawText ?? '';
  if (!text.trim()) return [];

  const looksLikeRx =
    /\brx\b|medication\s*[:\-]|prescrib|dosage\s*[:\-]|take\s+\d/i.test(text) ||
    (/\bDr\.?\s+[A-Z]/.test(text) &&
      /\d+(?:\.\d+)?\s*mg\b/i.test(text) &&
      !/\beGFR\b/i.test(text));

  if (!looksLikeRx && !RX_MEDICATION.test(text)) {
    return [];
  }

  let medicationName = '';
  let dosage = '';

  const labeledMed = text.match(RX_MEDICATION);
  if (labeledMed?.[1]) {
    medicationName = labeledMed[1].trim();
  }

  const labeledDose = text.match(RX_DOSAGE);
  if (labeledDose?.[1]) {
    dosage = labeledDose[1].trim();
  }

  if (!medicationName || !dosage) {
    const inline = text.match(RX_DOSAGE_INLINE);
    if (inline && !KNOWN_LAB_NAMES.test(inline[1])) {
      medicationName = medicationName || inline[1].trim();
      dosage = dosage || inline[2].trim();
    }
  }

  if (KNOWN_LAB_NAMES.test(medicationName)) {
    return [];
  }

  const freqMatch = text.match(RX_FREQUENCY);
  const frequency = (freqMatch?.[1] || freqMatch?.[0] || '')
    .replace(/^(Freq(?:uency)?|Sig|Directions?)\s*[:\-]?\s*/i, '')
    .trim();

  const docMatch = text.match(RX_DOCTOR);
  const prescribingDoctor = (docMatch?.[1] ?? '').trim();

  if (!medicationName && !dosage && !frequency && !prescribingDoctor) {
    return [];
  }

  return [
    {
      medicationName: medicationName || 'Unknown',
      dosage: dosage || 'Unknown',
      frequency: frequency || 'Unknown',
      prescribingDoctor: prescribingDoctor || 'Unknown',
    },
  ];
}

export function parseOcrDocument(rawText: string): OcrParsedPayload {
  const labs = parseLabResults(rawText);
  const prescriptions = parsePrescription(rawText);
  const parserNotes: string[] = [];
  const isPortal = detectPortalScreenshot(rawText);

  let documentHint: OcrParsedPayload['documentHint'] = 'unknown';
  if (isPortal) {
    documentHint = 'portal';
    parserNotes.push(
      'Portal chrome detected — saved as PORTAL_SCREENSHOT; review extracted fields before confirm.',
    );
  } else if (labs.length && !prescriptions.length) {
    documentHint = 'lab';
  } else if (prescriptions.length && !labs.length) {
    documentHint = 'prescription';
  } else if (labs.length && prescriptions.length) {
    documentHint = 'unknown';
    parserNotes.push(
      'Both lab and prescription patterns matched — review carefully.',
    );
  } else {
    parserNotes.push('No structured lab or prescription fields detected.');
  }

  if (labs.some((l) => l.testName === 'eGFR')) {
    parserNotes.push(
      'Detected eGFR — confirm units mL/min/1.73m2 on the source image.',
    );
  }

  return { documentHint, labs, prescriptions, parserNotes };
}

/** Infer MedicalEvents.kind from a verified OCR parse payload. */
export function inferMedicalEventKind(
  parsed: OcrParsedPayload,
): MedicalEventKind {
  if (parsed.documentHint === 'portal') return 'PORTAL_SCREENSHOT';
  if (parsed.documentHint === 'lab') return 'LAB_RESULT';
  if (parsed.documentHint === 'prescription') return 'PRESCRIPTION';
  return 'UNSTRUCTURED_DOC';
}
