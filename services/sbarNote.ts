import * as Print from 'expo-print';
import {
  DAD_MEDICATIONS,
  SEED_DAD_ID,
  SHA_LAB_PDF_MOCK,
} from '../utils/mockSeeder';

export interface SbarNoteInput {
  patientId?: string;
  patientName?: string;
  ageYears?: number;
  situation?: string;
  background?: string;
  assessment?: string;
  recommendation?: string;
}

/**
 * Build a 1-page SBAR note HTML for Dad's nephrology follow-up.
 * Caregiver handoff summary only — not a clinical diagnosis.
 */
export function buildDadSbarHtml(input: SbarNoteInput = {}): string {
  const name = input.patientName ?? 'Robert Ellis (Dad)';
  const age = input.ageYears ?? 78;
  const patientId = input.patientId ?? SEED_DAD_ID;
  const meds = DAD_MEDICATIONS.map(
    (m) => `${m.name} ${m.dose} ${m.frequency}`,
  ).join('; ');

  const situation =
    input.situation ??
    'Caregiver accompanying 78-year-old father to nephrology follow-up after recent eGFR 55 and UTI treatment.';
  const background =
    input.background ??
    `Stage 3 CKD; Type 2 Diabetes; mild cognitive impairment. Active meds: ${meds}. Recent SHA lab: eGFR 55 mL/min/1.73m2, Creatinine 1.4, HbA1c 7.2%.`;
  const assessment =
    input.assessment ??
    'Caregiver is preparing an SBAR handoff with confirmed lab context from local vault (educational summary only — clinician to interpret).';
  const recommendation =
    input.recommendation ??
    'Please review latest eGFR/creatinine trend, medication reconciliation (Metformin/Ramipril/Atorvastatin), and hydration counseling; clarify follow-up labs and caregiver questions.';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SBAR — ${name}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; padding: 24px; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { color: #444; margin-bottom: 16px; }
    .block { border: 1px solid #222; margin: 10px 0; }
    .label { background: #111; color: #fff; padding: 6px 10px; font-weight: 700; letter-spacing: 0.04em; }
    .body { padding: 10px; line-height: 1.45; }
    .notice { margin-top: 16px; font-size: 10px; color: #555; }
  </style>
</head>
<body>
  <h1>SBAR Visit Prep Note</h1>
  <p class="meta">${name} · Age ${age} · ${patientId} · Saskatchewan</p>
  <div class="block"><div class="label">S — Situation</div><div class="body">${situation}</div></div>
  <div class="block"><div class="label">B — Background</div><div class="body">${background}</div></div>
  <div class="block"><div class="label">A — Assessment (caregiver context)</div><div class="body">${assessment}</div></div>
  <div class="block"><div class="label">R — Recommendation / asks</div><div class="body">${recommendation}</div></div>
  <p class="notice">Lab source mock: SHA PDF excerpt — ${SHA_LAB_PDF_MOCK.split('\n')[0]}. Not a diagnostic document.</p>
</body>
</html>`;
}

export async function synthesizeDadSbarPdf(
  input: SbarNoteInput = {},
): Promise<{ uri: string; html: string }> {
  const html = buildDadSbarHtml(input);
  const result = await Print.printToFileAsync({ html, base64: false });
  if (!result.uri) {
    throw new Error('expo-print did not return an SBAR PDF URI');
  }
  return { uri: result.uri, html };
}
