import { DEMO_CAREGIVER_ID } from '../data/caregiverHousehold';
import { getFacilityById } from '../data/healthAuthorities';
import { compileDailyDigest } from '../services/digestEngine';
import { generateFOIPDF } from '../services/foiGenerator';
import { dailyDigestDeepLink } from '../services/notificationScheduler';
import { buildDadSbarHtml, synthesizeDadSbarPdf } from '../services/sbarNote';
import { generate811Script } from '../services/triage811Engine';
import type { FOIRequestPayload } from '../types/foiPayload';
import { SEED_DAD_ID } from './mockSeeder';

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

/** Run daily digest and return the local push-alert payload shape. */
export async function runDailyDigestSandbox(
  caregiverId: string = DEMO_CAREGIVER_ID,
  now: Date = new Date(),
): Promise<DigestSandboxResult> {
  const digest = await compileDailyDigest(caregiverId, now);
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

/** Generate Dad's 1-page SBAR PDF. */
export async function runDadSbarSandbox(): Promise<{
  uri: string;
  html: string;
}> {
  return synthesizeDadSbarPdf();
}

/** HTML-only SBAR (unit-testable without expo-print). */
export function previewDadSbarHtml(): string {
  return buildDadSbarHtml();
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

/** Trigger 811 teleprompter script for Dad with flustered-caregiver symptoms. */
export async function run811ScriptSandbox() {
  return generate811Script(SEED_DAD_ID, [
    'Sudden onset confusion',
    'Mild fever',
  ]);
}
