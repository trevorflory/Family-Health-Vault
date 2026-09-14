import {
  formatActiveMedications,
  generate811Script,
  REGULATORY_NOTICE,
} from '../services/triage811Engine';
import { PATIENT_VAULT } from '../data/patientVault';
import type { PatientVaultProfile } from '../types/triage811';

describe('triage811Engine', () => {
  it('formats a senior multi-generational profile into a ~30s spoken script', async () => {
    const result = await generate811Script('pt-7801', [
      'Sudden onset confusion',
      'Mild fever',
    ]);

    expect(result.spokenIntroScript).toContain('78-year-old');
    expect(result.spokenIntroScript).toContain('father');
    expect(result.spokenIntroScript).toMatch(/Sudden onset confusion/i);
    expect(result.spokenIntroScript).toMatch(/Mild fever/i);
    expect(result.spokenIntroScript).toMatch(/Type 2 Diabetes/i);
    expect(result.spokenIntroScript).toMatch(/Metformin 500mg/i);
    expect(result.spokenIntroScript).toMatch(/UTI treated/i);
    expect(result.historicalRedFlags.some((f) => /CKD|kidney/i.test(f))).toBe(
      true,
    );
    expect(result.questionsToAskNurse).toHaveLength(3);
    expect(result.regulatoryNotice).toBe(REGULATORY_NOTICE);
    // SaMD: must not claim a diagnosis or prescribe
    expect(result.spokenIntroScript.toLowerCase()).not.toMatch(
      /you have|diagnosed with|take \d|prescribe|antibiotic course/,
    );
  });

  it('formats a pediatric profile without inventing chronic history', async () => {
    const result = await generate811Script('pt-child-09', [
      'Mild fever',
      'Persistent vomiting',
    ]);
    expect(result.spokenIntroScript).toContain('9-year-old');
    expect(result.spokenIntroScript).toContain('daughter');
    expect(result.spokenIntroScript).not.toMatch(/Type 2 Diabetes|Metformin|CKD/i);
    expect(result.spokenIntroScript).toMatch(/vaccinations/i);
    expect(result.questionsToAskNurse[2]).toMatch(/child/i);
  });

  it('formats an adult mid-generation asthma profile', async () => {
    const result = await generate811Script('pt-2044', [
      'Shortness of breath',
      'Worsening cough',
    ]);
    expect(result.spokenIntroScript).toContain('50-year-old');
    expect(result.spokenIntroScript).toMatch(/Asthma/i);
    expect(result.spokenIntroScript).toMatch(/Salbutamol inhaler/i);
    expect(result.historicalRedFlags.some((f) => /Asthma/i.test(f))).toBe(true);
  });

  it('does not crash when medication dose/frequency fields are null or missing', async () => {
    const result = await generate811Script('pt-7801', ['Mild fever']);
    // Vitamin D has undefined dose + null frequency; null medication slot exists
    expect(result.spokenIntroScript).toMatch(/Vitamin D/);
    expect(result.spokenIntroScript).not.toMatch(/undefined|null/i);
    expect(result.questionsToAskNurse).toHaveLength(3);
  });

  it('formatActiveMedications tolerates nullish lists and blank entries', () => {
    expect(formatActiveMedications(null)).toBe('none listed');
    expect(formatActiveMedications(undefined)).toBe('none listed');
    expect(formatActiveMedications([])).toBe('none listed');
    expect(
      formatActiveMedications([
        null,
        undefined,
        { name: '  ', dose: '10mg' },
        { name: 'Aspirin', dose: null, frequency: undefined },
      ]),
    ).toBe('Aspirin');
  });

  it('rejects unknown patient ids', async () => {
    await expect(
      generate811Script('pt-missing', ['Mild fever']),
    ).rejects.toThrow(/Unknown patientId/i);
  });

  it('keeps vault profiles multi-generational for caregiver context', () => {
    const ages = Object.values(PATIENT_VAULT).map((p: PatientVaultProfile) => p.ageYears);
    expect(Math.min(...ages)).toBeLessThan(18);
    expect(Math.max(...ages)).toBeGreaterThanOrEqual(65);
  });
});
