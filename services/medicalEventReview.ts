/**
 * Update MedicalEvent status / parsed payload for local review inbox.
 */

import type {
  MedicalEventParsedPayload,
  MedicalEventRecord,
  MedicalEventStatus,
} from '../types/db';
import { getMedicalEventById, saveMedicalEvent } from './medicalEvents';

export async function updateMedicalEventReview(input: {
  id: string;
  status?: MedicalEventStatus;
  parsed?: MedicalEventParsedPayload;
  rawText?: string;
}): Promise<MedicalEventRecord | null> {
  const existing = await getMedicalEventById(input.id);
  if (!existing) return null;
  let parsed: MedicalEventParsedPayload;
  try {
    parsed =
      input.parsed ??
      (JSON.parse(existing.parsedJson) as MedicalEventParsedPayload);
  } catch {
    parsed = {
      documentHint: 'unknown',
      labs: [],
      prescriptions: [],
      parserNotes: ['Recovered after invalid parsedJson'],
    };
  }
  return saveMedicalEvent({
    id: existing.id,
    patientId: existing.patientId,
    kind: existing.kind,
    sourceUri: existing.sourceUri,
    rawText: input.rawText ?? existing.rawText,
    parsed,
    status: input.status ?? existing.status,
    sourceType: existing.sourceType,
    sourceAuthorityId: existing.sourceAuthorityId,
    externalId: existing.externalId,
    lastSyncedAt: existing.lastSyncedAt,
  });
}
