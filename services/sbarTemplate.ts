import type { SBARDocument } from '../types/sbar';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatVisitWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-CA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

/**
 * Builds a tight one-page HTML SBAR for expo-print.
 * Pure function — unit-testable without native modules.
 */
export function buildSBARHtml(doc: SBARDocument): string {
  const { sections } = doc;
  const apptBlock = doc.appointment
    ? `<p class="meta"><strong>Visit:</strong> ${escapeHtml(doc.appointment.title)} · ${escapeHtml(doc.appointment.location)} · ${escapeHtml(formatVisitWhen(doc.appointment.startsAt))}</p>`
    : `<p class="meta"><strong>Visit:</strong> Not linked to a household appointment</p>`;

  const docs = doc.documentsToBring
    .map((d) => `<li>${escapeHtml(d)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SBAR — ${escapeHtml(doc.patientDisplayName)}</title>
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
    .footer { margin-top: 10px; font-size: 9px; color: #5a7374; }
  </style>
</head>
<body>
  <h1>SBAR Visit Summary — ${escapeHtml(doc.patientDisplayName)}</h1>
  <p class="meta">Patient ref: ${escapeHtml(doc.patientId)} · Compiled ${escapeHtml(formatVisitWhen(doc.compiledAt))}</p>
  ${apptBlock}
  <p class="notice">${escapeHtml(doc.regulatoryNotice)}</p>

  <section>
    <h2>Situation</h2>
    <p>${escapeHtml(sections.situation)}</p>
  </section>
  <section>
    <h2>Background</h2>
    <p>${escapeHtml(sections.background)}</p>
  </section>
  <section>
    <h2>Assessment</h2>
    <p>${escapeHtml(sections.assessment)}</p>
  </section>
  <section>
    <h2>Recommendation</h2>
    <p>${escapeHtml(sections.recommendation)}</p>
  </section>
  <section>
    <h2>Documents to bring</h2>
    <ul>${docs}</ul>
  </section>
  <p class="footer">Healthcare App · Educational Context Summarizer · Not a medical device diagnostic output</p>
</body>
</html>`;
}
