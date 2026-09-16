import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { markMedDosesGiven } from '../../db/medDoses';
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
    <Pressable
      style={styles.medRow}
      onPress={med.given ? undefined : onToggle}
      disabled={med.given}
    >
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

function PersonSection({
  section,
  onMarkMed,
}: {
  section: DailyDependantSection;
  onMarkMed: (patientId: string, medicationId: string) => void;
}) {
  const hasAppt = section.appointmentsWithin72h.length > 0;
  const hasFoi = section.overdueTasks.some((t) => t.kind === 'FOI_PENDING');
  const handovers = section.recentHandovers ?? [];

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
                onMarkMed(section.dependant.patientId, m.medicationId)
              }
            />
          ))
        )}
      </View>

      <View style={styles.block}>
        <Text style={styles.sectionLabel}>Appointments</Text>
        {section.appointmentsWithin72h.length === 0 ? (
          <Text style={styles.meta}>No visits in the next 72 hours</Text>
        ) : (
          section.appointmentsWithin72h.map((a) => (
            <View key={a.appointmentId} style={styles.apptBlock}>
              <Text style={styles.line}>{a.title}</Text>
              <Text style={styles.alert}>{a.preparationAlert}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.block}>
        <Text style={styles.sectionLabel}>To-dos</Text>
        {section.overdueTasks.length === 0 ? (
          <Text style={styles.meta}>All clear</Text>
        ) : (
          section.overdueTasks.map((t) => (
            <Text key={t.taskId} style={styles.overdue}>
              ○ {t.label} ({t.ageDays}d)
            </Text>
          ))
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
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBusy(true);
      setError(null);
      const [payload, impactSummary] = await Promise.all([
        compileDailyDigest(caregiverId, new Date(), createLiveDigestLoaders()),
        compileCareImpactSummary({ caregiverId }),
      ]);
      setDigest(payload);
      setImpact(impactSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compile digest');
    } finally {
      setBusy(false);
    }
  }, [caregiverId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markOneMed(patientId: string, medicationId: string) {
    try {
      await markMedDosesGiven({
        patientId,
        medicationIds: [medicationId],
        dateKey: localDateKey(),
      });
      await load();
    } catch (err) {
      Alert.alert(
        'Could not save',
        err instanceof Error ? err.message : 'Med mark failed',
      );
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
          onMarkMed={markOneMed}
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
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 6,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#143536' },
  role: {
    fontSize: 12,
    color: '#5a7374',
    marginBottom: 4,
  },
  block: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e7f1f1',
    gap: 4,
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
