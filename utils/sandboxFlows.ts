import { DEMO_CAREGIVER_ID } from '../data/caregiverHousehold';
import { getFacilityById } from '../data/healthAuthorities';
import {
  compileDailyDigest,
  compileWeeklyDigest,
  createLiveDigestLoaders,
} from '../services/digestEngine';
import {
  buildEmergencyWalletCardHtml,
  decodeEmergencyQR,
  generateEmergencyQR,
  printEmergencyWalletCard,
  type EmergencyQRResult,
} from '../services/emergencyPass';
import { generateFOIPDF } from '../services/foiGenerator';
import {
  dailyDigestDeepLink,
  weeklyDigestDeepLink,
} from '../services/notificationScheduler';
import { parseOcrDocument } from '../services/ocrTextParsers';
import { compileSBAR } from '../services/sbarEngine';
import { buildSBARHtml, generateSBARPDF } from '../services/sbarGenerator';
import { generate811Script } from '../services/triage811Engine';
import { extractVisitDebrief } from '../services/visitDebriefExtract';
import { saveMedicalEvent } from '../db/medicalEvents';
import type { MedicalEventRecord, OcrParsedPayload, VisitDebriefParsed } from '../types/db';
import type { FOIRequestPayload } from '../types/foiPayload';
import type { SBARDocument } from '../types/sbar';
import type { WeeklyDigestPayload } from '../types/digest';
import { syncSkSampleToVault } from '../services/interop/skConnector';
import { syncAbSampleToVault } from '../services/interop/abConnector';
import { syncBcSampleToVault } from '../services/interop/bcConnector';
import { syncOnSampleToVault } from '../services/interop/onConnector';
import { syncQcSampleToVault } from '../services/interop/qcConnector';
import { syncMbSampleToVault } from '../services/interop/mbConnector';
import { syncNsSampleToVault } from '../services/interop/nsConnector';
import { syncAllRemainingCanadaSamples } from '../services/interop/canadaRemainingConnectors';
import {
  SEED_CHILD_ID,
  SEED_DAD_ID,
  SHA_LAB_PDF_MOCK,
  getDadSandboxMedicalEvents,
} from './mockSeeder';

/** Default post-visit transcript for sandbox voice debrief (matches seed themes). */
export const DAD_VISIT_DEBRIEF_TRANSCRIPT =
  'Nephrology discussed ankle swelling and evening fatigue. Keep Metformin. Need to bring blister pack next time. Monitor evening ankle size for the clinician.';

export interface DigestSandboxResult {
  headline: string;
  totalMedsDue: number;
  totalAppointments: number;
  totalOverdue: number;
  pushPayload: {
    title: string;
    body: string;
    data: ReturnType<typeof dailyDigestDeepLink>;
  };
}

export interface SbarSandboxResult {
  uri: string;
  html: string;
  document: SBARDocument;
}

const DAD_SBAR_INPUT = {
  visitReason: 'Nephrology follow-up — review kidney labs',
  caregiverNotes:
    'Caregiver preparing handoff after recent UTI treatment; monitoring ankle swelling and evening fatigue.',
  appointmentId: 'appt-dad-gp',
  includeMedicalEvents: true as const,
};

/** Run daily digest (live vault loaders) and return the local push-alert payload. */
export async function runDailyDigestSandbox(
  caregiverId: string = DEMO_CAREGIVER_ID,
  now: Date = new Date(),
): Promise<DigestSandboxResult> {
  const digest = await compileDailyDigest(
    caregiverId,
    now,
    createLiveDigestLoaders(),
  );
  const data = dailyDigestDeepLink(caregiverId);
  return {
    headline: digest.headline,
    totalMedsDue: digest.totalMedsDue,
    totalAppointments: digest.totalAppointments,
    totalOverdue: digest.totalOverdue,
    pushPayload: {
      title: 'Daily Morning Digest',
      body: digest.headline,
      data,
    },
  };
}

