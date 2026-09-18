import { getHousehold } from '../data/caregiverHousehold';
import type { MedicalEventRecord } from '../types/db';
import type {
  CaregiverPrompt,
  DailyDependantSection,
  DailyDigestPayload,
  DigestAppointment,
  WeeklyDigestPayload,
} from '../types/digest';
import type { DigestShiftHandoverSummary } from '../types/careObservation';
import type { FOIRequestRecord } from '../types/foiPayload';
import {
  generateCaregiverPrompts,
  mergeCaregiverTodos,
  promptsToCaregiverTodos,
} from './caregiverPrompts';
import {
  FOI_OVERDUE_DAYS,
  resolveOverdueTasks,
} from './digestOverdue';

const MS_72H = 72 * 60 * 60 * 1000;

export interface DigestDataLoaders {
  listFoiRequestsForPatient?: (
    patientId: string,
  ) => Promise<FOIRequestRecord[]>;
  listMedicalEventsForPatient?: (
    patientId: string,
  ) => Promise<MedicalEventRecord[]>;
  listMedDosesGivenForDate?: (
    patientId: string,
    dateKey: string,
  ) => Promise<string[]>;
  listMedDosesGivenBetween?: (
    patientId: string,
    fromDateKey: string,
    toDateKey: string,
  ) => Promise<Array<{ medicationId: string; dateKey: string }>>;
  /** Recent aide shift handovers for the morning digest card. */
  listRecentHandoversForPatient?: (
    patientId: string,
    now: Date,
  ) => Promise<DigestShiftHandoverSummary[]>;
  /** Vault / calendar-imported appointments merged over household fixtures. */
  listAppointmentsForPatient?: (
    patientId: string,
  ) => Promise<DigestAppointment[]>;
}

/** Wire digest compilation to local FOI / MedicalEvents / med-dose / handover stores. */
export function createLiveDigestLoaders(): DigestDataLoaders {
  // Require inside function so unit tests can compile without SQLite.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const foi = require('../db/foiRequests') as typeof import('../db/foiRequests');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const events = require('../db/medicalEvents') as typeof import('../db/medicalEvents');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const meds = require('../db/medDoses') as typeof import('../db/medDoses');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const handover = require('./shiftHandover') as typeof import('./shiftHandover');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const appts = require('../db/appointments') as typeof import('../db/appointments');
  return {
    listFoiRequestsForPatient: (id) => foi.listFOIRequestsForPatient(id),
    listMedicalEventsForPatient: (id) => events.listMedicalEventsForPatient(id),
    listMedDosesGivenForDate: (id, dateKey) =>
      meds.listMedDosesGiven(id, dateKey),
    listMedDosesGivenBetween: (id, from, to) =>
      meds.listMedDosesGivenBetween(id, from, to),
    listRecentHandoversForPatient: (id, now) =>
      handover.listRecentHandoverSummaries(id, now),
    listAppointmentsForPatient: (id) => appts.listAppointmentsForPatient(id),
  };
}

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

function dateKeyOffset(baseKey: string, dayOffset: number): string {
  const [y, m, d] = baseKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + dayOffset);
  return dateKey(dt);
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

