import {
  DEMO_CAREGIVER_ID,
  getHousehold,
} from '../data/caregiverHousehold';
import { listMedicalEventsForPatient } from '../db/medicalEvents';
import { getVisitGoals } from '../db/visitGoals';
import type {
  MedicalEventRecord,
  OcrParsedPayload,
  VisitDebriefParsed,
} from '../types/db';
import type {
  SBARAppointmentContext,
  SBARDocument,
  SBARInput,
  SBARSections,
} from '../types/sbar';
import type { PatientVaultProfile } from '../types/triage811';
import { getEffectiveVaultProfile } from './effectiveVault';
import { formatActiveMedications } from './triage811Engine';

export const SBAR_REGULATORY_NOTICE =
  'This one-page SBAR is an Educational Context Summarizer for visit prep only. Assessment reflects caregiver observations and concerns — not a clinical diagnosis, acuity score, or treatment plan. Share with the clinician and follow their judgment.';

const MAX_SECTION_CHARS = 420;
const MAX_NOTES_CHARS = 280;

export interface CompileSBAROptions {
  /** Injectable events for tests; skips DB when provided. */
  medicalEvents?: MedicalEventRecord[];
  now?: Date;
  /** Injectable visit goals text for tests. */
  visitGoalsText?: string | null;
}

function clip(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function formatConditions(conditions: string[] | null | undefined): string {
  if (!conditions || conditions.length === 0) return 'none listed';
  return conditions.filter((c) => c?.trim()).join(', ') || 'none listed';
}

function resolveAppointment(
  patientId: string,
  appointmentId: string | undefined,
  now: Date,
): SBARAppointmentContext | null {
  if (!appointmentId) return null;
  const household = getHousehold(DEMO_CAREGIVER_ID, now);
  if (!household) return null;

  for (const schedule of household.dependants) {
    if (schedule.dependant.patientId !== patientId) continue;
    const match = schedule.appointments.find(
      (a) => a.appointmentId === appointmentId,
    );
    if (match) {
      return {
        appointmentId: match.appointmentId,
        title: match.title,
        startsAt: match.startsAt,
        location: match.location,
      };
    }
  }
  return null;
}

function documentsToBring(patientId: string, now: Date): string[] {
  const docs: string[] = ['This 1-page SBAR summary'];
  const household = getHousehold(DEMO_CAREGIVER_ID, now);
  const schedule = household?.dependants.find(
    (d) => d.dependant.patientId === patientId,
  );
  for (const task of schedule?.overdueTasks ?? []) {
    if (task.kind === 'FOI_PENDING') {
      docs.push(`Pending FOI status note: ${task.label}`);
    }
    if (task.kind === 'MISSING_LAB_UPLOAD') {
      docs.push(`Missing lab upload reminder: ${task.label}`);
    }
  }
  docs.push('Current medication list / blister pack if available');
  return docs.slice(0, 5);
}

function parseEventPayload(event: MedicalEventRecord): unknown {
  try {
    return JSON.parse(event.parsedJson);
  } catch {
    return null;
  }
}

function isVisitDebrief(payload: unknown): payload is VisitDebriefParsed {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      (payload as VisitDebriefParsed).eventType === 'VISIT_DEBRIEF',
  );
}

function isOcrPayload(payload: unknown): payload is OcrParsedPayload {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as OcrParsedPayload).labs) &&
      Array.isArray((payload as OcrParsedPayload).prescriptions),
  );
}

/**
 * Pure formatter — turns MedicalEvents into SBAR-ready strings (no diagnoses).
 */
