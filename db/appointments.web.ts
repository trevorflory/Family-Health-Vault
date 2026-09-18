/**
 * Web appointments store (sessionStorage-backed).
 */

import type { DigestAppointment } from '../types/digest';
import {
  clearSessionMap,
  loadSessionMap,
  persistSessionMap,
} from './webSessionMap';

interface AppointmentRow extends DigestAppointment {
  patientId: string;
  updatedAt: string;
}

const STORAGE_KEY = 'healthcare.web.appointments.v1';
const memoryStore = loadSessionMap<AppointmentRow>(STORAGE_KEY);

function persist(): void {
  persistSessionMap(STORAGE_KEY, memoryStore);
}

export async function upsertAppointment(
  patientId: string,
  appointment: DigestAppointment,
): Promise<DigestAppointment> {
  const updatedAt = new Date().toISOString();
  const source = appointment.source ?? 'VAULT';
  const row: AppointmentRow = {
    ...appointment,
    source,
    patientId,
    updatedAt,
  };
  memoryStore.set(appointment.appointmentId, row);
  persist();
  return { ...appointment, source };
}

export async function upsertAppointments(
  patientId: string,
  appointments: DigestAppointment[],
): Promise<DigestAppointment[]> {
  const out: DigestAppointment[] = [];
  for (const a of appointments) {
    out.push(await upsertAppointment(patientId, a));
  }
  return out;
}

export async function listAppointmentsForPatient(
  patientId: string,
): Promise<DigestAppointment[]> {
  return [...memoryStore.values()]
    .filter((r) => r.patientId === patientId)
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .map(({ patientId: _p, updatedAt: _u, ...appt }) => appt);
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  memoryStore.delete(appointmentId);
  persist();
}

export function __resetAppointmentsForTests(): void {
  memoryStore.clear();
  clearSessionMap(STORAGE_KEY);
}
