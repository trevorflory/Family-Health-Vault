import type {
  CanadianJurisdiction,
  FOIRequestPayload,
  FOIScopeItem,
} from '../types/foiPayload';

export interface JurisdictionLegalMeta {
  jurisdiction: CanadianJurisdiction;
  actShortName: string;
  actFullName: string;
  requesterLabel: string;
  custodianLabel: string;
  declaration: string;
}

const LEGAL_META: Record<CanadianJurisdiction, JurisdictionLegalMeta> = {
  ON: {
    jurisdiction: 'ON',
    actShortName: 'PHIPA',
    actFullName:
      'Personal Health Information Protection Act, 2004 (PHIPA) — Province of Ontario',
    requesterLabel: 'individual / authorized substitute decision-maker',
    custodianLabel: 'health information custodian',
    declaration:
      'I hereby request access to the personal health information described herein pursuant to my rights under the Personal Health Information Protection Act, 2004 (PHIPA). I declare that the information provided is true and complete, and that I am the individual to whom the information relates or an authorized substitute decision-maker under PHIPA.',
  },
  SK: {
    jurisdiction: 'SK',
    actShortName: 'HIPA',
    actFullName:
      'Health Information Protection Act (HIPA) — Province of Saskatchewan',
    requesterLabel: 'individual / authorized personal representative',
    custodianLabel: 'trustee',
    declaration:
      'I hereby request access to the personal health information described herein pursuant to my rights under the Health Information Protection Act (HIPA) of Saskatchewan. I declare that the information provided is true and complete, and that I am the subject individual or an authorized personal representative entitled to make this request under HIPA.',
  },
  AB: {
    jurisdiction: 'AB',
    actShortName: 'HIA',
    actFullName: 'Health Information Act (HIA) — Province of Alberta',
    requesterLabel: 'individual / authorized representative',
    custodianLabel: 'custodian',
    declaration:
      'I hereby request access to the health information described herein pursuant to my rights under the Health Information Act (HIA) of Alberta. I declare that the information provided is true and complete, and that I am the individual who is the subject of the health information or an authorized representative under the HIA.',
  },
  BC: {
    jurisdiction: 'BC',
    actShortName: 'FIPPA/PIPA',
    actFullName:
      'Freedom of Information and Protection of Privacy Act (FIPPA) and/or Personal Information Protection Act (PIPA) — Province of British Columbia',
    requesterLabel: 'applicant',
    custodianLabel: 'public body / organization',
    declaration:
      'I hereby request access to the personal/health information described herein pursuant to my rights under the Freedom of Information and Protection of Privacy Act (FIPPA) and, where applicable, the Personal Information Protection Act (PIPA) of British Columbia. I declare that the information provided is true and complete, and that I am the applicant entitled to make this request.',
  },
};

export function getLegalMeta(
  jurisdiction: CanadianJurisdiction,
): JurisdictionLegalMeta {
  return LEGAL_META[jurisdiction];
}

const SCOPE_LABELS: Record<FOIScopeItem, string> = {
  FULL_CHART: 'Full historical clinical chart / complete medical record',
  DICOM_CDS: 'DICOM medical imaging studies on CD/DVD (all modalities on file)',
  LAB_HISTORY: 'Laboratory reports and lab history (complete available period)',
  SPECIALIST_NOTES: 'Specialist consult notes and referral correspondence',
};

