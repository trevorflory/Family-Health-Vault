/**
 * Vault appointments (manual + calendar ICS import).
 * Native: SQLite; Web: appointments.web.ts.
 */

import type { DigestAppointment } from '../types/digest';
import { getHealthcareDb } from './client';

export interface AppointmentRecord extends DigestAppointment {
  patientId: string;
  updatedAt: string;
}

const APPOINTMENTS_DDL = `
CREATE TABLE IF NOT EXISTS Appointments (
  appointmentId TEXT PRIMARY KEY NOT NULL,
  patientId TEXT NOT NULL,
  title TEXT NOT NULL,
  startsAt TEXT NOT NULL,
  endsAt TEXT,
  location TEXT NOT NULL,
  preparationAlert TEXT NOT NULL,
  clinicianName TEXT,
  source TEXT NOT NULL,
  externalCalendarEventId TEXT,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_appointments_patient
  ON Appointments(patientId);
CREATE INDEX IF NOT EXISTS idx_appointments_starts
  ON Appointments(startsAt);
`;

async function ensureTable(): Promise<void> {
  const db = await getHealthcareDb();
  await db.execAsync(APPOINTMENTS_DDL);
}

function rowToAppointment(row: AppointmentRecord): DigestAppointment {
  return {
    appointmentId: row.appointmentId,
    title: row.title,
    startsAt: row.startsAt,
    endsAt: row.endsAt ?? undefined,
    location: row.location,
    preparationAlert: row.preparationAlert,
    clinicianName: row.clinicianName ?? undefined,
    source: row.source as DigestAppointment['source'],
    externalCalendarEventId: row.externalCalendarEventId ?? undefined,
  };
}

export async function upsertAppointment(
  patientId: string,
  appointment: DigestAppointment,
): Promise<DigestAppointment> {
  await ensureTable();
  const db = await getHealthcareDb();
  const updatedAt = new Date().toISOString();
  const source = appointment.source ?? 'VAULT';
  await db.runAsync(
    `INSERT OR REPLACE INTO Appointments
      (appointmentId, patientId, title, startsAt, endsAt, location,
       preparationAlert, clinicianName, source, externalCalendarEventId, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      appointment.appointmentId,
      patientId,
      appointment.title,
      appointment.startsAt,
      appointment.endsAt ?? null,
      appointment.location,
      appointment.preparationAlert,
      appointment.clinicianName ?? null,
      source,
      appointment.externalCalendarEventId ?? null,
      updatedAt,
    ],
  );
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
  await ensureTable();
  const db = await getHealthcareDb();
  const rows = await db.getAllAsync<AppointmentRecord>(
    `SELECT appointmentId, patientId, title, startsAt, endsAt, location,
            preparationAlert, clinicianName, source, externalCalendarEventId, updatedAt
     FROM Appointments WHERE patientId = ? ORDER BY startsAt ASC`,
    [patientId],
  );
  return rows.map(rowToAppointment);
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  await ensureTable();
  const db = await getHealthcareDb();
  await db.runAsync(`DELETE FROM Appointments WHERE appointmentId = ?`, [
    appointmentId,
  ]);
}

export function __resetAppointmentsForTests(): void {
  // Table cleared via db reset in integration tests; no-op for unit tests.
}
