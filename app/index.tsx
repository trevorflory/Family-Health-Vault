import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  DEMO_CAREGIVER_ID,
  DEMO_SELF_ID,
  getHousehold,
} from '../data/caregiverHousehold';
import { getPatientVaultProfile } from '../data/patientVault';
import {
  compileDailyDigest,
  compileWeeklyDigest,
  createLiveDigestLoaders,
} from '../services/digestEngine';
import type { DigestDependantRef } from '../types/digest';
import { formatHealthStory } from '../utils/healthStory';
import { buildHomeAgenda, type HomeAgenda } from '../utils/homeAgenda';

export default function HomeScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState('');
  const [family, setFamily] = useState<DigestDependantRef[]>([]);
  const [agenda, setAgenda] = useState<HomeAgenda | null>(null);
  const [show811Picker, setShow811Picker] = useState(false);

  const load = useCallback(async () => {
    try {
      setBusy(true);
      setError(null);
      const now = new Date();
      const loaders = createLiveDigestLoaders();
      const [daily, weekly] = await Promise.all([
        compileDailyDigest(DEMO_CAREGIVER_ID, now, loaders),
        compileWeeklyDigest(DEMO_CAREGIVER_ID, now, loaders),
      ]);
      const selfVault = getPatientVaultProfile(DEMO_SELF_ID);
      setStory(selfVault ? formatHealthStory(selfVault) : 'Your vault profile is empty.');
      const household = getHousehold(DEMO_CAREGIVER_ID, now);
      setFamily(
        (household?.dependants ?? [])
          .map((d) => d.dependant)
          .filter((d) => d.role !== 'self'),
      );
      setAgenda(buildHomeAgenda(daily, weekly, now));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load home');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pickerPeople: DigestDependantRef[] = [
    {
      patientId: DEMO_SELF_ID,
      displayName: 'Myself',
      nickname: 'Myself',
      role: 'self',
      ageYears: 42,
      city: 'Regina',
    },
    ...family,
  ];

  if (busy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f3d3e" />
        <Text style={styles.meta}>Loading your vault…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Family Health Vault</Text>
        <Text style={styles.meta}>{error}</Text>
        <Pressable style={styles.primaryBtn} onPress={load}>
          <Text style={styles.primaryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.brand}>Family Health Vault</Text>
      <Text style={styles.lede}>
        Your household desk — summaries only, never diagnoses.
      </Text>

      <Text style={styles.section}>Myself</Text>
      <Link href={`/patient/${DEMO_SELF_ID}`} asChild>
        <Pressable style={styles.tile}>
          <Text style={styles.tileTitle}>Myself</Text>
          <Text style={styles.tileBody}>{story}</Text>
          <Text style={styles.tileCta}>Open my care hub →</Text>
        </Pressable>
      </Link>

      <Text style={styles.section}>My Family</Text>
      <View style={styles.familyRow}>
        {family.map((p) => (
          <Link key={p.patientId} href={`/patient/${p.patientId}`} asChild>
            <Pressable style={styles.miniTile}>
              <Text style={styles.miniNick}>{p.nickname}</Text>
              <Text style={styles.miniMeta}>
                {p.ageYears}y · {p.city}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>

      <Text style={styles.section}>Today</Text>
      <Link href="/digest/daily" asChild>
        <Pressable style={styles.tile}>
          {(agenda?.today ?? []).length === 0 ? (
            <Text style={styles.tileBody}>Nothing queued for today.</Text>
          ) : (
            agenda!.today.slice(0, 6).map((item) => (
              <Text key={item.id} style={styles.checkLine}>
                ○ {item.label}
              </Text>
            ))
          )}
          <Text style={styles.tileCta}>Open Daily Morning Status →</Text>
        </Pressable>
      </Link>

      <Text style={styles.section}>Tomorrow</Text>
      <View style={styles.tileMuted}>
        {(agenda?.tomorrow ?? []).length === 0 ? (
          <Text style={styles.tileBody}>Clear so far.</Text>
        ) : (
          agenda!.tomorrow.slice(0, 5).map((item) => (
            <Text key={item.id} style={styles.bullet}>
              · {item.label}
            </Text>
          ))
        )}
      </View>

      <Text style={styles.section}>My Week</Text>
      <Link href="/digest/weekly" asChild>
        <Pressable style={styles.tile}>
          {(agenda?.week ?? []).slice(0, 5).map((item) => (
            <Text key={item.id} style={styles.bullet}>
              · {item.label}
            </Text>
          ))}
          <Text style={styles.tileCta}>Open Weekly Overview →</Text>
        </Pressable>
      </Link>

      <Text style={styles.section}>811 · Connection & Info</Text>
      <Pressable style={styles.primary} onPress={() => setShow811Picker(true)}>
        <Text style={styles.primaryText}>Prepare an 811 call</Text>
        <Text style={styles.primarySub}>
          Choose who it’s for, then open the caregiver script
        </Text>
      </Pressable>

      <Text style={styles.devSection}>Developer</Text>
      <Link href="/sandbox" asChild>
        <Pressable style={styles.devRow}>
          <Text style={styles.devText}>QA sandbox</Text>
        </Pressable>
      </Link>

      <Modal
        visible={show811Picker}
        transparent
        animationType="fade"
        onRequestClose={() => setShow811Picker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShow811Picker(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Who is this 811 call for?</Text>
            {pickerPeople.map((p) => (
              <Pressable
                key={p.patientId}
                style={styles.modalRow}
                onPress={() => {
                  setShow811Picker(false);
                  router.push(`/patient/${p.patientId}/call811Prep`);
                }}
              >
                <Text style={styles.modalNick}>{p.nickname}</Text>
                <Text style={styles.modalMeta}>{p.displayName}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.modalCancel}
              onPress={() => setShow811Picker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 10 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  brand: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f3d3e',
    letterSpacing: -0.5,
  },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21, marginBottom: 4 },
  meta: { fontSize: 13, color: '#5a7374' },
  section: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tile: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 6,
  },
  tileMuted: {
    backgroundColor: '#eef4f4',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  tileTitle: { fontSize: 18, fontWeight: '700', color: '#0f3d3e' },
  tileBody: { fontSize: 14, color: '#355556', lineHeight: 20 },
  tileCta: { marginTop: 6, fontSize: 13, fontWeight: '600', color: '#1d5c5e' },
  checkLine: { fontSize: 14, color: '#143536', lineHeight: 20 },
  bullet: { fontSize: 14, color: '#143536', lineHeight: 20 },
  familyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniTile: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    minWidth: 100,
  },
  miniNick: { fontSize: 17, fontWeight: '700', color: '#0f3d3e' },
  miniMeta: { marginTop: 2, fontSize: 12, color: '#5a7374' },
  primary: {
    backgroundColor: '#0f3d3e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 4,
  },
  primaryText: { color: '#f4f7f5', fontWeight: '700', fontSize: 17 },
  primarySub: { color: '#c5d6d6', fontSize: 13, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700' },
  devSection: {
    marginTop: 20,
    fontSize: 11,
    fontWeight: '600',
    color: '#8aa0a0',
    textTransform: 'uppercase',
  },
  devRow: { paddingVertical: 8 },
  devText: { fontSize: 13, color: '#5a7374' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 61, 62, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#f4f7f5',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f3d3e',
    marginBottom: 6,
  },
  modalRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d5e2e2',
  },
  modalNick: { fontSize: 16, fontWeight: '700', color: '#0f3d3e' },
  modalMeta: { fontSize: 12, color: '#5a7374', marginTop: 2 },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: '#5a7374', fontWeight: '600' },
});
