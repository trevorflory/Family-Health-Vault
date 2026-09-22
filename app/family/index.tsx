import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  DEMO_CAREGIVER_ID,
  getHousehold,
} from '../../data/caregiverHousehold';
import { compileWeeklyDigest, createLiveDigestLoaders } from '../../services/digestEngine';
import type {
  DigestDependantRef,
  MedicationAdherenceSummary,
} from '../../types/digest';

/**
 * Family roster — all members as tiles; adherence summary lives here (not Weekly).
 */
export default function FamilyRosterScreen() {
  const [people, setPeople] = useState<DigestDependantRef[]>([]);
  const [adherence, setAdherence] = useState<MedicationAdherenceSummary[]>([]);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    try {
      setBusy(true);
      const now = new Date();
      const household = getHousehold(DEMO_CAREGIVER_ID, now);
      setPeople((household?.dependants ?? []).map((d) => d.dependant));
      const weekly = await compileWeeklyDigest(
        DEMO_CAREGIVER_ID,
        now,
        createLiveDigestLoaders(),
      );
      setAdherence(weekly.adherence);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const rateFor = (patientId: string) =>
    adherence.find((a) => a.patientId === patientId);

  if (busy && people.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f3d3e" />
        <Text style={styles.meta}>Loading family…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Household</Text>
      <Text style={styles.heading}>My Family</Text>
      <Text style={styles.lede}>
        Open anyone’s care hub. Medication adherence for the week sits on each
        tile below.
      </Text>

      {people.map((p) => {
        const a = rateFor(p.patientId);
        const isSelf = p.role === 'self';
        return (
          <Link key={p.patientId} href={`/patient/${p.patientId}`} asChild>
            <Pressable style={styles.tile}>
              <Text style={styles.nick}>
                {isSelf ? 'Myself' : p.nickname}
              </Text>
              <Text style={styles.meta}>
                {p.displayName} · {p.ageYears}y · {p.city}
              </Text>
              {a ? (
                <Text style={styles.adherence}>
                  Med adherence (prior 7d): {Math.round(a.adherenceRate * 100)}% (
                  {a.dosesTaken}/{a.dosesScheduled})
                </Text>
              ) : (
                <Text style={styles.adherence}>Med adherence: not tracked</Text>
              )}
            </Pressable>
          </Link>
        );
      })}

      <Link href="/" asChild>
        <Pressable style={styles.homeLink}>
          <Text style={styles.homeLinkText}>← Home</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 40 },
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
    letterSpacing: 0.7,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f3d3e',
    letterSpacing: -0.4,
  },
  lede: { fontSize: 15, color: '#355556', lineHeight: 22, marginBottom: 4 },
  meta: { fontSize: 13, color: '#5a7374' },
  tile: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 4,
  },
  nick: { fontSize: 18, fontWeight: '700', color: '#0f3d3e' },
  adherence: { fontSize: 13, color: '#1d5c5e', marginTop: 4, fontWeight: '600' },
  homeLink: { paddingVertical: 12 },
  homeLinkText: { color: '#1d5c5e', fontWeight: '600' },
});
