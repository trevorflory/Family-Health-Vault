import { getHousehold } from '../data/caregiverHousehold';
import type {
  CaregiverTodo,
  DailyDigestPayload,
  WeeklyDigestPayload,
  WeeklyScheduleItem,
} from '../types/digest';

export type HomeAgendaItemKind = 'med' | 'appt' | 'task' | 'prompt';

export interface HomeAgendaItem {
  id: string;
  label: string;
  kind: HomeAgendaItemKind;
  done: boolean;
  /** Lower sorts first (system priority). */
  priority: number;
  patientId?: string;
  nickname?: string;
  medicationId?: string;
  /** Deep link when the item is an actionable prompt. */
  href?: string;
}

export interface HomeAgenda {
  today: HomeAgendaItem[];
  week: HomeAgendaItem[];
}

export interface HomeAgendaDoneMaps {
  /** Agenda item ids marked done for today (non-med). */
  agendaDoneIds?: ReadonlySet<string> | string[];
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toDoneSet(
  ids: HomeAgendaDoneMaps['agendaDoneIds'],
): Set<string> {
  if (!ids) return new Set();
  return ids instanceof Set ? ids : new Set(ids);
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** e.g. Wed 17 Sep · 2:00 p.m. */
export function formatWeekWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('en-CA', { weekday: 'short' });
  const dayMonth = d.toLocaleDateString('en-CA', {
    day: 'numeric',
    month: 'short',
  });
  const time = formatClock(iso);
  const todayKey = localDateKey(now);
  const itemKey = localDateKey(d);
  if (itemKey === todayKey) return `Today · ${time}`;
  return `${weekday} ${dayMonth} · ${time}`;
}

function shortName(item: WeeklyScheduleItem): string {
  const first = item.displayName.split(' ')[0] ?? item.displayName;
  return first === 'You' ? 'Myself' : first;
}

/**
 * Build home Today / My Week lists from digest payloads.
 * Pure — injectable `now` and done maps for tests.
 * @see services/todoConnector.ts for future Todoist/Asana sync.
 */
export function buildHomeAgenda(
  daily: DailyDigestPayload,
  weekly: WeeklyDigestPayload,
  now: Date = new Date(),
  doneMaps: HomeAgendaDoneMaps = {},
): HomeAgenda {
  const agendaDone = toDoneSet(doneMaps.agendaDoneIds);
  const today: HomeAgendaItem[] = [];

  for (const section of daily.sections) {
    const nick = section.dependant.nickname;
    for (const p of section.prompts) {
      const id = `prompt-${p.promptId}`;
      today.push({
        id,
        kind: 'prompt',
        label: p.label,
        done: agendaDone.has(id),
        priority: p.priority ?? 2,
        patientId: p.patientId,
        nickname: p.nickname,
        href: p.href,
      });
    }
    for (const m of section.medsToday) {
      const id = `med-${section.dependant.patientId}-${m.medicationId}`;
      const when =
        m.scheduledTime <= '10:00'
          ? 'in the morning after breakfast'
          : m.scheduledTime >= '17:00'
            ? 'this evening'
            : `at ${m.scheduledTime}`;
      const timePri =
        m.scheduledTime <= '10:00' ? 3 : m.scheduledTime >= '17:00' ? 5 : 4;
      today.push({
        id,
        kind: 'med',
        label: `${nick}: take ${m.name}${m.dose ? ` ${m.dose}` : ''} ${when}`,
        done: Boolean(m.given),
        priority: timePri,
        patientId: section.dependant.patientId,
        nickname: nick,
        medicationId: m.medicationId,
      });
    }
    for (const t of section.overdueTasks) {
      const id = `task-${t.taskId}`;
      today.push({
        id,
        kind: 'task',
        label: `${nick}: ${t.label}`,
        done: agendaDone.has(id),
        priority: t.kind === 'FOI_PENDING' ? 0 : 1,
        patientId: section.dependant.patientId,
        nickname: nick,
      });
    }
  }

  today.sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      a.priority - b.priority ||
      a.label.localeCompare(b.label),
  );