/**
 * Generate Dad's 1-page SBAR via compileSBAR + generateSBARPDF (same path as export UI).
 * Inject seed MedicalEvents when the vault is empty so one-click demos still fold OCR + debrief.
 */
export async function runDadSbarSandbox(options?: {
  now?: Date;
  medicalEvents?: MedicalEventRecord[];
}): Promise<SbarSandboxResult> {
  const now = options?.now ?? new Date();
  const medicalEvents =
    options?.medicalEvents ?? getDadSandboxMedicalEvents(now);

  const document = await compileSBAR(SEED_DAD_ID, DAD_SBAR_INPUT, {
    now,
    medicalEvents,
  });
  const html = buildSBARHtml(document);
  const uri = await generateSBARPDF(document);
  return { uri, html, document };
}

/** HTML-only SBAR preview (unit-testable without expo-print). */
export async function previewDadSbarHtml(options?: {
  now?: Date;
  medicalEvents?: MedicalEventRecord[];
}): Promise<string> {
  const now = options?.now ?? new Date();
  const document = await compileSBAR(SEED_DAD_ID, DAD_SBAR_INPUT, {
    now,
    medicalEvents: options?.medicalEvents ?? getDadSandboxMedicalEvents(now),
  });
  return buildSBARHtml(document);
}

/** Generate printable SK HIPA FOI request for Dad → Saskatchewan Health Authority. */
export async function runSkHipaFoiSandbox(): Promise<{
  uri: string;
  payload: FOIRequestPayload;
}> {
  const facility = getFacilityById('sk-sha');
  if (!facility) {
    throw new Error('Saskatchewan Health Authority template missing');
  }

  const payload: FOIRequestPayload = {
    jurisdiction: 'SK',
    facility,
    patient: {
      patientId: SEED_DAD_ID,
      fullName: 'Robert Ellis',
      dateOfBirth: '1948-02-19',
      encryptedPhn: '••••-•••-8841',
    },
    scope: ['FULL_CHART', 'LAB_HISTORY', 'SPECIALIST_NOTES', 'DICOM_CDS'],
    applicant: {
      fullName: 'Alex Ellis',
      relationship: 'Adult child / substitute decision-maker',
      email: 'alex.ellis@example.com',
      phone: '+1-306-555-0142',
      mailingAddress: '245 Prairie Ave, Regina, SK S4P 1A1',
      hasPowerOfAttorney: true,
    },
    attachments: [
      {
        uri: 'file:///mock/poa-ellis.pdf',
        fileName: 'poa-ellis.pdf',
        mimeType: 'application/pdf',
        kind: 'POA',
      },
    ],
    feeWaiver: {
      requested: true,
      reason: 'Request is for continuity of care for an aging parent with CKD',
    },
    requestedAt: new Date().toISOString(),
  };

  const uri = await generateFOIPDF(payload);
  return { uri, payload };
}

/** Trigger 811 dispatcher cue sheet for Dad with flustered-caregiver symptoms. */
export async function run811ScriptSandbox() {
  return generate811Script(SEED_DAD_ID, [
    'Sudden onset confusion',
    'Mild fever',
  ]);
}

/** Force Leo parental POA age-out hand-off (demo) and return persisted log stats. */
export async function runLeoAgeOutSandbox(now: Date = new Date()) {
  const {
    executeAgeOutHandOff,
    listAccessLog,
    listProxyGrants,
    resetProxyAccessStore,
  } = await import('../services/proxyAccessEngine');
  await resetProxyAccessStore(now);
  const result = await executeAgeOutHandOff(
    SEED_CHILD_ID,
    DEMO_CAREGIVER_ID,
    16,
    now,
    { force: true },
  );
  const grants = await listProxyGrants(SEED_CHILD_ID);
  const log = await listAccessLog(SEED_CHILD_ID);
  return {
    ...result,
    grantStatuses: grants.map((g) => g.status),
    accessLogCount: log.length,
  };
}

