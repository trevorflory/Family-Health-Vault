/**
 * Google / device calendar bridge for Family Health Vault.
 *
 * Public path (works on web + Expo Go): ICS FILE_IMPORT / export — same honesty
 * posture as provincial portal connectors (no invented live OAuth).
 *
 * Device calendar (expo-calendar) requires a development build and is marked
 * NOT_PUBLIC until wired in a custom binary.
 */

import {
  cacheDirectory,
  documentDirectory,
  EncodingType,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { DigestAppointment } from '../../types/digest';
import { buildIcsFromAppointments, parseIcsToAppointments } from './ics';

export type CalendarSyncMode = 'FILE_ICS' | 'DEVICE_CALENDAR' | 'GOOGLE_OAUTH';

export interface CalendarInteropReadiness {
  syncMode: CalendarSyncMode;
  status: 'PUBLIC' | 'NOT_PUBLIC';
  summary: string;
  googleCalendarHint: string;
}

/** Honest readiness — do not claim a live Google OAuth endpoint. */
export const GOOGLE_CALENDAR_READINESS: CalendarInteropReadiness = {
  syncMode: 'FILE_ICS',
  status: 'PUBLIC',
  summary:
    'Share or import an .ics file so appointments stay visible in Google Calendar and the vault digests.',
  googleCalendarHint:
    'In Google Calendar: Settings → Import & export → Import the vault .ics, or Export your calendar and paste the .ics text into the vault importer.',
};

export const DEVICE_CALENDAR_READINESS: CalendarInteropReadiness = {
  syncMode: 'DEVICE_CALENDAR',
  status: 'NOT_PUBLIC',
  summary:
    'expo-calendar can mirror the phone calendar (including a synced Google account) but needs a development build — not available in Expo Go.',
  googleCalendarHint:
    'Until a dev build ships device sync, use FILE_ICS import/export with Google Calendar.',
};

export function appointmentsFromGoogleIcsExport(
  icsText: string,
): DigestAppointment[] {
  return parseIcsToAppointments(icsText);
}

export function googleCalendarIcsExport(
  appointments: DigestAppointment[],
  calendarName = 'Family Health Vault',
): string {
  return buildIcsFromAppointments(appointments, { calendarName });
}

/**
 * Write an ICS file and open the system share sheet (Mail, Files, Google Calendar).
 */
export async function shareAppointmentsIcs(input: {
  appointments: DigestAppointment[];
  fileName?: string;
  calendarName?: string;
}): Promise<{ uri: string; icsText: string }> {
  const icsText = googleCalendarIcsExport(
    input.appointments,
    input.calendarName,
  );
  const fileName = input.fileName ?? 'family-health-vault-appointments.ics';
  const base = cacheDirectory ?? documentDirectory ?? '';
  const uri = `${base}${fileName}`;
  await writeAsStringAsync(uri, icsText, {
    encoding: EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/calendar',
      dialogTitle: 'Add appointments to Google Calendar',
      UTI: 'public.calendar-event',
    });
  }
  return { uri, icsText };
}
