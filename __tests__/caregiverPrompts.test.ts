import {
  generateCaregiverPrompts,
  mergeCaregiverTodos,
  promptsToCaregiverTodos,
  POST_VISIT_DEBRIEF_WINDOW_MS,
} from '../services/caregiverPrompts';
import type { MedicalEventRecord } from '../types/db';
import type { DigestAppointment, DigestDependantRef } from '../types/digest';

const DAD: DigestDependantRef = {
  patientId: 'pt-7801',
  displayName: 'Dad (78) - Saskatoon',
  nickname: 'Dad',
  role: 'aging_parent',
  ageYears: 78,
  city: 'Saskatoon',
};

const eyeToday: DigestAppointment = {
  appointmentId: 'appt-dad-eye',
  title: "Dad's eye appointment",
  startsAt: '2026-09-14T20:00:00.000Z', // afternoon local-ish depending on TZ
  location: 'Vision Clinic',
  preparationAlert: 'Bring glasses',
  clinicianName: 'Dr Patel',
};

describe('caregiverPrompts', () => {
  it('emits check-in + prep before a same-day visit', () => {
    const now = new Date('2026-09-14T07:00:00');
    const appt: DigestAppointment = {
      ...eyeToday,
      startsAt: new Date(2026, 8, 14, 14, 0, 0).toISOString(),
    };
    const prompts = generateCaregiverPrompts({
      dependant: DAD,
      appointments: [appt],
      now,
    });

    expect(prompts.some((p) => p.kind === 'CHECK_IN_TODAY')).toBe(true);
    expect(
      prompts.some(
        (p) =>
          p.kind === 'CHECK_IN_TODAY' &&
          /Ask Dad about their appointment with Dr Patel today/i.test(p.label),
      ),
    ).toBe(true);
    expect(prompts.some((p) => p.kind === 'PREP_VISIT')).toBe(true);
    expect(prompts.some((p) => p.kind === 'POST_VISIT_DEBRIEF')).toBe(false);
  });

  it('emits post-visit voice-note prompt after the visit starts', () => {
    const start = new Date(2026, 8, 14, 10, 0, 0);
    const now = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const appt: DigestAppointment = {
      appointmentId: 'appt-dad-neph',
      title: "Dad's nephrology follow-up",
      startsAt: start.toISOString(),
      location: 'Hospital',
      preparationAlert: 'Print SBAR',
      clinicianName: 'Dr B',
    };
    const prompts = generateCaregiverPrompts({
      dependant: DAD,
      appointments: [appt],
      now,
    });

    const debrief = prompts.find((p) => p.kind === 'POST_VISIT_DEBRIEF');
    expect(debrief).toBeTruthy();
    expect(debrief!.href).toContain('/voiceDebrief');
    expect(debrief!.label).toMatch(/post-visit voice note/i);
  });

  it('clears post-visit prompt when a VISIT_DEBRIEF exists for the appointment', () => {
    const start = new Date(2026, 8, 14, 10, 0, 0);
    const now = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    const appt: DigestAppointment = {
      appointmentId: 'appt-clear',
      title: 'Clinic visit',
      startsAt: start.toISOString(),
      location: 'Clinic',
      preparationAlert: 'Prep',
    };
    const event: MedicalEventRecord = {
      id: 'me_debrief',
      patientId: DAD.patientId,
      kind: 'VISIT_DEBRIEF',
      sourceUri: null,
      rawText: 'notes',
      parsedJson: JSON.stringify({
        eventType: 'VISIT_DEBRIEF',
        discussionSummary: 'Discussed labs',
        dosageChanges: [],
        actionItems: [],
        appointmentId: 'appt-clear',
      }),
      status: 'CONFIRMED',
      sourceType: 'OCR',
      sourceAuthorityId: null,
      externalId: null,
      lastSyncedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const prompts = generateCaregiverPrompts({
      dependant: DAD,
      appointments: [appt],
      medicalEvents: [event],
      now,
    });
    expect(prompts.some((p) => p.kind === 'POST_VISIT_DEBRIEF')).toBe(false);
  });

  it('merges auto todos ahead of fixture todos', () => {
    const auto = promptsToCaregiverTodos([
      {
        promptId: 'prep-1',
        kind: 'PREP_VISIT',
        label: 'Print SBAR',
        patientId: DAD.patientId,
        nickname: 'Dad',
        appointmentId: 'a1',
        priority: 10,
        dueAt: '2026-09-16T10:00:00.000Z',
      },
    ]);
    const merged = mergeCaregiverTodos(
      [
        {
          todoId: 'fixture',
          label: 'Book follow-up',
          patientId: DAD.patientId,
          dueDateKey: '2026-09-17',
        },
      ],
      auto,
    );
    expect(merged[0].label).toBe('Print SBAR');
    expect(merged.some((t) => t.todoId === 'fixture')).toBe(true);
  });

  it('exposes a 48h post-visit window constant', () => {
    expect(POST_VISIT_DEBRIEF_WINDOW_MS).toBe(48 * 60 * 60 * 1000);
  });
});
