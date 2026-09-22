import { formatBlufAnswer } from '../services/askVault';

describe('formatBlufAnswer', () => {
  it('parses BLUF / Details markers', () => {
    const result = formatBlufAnswer(
      'BLUF: eGFR is on file from the last lab.\n\nDetails: Values are educational context only.',
    );
    expect(result.bluf).toMatch(/eGFR/i);
    expect(result.detail).toMatch(/educational/i);
  });

  it('falls back to first paragraph as BLUF', () => {
    const result = formatBlufAnswer('Short bottom line.\n\nLonger detail follows.');
    expect(result.bluf).toBe('Short bottom line.');
    expect(result.detail).toBe('Longer detail follows.');
  });
});