  const week: HomeAgendaItem[] = [];
  const seen = new Set<string>();
  const pushWeek = (item: HomeAgendaItem) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    week.push(item);
  };

  const household = getHousehold(daily.caregiverId, now);
  if (household) {
    for (const dep of household.dependants) {
      const nick = dep.dependant.nickname;
      for (const a of dep.appointments) {
        const id = `wk-appt-${a.appointmentId}`;
        const withDr = a.clinicianName ? ` with ${a.clinicianName}` : '';
        pushWeek({
          id,
          kind: 'appt',
          label: `${formatWeekWhen(a.startsAt, now)} · ${nick} — ${a.title}${withDr}`,
          done: agendaDone.has(id),
          priority: 2,
          patientId: dep.dependant.patientId,
          nickname: nick,
        });
      }
    }
  }

  for (const t of weekly.caregiverTodos) {
    const when = t.dueDateKey
      ? `${t.dueDateKey} · `
      : '';
    pushWeek({
      id: `todo-${t.todoId}`,
      kind: 'task',
      label: `${when}${t.label}`,
      done: agendaDone.has(`todo-${t.todoId}`),
      priority: t.dueDateKey && t.dueDateKey < localDateKey(now) ? 0 : 1,
      patientId: t.patientId,
      href: t.href,
    });
  }

  for (const item of weekly.upcomingWeek) {
    const id = `wk-${item.patientId}-${item.startsAt}-${item.title}`;
    if (seen.has(id)) continue;
    pushWeek({
      id,
      kind: 'appt',
      label: `${formatWeekWhen(item.startsAt, now)} · ${shortName(item)} — ${item.title}`,
      done: agendaDone.has(id),
      priority: 2,
      patientId: item.patientId,
      nickname: shortName(item),
    });
  }

  week.sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      (a.nickname ?? '').localeCompare(b.nickname ?? '') ||
      a.priority - b.priority ||
      a.label.localeCompare(b.label),
  );

  return { today, week };
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

export type WeekViewSort = 'priority' | 'day' | 'person';

export interface WeekViewRow {
  id: string;
  label: string;
  patientId?: string;
  nickname?: string;
  startsAt?: string;
  dueDateKey?: string;
  href?: string;
  /** Lower = higher priority for system sort. */
  priority: number;
}

/** Flatten weekly digest into filterable rows for Weekly Overview controls. */
export function buildWeekViewRows(
  weekly: WeeklyDigestPayload,
  now: Date = new Date(),
): WeekViewRow[] {
  const todayKey = localDateKey(now);
  const rows: WeekViewRow[] = [];

  for (const t of weekly.caregiverTodos) {
    const overdue =
      t.dueDateKey && t.dueDateKey < todayKey
        ? 0
        : t.dueDateKey === todayKey
          ? 1
          : 2;
    rows.push({
      id: `todo-${t.todoId}`,
      label: t.label,
      patientId: t.patientId,
      dueDateKey: t.dueDateKey,
      href: t.href,
      priority: overdue,
    });
  }

  for (const item of weekly.upcomingWeek) {
    const ms = new Date(item.startsAt).getTime() - now.getTime();
    const soonBoost = ms >= 0 && ms < 48 * 3600 * 1000 ? 1 : 3;
    rows.push({
      id: `wk-${item.patientId}-${item.startsAt}-${item.title}`,
      label: `${formatWeekWhen(item.startsAt, now)} · ${shortName(item)} — ${item.title}`,
      patientId: item.patientId,
      nickname: shortName(item),
      startsAt: item.startsAt,
      priority: soonBoost,
    });
  }

  return rows;
}

export function filterWeekViewRows(
  rows: WeekViewRow[],
  opts: {
    sort: WeekViewSort;
    dayKey?: string | null;
    patientId?: string | null;
  },
): WeekViewRow[] {
  let filtered = [...rows];
  if (opts.patientId) {
    filtered = filtered.filter((r) => r.patientId === opts.patientId);
  }
  if (opts.dayKey) {
    filtered = filtered.filter((r) => {
      if (r.dueDateKey) return r.dueDateKey === opts.dayKey;
      if (r.startsAt) return localDateKey(new Date(r.startsAt)) === opts.dayKey;
      return false;
    });
  }

  if (opts.sort === 'priority') {
    filtered.sort(
      (a, b) =>
        a.priority - b.priority ||
        (a.startsAt ?? a.dueDateKey ?? '').localeCompare(
          b.startsAt ?? b.dueDateKey ?? '',
        ),
    );
  } else if (opts.sort === 'day') {
    filtered.sort((a, b) =>
      (a.startsAt ?? a.dueDateKey ?? '').localeCompare(
        b.startsAt ?? b.dueDateKey ?? '',
      ),
    );
  } else {
    filtered.sort((a, b) =>
      (a.nickname ?? a.patientId ?? '').localeCompare(
        b.nickname ?? b.patientId ?? '',
      ),
    );
  }
  return filtered;
}
