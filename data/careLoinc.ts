/**
 * LOINC catalog for home-care / shift-handover vitals and nutrition.
 * Educational indexing for FHIR Observation.code — not clinical decision support.
 */

export interface CareLoincDefinition {
  code: string;
  display: string;
  loinc: string;
  category: 'NUTRITION' | 'WEIGHT' | 'MEDICATION' | 'VITALS' | 'BEHAVIOR';
  unit?: string;
}

export const CARE_LOINC_CATALOG: readonly CareLoincDefinition[] = [
  {
    code: 'BODY_WEIGHT',
    display: 'Body weight',
    loinc: '29463-7',
    category: 'WEIGHT',
    unit: 'kg',
  },
  {
    code: 'BP_SYSTOLIC',
    display: 'Systolic blood pressure',
    loinc: '8480-6',
    category: 'VITALS',
    unit: 'mm[Hg]',
  },
  {
    code: 'BP_DIASTOLIC',
    display: 'Diastolic blood pressure',
    loinc: '8462-4',
    category: 'VITALS',
    unit: 'mm[Hg]',
  },
  {
    code: 'MEAL_INTAKE_PCT',
    display: 'Meal intake percentage',
    loinc: '67520-5',
    category: 'NUTRITION',
    unit: '%',
  },
  {
    code: 'FLUID_INTAKE',
    display: 'Fluid intake',
    loinc: '9000-7',
    category: 'NUTRITION',
    unit: 'mL',
  },
  {
    code: 'MEDS_VERIFIED',
    display: 'Medication administration verified',
    loinc: '99595-7',
    category: 'MEDICATION',
  },
  {
    code: 'MOOD_BEHAVIOR',
    display: 'Mood / behavior note',
    loinc: '8693-4',
    category: 'BEHAVIOR',
  },
] as const;

export const LOINC_SYSTEM = 'http://loinc.org';

export function getCareLoinc(
  code: CareLoincDefinition['code'],
): CareLoincDefinition | undefined {
  return CARE_LOINC_CATALOG.find((c) => c.code === code);
}
