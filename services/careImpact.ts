/**
 * Caregiver impact ledger — coordination proxies only (SaMD-safe copy).
 * Does not claim clinical errors prevented or tax-dollar savings.
 */

import { listImpactEvents, saveImpactEvent } from '../db/careObservations';
import type {
  CareImpactEvent,
  CareImpactEventType,
  CareImpactSummary,
} from '../types/careObservation';

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const COPY: Record<CareImpactEventType, (n: number) => string> = {
  SBAR_EXPORTED: (n) =>
    `${n} clinician / ER visit packet${n === 1 ? '' : 's'} exported this year`,
  EMERGENCY_PASS_ISSUED: (n) =>
    `${n} emergency pass${n === 1 ? '' : 'es'} prepared for time-limited ER access`,
  SHIFT_HANDOVER_RECORDED: (n) =>
    `${n} aide shift handover${n === 1 ? '' : 's'} captured for the family digest`,
  FOI_DISPATCHED: (n) =>
    `${n} FOI / access request${n === 1 ? '' : 's'} dispatched from the vault`,
  PORTAL_IMPORT_COMPLETED: (n) =>
    `${n} provincial portal import${n === 1 ? '' : 's'} completed into the local vault`,
};

export async function recordCareImpactEvent(input: {
  type: CareImpactEventType;
  caregiverId?: string;
  patientId?: string;
  label?: string;
  at?: Date;
}): Promise<CareImpactEvent> {
  const at = input.at ?? new Date();
  const event: CareImpactEvent = {
    id: newId('imp'),
    caregiverId: input.caregiverId,
    patientId: input.patientId,
    type: input.type,
    atISO: at.toISOString(),
    label: input.label ?? input.type,
  };
  return saveImpactEvent(event);
}

export async function compileCareImpactSummary(options: {
  caregiverId?: string;
  patientId?: string;
  now?: Date;
}): Promise<CareImpactSummary> {
  const now = options.now ?? new Date();
  const year = now.getFullYear();
  const events = await listImpactEvents({
    caregiverId: options.caregiverId,
    patientId: options.patientId,
    year,
  });

  const types: CareImpactEventType[] = [
    'SBAR_EXPORTED',
    'EMERGENCY_PASS_ISSUED',
    'SHIFT_HANDOVER_RECORDED',
    'FOI_DISPATCHED',
    'PORTAL_IMPORT_COMPLETED',
  ];

  const counts = types
    .map((type) => {
      const count = events.filter((e) => e.type === type).length;
      return {
        type,
        count,
        copy: COPY[type](count),
      };
    })
    .filter((c) => c.count > 0);

  const total = counts.reduce((n, c) => n + c.count, 0);
  const headline =
    total === 0
      ? 'No coordination events recorded yet this year'
      : `${total} care-coordination event${total === 1 ? '' : 's'} recorded this year`;

  return {
    caregiverId: options.caregiverId,
    compiledAtISO: now.toISOString(),
    year,
    counts,
    headline,
  };
}
