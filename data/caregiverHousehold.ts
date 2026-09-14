import type {
  DigestAppointment,
  DigestDependantRef,
  DigestMedicationDue,
  DigestOverdueTask,
  MedicationAdherenceSummary,
  VitalTrendPoint,
  WeeklyScheduleItem,
} from '../types/digest';

export interface HouseholdDependantSchedule {
  dependant: DigestDependantRef;
  /** Absolute calendar med instances keyed by YYYY-MM-DD */
  medsByDate: Record<string, DigestMedicationDue[]>;
  appointments: DigestAppointment[];
  overdueTasks: DigestOverdueTask[];
  adherenceLast7Days: MedicationAdherenceSummary;
  vitalTrends: VitalTrendPoint[];
  weekSchedule: WeeklyScheduleItem[];
}

export interface CaregiverHousehold {
  caregiverId: string;
  caregiverName: string;
  dependants: HouseholdDependantSchedule[];
}

/**
 * Demo Sandwich Generation household: aging parent + child + self-care.
 * Dates are relative helpers resolved against "today" in the digest engine.
 */
export const DEMO_CAREGIVER_ID = 'cg-sandwich-01';

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoDateOffset(base: Date, dayOffset: number): string {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return localDateKey(d);
}

function isoDateTimeOffset(
  base: Date,
  dayOffset: number,
  hour: number,
  minute: number,
): string {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString();
}

function weekdayName(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'long' });
}

