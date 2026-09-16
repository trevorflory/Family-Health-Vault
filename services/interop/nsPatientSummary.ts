/**
 * Pure YourHealthNS Patient Summary text parser.
 * Caregivers share/print Patient Summary; we extract lab-like lines only.
 */

import type { LabResultParsed } from '../../types/db';
import { parseLabResults } from '../ocrTextParsers';

export interface NsPatientSummaryParseResult {
  labs: LabResultParsed[];
  sectionsSeen: string[];
  notes: string[];
}

const SECTION =
  /^(allergies|conditions|diagnostic imaging|hospital visits|immunizations|laboratory|lab results|medications|patient summary)\b/i;

/**
 * Parse Patient Summary / Records paste text into labs + section hints.
 */
export function parseNsPatientSummaryText(
  rawText: string,
): NsPatientSummaryParseResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim());
  const sectionsSeen: string[] = [];
  for (const line of lines) {
    const m = line.match(SECTION);
    if (m?.[1]) sectionsSeen.push(m[1].toLowerCase());
  }
  const labs = parseLabResults(rawText);
  const notes: string[] = [];
  if (sectionsSeen.length) {
    notes.push(`Patient Summary sections detected: ${sectionsSeen.join(', ')}`);
  }
  if (!labs.length) {
    notes.push(
      'No lab values matched — ensure Laboratory / lab result lines are included in the paste.',
    );
  } else {
    notes.push(`Extracted ${labs.length} lab value(s) from Patient Summary text.`);
  }
  return { labs, sectionsSeen, notes };
}

export const NS_SAMPLE_PATIENT_SUMMARY_TEXT = [
  'Patient Summary',
  'Laboratory',
  'eGFR 56 mL/min/1.73m2 (ref 60-120)',
  'HbA1c 7.0 %',
  'LDL 2.9 mmol/L',
  'Medications',
  'Atorvastatin 20 mg once daily',
].join('\n');