export function summarizeMedicalEvents(events: MedicalEventRecord[]): {
  backgroundExtras: string[];
  assessmentExtras: string[];
  documentExtras: string[];
  sourceEventIds: string[];
  sourceEventSummaries: string[];
} {
  const backgroundExtras: string[] = [];
  const assessmentExtras: string[] = [];
  const documentExtras: string[] = [];
  const sourceEventIds: string[] = [];
  const sourceEventSummaries: string[] = [];

  const usable = events.filter(
    (e) => e.status === 'CONFIRMED' || e.status === 'PENDING_REVIEW',
  );

  for (const event of usable) {
    const payload = parseEventPayload(event);
    const pendingTag =
      event.status === 'PENDING_REVIEW' ? ' (pending caregiver review)' : '';

    if (event.kind === 'VISIT_DEBRIEF' && isVisitDebrief(payload)) {
      sourceEventIds.push(event.id);
      sourceEventSummaries.push(
        `${event.status} visit debrief${pendingTag}`,
      );
      if (payload.discussionSummary?.trim()) {
        assessmentExtras.push(
          `Visit debrief notes${pendingTag}: ${payload.discussionSummary.trim()}`,
        );
      }
      for (const change of payload.dosageChanges ?? []) {
        assessmentExtras.push(
          `Reported dosage change to raise with clinician${pendingTag}: ${change.medicationName} — ${change.changeDescription}`,
        );
      }
      for (const item of (payload.actionItems ?? []).slice(0, 3)) {
        assessmentExtras.push(`Caregiver action item${pendingTag}: ${item}`);
      }
      documentExtras.push('Latest visit debrief transcript / notes');
      continue;
    }

    if (
      (event.kind === 'LAB_RESULT' ||
        event.kind === 'PRESCRIPTION' ||
        event.kind === 'PORTAL_SCREENSHOT' ||
        event.kind === 'UNSTRUCTURED_DOC') &&
      isOcrPayload(payload)
    ) {
      sourceEventIds.push(event.id);
      const sourceLabel =
        event.sourceType === 'FHIR' || event.sourceType === 'FILE_IMPORT'
          ? 'Custodian-synced'
          : event.kind === 'PORTAL_SCREENSHOT'
            ? 'Portal screenshot'
            : 'OCR';
      if (payload.labs.length) {
        const labBits = payload.labs
          .slice(0, 4)
          .map(
            (l) =>
              `${l.testName} ${l.value}${l.units ? ` ${l.units}` : ''}${
                l.referenceRange ? ` (ref ${l.referenceRange})` : ''
              }`,
          )
          .join('; ');
        backgroundExtras.push(
          `${sourceLabel} lab values on file${pendingTag}: ${labBits}. Values are transcribed context only — clinician to interpret.`,
        );
        sourceEventSummaries.push(
          `${event.status} lab ${sourceLabel}: ${payload.labs[0]?.testName ?? 'labs'}`,
        );
        documentExtras.push(
          event.kind === 'PORTAL_SCREENSHOT'
            ? 'Portal screenshot / lab printout'
            : 'OCR lab upload / printout',
        );
      }
      if (payload.prescriptions.length) {
        const rxBits = payload.prescriptions
          .slice(0, 3)
          .map(
            (r) =>
              `${r.medicationName} ${r.dosage} ${r.frequency} (Rx ${r.prescribingDoctor})`,
          )
          .join('; ');
        backgroundExtras.push(
          `OCR prescription text on file${pendingTag}: ${rxBits}. Not a prescribing recommendation.`,
        );
        sourceEventSummaries.push(
          `${event.status} Rx OCR: ${payload.prescriptions[0]?.medicationName ?? 'Rx'}`,
        );
        documentExtras.push('OCR prescription image / printout');
      }
      if (
        !payload.labs.length &&
        !payload.prescriptions.length &&
        event.rawText.trim()
      ) {
        backgroundExtras.push(
          `Unstructured OCR excerpt${pendingTag}: ${clip(event.rawText, 160)}`,
        );
        sourceEventSummaries.push(`${event.status} unstructured OCR`);
        documentExtras.push('OCR document upload');
      }
    }
  }

  return {
    backgroundExtras,
    assessmentExtras,
    documentExtras,
    sourceEventIds,
    sourceEventSummaries,
  };
}

function buildSituation(
  displayName: string,
  ageYears: number,
  relationshipLabel: string,
  visitReason: string,
  appointment: SBARAppointmentContext | null,
): string {
  const reason = visitReason.trim() || 'Routine follow-up / caregiver prep';
  const when = appointment
    ? ` Upcoming: ${appointment.title} at ${appointment.location} (${new Date(appointment.startsAt).toLocaleString('en-CA')}).`
    : '';
  return clip(
    `Caregiver accompanying ${displayName} (${ageYears}y, ${relationshipLabel}). Visit focus: ${reason}.${when}`,
    MAX_SECTION_CHARS,
  );
}