export function scopeLabel(item: FOIScopeItem): string {
  return SCOPE_LABELS[item];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds the printable HTML legal template for a FOI request.
 * Pure function — unit-testable without expo-print.
 */
export function buildFOIRequestHtml(payload: FOIRequestPayload): string {
  const legal = getLegalMeta(payload.jurisdiction);
  const facility = payload.facility;
  const patient = payload.patient;
  const applicant = payload.applicant;
  const scopeItems =
    payload.scope.length > 0
      ? payload.scope.map((s) => `<li>${escapeHtml(scopeLabel(s))}</li>`).join('')
      : '<li>No scope items selected</li>';

  const feeWaiverBlock = payload.feeWaiver.requested
    ? `
      <section>
        <h2>Fee Waiver Justification</h2>
        <p>A fee waiver is requested under the applicable access provisions of ${escapeHtml(legal.actShortName)}.</p>
        <p><strong>Justification:</strong> ${escapeHtml(payload.feeWaiver.reason?.trim() || 'Not specified')}</p>
      </section>`
    : '';

  const attachmentBlock =
    payload.attachments.length > 0
      ? `
      <section>
        <h2>Proof of Authority / Identity Attached</h2>
        <ul>
          ${payload.attachments
            .map(
              (a) =>
                `<li>${escapeHtml(a.kind)} — ${escapeHtml(a.fileName)} (${escapeHtml(a.mimeType)})</li>`,
            )
            .join('')}
        </ul>
      </section>`
      : `
      <section>
        <h2>Proof of Authority / Identity</h2>
        <p>No digital attachment recorded. Applicant affirms identity documents will accompany this request if required by the ${escapeHtml(legal.custodianLabel)}.</p>
      </section>`;

  const poaLine = applicant.hasPowerOfAttorney
    ? '<p><strong>Power of Attorney / substitute decision-maker:</strong> Yes — supporting authority documentation is attached or will be provided.</p>'
    : '<p><strong>Power of Attorney / substitute decision-maker:</strong> No — request is made by the subject individual or other authorized applicant as declared.</p>';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>FOI Access Request — ${escapeHtml(facility.name)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.45; padding: 28px; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 6px; }
    h2 { font-size: 14px; margin: 22px 0 8px; border-bottom: 1px solid #333; padding-bottom: 4px; }
    .meta { color: #444; margin-bottom: 18px; }
    .box { border: 1px solid #333; padding: 12px; margin: 10px 0; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #555; }
    ul { margin: 6px 0 0 18px; }
    .declaration { margin-top: 24px; padding: 14px; background: #f4f4f4; border-left: 3px solid #222; }
    .footer { margin-top: 28px; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <h1>Formal Access to Information / FOI Record Request</h1>
  <p class="meta">Governing statute: <strong>${escapeHtml(legal.actFullName)}</strong><br/>
  Request date: ${escapeHtml(payload.requestedAt)}</p>

  <section>
    <h2>1. Target Health Authority / Facility Record Department</h2>
    <div class="box">
      <div class="label">Custodian / Trustee</div>
      <p><strong>${escapeHtml(facility.name)}</strong><br/>
      ${escapeHtml(facility.departmentName)}</p>
      <p>${facility.addressLines.map(escapeHtml).join('<br/>')}</p>
      <p>
        ${facility.phone ? `Phone: ${escapeHtml(facility.phone)}<br/>` : ''}
        ${facility.fax ? `Fax: ${escapeHtml(facility.fax)}<br/>` : ''}
        ${facility.email ? `Email: ${escapeHtml(facility.email)}` : ''}
      </p>
    </div>
  </section>

  <section>
    <h2>2. Patient / Subject Individual</h2>
    <div class="box">
      <p><strong>Full legal name:</strong> ${escapeHtml(patient.fullName)}</p>
      <p><strong>Date of birth:</strong> ${escapeHtml(patient.dateOfBirth)}</p>
      <p><strong>Encrypted PHN / HIN:</strong> ${escapeHtml(patient.encryptedPhn)}</p>
      <p><strong>Internal patient reference:</strong> ${escapeHtml(patient.patientId)}</p>
    </div>
  </section>

  <section>
    <h2>3. Scope of Records Requested</h2>
    <p>Please produce copies of the following records held by the ${escapeHtml(legal.custodianLabel)} for the subject individual, covering the complete available historical period unless otherwise limited by law:</p>
    <ul>${scopeItems}</ul>
  </section>

  <section>
    <h2>4. Applicant / Proxy Details</h2>
    <div class="box">
      <p><strong>Applicant name:</strong> ${escapeHtml(applicant.fullName)}</p>
      <p><strong>Relationship to patient:</strong> ${escapeHtml(applicant.relationship)}</p>
      <p><strong>Email:</strong> ${escapeHtml(applicant.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(applicant.phone)}</p>
      <p><strong>Mailing address:</strong> ${escapeHtml(applicant.mailingAddress)}</p>
      ${poaLine}
    </div>
  </section>

  ${attachmentBlock}
  ${feeWaiverBlock}

  <section class="declaration">
    <h2>Legal Declaration — ${escapeHtml(legal.actShortName)}</h2>
    <p>${escapeHtml(legal.declaration)}</p>
    <p style="margin-top:16px;">Applicant signature: _______________________________ &nbsp;&nbsp; Date: _______________</p>
  </section>

  <p class="footer">Generated by Healthcare App FOI module for submission to the named ${escapeHtml(legal.custodianLabel)}. This document is not legal advice.</p>
</body>
</html>`;
}
