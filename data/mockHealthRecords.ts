/**
 * Mock household health-record snippets for sandbox LLM testing.
 * Educational context only — not a live EHR extract.
 */
export const MOCK_HEALTH_RECORD_CONTEXT = `
Patient: Robert "Dad" Ellis (78), Saskatoon
Chronic conditions: Type 2 Diabetes, Stage 3 CKD, Mild cognitive impairment
Active medications: Metformin 500mg twice daily; Ramipril 5mg daily; Vitamin D
Recent labs (portal screenshot OCR, caregiver-confirmed):
- eGFR 55 mL/min/1.73m2 (ref 60-120)
- Creatinine 1.4 mg/dL (ref 0.7-1.3)
- HbA1c 7.2 %
Recent events: UTI treated with antibiotics 2 weeks ago
Upcoming: Nephrology follow-up in 48 hours — print SBAR note
Open FOI: SHA chart package draft pending 34 days
`.trim();

export const SANDBOX_EXAMPLE_PROMPTS = [
  "What does Dad's latest eGFR lab result mean for his diabetes treatment?",
  'Summarize Dad’s chronic conditions and current medications from the record context.',
  'What questions should I ask the nephrologist about the listed eGFR value?',
];