export interface EmergencyPassSandboxResult {
  pass: EmergencyQRResult;
  html: string;
  pdfUri: string;
  /** Confirmed round-trip decode for QA (never log this in production UI). */
  decodedName: string;
}

/** Generate Dad's encrypted emergency QR + wallet-card PDF (same services as screen). */
export async function runDadEmergencyPassSandbox(options?: {
  now?: Date;
  secret?: string;
}): Promise<EmergencyPassSandboxResult> {
  const now = options?.now ?? new Date();
  const pass = await generateEmergencyQR(SEED_DAD_ID, {
    now,
    secret: options?.secret,
  });
  const html = buildEmergencyWalletCardHtml(pass);
  const pdfUri = await printEmergencyWalletCard(pass);
  const decoded = await decodeEmergencyQR(pass.encryptedPayload, {
    now,
    secret: options?.secret,
  });
  return {
    pass,
    html,
    pdfUri,
    decodedName: decoded.fullName,
  };
}

export interface WeeklyDigestSandboxResult {
  digest: WeeklyDigestPayload;
  pushPayload: {
    title: string;
    body: string;
    data: ReturnType<typeof weeklyDigestDeepLink>;
  };
}

/** Run weekly Sunday digest + push-alert payload shape. */
export async function runWeeklyDigestSandbox(
  caregiverId: string = DEMO_CAREGIVER_ID,
  now: Date = new Date(),
): Promise<WeeklyDigestSandboxResult> {
  const digest = await compileWeeklyDigest(
    caregiverId,
    now,
    createLiveDigestLoaders(),
  );
  return {
    digest,
    pushPayload: {
      title: 'Weekly Sunday Overview',
      body: digest.narrativeSummary,
      data: weeklyDigestDeepLink(caregiverId),
    },
  };
}

export interface OcrLabSandboxResult {
  record: MedicalEventRecord;
  parsed: OcrParsedPayload;
  rawText: string;
  deepLink: string;
}

/**
 * Parse SHA lab mock via OCR text parsers and persist MedicalEvents (PENDING_REVIEW).
 * Skips Tesseract — same parse/save path as verification after capture.
 */
export async function runDadOcrLabSandbox(options?: {
  rawText?: string;
  eventId?: string;
  status?: MedicalEventRecord['status'];
}): Promise<OcrLabSandboxResult> {
  const rawText = options?.rawText ?? SHA_LAB_PDF_MOCK;
  const parsed = parseOcrDocument(rawText);
  const record = await saveMedicalEvent({
    id: options?.eventId ?? 'me_sandbox_ocr_lab_dad',
    patientId: SEED_DAD_ID,
    kind: 'LAB_RESULT',
    sourceUri: 'mock://sha/lab-report-sandbox.pdf',
    rawText,
    parsed,
    status: options?.status ?? 'PENDING_REVIEW',
  });
  return {
    record,
    parsed,
    rawText,
    deepLink: `/patient/${SEED_DAD_ID}/uploadDoc`,
  };
}

export interface VoiceDebriefSandboxResult {
  record: MedicalEventRecord;
  transcript: string;
  extracted: VisitDebriefParsed;
  deepLink: string;
}

/**
 * Extract visit debrief from transcript and persist VISIT_DEBRIEF MedicalEvent.
 * Skips mic/Whisper — same extract/save path as review after recording.
 */
export async function runDadVoiceDebriefSandbox(options?: {
  transcript?: string;
  eventId?: string;
  status?: MedicalEventRecord['status'];
}): Promise<VoiceDebriefSandboxResult> {
  const transcript = options?.transcript ?? DAD_VISIT_DEBRIEF_TRANSCRIPT;
  const extracted = extractVisitDebrief(transcript);
  const record = await saveMedicalEvent({
    id: options?.eventId ?? 'me_sandbox_visit_debrief_dad',
    patientId: SEED_DAD_ID,
    kind: 'VISIT_DEBRIEF',
    sourceUri: 'mock://voice/dad-nephrology-debrief-sandbox.m4a',
    rawText: transcript,
    parsed: extracted,
    status: options?.status ?? 'PENDING_REVIEW',
  });
  return {
    record,
    transcript,
    extracted,
    deepLink: `/patient/${SEED_DAD_ID}/voiceDebrief`,
  };
}

