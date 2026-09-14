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
import { compileDailyDigest } from '../../services/digestEngine';
import { scheduleDigestNotifications } from '../../services/notificationScheduler';
import type { DailyDigestPayload, DailyDependantSection } from '../../types/digest';

function QuickActions({
  section,
  onMarkMeds,
}: {
  section: DailyDependantSection;
  onMarkMeds: (patientId: string) => void;
}) {
  const hasMeds = section.medsToday.length > 0;
  const hasAppt = section.appointmentsWithin72h.length > 0;
  const hasFoi = section.overdueTasks.some((t) => t.kind === 'FOI_PENDING');

  return (
    <View style={styles.actions}>
      {hasMeds ? (
        <Pressable
          style={styles.actionBtn}
          onPress={() => onMarkMeds(section.dependant.patientId)}
        >
          <Text style={styles.actionText}>Mark Meds Given</Text>
        </Pressable>
      ) : null}
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
        <Link href={`/patient/${section.dependant.patientId}/foiWizard`} asChild>
          <Pressable style={styles.actionBtn}>
            <Text style={styles.actionText}>Review FOI Status</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

export default function DailyDigestScreen() {
  const params = useLocalSearchParams<{ caregiverId?: string }>();
  const caregiverId = params.caregiverId || DEMO_CAREGIVER_ID;

  const [digest, setDigest] = useState<DailyDigestPayload | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [givenIds, setGivenIds] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      setBusy(true);
      setError(null);
      const payload = await compileDailyDigest(caregiverId);
      setDigest(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compile digest');
    } finally {
      setBusy(false);
    }
  }, [caregiverId]);

  useEffect(() => {
    void load();
  }, [load]);

  function markMedsGiven(patientId: string) {
    setGivenIds((prev) => ({ ...prev, [patientId]: true }));
    Alert.alert('Meds marked', 'Morning doses marked given for this profile.');
  }

  async function enableNotifications() {
    try {
      await scheduleDigestNotifications(caregiverId);
      Alert.alert(
        'Notifications scheduled',
        'Daily digest at 7:00 AM and weekly overview Sundays at 4:00 PM.',
      );
    } catch (err) {
      Alert.alert(
        'Notifications unavailable',
        err instanceof Error ? err.message : 'Could not schedule notifications',
      );
    }
  }

  if (busy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f3d3e" />
        <Text style={styles.meta}>Compiling morning digest…</Text>
      </View>
    );
  }

  if (error || !digest) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Daily Morning Digest</Text>
        <Text style={styles.meta}>{error ?? 'No digest available'}</Text>
        <Pressable style={styles.primaryBtn} onPress={load}>
          <Text style={styles.primaryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Sandwich Generation · Caregiver digest</Text>
      <Text style={styles.heading}>Daily Morning Digest</Text>
      <Text style={styles.lede}>{digest.headline}</Text>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryChip}>{digest.totalMedsDue} meds</Text>
        <Text style={styles.summaryChip}>{digest.totalAppointments} visits</Text>
        <Text style={styles.summaryChip}>{digest.totalOverdue} overdue</Text>
      </View>

      <Pressable style={styles.secondaryBtn} onPress={enableNotifications}>
        <Text style={styles.secondaryBtnText}>Enable 7 AM / Sunday alerts</Text>
      </Pressable>

      <Link href="/digest/weekly" asChild>
        <Pressable style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>Open Weekly Sunday Overview →</Text>
        </Pressable>
      </Link>

      {digest.sections.map((section) => (
        <View key={section.dependant.patientId} style={styles.card}>
          <Text style={styles.cardTitle}>{section.dependant.displayName}</Text>
          <Text style={styles.role}>
            {section.dependant.role.replace('_', ' ')} · {section.dependant.city}
          </Text>

          <Text style={styles.sectionLabel}>Meds scheduled today</Text>
          {section.medsToday.length === 0 ? (
            <Text style={styles.meta}>None</Text>
          ) : (
            section.medsToday.map((m) => (
              <Text key={m.medicationId} style={styles.line}>
                {m.scheduledTime} · {m.name}
                {m.dose ? ` ${m.dose}` : ''}
                {givenIds[section.dependant.patientId] || m.given
                  ? ' ✓'
                  : ''}
              </Text>
            ))
          )}

          <Text style={styles.sectionLabel}>Within 72 hours</Text>
          {section.appointmentsWithin72h.length === 0 ? (
            <Text style={styles.meta}>No upcoming visits</Text>
          ) : (
            section.appointmentsWithin72h.map((a) => (
              <View key={a.appointmentId} style={styles.apptBlock}>
                <Text style={styles.line}>{a.title}</Text>
                <Text style={styles.alert}>{a.preparationAlert}</Text>
              </View>
            ))
          )}

          <Text style={styles.sectionLabel}>Overdue</Text>
          {section.overdueTasks.length === 0 ? (
            <Text style={styles.meta}>All clear</Text>
          ) : (
            section.overdueTasks.map((t) => (
              <Text key={t.taskId} style={styles.overdue}>
                {t.label} ({t.ageDays}d)
              </Text>
            ))
          )}

          <QuickActions section={section} onMarkMeds={markMedsGiven} />
        </View>
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
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#143536' },
  role: { fontSize: 12, color: '#5a7374', textTransform: 'capitalize', marginBottom: 4 },
  sectionLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  line: { fontSize: 15, color: '#143536', lineHeight: 21 },
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
  primaryBtn: {
    backgroundColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#0f3d3e', fontWeight: '600' },
  linkBtn: { paddingVertical: 4 },
  linkBtnText: { color: '#1d5c5e', fontWeight: '600' },
});
