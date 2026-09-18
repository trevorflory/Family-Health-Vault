import { getPatientVaultProfile } from '../data/patientVault';
import {
  formatHealthStory,
  formatHealthStoryDeep,
} from '../utils/healthStory';

describe('healthStory', () => {
  it('formats a concise self story with anthropometrics and meds', () => {
    const profile = getPatientVaultProfile('pt-self-01')!;
    const story = formatHealthStory(profile);
    expect(story).toMatch(/42-year-old female/);
    expect(story).toMatch(/165 cm/);
    expect(story).toMatch(/60 kg/);
    expect(story).toMatch(/Type 2 Diabetes/);
    expect(story).toMatch(/Metformin/);
    expect(story).toMatch(/Vitamin D/);
  });

  it('deep story appends recent events', () => {
    const profile = getPatientVaultProfile('pt-7801')!;
    const deep = formatHealthStoryDeep(profile);
    expect(deep).toMatch(/78-year-old male/);
    expect(deep).toMatch(/Recent context/);
    expect(deep).toMatch(/UTI/i);
  });
});
