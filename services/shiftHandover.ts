/**
 * Shift-change handover capture for home-care / facility aides.
 * Expands to CareObservations + optional MedicalEvents provenance.
 */

import {
  listHandoversSince,
  saveHandover,
  saveObservations,
} from '../db/careObservations';
import { getCareLoinc } from '../data/careLoinc';
import type {
  CareObservation,
  DigestShiftHandoverSummary,
  ShiftHandoverLog,
  SubmitShiftHandoverInput,
} from '../types/careObservation';
import { assertDelegateScope } from './delegateAccess';
import { recordCareImpactEvent } from './careImpact';

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function observationFromHandover(
  partial: Omit<
    CareObservation,
    'id' | 'source' | 'status' | 'dataResidency' | 'createdAt'
  > &
    Partial<Pick<CareObservation, 'status'>>,
  createdAt: number,
): CareObservation {
  return {
    id: newId('cobs'),
    source: 'DELEGATE_HANDOVER',
    status: partial.status ?? 'CONFIRMED',
    dataResidency: 'DEVICE',
    createdAt,
    ...partial,
  };
}

export async function submitShiftHandover(
  input: SubmitShiftHandoverInput,
  options?: {
    caregiverId?: string;
    saveMedicalEvent?: (input: {
      patientId: string;
      kind: 'UNSTRUCTURED_DOC';
      rawText: string;
      parsed: {
        eventType: 'CARE_HOME_DAILY_LOG';
        observationCount: number;
        parserNotes: string[];
      };
      status: 'CONFIRMED';
      sourceType: 'MANUAL';
    }) => Promise<{ id: string }>;
  },
): Promise<{ handover: ShiftHandoverLog; observations: CareObservation[] }> {
  const now = input.now ?? new Date();
  const grant = await assertDelegateScope(
    input.tokenId,
    'SUBMIT_HANDOVER',
    now,
  );

  const handoverId = newId('hov');
  const shiftEndedAtISO = input.shiftEndedAtISO ?? now.toISOString();
  const createdAt = now.getTime();
  const observations: CareObservation[] = [];

  const medsDef = getCareLoinc('MEDS_VERIFIED')!;
  observations.push(
    observationFromHandover(
      {
        patientId: grant.patientId,
        performerId: grant.tokenId,
        effectiveDateTimeISO: shiftEndedAtISO,
        category: medsDef.category,
        loincCode: medsDef.loinc,
        display: medsDef.display,
        numericValue: input.medsVerified ? 1 : 0,
        textValue: input.medsVerified
          ? input.medsNote?.trim() || 'Medications verified'
          : input.medsNote?.trim() || 'Medications not verified',
        handoverId,
      },
      createdAt,
    ),
  );

  const intake = input.intakeSummary.trim();
  if (intake) {
    const mealDef = getCareLoinc('MEAL_INTAKE_PCT')!;
    observations.push(
      observationFromHandover(
        {
          patientId: grant.patientId,
          performerId: grant.tokenId,
          effectiveDateTimeISO: shiftEndedAtISO,
          category: 'NUTRITION',
          loincCode:
            input.mealPercent != null ? mealDef.loinc : undefined,
          display: 'Intake summary',
          numericValue: input.mealPercent,
          unit: input.mealPercent != null ? '%' : undefined,
          textValue: intake,
          handoverId,
        },
        createdAt,
      ),
    );
  }

  const mood = input.moodBehaviorSummary.trim();
  if (mood) {
    const moodDef = getCareLoinc('MOOD_BEHAVIOR')!;
    observations.push(
      observationFromHandover(
        {
          patientId: grant.patientId,
          performerId: grant.tokenId,
          effectiveDateTimeISO: shiftEndedAtISO,
          category: moodDef.category,
          loincCode: moodDef.loinc,
          display: moodDef.display,
          textValue: mood,
          handoverId,
        },
        createdAt,
      ),
    );
  }

  if (input.weightKg != null && Number.isFinite(input.weightKg)) {
    const def = getCareLoinc('BODY_WEIGHT')!;
    observations.push(
      observationFromHandover(
        {
          patientId: grant.patientId,
          performerId: grant.tokenId,
          effectiveDateTimeISO: shiftEndedAtISO,
          category: def.category,
          loincCode: def.loinc,
          display: def.display,
          numericValue: input.weightKg,
          unit: 'kg',
          handoverId,
        },
        createdAt,
      ),
    );
  }

  if (
    input.systolicMmHg != null &&
    input.diastolicMmHg != null &&
    Number.isFinite(input.systolicMmHg) &&
    Number.isFinite(input.diastolicMmHg)
  ) {
    const sysDef = getCareLoinc('BP_SYSTOLIC')!;
    const diaDef = getCareLoinc('BP_DIASTOLIC')!;
    observations.push(
      observationFromHandover(
        {
          patientId: grant.patientId,
          performerId: grant.tokenId,
          effectiveDateTimeISO: shiftEndedAtISO,
          category: sysDef.category,
          loincCode: sysDef.loinc,
          display: sysDef.display,
          numericValue: input.systolicMmHg,
          unit: 'mm[Hg]',
          handoverId,
        },
        createdAt,
      ),
      observationFromHandover(
        {
          patientId: grant.patientId,
          performerId: grant.tokenId,
          effectiveDateTimeISO: shiftEndedAtISO,
          category: diaDef.category,
          loincCode: diaDef.loinc,
          display: diaDef.display,
          numericValue: input.diastolicMmHg,
          unit: 'mm[Hg]',
          handoverId,
        },
        createdAt,
      ),
    );
  }

  let sourceEventId: string | undefined;
  if (options?.saveMedicalEvent) {
    const saved = await options.saveMedicalEvent({
      patientId: grant.patientId,
      kind: 'UNSTRUCTURED_DOC',
      rawText: [
        `Shift handover by ${grant.recipientName}`,
        `Meds verified: ${input.medsVerified ? 'yes' : 'no'}`,
        `Intake: ${intake}`,
        `Mood: ${mood}`,
        input.tellTheFamily ? `Family note: ${input.tellTheFamily}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      parsed: {
        eventType: 'CARE_HOME_DAILY_LOG',
        observationCount: observations.length,
        parserNotes: ['Delegate shift handover'],
      },
      status: 'CONFIRMED',
      sourceType: 'MANUAL',
    });
    sourceEventId = saved.id;
  }

  const linked = observations.map((o) =>
    sourceEventId ? { ...o, sourceEventId } : o,
  );
  await saveObservations(linked);

  const handover: ShiftHandoverLog = {
    id: handoverId,
    patientId: grant.patientId,
    delegateGrantId: grant.tokenId,
    performerLabel: grant.recipientName,
    shiftEndedAtISO,
    medsVerified: input.medsVerified,
    medsNote: input.medsNote?.trim() || undefined,
    intakeSummary: intake,
    moodBehaviorSummary: mood,
    tellTheFamily: input.tellTheFamily?.trim() || undefined,
    observationIds: linked.map((o) => o.id),
    sourceEventId,
    createdAt,
  };
  await saveHandover(handover);

  await recordCareImpactEvent({
    type: 'SHIFT_HANDOVER_RECORDED',
    caregiverId: options?.caregiverId,
    patientId: grant.patientId,
    label: 'Shift handover recorded',
    at: now,
  });

  return { handover, observations: linked };
}

const HANDOVER_DIGEST_WINDOW_MS = 36 * 60 * 60 * 1000;

export async function listRecentHandoverSummaries(
  patientId: string,
  now: Date = new Date(),
  windowMs: number = HANDOVER_DIGEST_WINDOW_MS,
): Promise<DigestShiftHandoverSummary[]> {
  const since = now.getTime() - windowMs;
  const rows = await listHandoversSince(patientId, since);
  return rows.map((h) => ({
    handoverId: h.id,
    patientId: h.patientId,
    performerLabel: h.performerLabel,
    shiftEndedAtISO: h.shiftEndedAtISO,
    medsVerified: h.medsVerified,
    intakeSummary: h.intakeSummary,
    moodBehaviorSummary: h.moodBehaviorSummary,
    tellTheFamily: h.tellTheFamily,
  }));
}

export function toDigestHandoverSummary(
  h: ShiftHandoverLog,
): DigestShiftHandoverSummary {
  return {
    handoverId: h.id,
    patientId: h.patientId,
    performerLabel: h.performerLabel,
    shiftEndedAtISO: h.shiftEndedAtISO,
    medsVerified: h.medsVerified,
    intakeSummary: h.intakeSummary,
    moodBehaviorSummary: h.moodBehaviorSummary,
    tellTheFamily: h.tellTheFamily,
  };
}