/** Build household schedules anchored to a reference "now" (injectable for tests). */
export function buildHouseholdForNow(
  now: Date = new Date(),
  caregiverId: string = DEMO_CAREGIVER_ID,
): CaregiverHousehold | undefined {
  if (caregiverId !== DEMO_CAREGIVER_ID) return undefined;

  const today = isoDateOffset(now, 0);
  const tomorrow = isoDateOffset(now, 1);

  const dad: HouseholdDependantSchedule = {
    dependant: {
      patientId: 'pt-7801',
      displayName: 'Dad (78) - Saskatoon',
      role: 'aging_parent',
      ageYears: 78,
      city: 'Saskatoon',
    },
    medsByDate: {
      [today]: [
        {
          medicationId: 'med-met-am',
          name: 'Metformin',
          dose: '500mg',
          scheduledTime: '08:00',
          given: false,
        },
        {
          medicationId: 'med-ram-am',
          name: 'Ramipril',
          dose: '5mg',
          scheduledTime: '08:00',
          given: false,
        },
        {
          medicationId: 'med-met-pm',
          name: 'Metformin',
          dose: '500mg',
          scheduledTime: '20:00',
          given: false,
        },
      ],
    },
    appointments: [
      {
        appointmentId: 'appt-dad-gp',
        title: "Dad's nephrology follow-up",
        startsAt: isoDateTimeOffset(now, 2, 10, 30),
        location: 'Saskatoon City Hospital',
        preparationAlert: `Print SBAR note for Dad's visit on ${weekdayName(isoDateTimeOffset(now, 2, 10, 30))}`,
      },
    ],
    overdueTasks: [
      {
        taskId: 'foi-dad-sha',
        kind: 'FOI_PENDING',
        label: 'SHA FOI draft pending — chart package for Dad',
        ageDays: 34,
      },
      {
        taskId: 'lab-dad-egfr',
        kind: 'MISSING_LAB_UPLOAD',
        label: 'Missing eGFR lab upload from last clinic',
        ageDays: 12,
      },
    ],
    adherenceLast7Days: {
      patientId: 'pt-7801',
      displayName: 'Dad (78) - Saskatoon',
      dosesScheduled: 21,
      dosesTaken: 18,
      adherenceRate: 18 / 21,
    },
    vitalTrends: [
      {
        date: isoDateOffset(now, -6),
        label: 'Morning BP (systolic)',
        value: 138,
        unit: 'mmHg',
      },
      {
        date: isoDateOffset(now, -3),
        label: 'Morning BP (systolic)',
        value: 142,
        unit: 'mmHg',
      },
      {
        date: isoDateOffset(now, -1),
        label: 'Morning BP (systolic)',
        value: 136,
        unit: 'mmHg',
      },
    ],
    weekSchedule: [
      {
        patientId: 'pt-7801',
        displayName: 'Dad (78) - Saskatoon',
        title: 'Nephrology follow-up',
        startsAt: isoDateTimeOffset(now, 2, 10, 30),
      },
      {
        patientId: 'pt-7801',
        displayName: 'Dad (78) - Saskatoon',
        title: 'Pharmacy refill pickup',
        startsAt: isoDateTimeOffset(now, 5, 15, 0),
      },
    ],
  };

  const leo: HouseholdDependantSchedule = {
    dependant: {
      patientId: 'pt-leo-04',
      displayName: 'Leo (4) - Regina',
      role: 'child',
      ageYears: 4,
      city: 'Regina',
    },
    medsByDate: {
      [today]: [
        {
          medicationId: 'med-leo-vit',
          name: 'Children’s multivitamin',
          dose: '1 chewable',
          scheduledTime: '07:30',
          given: false,
        },
      ],
    },
    appointments: [
      {
        appointmentId: 'appt-leo-well',
        title: 'Leo well-child visit',
        startsAt: isoDateTimeOffset(now, 1, 14, 0),
        location: 'Regina Primary Care',
        preparationAlert: 'Pack immunization booklet for Leo tomorrow afternoon',
      },
    ],
    overdueTasks: [],
    adherenceLast7Days: {
      patientId: 'pt-leo-04',
      displayName: 'Leo (4) - Regina',
      dosesScheduled: 7,
      dosesTaken: 7,
      adherenceRate: 1,
    },
    vitalTrends: [
      {
        date: isoDateOffset(now, -5),
        label: 'Weight',
        value: 16.8,
        unit: 'kg',
      },
      {
        date: isoDateOffset(now, -1),
        label: 'Weight',
        value: 16.9,
        unit: 'kg',
      },
    ],
    weekSchedule: [
      {
        patientId: 'pt-leo-04',
        displayName: 'Leo (4) - Regina',
        title: 'Well-child visit',
        startsAt: isoDateTimeOffset(now, 1, 14, 0),
      },
    ],
  };

  const self: HouseholdDependantSchedule = {
    dependant: {
      patientId: 'pt-self-01',
      displayName: 'You (42) - Regina',
      role: 'self',
      ageYears: 42,
      city: 'Regina',
    },
    medsByDate: {
      [today]: [
        {
          medicationId: 'med-self-vitd',
          name: 'Vitamin D',
          dose: '1000 IU',
          scheduledTime: '09:00',
          given: false,
        },
      ],
      [tomorrow]: [
        {
          medicationId: 'med-self-vitd-tm',
          name: 'Vitamin D',
          dose: '1000 IU',
          scheduledTime: '09:00',
          given: false,
        },
      ],
    },
    appointments: [],
    overdueTasks: [
      {
        taskId: 'lab-self-lipid',
        kind: 'MISSING_LAB_UPLOAD',
        label: 'Missing fasting lipid panel upload (self)',
        ageDays: 40,
      },
    ],
    adherenceLast7Days: {
      patientId: 'pt-self-01',
      displayName: 'You (42) - Regina',
      dosesScheduled: 7,
      dosesTaken: 5,
      adherenceRate: 5 / 7,
    },
    vitalTrends: [
      {
        date: isoDateOffset(now, -6),
        label: 'Resting HR',
        value: 72,
        unit: 'bpm',
      },
      {
        date: isoDateOffset(now, -2),
        label: 'Resting HR',
        value: 68,
        unit: 'bpm',
      },
    ],
    weekSchedule: [
      {
        patientId: 'pt-self-01',
        displayName: 'You (42) - Regina',
        title: 'Physio for caregiver back strain',
        startsAt: isoDateTimeOffset(now, 4, 17, 30),
      },
    ],
  };

  return {
    caregiverId,
    caregiverName: 'Alex Ellis',
    dependants: [dad, leo, self],
  };
}

export function getHousehold(
  caregiverId: string,
  now: Date = new Date(),
): CaregiverHousehold | undefined {
  return buildHouseholdForNow(now, caregiverId);
}
