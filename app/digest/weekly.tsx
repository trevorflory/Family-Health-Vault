import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DEMO_CAREGIVER_ID } from '../../data/caregiverHousehold';
import {
  compileWeeklyDigest,
  createLiveDigestLoaders,
} from '../../services/digestEngine';
import type { WeeklyDigestPayload } from '../../types/digest';

export default function WeeklyDigestScreen() {
  const params = useLocalSearchParams<{ caregiverId?: string }>();
  const caregiverId = params.caregiverId || DEMO_CAREGIVER_ID;

  const [digest, setDigest] = useState<WeeklyDigestPayload | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBusy(true);
      setError(null);
      setDigest(
        await compileWeeklyDigest(
          caregiverId,
          new Date(),
          createLiveDigestLoaders(),
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to compile weekly digest',
      );
    } finally {
      setBusy(false);
    }
  }, [caregiverId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (busy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f3d3e" />
        <Text style={styles.meta}>Compiling next 7 days…</Text>
      </View>
    );
  }

  if (error || !digest) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Weekly Overview</Text>
        <Text style={styles.meta}>{error ?? 'No digest available'}</Text>
        <Pressable style={styles.primaryBtn} onPress={load}>
          <Text style={styles.primaryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>
        Rolling window · {digest.windowStart} → {digest.windowEnd}
      </Text>
      <Text style={styles.heading}>Weekly Overview</Text>
      <Text style={styles.lede}>{digest.headline}</Text>
      <Text style={styles.narrative}>{digest.narrativeSummary}</Text>
      <Text style={styles.note}>
        Sunday delivery target (push / email later). Home “My Week” mirrors these
        to-dos and events.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Caregiver to-dos</Text>
        {digest.caregiverTodos.length === 0 ? (
          <Text style={styles.meta}>No open to-dos</Text>
        ) : (
          digest.caregiverTodos.map((t) => (
            <Text key={t.todoId} style={styles.line}>
              ○ {t.label}
              {t.dueDateKey ? ` · due ${t.dueDateKey}` : ''}
            </Text>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Next 7 days</Text>
        {digest.upcomingWeek.length === 0 ? (
          <Text style={styles.meta}>No events in this window</Text>
        ) : (
          digest.upcomingWeek.map((item) => (
            <Text
              key={`${item.patientId}-${item.startsAt}-${item.title}`}
              style={styles.line}
            >
              {new Date(item.startsAt).toLocaleString('en-CA')} ·{' '}
              {item.displayName} — {item.title}
            </Text>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>7-day vital trends</Text>
        {digest.vitalTrends.map((v, i) => (
          <Text key={`${v.date}-${v.label}-${i}`} style={styles.line}>
            {v.date} · {v.label}: {v.value} {v.unit}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Medication adherence</Text>
        {digest.adherence.map((a) => (
          <Text key={a.patientId} style={styles.line}>
            {a.displayName}: {Math.round(a.adherenceRate * 100)}% (
            {a.dosesTaken}/{a.dosesScheduled})
          </Text>
        ))}
      </View>

      <Link href="/" asChild>
        <Pressable style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>← Back to home</Text>
        </Pressable>
      </Link>
      <Link href="/digest/daily" asChild>
        <Pressable style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>← Daily Morning Status</Text>
        </Pressable>
      </Link>
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
  },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  narrative: { fontSize: 14, color: '#355556', lineHeight: 20 },
  note: { fontSize: 12, color: '#5a7374', lineHeight: 18 },
  meta: { fontSize: 13, color: '#5a7374' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#143536',
    marginBottom: 4,
  },
  line: { fontSize: 14, color: '#143536', lineHeight: 20 },
  primaryBtn: {
    backgroundColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700' },
  linkBtn: { paddingVertical: 4 },
  linkBtnText: { color: '#1d5c5e', fontWeight: '600' },
});