export { SHA_LAB_PDF_MOCK };

export interface SkConnectorSandboxResult {
  importedCount: number;
  skippedCount: number;
  syncedAt: string;
  smartAvailable: boolean;
  playbookSteps: number;
  /** Second pass proves externalId upsert does not duplicate rows. */
  reimportImportedCount: number;
  deepLink: string;
}

/**
 * Exercise Saskatchewan connector: sample FHIR sync + idempotent re-import.
 */
export async function runSkShaConnectorSandbox(options?: {
  patientId?: string;
  now?: Date;
}): Promise<SkConnectorSandboxResult> {
  const patientId = options?.patientId ?? SEED_DAD_ID;
  const now = options?.now ?? new Date('2026-09-15T12:00:00.000Z');
  const first = await syncSkSampleToVault({ patientId, now });
  const second = await syncSkSampleToVault({
    patientId,
    now: new Date(now.getTime() + 60_000),
  });
  return {
    importedCount: first.result.importedCount,
    skippedCount: first.result.skippedCount,
    syncedAt: first.result.syncedAt,
    smartAvailable: first.smart.ok,
    playbookSteps: first.playbook.length,
    reimportImportedCount: second.result.importedCount,
    deepLink: `/patient/${patientId}/portalSync`,
  };
}

export interface AbConnectorSandboxResult {
  importedCount: number;
  jurisdiction: string;
  smartAvailable: boolean;
  playbookSteps: number;
  deepLink: string;
}

/** Exercise Alberta MyHealth FILE_IMPORT sample FHIR sync. */
export async function runAbMyHealthConnectorSandbox(options?: {
  patientId?: string;
  now?: Date;
}): Promise<AbConnectorSandboxResult> {
  const patientId = options?.patientId ?? SEED_DAD_ID;
  const { result, smart, playbook } = await syncAbSampleToVault({
    patientId,
    now: options?.now ?? new Date('2026-09-15T12:00:00.000Z'),
  });
  return {
    importedCount: result.importedCount,
    jurisdiction: result.jurisdiction,
    smartAvailable: smart.ok,
    playbookSteps: playbook.length,
    deepLink: `/patient/${patientId}/portalSync`,
  };
}

export interface BcConnectorSandboxResult {
  importedCount: number;
  jurisdiction: string;
  smartAvailable: boolean;
  playbookSteps: number;
  deepLink: string;
}

/** Exercise BC Health Gateway FILE_IMPORT sample FHIR sync. */
export async function runBcHealthGatewayConnectorSandbox(options?: {
  patientId?: string;
  now?: Date;
}): Promise<BcConnectorSandboxResult> {
  const patientId = options?.patientId ?? SEED_DAD_ID;
  const { result, smart, playbook } = await syncBcSampleToVault({
    patientId,
    now: options?.now ?? new Date('2026-09-15T12:00:00.000Z'),
  });
  return {
    importedCount: result.importedCount,
    jurisdiction: result.jurisdiction,
    smartAvailable: smart.ok,
    playbookSteps: playbook.length,
    deepLink: `/patient/${patientId}/portalSync`,
  };
}

export interface OnConnectorSandboxResult {
  importedCount: number;
  jurisdiction: string;
  smartAvailable: boolean;
  playbookSteps: number;
  deepLink: string;
}

/** Exercise Ontario MyChart/OLIS FILE_IMPORT sample FHIR sync. */
export async function runOnPortalConnectorSandbox(options?: {
  patientId?: string;
  now?: Date;
}): Promise<OnConnectorSandboxResult> {
  const patientId = options?.patientId ?? SEED_DAD_ID;
  const { result, smart, playbook } = await syncOnSampleToVault({
    patientId,
    now: options?.now ?? new Date('2026-09-15T12:00:00.000Z'),
  });
  return {
    importedCount: result.importedCount,
    jurisdiction: result.jurisdiction,
    smartAvailable: smart.ok,
    playbookSteps: playbook.length,
    deepLink: `/patient/${patientId}/portalSync`,
  };
}

