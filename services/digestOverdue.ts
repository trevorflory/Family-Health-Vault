import type { MedicalEventRecord } from '../types/db';
import type { DigestOverdueTask } from '../types/digest';
import type { FOIRequestRecord } from '../types/foiPayload';

const MS_DAY = 24 * 60 * 60 * 1000;
export const FOI_OVERDUE_DAYS = 30;

function ageDaysSince(iso: string, now: Date): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / MS_DAY));
}

/**
 * Build FOI_PENDING overdue tasks from live FOIRequests (DRAFT only).
 * DISPATCHED requests are considered sent — not digest-overdue.
 */
export function overdueTasksFromFoiRequests(
  records: FOIRequestRecord[],
  now: Date,
  minAgeDays: number = FOI_OVERDUE_DAYS,
): DigestOverdueTask[] {
  return records
    .filter((r) => r.status === 'DRAFT')
    .map((r) => {
      const ageDays = ageDaysSince(r.createdAt, now);
      return {
        taskId: `foi-live-${r.id}`,
        kind: 'FOI_PENDING' as const,
        label: `FOI ${r.status} — ${r.jurisdiction} / ${r.facilityId} (${ageDays}d)`,
        ageDays,
        relatedId: r.id,
      };
    })
    .filter((t) => t.ageDays > minAgeDays)
    .sort((a, b) => b.ageDays - a.ageDays);
}

function hasLabUploadOnFile(events: MedicalEventRecord[]): boolean {
  return events.some(
    (e) =>
      e.kind === 'LAB_RESULT' &&
      (e.status === 'CONFIRMED' || e.status === 'PENDING_REVIEW'),
  );
}

/**
 * Merge household fixture overdue tasks with live FOI + MedicalEvents.
 * - Live DRAFT FOI rows replace fixture FOI_PENDING when any FOI rows exist.
 * - MISSING_LAB_UPLOAD fixtures drop when a lab OCR event is on file.
 */
export function resolveOverdueTasks(input: {
  fixtureTasks: DigestOverdueTask[];
  foiRecords: FOIRequestRecord[];
  medicalEvents: MedicalEventRecord[];
  now: Date;
}): DigestOverdueTask[] {
  const { fixtureTasks, foiRecords, medicalEvents, now } = input;
  const nonFoiFixtures = fixtureTasks.filter((t) => t.kind !== 'FOI_PENDING');
  const foiFixtures = fixtureTasks.filter((t) => t.kind === 'FOI_PENDING');

  const liveFoi = overdueTasksFromFoiRequests(foiRecords, now);
  const foiTasks =
    foiRecords.length > 0
      ? liveFoi
      : foiFixtures.filter((t) => t.ageDays > FOI_OVERDUE_DAYS);

  const labOnFile = hasLabUploadOnFile(medicalEvents);
  const otherTasks = nonFoiFixtures.filter((t) => {
    if (t.kind === 'MISSING_LAB_UPLOAD' && labOnFile) return false;
    return true;
  });

  return [...foiTasks, ...otherTasks];
}
