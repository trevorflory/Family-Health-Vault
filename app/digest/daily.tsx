import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DEMO_CAREGIVER_ID } from '../../data/caregiverHousehold';
import { listAgendaItemsDone, setAgendaItemDone } from '../../db/agendaMarks';
import { setMedDoseGiven } from '../../db/medDoses';
import { compileCareImpactSummary } from '../../services/careImpact';
import {
  compileDailyDigest,
  createLiveDigestLoaders,
} from '../../services/digestEngine';
import type { CareImpactSummary } from '../../types/careObservation';
import type {
  DailyDigestPayload,
  DailyDependantSection,
  DigestMedicationDue,
} from '../../types/digest';

function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function MedCheckboxRow({
  med,
  onToggle,
}: {
  med: DigestMedicationDue;
  onToggle: () => void;
}) {
  return (
    <Pressable style={styles.medRow} onPress={onToggle}>
      <View style={[styles.checkbox, med.given && styles.checkboxOn]}>
        {med.given ? <Text style={styles.checkboxMark}>✓</Text> : null}
      </View>
      <View style={styles.medTextWrap}>
        <Text style={[styles.line, med.given && styles.lineDone]}>
          {med.scheduledTime} · {med.name}
          {med.dose ? ` ${med.dose}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function AgendaCheckRow({
  label,
  done,
  href,
  onToggle,
}: {
  label: string;
  done: boolean;
  href?: string;
  onToggle: () => void;
}) {
  const labelEl = (
    <Text style={[styles.line, done && styles.lineDone]}>{label}</Text>
  );
  return (
    <View style={styles.medRow}>
      <Pressable onPress={onToggle} accessibilityRole="checkbox">
        <View style={[styles.checkbox, done && styles.checkboxOn]}>
          {done ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
      </Pressable>
      {href ? (
        <Link href={href} asChild>
          <Pressable style={styles.medTextWrap}>{labelEl}</Pressable>
        </Link>
      ) : (
        <View style={styles.medTextWrap}>{labelEl}</View>
      )}
    </View>
  );
}

function PersonSection({
  section,
  agendaDone,
  onToggleMed,
  onToggleAgenda,
}: {
  section: DailyDependantSection;
  agendaDone: Set<string>;
  onToggleMed: (patientId: string, medicationId: string, given: boolean) => void;
  onToggleAgenda: (itemId: string, done: boolean) => void;
}) {
  const hasAppt = section.appointmentsWithin72h.length > 0;
  const hasFoi = section.overdueTasks.some((t) => t.kind === 'FOI_PENDING');
  const handovers = section.recentHandovers ?? [];
  const apptIds = new Set(
    section.appointmentsWithin72h.map((a) => a.appointmentId),
  );
  /** Prep lives under the appointment card — don't repeat in Prompts. */
  const promptsSansPrep = section.prompts.filter(
    (p) =>
      !(
        p.kind === 'PREP_VISIT' &&
        p.appointmentId &&
        apptIds.has(p.appointmentId)
      ),
  );

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{section.dependant.nickname}</Text>
      <Text style={styles.role}>
        {section.dependant.displayName} · {section.dependant.city}
      </Text>

      <View style={styles.block}>
        <Text style={styles.sectionLabel}>Medications</Text>
        {section.medsToday.length === 0 ? (
          <Text style={styles.meta}>None scheduled today</Text>
        ) : (
          section.medsToday.map((m) => (
            <MedCheckboxRow
              key={m.medicationId}
              med={m}
              onToggle={() =>
                onToggleMed(
                  section.dependant.patientId,
                  m.medicationId,
                  !m.given,
                )
              }
            />
          ))
        )}
      </View>

      <View style={styles.block}>
        <Text style={styles.sectionLabel}>Appointments & prep</Text>
        {section.appointmentsWithin72h.length === 0 ? (
          <Text style={styles.meta}>No visits in the next 72 hours</Text>
        ) : (
          section.appointmentsWithin72h.map((a) => {
            const prep = section.prompts.find(
              (p) =>
                p.kind === 'PREP_VISIT' && p.appointmentId === a.appointmentId,
            );
            const prepId = prep ? `prompt-${prep.promptId}` : null;
            return (
              <View key={a.appointmentId} style={styles.apptBlock}>
                <Text style={styles.line}>{a.title}</Text>
                {a.clinicianName ? (
                  <Text style={styles.meta}>{a.clinicianName}</Text>
                ) : null}
                <Text style={styles.meta}>
                  {new Date(a.startsAt).toLocaleString('en-CA', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
                {prep && prepId ? (
                  <AgendaCheckRow
                    label={prep.label}
                    done={agendaDone.has(prepId)}
                    href={prep.href}
                    onToggle={() =>
                      onToggleAgenda(prepId, !agendaDone.has(prepId))
                    }
                  />
                ) : null}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.block}>
        <Text style={styles.sectionLabel}>Check-ins & follow-ups</Text>
        {promptsSansPrep.length === 0 ? (
          <Text style={styles.meta}>No other prompts right now</Text>
        ) : (
          promptsSansPrep.map((p) => {
            const id = `prompt-${p.promptId}`;
            return (
              <AgendaCheckRow
                key={p.promptId}
                label={p.label}
                done={agendaDone.has(id)}
                href={p.href}
                onToggle={() => onToggleAgenda(id, !agendaDone.has(id))}
              />
            );
          })
        )}
      </View>
      <View style={styles.block}>
        <Text style={styles.sectionLabel}>To-dos</Text>
        {section.overdueTasks.length === 0 ? (
          <Text style={styles.meta}>All clear</Text>
        ) : (
          section.overdueTasks.map((t) => {
            const id = `task-${t.taskId}`;
            return (
              <AgendaCheckRow
                key={t.taskId}
                label={`${t.label} (${t.ageDays}d)`}
                done={agendaDone.has(id)}
                onToggle={() => onToggleAgenda(id, !agendaDone.has(id))}
              />
            );
          })
        )}
      </View>

      {handovers.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.sectionLabel}>Last shift handover</Text>
          {handovers.map((h) => (
            <View key={h.handoverId} style={styles.apptBlock}>
              <Text style={styles.line}>
                {h.performerLabel} · meds{' '}
                {h.medsVerified ? 'verified' : 'not verified'}
              </Text>
              <Text style={styles.meta}>{h.intakeSummary}</Text>
              <Text style={styles.meta}>{h.moodBehaviorSummary}</Text>
              {h.tellTheFamily ? (
                <Text style={styles.alert}>Family: {h.tellTheFamily}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        {hasAppt ? (
          <Link
            href={{
              pathname: `/patient/${section.dependant.patientId}/sbarExport`,
              params: {
                appointmentId: section.appointmentsWithin72h[0]?.appointmentId,
              },
            }}
            asChild
          >
            <Pressable style={styles.actionBtn}>
              <Text style={styles.actionText}>Export Visit SBAR</Text>
            </Pressable>
          </Link>
        ) : null}
        {hasFoi ? (
          <Link
            href={`/patient/${section.dependant.patientId}/foiStatus`}
            asChild
          >
            <Pressable style={styles.actionBtn}>
              <Text style={styles.actionText}>Review FOI Status</Text>
            </Pressable>
          </Link>
        ) : null}
        <Link href={`/patient/${section.dependant.patientId}`} asChild>
          <Pressable style={styles.actionBtnSecondary}>
            <Text style={styles.actionTextSecondary}>Open care hub</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

export default function DailyDigestScreen() {
  const params = useLocalSearchParams<{ caregiverId?: string }>();
  const caregiverId = params.caregiverId || DEMO_CAREGIVER_ID;

  const [digest, setDigest] = useState<DailyDigestPayload | null>(null);
  const [impact, setImpact] = useState<CareImpactSummary | null>(null);
  const [agendaDone, setAgendaDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshQuiet = useCallback(async () => {
    const dateKey = localDateKey();
    const [payload, impactSummary, doneIds] = await Promise.all([
      compileDailyDigest(caregiverId, new Date(), createLiveDigestLoaders()),
      compileCareImpactSummary({ caregiverId }),
      listAgendaItemsDone(dateKey),
    ]);
    setDigest(payload);
    setImpact(impactSummary);
    setAgendaDone(new Set(doneIds));
  }, [caregiverId]);

  const load = useCallback(async () => {
    try {
      setBusy(true);
      setError(null);
      await refreshQuiet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compile digest');
    } finally {
      setBusy(false);
    }
  }, [refreshQuiet]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function toggleMed(
    patientId: string,
    medicationId: string,
    given: boolean,
  ) {
    // Optimistic — avoid full-page busy reload (scroll jump).
    setDigest((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.dependant.patientId !== patientId
            ? s
            : {
                ...s,
                medsToday: s.medsToday.map((m) =>
                  m.medicationId === medicationId ? { ...m, given } : m,
                ),
              },
        ),
      };
    });
    try {
      await setMedDoseGiven({
        patientId,
        medicationId,
        dateKey: localDateKey(),
        given,
      });
      await refreshQuiet();
    } catch (err) {
      Alert.alert(
        'Could not save',
        err instanceof Error ? err.message : 'Med mark failed',
      );
      await refreshQuiet();
    }
  }

  async function toggleAgenda(itemId: string, done: boolean) {
    setAgendaDone((prev) => {
      const next = new Set(prev);
      if (done) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
    try {
      await setAgendaItemDone({
        itemId,
        dateKey: localDateKey(),
        done,
      });
      await refreshQuiet();
    } catch (err) {
      Alert.alert(
        'Could not save',
        err instanceof Error ? err.message : 'Checklist update failed',
      );
      await refreshQuiet();
    }
  }

  if (busy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f3d3e" />
        <Text style={styles.meta}>Compiling morning status…</Text>
      </View>
    );
  }

  if (error || !digest) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Daily Morning Status</Text>
        <Text style={styles.meta}>{error ?? 'No digest available'}</Text>
        <Pressable style={styles.primaryBtn} onPress={load}>
          <Text style={styles.primaryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Feeds Home → Today</Text>
      <Text style={styles.heading}>Daily Morning Status</Text>
      <Text style={styles.lede}>{digest.headline}</Text>

      {impact && impact.counts.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Care coordination this year</Text>
          <Text style={styles.meta}>{impact.headline}</Text>
          {impact.counts.map((c) => (
            <Text key={c.type} style={styles.line}>
              {c.copy}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryChip}>{digest.totalMedsDue} meds</Text>
        <Text style={styles.summaryChip}>{digest.totalAppointments} visits</Text>
        <Text style={styles.summaryChip}>{digest.totalOverdue} overdue</Text>
      </View>

      <Link href="/" asChild>
        <Pressable style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>← Back to home</Text>
        </Pressable>
      </Link>
      <Link href="/digest/weekly" asChild>
        <Pressable style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>Open Weekly Overview →</Text>
        </Pressable>
      </Link>

      {digest.sections.map((section) => (
        <PersonSection
          key={section.dependant.patientId}
          section={section}
          agendaDone={agendaDone}
          onToggleMed={toggleMed}
          onToggleAgenda={toggleAgenda}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 12 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  meta: { fontSize: 13, color: '#5a7374' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryChip: {
    backgroundColor: '#e7f1f1',
    color: '#0f3d3e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    fontWeight: '600',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 4,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#143536' },
  role: {
    fontSize: 11,
    color: '#5a7374',
    marginBottom: 2,
  },
  block: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e7f1f1',
    gap: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0f3d3e',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: '#0f3d3e' },
  checkboxMark: { color: '#f4f7f5', fontSize: 13, fontWeight: '700' },
  medTextWrap: { flex: 1 },
  line: { fontSize: 15, color: '#143536', lineHeight: 21 },
  lineDone: { color: '#5a7374', textDecorationLine: 'line-through' },
  alert: { fontSize: 14, color: '#6b4f1d', marginTop: 2 },
  overdue: { fontSize: 14, color: '#8a2b1e', lineHeight: 20 },
  prompt: { fontSize: 14, color: '#1d5c5e', lineHeight: 20 },
  apptBlock: { marginBottom: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionBtn: {
    backgroundColor: '#0f3d3e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionText: { color: '#f4f7f5', fontWeight: '600', fontSize: 13 },
  actionBtnSecondary: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionTextSecondary: { color: '#0f3d3e', fontWeight: '600', fontSize: 13 },
  primaryBtn: {
    backgroundColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700' },
  linkBtn: { paddingVertical: 2 },
  linkBtnText: { color: '#1d5c5e', fontWeight: '600' },
});
