import { getHousehold } from '../data/caregiverHousehold';
import { getPatientVaultProfile } from '../data/patientVault';
import { listMedicalEventsForPatient } from '../db/medicalEvents';
import { listVisitGoals } from '../db/visitGoals';
import type { VisitDebriefParsed } from '../types/db';

export interface CaregiverAdviceSnippet {
  text: string;
  updatedAt: string;
  patientId: string;
  nickname: string;
  source: 'VISIT_GOALS' | 'VISIT_DEBRIEF';
  href: string;
}

function nicknameFor(patientId: string, caregiverId: string, now: Date): string {
  const household = getHousehold(caregiverId, now);
  const dep = household?.dependants.find((d) => d.dependant.patientId === patientId);
  if (dep) return dep.dependant.nickname;
  const profile = getPatientVaultProfile(patientId);
  if (profile?.relationshipLabel === 'self') return 'Myself';
  return profile?.preferredName ?? profile?.fullName ?? 'Family';
}

/**
 * Most recent caregiver-authored advice (visit goals or debrief notes).
 */
export async function getMostRecentCaregiverAdvice(options: {
  caregiverId: string;
  now?: Date;
}): Promise<CaregiverAdviceSnippet | null> {
  const now = options.now ?? new Date();
  const household = getHousehold(options.caregiverId, now);
  const patientIds =
    household?.dependants.map((d) => d.dependant.patientId) ?? [];

  const candidates: CaregiverAdviceSnippet[] = [];

  const goals = await listVisitGoals();
  for (const g of goals) {
    if (!g.goalsText.trim()) continue;
    if (patientIds.length && !patientIds.includes(g.patientId)) continue;
    candidates.push({
      text: g.goalsText.trim(),
      updatedAt: g.updatedAt,
      patientId: g.patientId,
      nickname: nicknameFor(g.patientId, options.caregiverId, now),
      source: 'VISIT_GOALS',
      href: `/patient/${g.patientId}/appointmentPrep?appointmentId=${g.appointmentId}`,
    });
  }

  for (const patientId of patientIds) {
    const events = await listMedicalEventsForPatient(patientId);
    for (const ev of events) {
      if (ev.kind !== 'VISIT_DEBRIEF') continue;
      if (ev.status === 'REJECTED') continue;
      try {
        const parsed = JSON.parse(ev.parsedJson) as VisitDebriefParsed;
        const bits = [
          parsed.discussionSummary?.trim(),
          ...(parsed.actionItems ?? []).map((s) => s.trim()),
        ].filter(Boolean) as string[];
        const text = bits[0] ?? '';
        if (!text) continue;
        candidates.push({
          text,
          updatedAt: ev.createdAt,
          patientId,
          nickname: nicknameFor(patientId, options.caregiverId, now),
          source: 'VISIT_DEBRIEF',
          href: `/patient/${patientId}/voiceDebrief`,
        });
      } catch {
        /* ignore */
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return candidates[0] ?? null;
}
