import {
  formatMedicationLines,
  mergeOverridesIntoMedsToday,
} from '../services/effectiveVault';
import type { DigestMedicationDue } from '../types/digest';

describe('effectiveVault helpers', () => {
  it('rebuilds digest meds from overrides while keeping schedule by name', () => {
    const fixture: DigestMedicationDue[] = [
      {
        medicationId: 'med-met',
        name: 'Metformin',
        dose: '500mg',
        scheduledTime: '08:00',
        given: false,
      },
    ];
    const merged = mergeOverridesIntoMedsToday(
      fixture,
      [
        { name: 'Metformin', dose: '1000mg', frequency: 'twice daily' },
        { name: 'NewMed', dose: '5mg', frequency: 'daily' },
      ],
      new Set(['med-met']),
    );
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({
      medicationId: 'med-met',
      name: 'Metformin',
      dose: '1000mg',
      scheduledTime: '08:00',
      given: true,
    });
    expect(merged[1].name).toBe('NewMed');
    expect(merged[1].scheduledTime).toBe('08:00');
  });

  it('formats medication lines for emergency context', () => {
    expect(
      formatMedicationLines([
        { name: 'Ramipril', dose: '5mg', frequency: 'daily' },
      ]),
    ).toEqual(['Ramipril 5mg daily']);
  });
});
