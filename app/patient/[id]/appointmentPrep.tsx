import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  DEMO_CAREGIVER_ID,
  getHousehold,
} from '../../../data/caregiverHousehold';
import { listMedicalEventsForPatient } from '../../../db/medicalEvents';
import { getVisitGoals, setVisitGoals } from '../../../db/visitGoals';
import { compileBiomarkerTrends } from '../../../services/biomarkerTrends';
import { compileWeeklyDigest, createLiveDigestLoaders } from '../../../services/digestEngine';
import { SBAR_REGULATORY_NOTICE } from '../../../services/sbarEngine';
import type { DigestAppointment, VitalTrendPoint } from '../../../types/digest';

function pickNextAppointment(
  appointments: DigestAppointment[],
  preferredId: string | undefined,
  now: Date,
): DigestAppointment | null {
  if (preferredId) {
    const hit = appointments.find((a) => a.appointmentId === preferredId);
    if (hit) return hit;
  }
  const upcoming = appointments
    .filter((a) => new Date(a.startsAt).getTime() >= now.getTime() - 2 * 3600_000)
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  return upcoming[0] ?? null;
}

/**
 * Unified Appointment Prep — goals, insights, SBAR deep-link, 7-day vitals.
 */
export default function AppointmentPrepScreen() {
  const { id: patientId, appointmentId } = useLocalSearchParams<{
    id: string;
    appointmentId?: string;
  }>();
  const now = useMemo(() => new Date(), []);
  const household = getHousehold(DEMO_CAREGIVER_ID, now);
  const dep = household?.dependants.find(
    (d) => d.dependant.patientId === patientId,
  );
  const next = pickNextAppointment(
    dep?.appointments ?? [],
    appointmentId,
    now,
  );

  const [goals, setGoals] = useState('');
  const [saving, setSaving] = useState(false);
  const [insightLines, setInsightLines] = useState<string[]>([]);
  const [vitals, setVitals] = useState<VitalTrendPoint[]>([]);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    if (!patientId) return;
    setBusy(true);
    try {
      const [events, weekly, saved] = await Promise.all([
        listMedicalEventsForPatient(patientId),
        compileWeeklyDigest(
          DEMO_CAREGIVER_ID,
          now,
          createLiveDigestLoaders(),
        ),
        next
          ? getVisitGoals(patientId, next.appointmentId)
          : Promise.resolve(null),
      ]);
      const series = compileBiomarkerTrends(events);
      setInsightLines(
        series.slice(0, 4).map((s) => {
          const last = s.points.at(-1);
          return last
            ? `${s.displayName}: latest ${last.value} ${last.units}`
            : s.displayName;
        }),
      );
      setVitals(
        weekly.vitalTrends.filter((v) => v.patientId === patientId),
      );
      if (saved?.goalsText) setGoals(saved.goalsText);
    } finally {
      setBusy(false);
    }
  }, [patientId, next, now]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSaveGoals() {
    if (!patientId || !next) {
      Alert.alert('No visit selected', 'Add an appointment to attach goals.');
      return;
    }
    try {
      setSaving(true);
      await setVisitGoals({
        patientId,
        appointmentId: next.appointmentId,
        goalsText: goals,
      });
      Alert.alert('Saved', 'Visit goals will appear in prep for this appointment.');
    } catch (err) {
      Alert.alert(
        'Could not save',
        err instanceof Error ? err.message : 'Save failed',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Appointment Prep</Text>
      <Text style={styles.lede}>
        Capture what you want from the visit, review vault insights, then export
        an educational SBAR for the clinician.
      </Text>
      <Text style={styles.notice}>{SBAR_REGULATORY_NOTICE}</Text>

      {next ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preloaded visit</Text>
          <Text style={styles.line}>{next.title}</Text>
          <Text style={styles.meta}>
            {new Date(next.startsAt).toLocaleString('en-CA', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
            {next.clinicianName ? ` · ${next.clinicianName}` : ''}
          </Text>
          {next.preparationAlert ? (
            <Text style={styles.alert}>{next.preparationAlert}</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.meta}>No upcoming visit to preload.</Text>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What do you want from this visit?</Text>
        <Text style={styles.meta}>
          Goals fold into your prep notes (educational — not a care plan).
        </Text>
        <TextInput
          style={styles.input}
          multiline
          value={goals}
          onChangeText={setGoals}
          placeholder="e.g. Ask about eGFR trend, refill timing, dizziness after Ramipril…"
          placeholderTextColor="#8aa0a1"
        />
        <Pressable
          style={[styles.secondaryBtn, saving && styles.disabled]}
          disabled={saving || !next}
          onPress={() => void onSaveGoals()}
        >
          <Text style={styles.secondaryBtnText}>
            {saving ? 'Saving…' : 'Save visit goals'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Suggested questions / insights</Text>
        {busy ? (
          <ActivityIndicator color="#0f3d3e" />
        ) : insightLines.length === 0 ? (
          <Text style={styles.meta}>No biomarker trends on file yet.</Text>
        ) : (
          insightLines.map((line) => (
            <Text key={line} style={styles.line}>
              · {line}
            </Text>
          ))
        )}
        <Link href={`/patient/${patientId}/insights`} asChild>
          <Pressable>
            <Text style={styles.link}>Open full Visit Prep Insights →</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>7-day vital trends</Text>
        {vitals.length === 0 ? (
          <Text style={styles.meta}>No vital samples in this window.</Text>
        ) : (
          vitals.slice(0, 8).map((v, i) => (
            <Text key={`${v.date}-${v.label}-${i}`} style={styles.line}>
              {v.date} · {v.label}: {v.value} {v.unit}
            </Text>
          ))
        )}
      </View>

      <Link
        href={{
          pathname: `/patient/${patientId}/sbarExport`,
          params: next?.appointmentId
            ? { appointmentId: next.appointmentId }
            : undefined,
        }}
        asChild
      >
        <Pressable style={styles.primary}>
          <Text style={styles.primaryText}>SBAR / summary for visit</Text>
          <Text style={styles.primarySub}>
            One-page educational handoff · includes goals when saved
          </Text>
        </Pressable>
      </Link>

      <Link href={`/patient/${patientId}/appointments`} asChild>
        <Pressable style={styles.homeLink}>
          <Text style={styles.homeLinkText}>← Medical Appointments</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, paddingBottom: 48 },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  notice: { fontSize: 12, color: '#6b7c7d', lineHeight: 17 },
  meta: { fontSize: 13, color: '#5a7374', lineHeight: 18 },
  alert: { fontSize: 14, color: '#6b4f1d', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#143536' },
  line: { fontSize: 14, color: '#143536', lineHeight: 20 },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#c5d4d4',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#ffffff',
    color: '#0f3d3e',
    textAlignVertical: 'top',
  },
  primary: {
    backgroundColor: '#0f3d3e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 4,
  },
  primaryText: { color: '#f4f7f5', fontWeight: '700', fontSize: 17 },
  primarySub: { color: '#c5d6d6', fontSize: 13, lineHeight: 18 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryBtnText: { color: '#0f3d3e', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  link: { color: '#1d5c5e', fontWeight: '600', marginTop: 6 },
  homeLink: { paddingVertical: 8 },
  homeLinkText: { color: '#1d5c5e', fontWeight: '600' },
});
