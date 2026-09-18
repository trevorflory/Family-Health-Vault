import {
  buildDispatcherCueSheet,
  composeGuidedSymptoms,
  formatActiveMedications,
  generate811Script,
  shouldOfferEmergencyTools,
  REGULATORY_NOTICE,
} from '../services/triage811Engine';
import { PATIENT_VAULT, getPatientVaultProfile } from '../data/patientVault';
import type { PatientVaultProfile } from '../types/triage811';

describe('triage811Engine', () => {
  it('formats a senior profile into an opening + dispatcher cue sheet', async () => {
    const result = await generate811Script('pt-7801', [
      'Sudden onset confusion',
      'Mild fever',
    ]);

    expect(result.spokenIntroScript).toContain('78-year-old');
    expect(result.spokenIntroScript).toContain('father');
    expect(result.spokenIntroScript).toMatch(/Bob|Robert/i);
    expect(result.spokenIntroScript).toMatch(/Sudden onset confusion/i);
    expect(result.spokenIntroScript).toMatch(/Mild fever/i);
    expect(result.spokenIntroScript.toLowerCase()).toMatch(
      /history and medications ready/i,
    );

    expect(result.dispatcherCueSheet).toHaveLength(4);
    const [who, whats, history, recent] = result.dispatcherCueSheet;
    expect(who.dispatcherAsks).toMatch(/who are you calling about/i);
    expect(who.readyAnswer).toMatch(/Robert Ellis/i);
    expect(who.readyAnswer).toMatch(/78-year-old/i);
    expect(whats.readyAnswer).toMatch(/Sudden onset confusion/i);
    expect(history.readyAnswer).toMatch(/Type 2 Diabetes/i);
    expect(history.readyAnswer).toMatch(/Metformin 500mg/i);
    expect(recent.readyAnswer).toMatch(/UTI treated/i);

    expect(result.historicalRedFlags.some((f) => /CKD|kidney/i.test(f))).toBe(
      true,
    );
    expect(result.questionsToAskNurse).toHaveLength(3);
    expect(result.regulatoryNotice).toBe(REGULATORY_NOTICE);
    expect(result.offerEmergencyTools).toBe(false);
    // SaMD: must not claim a diagnosis or prescribe
    expect(result.spokenIntroScript.toLowerCase()).not.toMatch(
      /you have|diagnosed with|take \d|prescribe|antibiotic course/,
    );
  });

  it('buildDispatcherCueSheet mirrors nurse-asks / caregiver-answers framing', () => {
    const profile = getPatientVaultProfile('pt-7801')!;
    const sheet = buildDispatcherCueSheet(profile, ['Mild fever']);
    for (const cue of sheet) {
      expect(cue.dispatcherAsks.length).toBeGreaterThan(10);
      expect(cue.readyAnswer.length).toBeGreaterThan(5);
    }
    expect(sheet[2].dispatcherAsks).toMatch(/conditions|medications/i);
  });

  it('formats a pediatric profile without inventing chronic history', async () => {
    const result = await generate811Script('pt-child-09', [
      'Mild fever',
      'Persistent vomiting',
    ]);
    expect(result.spokenIntroScript).toContain('9-year-old');
    expect(result.spokenIntroScript).toContain('daughter');
    expect(result.dispatcherCueSheet[2].readyAnswer).toMatch(/none listed/i);
    expect(result.dispatcherCueSheet[2].readyAnswer).not.toMatch(
      /Type 2 Diabetes|Metformin|CKD/i,
    );
    expect(result.dispatcherCueSheet[3].readyAnswer).toMatch(/vaccinations/i);
    expect(result.questionsToAskNurse[2]).toMatch(/child/i);
  });

  it('formats an adult mid-generation asthma profile', async () => {
    const result = await generate811Script('pt-2044', [
      'Shortness of breath',
      'Worsening cough',
    ]);
    expect(result.spokenIntroScript).toContain('50-year-old');
    expect(result.dispatcherCueSheet[2].readyAnswer).toMatch(/Asthma/i);
    expect(result.dispatcherCueSheet[2].readyAnswer).toMatch(
      /Salbutamol inhaler/i,
    );
    expect(result.historicalRedFlags.some((f) => /Asthma/i.test(f))).toBe(true);
  });

  it('does not crash when medication dose/frequency fields are null or missing', async () => {
    const result = await generate811Script('pt-2044', ['Mild fever']);
    // Salbutamol has null dose; undefined medication slot exists
    expect(result.dispatcherCueSheet[2].readyAnswer).toMatch(/Salbutamol/i);
    expect(result.dispatcherCueSheet[2].readyAnswer).not.toMatch(
      /undefined|null/i,
    );
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

  it('composes guided category symptoms and offers emergency tools only when flagged', async () => {
    const symptoms = composeGuidedSymptoms({
      categoryId: 'neuro',
      followUps: ['Started in the last hour'],
    });
    expect(symptoms).toEqual(
      expect.arrayContaining([
        'Sudden onset confusion',
        'Started in the last hour',
      ]),
    );
    expect(shouldOfferEmergencyTools([])).toBe(false);
    expect(
      shouldOfferEmergencyTools(['I believe this is life-threatening right now']),
    ).toBe(true);

    const withFlag = await generate811Script('pt-7801', symptoms, {
      emergencyFlags: ['Unconscious or cannot wake them'],
    });
    expect(withFlag.offerEmergencyTools).toBe(true);
    expect(withFlag.dispatcherCueSheet).toHaveLength(4);
    expect(withFlag.questionsToAskNurse).toHaveLength(3);
  });

  it('keeps vault profiles multi-generational for caregiver context', () => {
    const ages = Object.values(PATIENT_VAULT).map(
      (p: PatientVaultProfile) => p.ageYears,
    );
    expect(Math.min(...ages)).toBeLessThan(18);
    expect(Math.max(...ages)).toBeGreaterThanOrEqual(65);
  });
});
