import type { BiomarkerSeries } from './biomarkerTrends';
import {
  BIOMARKER_TRENDS_NOTICE,
  formatBiomarkerSummaryLines,
} from './biomarkerTrends';
import type { SBARDocument } from '../types/sbar';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const VISIT_KIT_NOTICE =
  'This Visit Kit combines an Educational Context Summarizer (SBAR) with transcribed lab values from caregiver uploads or portal sync. It does not diagnose, prescribe, or replace professional judgment.';

/**
 * Pure HTML builder for Visit Kit (SBAR + biomarker trend summary).
 */
export function buildVisitKitHtml(
  sbar: SBARDocument,
  series: BiomarkerSeries[],
): string {
  const lines = formatBiomarkerSummaryLines(series);
  const labItems = lines.length
    ? lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')
    : '<li>No CONFIRMED / PENDING_REVIEW trendable labs on file.</li>';

  const docs = sbar.documentsToBring
    .map((d) => `<li>${escapeHtml(d)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Visit Kit — ${escapeHtml(sbar.patientDisplayName)}</title>
  <style>
    @page { margin: 12mm; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #143536; line-height: 1.35; padding: 16px; font-size: 11px; }
    h1 { font-size: 16px; margin: 0 0 4px; color: #0f3d3e; }
    .meta { color: #5a7374; margin: 0 0 10px; font-size: 10px; }
    .notice { background: #eef5f5; border-left: 3px solid #0f3d3e; padding: 8px 10px; margin: 0 0 12px; font-size: 9px; color: #355556; }
    section { margin: 0 0 10px; page-break-inside: avoid; }
    h2 { font-size: 11px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.04em; color: #0f3d3e; border-bottom: 1px solid #c5d6d6; padding-bottom: 2px; }
    p { margin: 0; }
    ul { margin: 4px 0 0 16px; padding: 0; }
  </style>
</head>
<body>
  <h1>Visit Kit — ${escapeHtml(sbar.patientDisplayName)}</h1>
  <p class="meta">Patient ref: ${escapeHtml(sbar.patientId)} · Compiled ${escapeHtml(sbar.compiledAt)}</p>
  <p class="notice">${escapeHtml(VISIT_KIT_NOTICE)}</p>
  <p class="notice">${escapeHtml(sbar.regulatoryNotice)}</p>
  <p class="notice">${escapeHtml(BIOMARKER_TRENDS_NOTICE)}</p>

  <section>
    <h2>Situation</h2>
    <p>${escapeHtml(sbar.sections.situation)}</p>
  </section>
  <section>
    <h2>Background</h2>
    <p>${escapeHtml(sbar.sections.background)}</p>
  </section>
  <section>
    <h2>Assessment</h2>
    <p>${escapeHtml(sbar.sections.assessment)}</p>
  </section>
  <section>
    <h2>Recommendation</h2>
    <p>${escapeHtml(sbar.sections.recommendation)}</p>
  </section>
  <section>
    <h2>Lab values on file (transcribed)</h2>
    <ul>${labItems}</ul>
  </section>
  <section>
    <h2>Documents to bring</h2>
    <ul>${docs}</ul>
  </section>
</body>
</html>`;
}
