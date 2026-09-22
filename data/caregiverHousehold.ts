import type {
  CaregiverTodo,
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
  caregiverTodos: CaregiverTodo[];
}

/**
 * Demo Sandwich Generation household: aging parent + child + self-care.
 * Dates are relative helpers resolved against "today" in the digest engine.
 */
export const DEMO_CAREGIVER_ID = 'cg-sandwich-01';
export const DEMO_SELF_ID = 'pt-self-01';
export const DEMO_DAD_ID = 'pt-7801';
export const DEMO_MOM_ID = 'pt-mom-76';
export const DEMO_CHILD_ID = 'pt-leo-04';
export const DEMO_CHILD_MIA_ID = 'pt-child-09';
export const DEMO_CHILD_SAM_ID = 'pt-sam-07';
export const DEMO_CHILD_NORA_ID = 'pt-nora-11';

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
      patientId: DEMO_DAD_ID,
      displayName: 'Dad (78) - Saskatoon',
      nickname: 'Dad',
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
      [tomorrow]: [
        {
          medicationId: 'med-met-am-tm',
          name: 'Metformin',
          dose: '500mg',
          scheduledTime: '08:00',
          given: false,
        },
        {
          medicationId: 'med-ram-am-tm',
          name: 'Ramipril',
          dose: '5mg',
          scheduledTime: '08:00',
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
        clinicianName: 'Dr B',
        source: 'VAULT',
      },
      {
        appointmentId: 'appt-dad-eye',
        title: "Dad's eye appointment",
        startsAt: isoDateTimeOffset(now, 0, 14, 0),
        location: 'Saskatoon Vision Clinic',
        preparationAlert: 'Bring current glasses and medication list',
        clinicianName: 'Dr Patel',
        source: 'VAULT',
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
      patientId: DEMO_DAD_ID,
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
        patientId: DEMO_DAD_ID,
        displayName: 'Dad (78) - Saskatoon',
        title: 'Nephrology follow-up',
        startsAt: isoDateTimeOffset(now, 2, 10, 30),
      },
      {
        patientId: DEMO_DAD_ID,
        displayName: 'Dad (78) - Saskatoon',
        title: 'Pharmacy refill pickup',
        startsAt: isoDateTimeOffset(now, 5, 15, 0),
      },
    ],
  };

  const leo: HouseholdDependantSchedule = {
    dependant: {
      patientId: DEMO_CHILD_ID,
      displayName: 'Leo (4) - Regina',
      nickname: 'Leo',
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
      {
        appointmentId: 'appt-leo-school-imm',
        title: 'Leo grade immunization at school',
        startsAt: isoDateTimeOffset(now, 0, 10, 30),
        location: 'School clinic',
        preparationAlert: 'Consent form already on file — check school portal tonight',
      },
    ],
    overdueTasks: [],
    adherenceLast7Days: {
      patientId: DEMO_CHILD_ID,
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
        patientId: DEMO_CHILD_ID,
        displayName: 'Leo (4) - Regina',
        title: 'Well-child visit',
        startsAt: isoDateTimeOffset(now, 1, 14, 0),
      },
    ],
  };

  const self: HouseholdDependantSchedule = {
    dependant: {
      patientId: DEMO_SELF_ID,
      displayName: 'You (42) - Regina',
      nickname: 'Myself',
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
      patientId: DEMO_SELF_ID,
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
        patientId: DEMO_SELF_ID,
        displayName: 'You (42) - Regina',
        title: 'Physio for caregiver back strain',
        startsAt: isoDateTimeOffset(now, 4, 17, 30),
      },
    ],
  };

  const mom: HouseholdDependantSchedule = {
    dependant: {
      patientId: DEMO_MOM_ID,
      displayName: 'Mom (76) - Saskatoon',
      nickname: 'Mom',
      role: 'aging_parent',
      ageYears: 76,
      city: 'Saskatoon',
    },
    medsByDate: {
      [today]: [
        {
          medicationId: 'med-mom-amlo',
          name: 'Amlodipine',
          dose: '5mg',
          scheduledTime: '08:30',
          given: false,
        },
      ],
    },
    appointments: [
      {
        appointmentId: 'appt-mom-cardio',
        title: "Mom's cardiology check-in",
        startsAt: isoDateTimeOffset(now, 3, 11, 0),
        location: 'Saskatoon Heart Centre',
        preparationAlert: 'Bring BP log for Mom’s cardiology visit',
        clinicianName: 'Dr Singh',
        source: 'VAULT',
      },
    ],
    overdueTasks: [
      {
        taskId: 'lab-mom-lipid',
        kind: 'MISSING_LAB_UPLOAD',
        label: 'Missing lipid panel upload for Mom',
        ageDays: 18,
      },
    ],
    adherenceLast7Days: {
      patientId: DEMO_MOM_ID,
      displayName: 'Mom (76) - Saskatoon',
      dosesScheduled: 7,
      dosesTaken: 6,
      adherenceRate: 6 / 7,
    },
    vitalTrends: [
      {
        date: isoDateOffset(now, -4),
        label: 'Morning BP (systolic)',
        value: 128,
        unit: 'mmHg',
      },
      {
        date: isoDateOffset(now, -1),
        label: 'Morning BP (systolic)',
        value: 124,
        unit: 'mmHg',
      },
    ],
    weekSchedule: [
      {
        patientId: DEMO_MOM_ID,
        displayName: 'Mom (76) - Saskatoon',
        title: 'Cardiology check-in',
        startsAt: isoDateTimeOffset(now, 3, 11, 0),
      },
    ],
  };

  const mia: HouseholdDependantSchedule = {
    dependant: {
      patientId: DEMO_CHILD_MIA_ID,
      displayName: 'Mia (9) - Regina',
      nickname: 'Mia',
      role: 'child',
      ageYears: 9,
      city: 'Regina',
    },
    medsByDate: {},
    appointments: [
      {
        appointmentId: 'appt-mia-dental',
        title: 'Mia dental cleaning',
        startsAt: isoDateTimeOffset(now, 5, 15, 30),
        location: 'Regina Kids Dental',
        preparationAlert: 'Confirm Mia dental appointment time tonight',
        source: 'VAULT',
      },
    ],
    overdueTasks: [],
    adherenceLast7Days: {
      patientId: DEMO_CHILD_MIA_ID,
      displayName: 'Mia (9) - Regina',
      dosesScheduled: 0,
      dosesTaken: 0,
      adherenceRate: 1,
    },
    vitalTrends: [],
    weekSchedule: [
      {
        patientId: DEMO_CHILD_MIA_ID,
        displayName: 'Mia (9) - Regina',
        title: 'Dental cleaning',
        startsAt: isoDateTimeOffset(now, 5, 15, 30),
      },
    ],
  };

  const sam: HouseholdDependantSchedule = {
    dependant: {
      patientId: DEMO_CHILD_SAM_ID,
      displayName: 'Sam (7) - Regina',
      nickname: 'Sam',
      role: 'child',
      ageYears: 7,
      city: 'Regina',
    },
    medsByDate: {
      [today]: [
        {
          medicationId: 'med-sam-inhaler',
          name: 'Salbutamol inhaler',
          dose: '2 puffs',
          scheduledTime: '07:45',
          given: false,
        },
      ],
    },
    appointments: [
      {
        appointmentId: 'appt-sam-asthma',
        title: 'Sam asthma review',
        startsAt: isoDateTimeOffset(now, 6, 9, 30),
        location: 'Regina Pediatrics',
        preparationAlert: 'Bring Sam’s inhaler technique checklist',
        clinicianName: 'Dr Okoro',
        source: 'VAULT',
      },
    ],
    overdueTasks: [],
    adherenceLast7Days: {
      patientId: DEMO_CHILD_SAM_ID,
      displayName: 'Sam (7) - Regina',
      dosesScheduled: 7,
      dosesTaken: 6,
      adherenceRate: 6 / 7,
    },
    vitalTrends: [
      {
        date: isoDateOffset(now, -2),
        label: 'Peak flow',
        value: 180,
        unit: 'L/min',
      },
    ],
    weekSchedule: [
      {
        patientId: DEMO_CHILD_SAM_ID,
        displayName: 'Sam (7) - Regina',
        title: 'Asthma review',
        startsAt: isoDateTimeOffset(now, 6, 9, 30),
      },
    ],
  };

  const nora: HouseholdDependantSchedule = {
    dependant: {
      patientId: DEMO_CHILD_NORA_ID,
      displayName: 'Nora (11) - Regina',
      nickname: 'Nora',
      role: 'child',
      ageYears: 11,
      city: 'Regina',
    },
    medsByDate: {},
    appointments: [],
    overdueTasks: [
      {
        taskId: 'lab-nora-vaccine',
        kind: 'OTHER',
        label: 'Upload Nora school vaccine record',
        ageDays: 9,
      },
    ],
    adherenceLast7Days: {
      patientId: DEMO_CHILD_NORA_ID,
      displayName: 'Nora (11) - Regina',
      dosesScheduled: 0,
      dosesTaken: 0,
      adherenceRate: 1,
    },
    vitalTrends: [],
    weekSchedule: [
      {
        patientId: DEMO_CHILD_NORA_ID,
        displayName: 'Nora (11) - Regina',
        title: 'School sports physical form due',
        startsAt: isoDateTimeOffset(now, 4, 16, 0),
      },
    ],
  };

  const caregiverTodos: CaregiverTodo[] = [
    {
      todoId: 'todo-book-dad-gp',
      label: 'Book follow-up appointment for Dad after nephrology',
      patientId: DEMO_DAD_ID,
      dueDateKey: isoDateOffset(now, 3),
    },
    {
      todoId: 'todo-refill-leo',
      label: 'Refill multivitamin for Leo',
      patientId: DEMO_CHILD_ID,
      dueDateKey: isoDateOffset(now, 4),
    },
    {
      todoId: 'todo-lipid-self',
      label: 'Upload fasting lipid panel for Myself',
      patientId: DEMO_SELF_ID,
      dueDateKey: isoDateOffset(now, 2),
    },
    {
      todoId: 'todo-foi-dad',
      label: 'Finish SHA FOI package for Dad',
      patientId: DEMO_DAD_ID,
      dueDateKey: isoDateOffset(now, 1),
    },
    {
      todoId: 'todo-mom-bp-log',
      label: 'Print Mom BP log before cardiology',
      patientId: DEMO_MOM_ID,
      dueDateKey: isoDateOffset(now, 2),
    },
    {
      todoId: 'todo-nora-vaccine',
      label: 'Upload Nora school vaccine record',
      patientId: DEMO_CHILD_NORA_ID,
      dueDateKey: isoDateOffset(now, 3),
    },
  ];

  return {
    caregiverId,
    caregiverName: 'Alex Ellis',
    // Self first for caregiver-home / daily Myself-first ordering
    dependants: [self, dad, mom, leo, mia, sam, nora],
    caregiverTodos,
  };
}

export function getHousehold(
  caregiverId: string,
  now: Date = new Date(),
): CaregiverHousehold | undefined {
  return buildHouseholdForNow(now, caregiverId);
}
