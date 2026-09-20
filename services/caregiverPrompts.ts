/**
 * Pure appointment → caregiver prompt compiler.
 * Educational / logistical only — never diagnoses or advises treatment.
 */

import type { MedicalEventRecord } from '../types/db';
import type {
  CaregiverPrompt,
  CaregiverTodo,
  DigestAppointment,
  DigestDependantRef,
} from '../types/digest';

const MS_HOUR = 60 * 60 * 1000;
const MS_72H = 72 * MS_HOUR;
/** Keep post-visit voice-note prompts open this long after start. */
export const POST_VISIT_DEBRIEF_WINDOW_MS = 48 * MS_HOUR;

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function shortVisitTitle(title: string): string {
  return title.replace(/^(Dad'|Leo |Myself'?s?)\s*/i, '').trim() || title;
}

function clinicianPhrase(appt: DigestAppointment): string {
  if (appt.clinicianName?.trim()) {
    return ` with ${appt.clinicianName.trim()}`;
  }
  return '';
}

function hasClearingVisitDebrief(
  events: MedicalEventRecord[],
  appointment: DigestAppointment,
  now: Date,
): boolean {
  const startMs = new Date(appointment.startsAt).getTime();
  const windowEnd = startMs + POST_VISIT_DEBRIEF_WINDOW_MS;
  for (const ev of events) {
    if (ev.kind !== 'VISIT_DEBRIEF') continue;
    if (ev.status === 'REJECTED') continue;
    try {
      const parsed = JSON.parse(ev.parsedJson) as { appointmentId?: string };
      if (parsed.appointmentId === appointment.appointmentId) return true;
    } catch {
      /* ignore malformed */
    }
    const stamp = new Date(ev.createdAt).getTime();
    if (stamp >= startMs && stamp <= Math.min(windowEnd, now.getTime() + MS_HOUR)) {
      return true;
    }
  }
  return false;
}

/**
 * Build conversational caregiver prompts for one dependant from appointments.
 */
export function generateCaregiverPrompts(input: {
  dependant: DigestDependantRef;
  appointments: DigestAppointment[];
  medicalEvents?: MedicalEventRecord[];
  now?: Date;
}): CaregiverPrompt[] {
  const now = input.now ?? new Date();
  const todayKey = localDateKey(now);
  const events = input.medicalEvents ?? [];
  const nick = input.dependant.nickname;
  const prompts: CaregiverPrompt[] = [];

  for (const appt of input.appointments) {
    const start = new Date(appt.startsAt);
    const startMs = start.getTime();
    if (Number.isNaN(startMs)) continue;
    const apptDay = localDateKey(start);
    const visit = shortVisitTitle(appt.title);
    const withClinician = clinicianPhrase(appt);
    const clock = formatClock(appt.startsAt);

    if (apptDay === todayKey) {
      const beforeVisit = now.getTime() < startMs;
      const label = beforeVisit
        ? nick === 'Myself'
          ? `You have ${visit}${withClinician} today at ${clock}`
          : `Ask ${nick} about their appointment${withClinician} today (${visit} at ${clock})`
        : nick === 'Myself'
          ? `Follow up on your ${visit}${withClinician} from today`
          : `Ask ${nick} how their ${visit}${withClinician} went today`;
      prompts.push({
        promptId: `checkin-${appt.appointmentId}`,
        kind: 'CHECK_IN_TODAY',
        label,
        patientId: input.dependant.patientId,
        nickname: nick,
        appointmentId: appt.appointmentId,
        dueAt: appt.startsAt,
        priority: beforeVisit ? 20 : 25,
      });
    }

    if (startMs > now.getTime() && startMs <= now.getTime() + MS_72H) {
      const prep = appt.preparationAlert?.trim();
      if (prep) {
        prompts.push({
          promptId: `prep-${appt.appointmentId}`,
          kind: 'PREP_VISIT',
          label: prep,
          patientId: input.dependant.patientId,
          nickname: nick,
          appointmentId: appt.appointmentId,
          dueAt: appt.startsAt,
          href: `/patient/${input.dependant.patientId}/appointmentPrep?appointmentId=${appt.appointmentId}`,
          priority: 10,
        });
      }
    }

    if (
      now.getTime() >= startMs &&
      now.getTime() <= startMs + POST_VISIT_DEBRIEF_WINDOW_MS &&
      !hasClearingVisitDebrief(events, appt, now)
    ) {
      prompts.push({
        promptId: `debrief-${appt.appointmentId}`,
        kind: 'POST_VISIT_DEBRIEF',
        label:
          nick === 'Myself'
            ? `Record a post-visit voice note after your ${visit}`
            : `Record a post-visit voice note after ${nick}'s ${visit}`,
        patientId: input.dependant.patientId,
        nickname: nick,
        appointmentId: appt.appointmentId,
        dueAt: appt.startsAt,
        href: `/patient/${input.dependant.patientId}/voiceDebrief`,
        priority: 5,
      });
    }
  }

  return prompts.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (a.dueAt ?? '').localeCompare(b.dueAt ?? '');
  });
}

/** Fold appointment prompts into weekly caregiver to-do rows. */
export function promptsToCaregiverTodos(
  prompts: CaregiverPrompt[],
  now: Date = new Date(),
): CaregiverTodo[] {
  const todayKey = localDateKey(now);
  return prompts.map((p) => ({
    todoId: `auto-${p.promptId}`,
    label: p.label,
    patientId: p.patientId,
    dueDateKey: p.dueAt ? localDateKey(new Date(p.dueAt)) : todayKey,
    sourcePromptKind: p.kind,
    appointmentId: p.appointmentId,
    href: p.href,
  }));
}

/** Merge fixture/manual todos with auto-generated ones (auto wins on same appointmentId+kind). */
export function mergeCaregiverTodos(
  fixtureTodos: CaregiverTodo[],
  autoTodos: CaregiverTodo[],
): CaregiverTodo[] {
  const seen = new Set<string>();
  const out: CaregiverTodo[] = [];
  const keyOf = (t: CaregiverTodo) =>
    t.appointmentId && t.sourcePromptKind
      ? `${t.appointmentId}:${t.sourcePromptKind}`
      : t.todoId;

  for (const t of autoTodos) {
    const k = keyOf(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  for (const t of fixtureTodos) {
    const k = keyOf(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.sort((a, b) =>
    (a.dueDateKey ?? '').localeCompare(b.dueDateKey ?? ''),
  );
}
