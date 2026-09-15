/**
 * Map minimal FHIR R4 resources into SaveMedicalEventInput shapes.
 * Read/import only — SaMD educational context, not clinical interpretation.
 */

import type { SaveMedicalEventInput } from '../../types/db';
import type {
  FhirBundle,
  FhirCoding,
  FhirImportResource,
  FhirImmunization,
  FhirMedicationRequest,
  FhirObservation,
} from '../../types/interop';
import { enrichLabWithCode, resolveLabCode } from '../labCodes';

function codingDisplay(concept?: {
  coding?: Array<{ display?: string; code?: string }>;
  text?: string;
}): string {
  return (
    concept?.text?.trim() ||
    concept?.coding?.find((c) => c.display)?.display?.trim() ||
    concept?.coding?.find((c) => c.code)?.code?.trim() ||
    'Unknown'
  );
}

function observationValue(obs: FhirObservation): {
  value: string;
  units: string;
} {
  if (obs.valueQuantity?.value != null) {
    return {
      value: String(obs.valueQuantity.value),
      units: obs.valueQuantity.unit ?? obs.valueQuantity.code ?? '',
    };
  }
  return { value: obs.valueString?.trim() || '', units: '' };
}

function observationRefRange(obs: FhirObservation): string | undefined {
  const first = obs.referenceRange?.[0];
  if (!first) return undefined;
  if (first.text?.trim()) return first.text.trim();
  const low = first.low?.value;
  const high = first.high?.value;
  if (low != null && high != null) return `${low}-${high}`;
  if (low != null) return `>=${low}`;
  if (high != null) return `<=${high}`;
  return undefined;
}

export function mapFhirObservationToSaveInput(
  obs: FhirObservation,
  options: {
    patientId: string;
    authorityId: string;
    syncedAt?: string;
    status?: SaveMedicalEventInput['status'];
  },
): SaveMedicalEventInput | null {
  const testName = codingDisplay(obs.code);
  const { value, units } = observationValue(obs);
  if (!testName || !value) return null;

  const loincFromFhir = obs.code?.coding?.find((c: FhirCoding) =>
    (c.system ?? '').toLowerCase().includes('loinc'),
  )?.code;
  const enriched = enrichLabWithCode({
    testName,
    value,
    units,
    ...(observationRefRange(obs)
      ? { referenceRange: observationRefRange(obs) }
      : {}),
  });
  if (loincFromFhir && !enriched.loinc) {
    enriched.loinc = loincFromFhir;
  }
  const resolved = resolveLabCode(enriched.testName);

  const syncedAt = options.syncedAt ?? new Date().toISOString();
  const externalId = obs.id ? `Observation/${obs.id}` : undefined;

  return {
    patientId: options.patientId,
    kind: 'LAB_RESULT',
    rawText: [
      `FHIR Observation import from ${options.authorityId}`,
      `${enriched.testName}: ${enriched.value} ${enriched.units}`.trim(),
      enriched.referenceRange ? `ref ${enriched.referenceRange}` : '',
      resolved?.loinc || enriched.loinc
        ? `LOINC ${resolved?.loinc ?? enriched.loinc}`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
    parsed: {
      documentHint: 'lab',
      labs: [enriched],
      prescriptions: [],
      parserNotes: [
        'Imported from FHIR Observation — educational context only; clinician to interpret.',
      ],
      sourceAuthorityId: options.authorityId,
    },
    status: options.status ?? 'PENDING_REVIEW',
    sourceType: 'FHIR',
    sourceAuthorityId: options.authorityId,
    externalId: externalId ?? null,
    lastSyncedAt: syncedAt,
  };
}

export function mapFhirMedicationRequestToSaveInput(
  rx: FhirMedicationRequest,
  options: {
    patientId: string;
    authorityId: string;
    syncedAt?: string;
    status?: SaveMedicalEventInput['status'];
  },
): SaveMedicalEventInput | null {
  const medicationName = codingDisplay(rx.medicationCodeableConcept);
  if (!medicationName || medicationName === 'Unknown') return null;
  const dosage =
    rx.dosageInstruction?.[0]?.text?.trim() ||
    rx.dosageInstruction?.[0]?.timing?.code?.text?.trim() ||
    'Unknown';
  const prescribingDoctor = rx.requester?.display?.trim() || 'Unknown';
  const syncedAt = options.syncedAt ?? new Date().toISOString();

  return {
    patientId: options.patientId,
    kind: 'PRESCRIPTION',
    rawText: `FHIR MedicationRequest import\n${medicationName} ${dosage}\n${prescribingDoctor}`,
    parsed: {
      documentHint: 'prescription',
      labs: [],
      prescriptions: [
        {
          medicationName,
          dosage,
          frequency: dosage,
          prescribingDoctor,
        },
      ],
      parserNotes: [
        'Imported from FHIR MedicationRequest — not a prescribing recommendation.',
      ],
      sourceAuthorityId: options.authorityId,
    },
    status: options.status ?? 'PENDING_REVIEW',
    sourceType: 'FHIR',
    sourceAuthorityId: options.authorityId,
    externalId: rx.id ? `MedicationRequest/${rx.id}` : null,
    lastSyncedAt: syncedAt,
  };
}

export function mapFhirImmunizationToRawNote(
  imm: FhirImmunization,
  authorityId: string,
): string {
  const vaccine = codingDisplay(imm.vaccineCode);
  const when = imm.occurrenceDateTime ?? 'date unknown';
  return `FHIR Immunization from ${authorityId}: ${vaccine} (${when})`;
}

export function flattenFhirBundle(
  bundle: FhirBundle | FhirImportResource | FhirImportResource[],
): FhirImportResource[] {
  if (Array.isArray(bundle)) return bundle;
  if (
    bundle &&
    typeof bundle === 'object' &&
    'resourceType' in bundle &&
    bundle.resourceType === 'Bundle'
  ) {
    return (bundle.entry ?? [])
      .map((e) => e.resource)
      .filter((r): r is FhirImportResource => !!r?.resourceType);
  }
  if (bundle && typeof bundle === 'object' && 'resourceType' in bundle) {
    return [bundle as FhirImportResource];
  }
  return [];
}

export function mapFhirResourcesToSaveInputs(
  resources: FhirImportResource[],
  options: {
    patientId: string;
    authorityId: string;
    syncedAt?: string;
    status?: SaveMedicalEventInput['status'];
  },
): { inputs: SaveMedicalEventInput[]; notes: string[] } {
  const inputs: SaveMedicalEventInput[] = [];
  const notes: string[] = [];

  for (const resource of resources) {
    if (resource.resourceType === 'Observation') {
      const mapped = mapFhirObservationToSaveInput(resource, options);
      if (mapped) inputs.push(mapped);
      else notes.push('Skipped Observation without usable value');
    } else if (resource.resourceType === 'MedicationRequest') {
      const mapped = mapFhirMedicationRequestToSaveInput(resource, options);
      if (mapped) inputs.push(mapped);
      else notes.push('Skipped MedicationRequest without medication name');
    } else if (resource.resourceType === 'Immunization') {
      notes.push(mapFhirImmunizationToRawNote(resource, options.authorityId));
    }
  }

  return { inputs, notes };
}
