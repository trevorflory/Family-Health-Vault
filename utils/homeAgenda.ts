import { getHousehold } from '../data/caregiverHousehold';
import type {
  CaregiverTodo,
  DailyDigestPayload,
  WeeklyDigestPayload,
  WeeklyScheduleItem,
} from '../types/digest';

export interface HomeAgendaItem {
  id: string;
  label: string;
  patientId?: string;
  nickname?: string;
}

export interface HomeAgenda {
  today: HomeAgendaItem[];
  tomorrow: HomeAgendaItem[];
  week: HomeAgendaItem[];
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameLocalDay(iso: string, dayKey: string): boolean {
  return localDateKey(new Date(iso)) === dayKey;
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Build home Today / Tomorrow / My Week lists from digest payloads + household
 * tomorrow meds / caregiver to-dos. Pure — injectable `now` for tests.
 */
export function buildHomeAgenda(
  daily: DailyDigestPayload,
  weekly: WeeklyDigestPayload,
  now: Date = new Date(),
): HomeAgenda {
  const todayKey = localDateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = localDateKey(tomorrow);

  const today: HomeAgendaItem[] = [];
  for (const section of daily.sections) {
    const nick = section.dependant.nickname;
    for (const m of section.medsToday) {
      if (m.given) continue;
      const when =
        m.scheduledTime <= '10:00'
          ? 'in the morning after breakfast'
          : m.scheduledTime >= '17:00'
            ? 'this evening'
            : `at ${m.scheduledTime}`;
      today.push({
        id: `med-${section.dependant.patientId}-${m.medicationId}`,
        label: `${nick}: take ${m.name}${m.dose ? ` ${m.dose}` : ''} ${when}`,
        patientId: section.dependant.patientId,
        nickname: nick,
      });
    }
    for (const a of section.appointmentsWithin72h) {
      if (!isSameLocalDay(a.startsAt, todayKey)) continue;
      today.push({
        id: `appt-${a.appointmentId}`,
        label: `${nick} has ${a.title} at ${formatClock(a.startsAt)}`,
        patientId: section.dependant.patientId,
        nickname: nick,
      });
    }
    for (const t of section.overdueTasks) {
      today.push({
        id: `task-${t.taskId}`,
        label: `${nick}: ${t.label}`,
        patientId: section.dependant.patientId,
        nickname: nick,
      });
    }
  }

  const household = getHousehold(daily.caregiverId, now);
  const tomorrowItems: HomeAgendaItem[] = [];
  if (household) {
    for (const dep of household.dependants) {
      const nick = dep.dependant.nickname;
      for (const m of dep.medsByDate[tomorrowKey] ?? []) {
        tomorrowItems.push({
          id: `tm-med-${dep.dependant.patientId}-${m.medicationId}`,
          label: `${nick}: ${m.name}${m.dose ? ` ${m.dose}` : ''} at ${m.scheduledTime}`,
          patientId: dep.dependant.patientId,
          nickname: nick,
        });
      }
      for (const a of dep.appointments) {
        if (!isSameLocalDay(a.startsAt, tomorrowKey)) continue;
        tomorrowItems.push({
          id: `tm-appt-${a.appointmentId}`,
          label: `${nick}: ${a.title} at ${formatClock(a.startsAt)}`,
          patientId: dep.dependant.patientId,
          nickname: nick,
        });
      }
    }
  }

  const week: HomeAgendaItem[] = [];
  const seen = new Set<string>();
  const pushWeek = (item: HomeAgendaItem) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    week.push(item);
  };

  for (const t of weekly.caregiverTodos) {
    pushWeek({
      id: `todo-${t.todoId}`,
      label: t.label,
      patientId: t.patientId,
    });
  }
  for (const item of weekly.upcomingWeek) {
    pushWeek({
      id: `wk-${item.patientId}-${item.startsAt}-${item.title}`,
      label: `${shortName(item)}: ${item.title}`,
      patientId: item.patientId,
    });
  }

  return {
    today,
    tomorrow: tomorrowItems,
    week,
  };
}

function shortName(item: WeeklyScheduleItem): string {
  const first = item.displayName.split(' ')[0] ?? item.displayName;
  return first === 'You' ? 'Myself' : first;
}

export function filterTodosInWindow(
  todos: CaregiverTodo[],
  windowStart: string,
  windowEnd: string,
): CaregiverTodo[] {
  return todos.filter((t) => {
    if (!t.dueDateKey) return true;
    return t.dueDateKey >= windowStart && t.dueDateKey <= windowEnd;
  });
}
