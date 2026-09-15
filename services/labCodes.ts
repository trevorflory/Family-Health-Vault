/**
 * Stable internal lab codes with optional LOINC aliases for FHIR Observation mapping.
 * Educational indexing only — not clinical decision support.
 */

export interface LabCodeDefinition {
  /** Stable vault-internal code. */
  code: string;
  displayName: string;
  /** Optional LOINC for Phase B FHIR Observation.code mapping. */
  loinc?: string;
  aliases: string[];
}

export const LAB_CODE_CATALOG: readonly LabCodeDefinition[] = [
  {
    code: 'EGFR',
    displayName: 'eGFR',
    loinc: '33914-3',
    aliases: ['egfr', 'estimated gfr', 'gfr'],
  },
  {
    code: 'CREATININE',
    displayName: 'Creatinine',
    loinc: '2160-0',
    aliases: ['creatinine', 'creat', 'serum creatinine'],
  },
  {
    code: 'HBA1C',
    displayName: 'HbA1c',
    loinc: '4548-4',
    aliases: ['hba1c', 'a1c', 'hemoglobin a1c'],
  },
  {
    code: 'LDL',
    displayName: 'LDL',
    loinc: '2089-1',
    aliases: ['ldl', 'ldl-c', 'ldl cholesterol'],
  },
  {
    code: 'HDL',
    displayName: 'HDL',
    loinc: '2085-9',
    aliases: ['hdl', 'hdl-c', 'hdl cholesterol'],
  },
  {
    code: 'CHOLESTEROL',
    displayName: 'Cholesterol',
    loinc: '2093-3',
    aliases: ['cholesterol', 'total cholesterol'],
  },
  {
    code: 'TRIGLYCERIDES',
    displayName: 'Triglycerides',
    loinc: '2571-8',
    aliases: ['triglycerides', 'trig'],
  },
  {
    code: 'GLUCOSE',
    displayName: 'Glucose',
    loinc: '2345-7',
    aliases: ['glucose', 'blood glucose', 'fasting glucose'],
  },
  {
    code: 'POTASSIUM',
    displayName: 'Potassium',
    loinc: '2823-3',
    aliases: ['potassium', 'k+', 'k'],
  },
  {
    code: 'SODIUM',
    displayName: 'Sodium',
    loinc: '2951-2',
    aliases: ['sodium', 'na+', 'na'],
  },
] as const;

/** Biomarkers surfaced in Insights / visit-prep trend charts. */
export const TREND_BIOMARKER_CODES = [
  'EGFR',
  'HBA1C',
  'LDL',
  'CREATININE',
  'GLUCOSE',
] as const;

export type TrendBiomarkerCode = (typeof TREND_BIOMARKER_CODES)[number];

export function resolveLabCode(
  testName: string,
): LabCodeDefinition | undefined {
  const key = testName.trim().toLowerCase();
  if (!key) return undefined;
  return LAB_CODE_CATALOG.find(
    (def) =>
      def.displayName.toLowerCase() === key ||
      def.code.toLowerCase() === key ||
      def.aliases.some((a) => a === key),
  );
}

export function enrichLabWithCode(lab: {
  testName: string;
  value: string;
  units: string;
  referenceRange?: string;
}): {
  testName: string;
  value: string;
  units: string;
  referenceRange?: string;
  code?: string;
  loinc?: string;
} {
  const def = resolveLabCode(lab.testName);
  if (!def) return lab;
  return {
    ...lab,
    testName: def.displayName,
    code: def.code,
    ...(def.loinc ? { loinc: def.loinc } : {}),
  };
}