export interface QcConnectorSandboxResult {
  importedCount: number;
  jurisdiction: string;
  smartAvailable: boolean;
  playbookSteps: number;
  deepLink: string;
}

/** Exercise Québec Carnet santé FILE_IMPORT sample FHIR sync. */
export async function runQcCarnetConnectorSandbox(options?: {
  patientId?: string;
  now?: Date;
}): Promise<QcConnectorSandboxResult> {
  const patientId = options?.patientId ?? SEED_DAD_ID;
  const { result, smart, playbook } = await syncQcSampleToVault({
    patientId,
    now: options?.now ?? new Date('2026-09-15T12:00:00.000Z'),
  });
  return {
    importedCount: result.importedCount,
    jurisdiction: result.jurisdiction,
    smartAvailable: smart.ok,
    playbookSteps: playbook.length,
    deepLink: `/patient/${patientId}/portalSync`,
  };
}

export interface MbConnectorSandboxResult {
  importedCount: number;
  jurisdiction: string;
  smartAvailable: boolean;
  playbookSteps: number;
  deepLink: string;
}

/** Exercise Manitoba eChart / Shared Health FILE_IMPORT sample FHIR sync. */
export async function runMbEchartConnectorSandbox(options?: {
  patientId?: string;
  now?: Date;
}): Promise<MbConnectorSandboxResult> {
  const patientId = options?.patientId ?? SEED_DAD_ID;
  const { result, smart, playbook } = await syncMbSampleToVault({
    patientId,
    now: options?.now ?? new Date('2026-09-15T12:00:00.000Z'),
  });
  return {
    importedCount: result.importedCount,
    jurisdiction: result.jurisdiction,
    smartAvailable: smart.ok,
    playbookSteps: playbook.length,
    deepLink: `/patient/${patientId}/portalSync`,
  };
}

export interface NsConnectorSandboxResult {
  importedCount: number;
  jurisdiction: string;
  smartAvailable: boolean;
  playbookSteps: number;
  deepLink: string;
}

/** Exercise Nova Scotia YourHealthNS FILE_IMPORT sample FHIR sync. */
export async function runNsYourHealthConnectorSandbox(options?: {
  patientId?: string;
  now?: Date;
}): Promise<NsConnectorSandboxResult> {
  const patientId = options?.patientId ?? SEED_DAD_ID;
  const { result, smart, playbook } = await syncNsSampleToVault({
    patientId,
    now: options?.now ?? new Date('2026-09-15T12:00:00.000Z'),
  });
  return {
    importedCount: result.importedCount,
    jurisdiction: result.jurisdiction,
    smartAvailable: smart.ok,
    playbookSteps: playbook.length,
    deepLink: `/patient/${patientId}/portalSync`,
  };
}

export interface RemainingCanadaSandboxResult {
  jurisdictions: string[];
  totalImported: number;
  allSmartUnavailable: boolean;
  deepLink: string;
}

/** Exercise NB/NL/PE/YT/NT/NU FILE_IMPORT sample syncs (completes Canada coverage). */
export async function runRemainingCanadaConnectorsSandbox(options?: {
  patientId?: string;
  now?: Date;
}): Promise<RemainingCanadaSandboxResult> {
  const patientId = options?.patientId ?? SEED_DAD_ID;
  const rows = await syncAllRemainingCanadaSamples({
    patientId,
    now: options?.now ?? new Date('2026-09-15T12:00:00.000Z'),
  });
  return {
    jurisdictions: rows.map((r) => r.result.jurisdiction),
    totalImported: rows.reduce((sum, r) => sum + r.result.importedCount, 0),
    allSmartUnavailable: rows.every((r) => !r.smart.ok),
    deepLink: `/patient/${patientId}/portalSync`,
  };
}