function buildBackground(
  profile: PatientVaultProfile,
  extras: string[],
): string {
  const conditions = formatConditions(profile.chronicConditions);
  const meds = formatActiveMedications(profile.activeMedications);
  const recent = (profile.recentEvents ?? [])
    .map((e) => e.trim())
    .filter(Boolean)
    .slice(0, 3);
  const markers = (profile.historicalMarkers ?? [])
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, 3);

  const parts = [
    `Chronic conditions on file: ${conditions}.`,
    `Active medications: ${meds}.`,
  ];
  // Prefer MedicalEvent context over long vault recent/marker lists (section is clipped).
  for (const extra of extras.slice(0, 3)) {
    parts.push(extra);
  }
  if (recent.length) parts.push(`Recent events: ${recent.join('; ')}.`);
  if (markers.length) {
    parts.push(`Historical context markers: ${markers.join('; ')}.`);
  }

  return clip(parts.join(' '), MAX_SECTION_CHARS);
}

function buildAssessment(
  caregiverNotes: string | undefined,
  extras: string[],
): string {
  const chunks: string[] = [];
  const notes = caregiverNotes?.trim();
  if (notes) {
    chunks.push(
      `Caregiver observations / concerns to raise (not a clinical assessment): ${clip(notes, MAX_NOTES_CHARS)}`,
    );
  }
  for (const extra of extras.slice(0, 3)) {
    chunks.push(extra);
  }
  if (chunks.length === 0) {
    return clip(
      'Caregiver observations: no free-text debrief or confirmed visit notes on file. Ask the clinician to review vault context and clarify any new symptoms at the start of the visit.',
      MAX_SECTION_CHARS,
    );
  }
  return clip(chunks.join(' '), MAX_SECTION_CHARS);
}

function buildRecommendation(
  visitReason: string,
  docs: string[],
  appointment: SBARAppointmentContext | null,
  visitGoalsText?: string | null,
): string {
  const focus = visitReason.trim() || 'the listed concerns';
  const goals = visitGoalsText?.trim();
  const questions = [
    goals
      ? `Caregiver visit goals to discuss (educational talking points, not a care plan): ${clip(goals, 160)}`
      : `Please confirm priorities for today’s visit focused on: ${focus}.`,
    'Which warning signs should the caregiver monitor before the next appointment?',
    'Are any medication timing or lab follow-ups needed from the caregiver side?',
  ];
  const docLine = `Documents to bring: ${docs.join('; ')}.`;
  const apptLine = appointment
    ? `Confirm logistics for ${appointment.title}.`
    : 'Confirm next follow-up timing with the clinician.';
  return clip(`${questions.join(' ')} ${docLine} ${apptLine}`, MAX_SECTION_CHARS);
}

/**
 * Compile a physician-ready 1-page SBAR from vault + caregiver notes + MedicalEvents.
 * SaMD safeguard: educational context summarizer only — no diagnosis or prescribing.
 */
export async function compileSBAR(
  patientId: string,
  input: SBARInput,
  options: CompileSBAROptions = {},
): Promise<SBARDocument> {
  const now = options.now ?? new Date();
  const profile = await getEffectiveVaultProfile(patientId);
  if (!profile) {
    throw new Error(`Unknown patientId: ${patientId}`);
  }

  const appointment = resolveAppointment(patientId, input.appointmentId, now);
  const docs = documentsToBring(patientId, now);
  const displayName = profile.preferredName?.trim() || profile.fullName;

  let events: MedicalEventRecord[] = [];
  if (input.includeMedicalEvents !== false) {
    events =
      options.medicalEvents ?? (await listMedicalEventsForPatient(patientId));
  }

  let visitGoalsText = options.visitGoalsText;
  if (visitGoalsText === undefined && input.appointmentId) {
    const saved = await getVisitGoals(patientId, input.appointmentId);
    visitGoalsText = saved?.goalsText ?? null;
  }

  const summarized = summarizeMedicalEvents(events);
  for (const extra of summarized.documentExtras) {
    if (!docs.includes(extra) && docs.length < 6) docs.push(extra);
  }

  const sections: SBARSections = {
    situation: buildSituation(
      displayName,
      profile.ageYears,
      profile.relationshipLabel,
      input.visitReason,
      appointment,
    ),
    background: buildBackground(profile, summarized.backgroundExtras),
    assessment: buildAssessment(
      input.caregiverNotes,
      summarized.assessmentExtras,
    ),
    recommendation: buildRecommendation(
      input.visitReason,
      docs,
      appointment,
      visitGoalsText,
    ),
  };

  return {
    patientId,
    patientDisplayName: displayName,
    compiledAt: now.toISOString(),
    appointment,
    sections,
    documentsToBring: docs,
    sourceEventIds: summarized.sourceEventIds,
    sourceEventSummaries: summarized.sourceEventSummaries,
    regulatoryNotice: SBAR_REGULATORY_NOTICE,
  };
}