/** Fixture appointments overwritten by same appointmentId from the vault store. */
export function mergeAppointments(
  fixture: DigestAppointment[],
  live: DigestAppointment[],
): DigestAppointment[] {
  const byId = new Map<string, DigestAppointment>();
  for (const a of fixture) byId.set(a.appointmentId, a);
  for (const a of live) byId.set(a.appointmentId, a);
  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

async function emptyList<T>(): Promise<T[]> {
  return [];
}

/**
 * Morning digest: meds today, appointments ≤72h with prep alerts,
 * overdue FOI (>30d) and missing lab uploads across Aging Parents / Children / Self.
 *
 * Vault truthfulness: pass `createLiveDigestLoaders()` (or custom injectables)
 * so FOI/MedicalEvents/med marks override household fixtures where present.
 * Default loaders are empty — fixture overdue tasks remain for pure unit tests.
 */
export async function compileDailyDigest(
  caregiverId: string,
  now: Date = new Date(),
  loaders: DigestDataLoaders = {},
): Promise<DailyDigestPayload> {
  const household = getHousehold(caregiverId, now);
  if (!household) {
    throw new Error(`Unknown caregiverId: ${caregiverId}`);
  }

  const todayKey = dateKey(now);
  const listFoi = loaders.listFoiRequestsForPatient ?? emptyList;
  const listEvents = loaders.listMedicalEventsForPatient ?? emptyList;
  const listMedMarks = loaders.listMedDosesGivenForDate ?? emptyList;
  const listHandovers =
    loaders.listRecentHandoversForPatient ??
    (async () => [] as DigestShiftHandoverSummary[]);
  const listAppts = loaders.listAppointmentsForPatient ?? emptyList;

  const sections: DailyDependantSection[] = [];

  for (const dep of household.dependants) {
    const patientId = dep.dependant.patientId;
    const [foiRecords, medicalEvents, givenIds, recentHandovers, liveAppts] =
      await Promise.all([
        listFoi(patientId),
        listEvents(patientId),
        listMedMarks(patientId, todayKey),
        listHandovers(patientId, now),
        listAppts(patientId),
      ]);
    const givenSet = new Set(givenIds);
    const appointments = mergeAppointments(dep.appointments, liveAppts);

    const medsToday = [...(dep.medsByDate[todayKey] ?? [])].map((m) => ({
      ...m,
      given: m.given || givenSet.has(m.medicationId),
    }));

    const overdueTasks = resolveOverdueTasks({
      fixtureTasks: dep.overdueTasks,
      foiRecords,
      medicalEvents,
      now,
    });

    const prompts = generateCaregiverPrompts({
      dependant: dep.dependant,
      appointments,
      medicalEvents,
      now,
    });

    sections.push({
      dependant: dep.dependant,
      medsToday,
      appointmentsWithin72h: appointmentsWithin72Hours(appointments, now),
      overdueTasks,
      prompts,
      recentHandovers,
    });
  }

  sections.sort((a, b) => {
    const rank = (role: string) =>
      role === 'self' ? 0 : role === 'aging_parent' ? 1 : 2;
    return rank(a.dependant.role) - rank(b.dependant.role);
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
 * When med-dose marks exist for the last 7 days, adherence dosesTaken is bumped.
 */
export async function compileWeeklyDigest(
  caregiverId: string,
  now: Date = new Date(),
  loaders: DigestDataLoaders = {},
): Promise<WeeklyDigestPayload> {
  const household = getHousehold(caregiverId, now);
  if (!household) {
    throw new Error(`Unknown caregiverId: ${caregiverId}`);
  }

  const todayKey = dateKey(now);
  const fromKey = dateKeyOffset(todayKey, -6);
  const windowEnd = dateKeyOffset(todayKey, 6);
  const listBetween = loaders.listMedDosesGivenBetween;

  const vitalTrends = household.dependants.flatMap((d) => d.vitalTrends);
  const adherence = await Promise.all(
    household.dependants.map(async (d) => {
      const base = { ...d.adherenceLast7Days };
      if (!listBetween) return base;
      const marks = await listBetween(d.dependant.patientId, fromKey, todayKey);
      if (marks.length === 0) return base;
      const dosesTaken = Math.min(
        base.dosesScheduled,
        base.dosesTaken + marks.length,
      );
      return {
        ...base,
        dosesTaken,
        adherenceRate:
          base.dosesScheduled === 0 ? 0 : dosesTaken / base.dosesScheduled,
      };
    }),
  );

  const listAppts = loaders.listAppointmentsForPatient ?? emptyList;
  const listEvents = loaders.listMedicalEventsForPatient ?? emptyList;

  const weekPrompts: CaregiverPrompt[] = [];
  const upcomingFromAppts: WeeklyDigestPayload['upcomingWeek'] = [];

  for (const dep of household.dependants) {
    const [liveAppts, medicalEvents] = await Promise.all([
      listAppts(dep.dependant.patientId),
      listEvents(dep.dependant.patientId),
    ]);
    const appointments = mergeAppointments(dep.appointments, liveAppts);
    weekPrompts.push(
      ...generateCaregiverPrompts({
        dependant: dep.dependant,
        appointments,
        medicalEvents,
        now,
      }),
    );
    for (const a of appointments) {
      upcomingFromAppts.push({
        patientId: dep.dependant.patientId,
        displayName: dep.dependant.displayName,
        title: a.title,
        startsAt: a.startsAt,
      });
    }
  }

  const windowEndMs = startOfDay(now).getTime() + 7 * 24 * 60 * 60 * 1000;
  const upcomingWeek = [
    ...household.dependants.flatMap((d) => d.weekSchedule),
    ...upcomingFromAppts,
  ]
    .filter((item) => {
      const t = new Date(item.startsAt).getTime();
      return t >= now.getTime() && t < windowEndMs;
    })
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .filter((item, index, arr) => {
      const key = `${item.patientId}|${item.startsAt}|${item.title}`;
      return (
        arr.findIndex(
          (x) => `${x.patientId}|${x.startsAt}|${x.title}` === key,
        ) === index
      );
    });

  const caregiverTodos = mergeCaregiverTodos(
    household.caregiverTodos,
    promptsToCaregiverTodos(weekPrompts, now),
  );

  const avgAdherence =
    adherence.length === 0
      ? 0
      : adherence.reduce((n, a) => n + a.adherenceRate, 0) / adherence.length;

  const narrativeSummary = `Next 7 days (${todayKey} → ${windowEnd}): ${upcomingWeek.length} scheduled events and ${caregiverTodos.length} caregiver to-dos. Household medication adherence averaged ${Math.round(avgAdherence * 100)}% across ${adherence.length} profiles.`;

  return {
    caregiverId,
    compiledAt: now.toISOString(),
    weekOf: mondayOfWeek(now),
    windowStart: todayKey,
    windowEnd,
    headline: 'Weekly overview — next 7 days + caregiver to-dos',
    vitalTrends,
    adherence,
    upcomingWeek,
    caregiverTodos,
    narrativeSummary,
  };
}

export { FOI_OVERDUE_DAYS };
