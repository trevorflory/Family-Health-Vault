import * as Print from 'expo-print';
import { getEmergencyProfile } from '../data/emergencyProfiles';
import type { EmergencyPatientContext } from '../data/emergencyProfiles';
import {
  DEFAULT_EMERGENCY_PASS_SECRET,
  decryptAes256Gcm,
  encryptAes256Gcm,
} from './emergencyCrypto';
import { formatMedicationLines } from './effectiveVault';
import { getVaultMedOverrides } from '../db/vaultMedOverrides';

/** Default QR / digital pass lifetime (short-lived). */
export const EMERGENCY_PASS_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export interface EmergencyPassPayload {
  v: 1;
  patientId: string;
  fullName: string;
  ageYears: number;
  allergies: string[];
  activeMedications: string[];
  emergencyContacts: EmergencyPatientContext['emergencyContacts'];
  primaryCaregiverPhone: string;
  criticalAlerts: string[];
  issuedAt: string;
  expiresAt: string;
}

export interface EmergencyQRResult {
  patientId: string;
  /** AES-256-GCM encrypted token for QR encoding. */
  encryptedPayload: string;
  expiresAt: string;
  issuedAt: string;
  /** Human-readable context mirrored on the wallet card. */
  context: EmergencyPatientContext;
  /** Compact QR string (same as encryptedPayload). */
  qrValue: string;
}

function buildPayload(
  context: EmergencyPatientContext,
  now: Date,
  ttlMs: number,
): EmergencyPassPayload {
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
  return {
    v: 1,
    patientId: context.patientId,
    fullName: context.fullName,
    ageYears: context.ageYears,
    allergies: context.allergies,
    activeMedications: context.activeMedications,
    emergencyContacts: context.emergencyContacts,
    primaryCaregiverPhone: context.primaryCaregiverPhone,
    criticalAlerts: context.criticalAlerts,
    issuedAt,
    expiresAt,
  };
}

/**
 * Generate a short-lived AES-256 encrypted emergency QR payload
 * containing allergies, active meds, emergency contacts, and caregiver phone.
 */
export async function generateEmergencyQR(
  patientId: string,
  options: {
    now?: Date;
    ttlMs?: number;
    secret?: string;
  } = {},
): Promise<EmergencyQRResult> {
  const context = getEmergencyProfile(patientId);
  if (!context) {
    throw new Error(`Unknown patientId for emergency pass: ${patientId}`);
  }

  const overrides = await getVaultMedOverrides(patientId);
  const resolvedContext: EmergencyPatientContext = overrides
    ? {
        ...context,
        activeMedications: formatMedicationLines(overrides),
      }
    : context;

  const now = options.now ?? new Date();
  const ttlMs = options.ttlMs ?? EMERGENCY_PASS_TTL_MS;
  const payload = buildPayload(resolvedContext, now, ttlMs);
  const encryptedPayload = await encryptAes256Gcm(
    JSON.stringify(payload),
    options.secret ?? DEFAULT_EMERGENCY_PASS_SECRET,
  );

  return {
    patientId,
    encryptedPayload,
    expiresAt: payload.expiresAt,
    issuedAt: payload.issuedAt,
    context: resolvedContext,
    qrValue: encryptedPayload,
  };
}

/** Decrypt + parse an emergency pass token (for unit tests / ER tooling). */
export async function decodeEmergencyQR(
  encryptedPayload: string,
  options: { secret?: string; now?: Date } = {},
): Promise<EmergencyPassPayload> {
  const json = await decryptAes256Gcm(
    encryptedPayload,
    options.secret ?? DEFAULT_EMERGENCY_PASS_SECRET,
  );
  const payload = JSON.parse(json) as EmergencyPassPayload;
  const now = options.now ?? new Date();
  if (new Date(payload.expiresAt).getTime() < now.getTime()) {
    throw new Error('Emergency pass has expired');
  }
  return payload;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a printable 1-page Emergency Wallet Card HTML for expo-print.
 */
export function buildEmergencyWalletCardHtml(pass: EmergencyQRResult): string {
  const { context, expiresAt, issuedAt, encryptedPayload } = pass;
  const allergies = context.allergies.map(escapeHtml).join(', ') || 'None listed';
  const meds =
    context.activeMedications.map((m) => `<li>${escapeHtml(m)}</li>`).join('') ||
    '<li>None listed</li>';
  const contacts = context.emergencyContacts
    .map(
      (c) =>
        `<li><strong>${escapeHtml(c.name)}</strong> (${escapeHtml(c.relationship)}) — ${escapeHtml(c.phone)}</li>`,
    )
    .join('');
  const alerts = context.criticalAlerts
    .map((a) => `<li>${escapeHtml(a)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Emergency Wallet Card — ${escapeHtml(context.fullName)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000; }
    .card { border: 3px solid #000; padding: 16px; }
    h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: 0.02em; }
    .banner { background: #000; color: #fff; padding: 8px 10px; font-weight: 700; font-size: 14px; margin: 10px 0; }
    h2 { font-size: 13px; margin: 12px 0 4px; text-transform: uppercase; border-bottom: 1px solid #000; }
    ul { margin: 4px 0 0 18px; padding: 0; }
    .meta { font-size: 11px; margin-top: 12px; }
    .token { font-size: 8px; word-break: break-all; font-family: monospace; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>EMERGENCY WALLET CARD</h1>
    <div class="banner">ALLERGIES: ${allergies}</div>
    <p><strong>${escapeHtml(context.fullName)}</strong> · Age ${context.ageYears} · ID ${escapeHtml(context.patientId)}</p>
    <p><strong>Primary caregiver phone:</strong> ${escapeHtml(context.primaryCaregiverPhone)}</p>

    <h2>Critical alerts</h2>
    <ul>${alerts}</ul>

    <h2>Active medications</h2>
    <ul>${meds}</ul>

    <h2>Emergency contacts</h2>
    <ul>${contacts}</ul>

    <p class="meta">Issued ${escapeHtml(issuedAt)} · Expires ${escapeHtml(expiresAt)} · Offline encrypted QR companion on caregiver device</p>
    <p class="token">EP token: ${escapeHtml(encryptedPayload)}</p>
  </div>
</body>
</html>`;
}

/**
 * Render the wallet card to a local PDF via expo-print.
 */
export async function printEmergencyWalletCard(
  pass: EmergencyQRResult,
): Promise<string> {
  const html = buildEmergencyWalletCardHtml(pass);
  const result = await Print.printToFileAsync({ html, base64: false });
  if (!result.uri) {
    throw new Error('expo-print did not return a wallet card PDF URI');
  }
  return result.uri;
}
