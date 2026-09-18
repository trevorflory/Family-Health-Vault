import {
  buildIcsFromAppointments,
  parseIcsToAppointments,
  toIcsUtc,
} from '../services/calendar/ics';
import type { DigestAppointment } from '../types/digest';

const sample: DigestAppointment = {
  appointmentId: 'appt-dad-eye',
  title: "Dad's eye appointment",
  startsAt: '2026-09-14T20:00:00.000Z',
  endsAt: '2026-09-14T21:00:00.000Z',
  location: 'Saskatoon Vision Clinic',
  preparationAlert: 'Bring glasses',
  clinicianName: 'Dr Patel',
  source: 'VAULT',
};

describe('calendar ics', () => {
  it('round-trips appointments through ICS export/import', () => {
    const ics = buildIcsFromAppointments([sample], {
      calendarName: 'Family Health Vault',
      now: new Date('2026-09-14T12:00:00.000Z'),
    });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Dad\'s eye appointment');
    expect(ics).toContain(`DTSTART:${toIcsUtc(sample.startsAt)}`);

    const parsed = parseIcsToAppointments(ics);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe(sample.title);
    expect(parsed[0].location).toBe(sample.location);
    expect(parsed[0].source).toBe('CALENDAR_ICS');
    expect(parsed[0].startsAt).toBe(sample.startsAt);
  });

  it('parses a minimal Google-style VEVENT', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:abc123@google.com
DTSTART:20260915T153000Z
DTEND:20260915T163000Z
SUMMARY:Mom \\, Dr B
LOCATION:Clinic
DESCRIPTION:Ask about meds
END:VEVENT
END:VCALENDAR`;
    const parsed = parseIcsToAppointments(ics);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Mom , Dr B');
    expect(parsed[0].preparationAlert).toBe('Ask about meds');
  });
});
