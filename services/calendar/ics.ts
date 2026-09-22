/**
 * Minimal iCalendar (ICS) builder/parser for vault ↔ Google Calendar file import.
 * Read/import only into the vault; never writes back to Google APIs.
 */

import type { DigestAppointment } from '../../types/digest';

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format Date as UTC ICS timestamp: YYYYMMDDTHHMMSSZ */
export function toIcsUtc(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

export function buildIcsFromAppointments(
  appointments: DigestAppointment[],
  options?: { calendarName?: string; now?: Date },
): string {
  const now = options?.now ?? new Date();
  const stamp = toIcsUtc(now);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Family Health Vault//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  if (options?.calendarName) {
    lines.push(`X-WR-CALNAME:${escapeIcsText(options.calendarName)}`);
  }

  for (const appt of appointments) {
    const start = new Date(appt.startsAt);
    if (Number.isNaN(start.getTime())) continue;
    const end = appt.endsAt
      ? new Date(appt.endsAt)
      : new Date(start.getTime() + DEFAULT_DURATION_MS);
    const uid = `${appt.appointmentId}@family-health-vault`;
    const descParts = [appt.preparationAlert, appt.clinicianName]
      .filter(Boolean)
      .join(' · ');
    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${uid}`));
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${toIcsUtc(start)}`);
    lines.push(`DTEND:${toIcsUtc(end)}`);
    lines.push(foldLine(`SUMMARY:${escapeIcsText(appt.title)}`));
    if (appt.location) {
      lines.push(foldLine(`LOCATION:${escapeIcsText(appt.location)}`));
    }
    if (descParts) {
      lines.push(foldLine(`DESCRIPTION:${escapeIcsText(descParts)}`));
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

function unfoldIcs(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const physical = normalized.split('\n');
  const logical: string[] = [];
  for (const line of physical) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && logical.length) {
      logical[logical.length - 1] += line.slice(1);
    } else {
      logical.push(line);
    }
  }
  return logical;
}

function parseIcsDate(value: string): string | null {
  const v = value.trim();
  // YYYYMMDDTHHMMSSZ
  const zulu = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/i.exec(v);
  if (zulu) {
    const [, y, mo, d, h, mi, s] = zulu;
    return new Date(
      Date.UTC(+y, +mo - 1, +d, +h, +mi, +s),
    ).toISOString();
  }
  // YYYYMMDDTHHMMSS (treat as local)
  const local = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(v);
  if (local) {
    const [, y, mo, d, h, mi, s] = local;
    return new Date(+y, +mo - 1, +d, +h, +mi, +s).toISOString();
  }
  // YYYYMMDD all-day
  const day = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (day) {
    const [, y, mo, d] = day;
    return new Date(+y, +mo - 1, +d, 9, 0, 0).toISOString();
  }
  const asDate = new Date(v);
  return Number.isNaN(asDate.getTime()) ? null : asDate.toISOString();
}

/**
 * Parse VEVENT blocks from an ICS / Google Calendar export into DigestAppointment.
 * patientId is applied by the caller when persisting.
 */
export function parseIcsToAppointments(icsText: string): DigestAppointment[] {
  const lines = unfoldIcs(icsText);
  const out: DigestAppointment[] = [];
  let inEvent = false;
  let uid = '';
  let summary = '';
  let location = '';
  let description = '';
  let dtStart = '';
  let dtEnd = '';

  const flush = () => {
    if (!dtStart || !summary) return;
    const startsAt = parseIcsDate(dtStart);
    if (!startsAt) return;
    const endsAt = dtEnd ? parseIcsDate(dtEnd) ?? undefined : undefined;
    const idFromUid = uid
      ? uid.replace(/@.*$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64)
      : `ics-${startsAt.slice(0, 10)}-${out.length + 1}`;
    out.push({
      appointmentId: idFromUid || `ics-${out.length + 1}`,
      title: unescapeIcsText(summary),
      startsAt,
      endsAt,
      location: unescapeIcsText(location) || 'Imported calendar',
      preparationAlert:
        unescapeIcsText(description).trim() ||
        'Imported from calendar — add prep notes if needed',
      source: 'CALENDAR_ICS',
      externalCalendarEventId: uid || undefined,
    });
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      uid = '';
      summary = '';
      location = '';
      description = '';
      dtStart = '';
      dtEnd = '';
      continue;
    }
    if (line === 'END:VEVENT') {
      if (inEvent) flush();
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const keyPart = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const key = keyPart.split(';')[0]!.toUpperCase();
    if (key === 'UID') uid = value;
    else if (key === 'SUMMARY') summary = value;
    else if (key === 'LOCATION') location = value;
    else if (key === 'DESCRIPTION') description = value;
    else if (key === 'DTSTART') dtStart = value;
    else if (key === 'DTEND') dtEnd = value;
  }

  return out;
}
