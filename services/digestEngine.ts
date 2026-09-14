import { getHousehold } from '../data/caregiverHousehold';
import type {
  DailyDependantSection,
  DailyDigestPayload,
  DigestAppointment,
  WeeklyDigestPayload,
} from '../types/digest';

const MS_72H = 72 * 60 * 60 * 1000;
const FOI_OVERDUE_DAYS = 30;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKey(d: Date): string {
  const x = startOfDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mondayOfWeek(d: Date): string {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return dateKey(x);
}

function appointmentsWithin72Hours(
  appointments: DigestAppointment[],
  now: Date,
): DigestAppointment[] {
  const end = now.getTime() + MS_72H;
  return appointments
    .filter((a) => {
      const t = new Date(a.startsAt).getTime();
      return t >= now.getTime() && t <= end;
    })
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
}

/**
 * Morning digest: meds today, appointments ≤72h with prep alerts,
 * overdue FOI (>30d) and missing lab uploads across Aging Parents / Children / Self.
 */
export async function compileDailyDigest(
  caregiverId: string,
  now: Date = new Date(),
): Promise<DailyDigestPayload> {
  const household = getHousehold(caregiverId, now);
  if (!household) {
    throw new Error(`Unknown caregiverId: ${caregiverId}`);
  }

  const todayKey = dateKey(now);
  const sections: DailyDependantSection[] = household.dependants.map((dep) => {
    const medsToday = [...(dep.medsByDate[todayKey] ?? [])];
    const appointmentsWithin72h = appointmentsWithin72Hours(
      dep.appointments,
      now,
    );
    const overdueTasks = dep.overdueTasks.filter((t) => {
      if (t.kind === 'FOI_PENDING') return t.ageDays > FOI_OVERDUE_DAYS;
      return true;
    });

    return {
      dependant: dep.dependant,
      medsToday,
      appointmentsWithin72h,
      overdueTasks,
    };
  });

  const totalMedsDue = sections.reduce((n, s) => n + s.medsToday.length, 0);
  const totalAppointments = sections.reduce(
    (n, s) => n + s.appointmentsWithin72h.length,
    0,
  );
  const totalOverdue = sections.reduce((n, s) => n + s.overdueTasks.length, 0);

  return {
    caregiverId,
    compiledAt: now.toISOString(),
    headline: `Good morning — ${totalMedsDue} meds, ${totalAppointments} visits in 72h, ${totalOverdue} overdue items across your household`,
    sections,
    totalMedsDue,
    totalAppointments,
    totalOverdue,
  };
}

/**
 * Sunday overview: 7-day vitals trends, med adherence, upcoming week schedule.
 */
export async function compileWeeklyDigest(
  caregiverId: string,
  now: Date = new Date(),
): Promise<WeeklyDigestPayload> {
  const household = getHousehold(caregiverId, now);
  if (!household) {
    throw new Error(`Unknown caregiverId: ${caregiverId}`);
  }

  const vitalTrends = household.dependants.flatMap((d) => d.vitalTrends);
  const adherence = household.dependants.map((d) => d.adherenceLast7Days);
  const upcomingWeek = household.dependants
    .flatMap((d) => d.weekSchedule)
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  const avgAdherence =
    adherence.length === 0
      ? 0
      : adherence.reduce((n, a) => n + a.adherenceRate, 0) / adherence.length;

  const narrativeSummary = `This week: household medication adherence averaged ${Math.round(avgAdherence * 100)}% across ${adherence.length} profiles. ${upcomingWeek.length} events are on the upcoming schedule. Review vitals trends before Sunday planning.`;

  return {
    caregiverId,
    compiledAt: now.toISOString(),
    weekOf: mondayOfWeek(now),
    headline: 'Weekly Sunday Overview — household health trends',
    vitalTrends,
    adherence,
    upcomingWeek,
    narrativeSummary,
  };
}
