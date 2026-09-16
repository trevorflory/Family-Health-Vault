/**
 * Export CareObservations / handovers as FHIR R4 Bundle (adapter only).
 * No provincial write-back.
 */

import { LOINC_SYSTEM } from '../../data/careLoinc';
import type {
  CareObservation,
  ShiftHandoverLog,
} from '../../types/careObservation';
import type {
  FhirBundle,
  FhirDocumentReference,
  FhirImportResource,
  FhirMedicationAdministration,
  FhirObservation,
} from '../../types/interop';
import { listObservationsForPatient } from '../../db/careObservations';

function observationToFhir(obs: CareObservation): FhirObservation {
  const coding = obs.loincCode
    ? {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: obs.loincCode,
            display: obs.display,
          },
        ],
        text: obs.display,
      }
    : { text: obs.display };

  const resource: FhirObservation = {
    resourceType: 'Observation',
    id: obs.id,
    status: obs.status === 'CONFIRMED' ? 'final' : 'preliminary',
    code: coding,
    effectiveDateTime: obs.effectiveDateTimeISO,
    subject: { reference: `Patient/${obs.patientId}` },
    performer: [{ display: obs.performerId }],
  };

  if (obs.numericValue != null && Number.isFinite(obs.numericValue)) {
    resource.valueQuantity = {
      value: obs.numericValue,
      unit: obs.unit,
      system: 'http://unitsofmeasure.org',
      code: obs.unit,
    };
  } else if (obs.textValue) {
    resource.valueString = obs.textValue;
  }

  return resource;
}

function medsObservationToMedAdmin(
  obs: CareObservation,
): FhirMedicationAdministration {
  return {
    resourceType: 'MedicationAdministration',
    id: `ma_${obs.id}`,
    status: obs.numericValue === 1 ? 'completed' : 'not-done',
    medicationCodeableConcept: {
      text: obs.textValue || obs.display,
    },
    effectiveDateTime: obs.effectiveDateTimeISO,
    subject: { reference: `Patient/${obs.patientId}` },
    note: obs.textValue ? [{ text: obs.textValue }] : undefined,
  };
}

function handoverToDocumentReference(
  handover: ShiftHandoverLog,
): FhirDocumentReference {
  return {
    resourceType: 'DocumentReference',
    id: `dr_${handover.id}`,
    status: 'current',
    type: { text: 'Shift handover log' },
    subject: { reference: `Patient/${handover.patientId}` },
    date: handover.shiftEndedAtISO,
    description: [
      `Performer: ${handover.performerLabel}`,
      `Meds verified: ${handover.medsVerified ? 'yes' : 'no'}`,
      `Intake: ${handover.intakeSummary}`,
      `Mood: ${handover.moodBehaviorSummary}`,
      handover.tellTheFamily ? `Family: ${handover.tellTheFamily}` : '',
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

export function careObservationsToFhirResources(
  observations: CareObservation[],
): FhirImportResource[] {
  const out: FhirImportResource[] = [];
  for (const obs of observations) {
    if (obs.category === 'MEDICATION' && obs.loincCode === '99595-7') {
      out.push(medsObservationToMedAdmin(obs));
      out.push(observationToFhir(obs));
    } else {
      out.push(observationToFhir(obs));
    }
  }
  return out;
}

export function buildCareObservationBundle(options: {
  patientId: string;
  observations: CareObservation[];
  handovers?: ShiftHandoverLog[];
  now?: Date;
}): FhirBundle {
  const resources: FhirImportResource[] = [
    ...careObservationsToFhirResources(options.observations),
  ];
  for (const h of options.handovers ?? []) {
    resources.push(handoverToDocumentReference(h));
  }
  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: (options.now ?? new Date()).toISOString(),
    entry: resources.map((resource) => ({ resource })),
  };
}

/** Load on-device observations and export a FHIR R4 collection Bundle. */
export async function exportToFHIRBundle(
  patientId: string,
  options?: { handovers?: ShiftHandoverLog[]; now?: Date },
): Promise<FhirBundle> {
  const observations = await listObservationsForPatient(patientId);
  return buildCareObservationBundle({
    patientId,
    observations,
    handovers: options?.handovers,
    now: options?.now,
  });
}
