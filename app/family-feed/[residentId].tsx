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
import {
  getFamilyFeed,
  runPccFixtureSync,
  resetLtcMemoryDb,
} from '../../services/ehr/client';
import { saveFamilyFeedCache } from '../../db/familyFeedCache';
import {
  getDeviceWalletPlan,
  enableSandboxWalletPro,
} from '../../services/walletEntitlements';
import type { WalletPlan } from '@family-health-vault/shared';

const PRIMARY_FAMILY =
  '11111111-1111-4111-8111-111111111111';
const SECONDARY_FAMILY =
  '22222222-2222-4222-8222-222222222222';

/**
 * Freemium / POA-scoped LTC family timeline (read-only from EHR ingest).
 */
export default function FamilyFeedScreen() {
  const { residentId } = useLocalSearchParams<{ residentId: string }>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asPrimary, setAsPrimary] = useState(true);
  const [plan, setPlan] = useState<WalletPlan>(getDeviceWalletPlan());
  const [feed, setFeed] = useState<ReturnType<typeof getFamilyFeed> | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!residentId) return;
    setBusy(true);
    setError(null);
    try {
      resetLtcMemoryDb();
      const { db, residentId: syncedId } = await runPccFixtureSync();
      const resident =
        db.residents.find((r) => r.id === residentId) ??
        db.residents.find((r) => r.id === syncedId) ??
        db.residents[0] ??
        null;
      if (!resident) {
        setError('No resident after PCC fixture sync');
        return;
      }
      const familyId = asPrimary ? PRIMARY_FAMILY : SECONDARY_FAMILY;
      const next = getFamilyFeed(db, familyId, resident.id);
      setFeed(next);
      saveFamilyFeedCache({
        residentId: resident.id,
        cachedAtISO: new Date().toISOString(),
        timeline: next.timeline,
        plan: getDeviceWalletPlan(),
      });
      setPlan(getDeviceWalletPlan());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feed');
    } finally {
      setBusy(false);
    }
  }, [residentId, asPrimary]);

  useEffect(() => {
    void load();
  }, [load]);

  if (busy && !feed) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f3d3e" />
        <Text style={styles.meta}>Loading facility feed…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>LTC · read-only</Text>
      <Text style={styles.heading}>Family feed</Text>
      <Text style={styles.lede}>
        Timeline from facility EHR charting (zero staff workload). Secondary
        contacts see schedule only; primary POA sees clinical when delivery is
        enabled.
      </Text>

      <View style={styles.rowBtns}>
        <Pressable
          style={[styles.chip, asPrimary && styles.chipOn]}
          onPress={() => setAsPrimary(true)}
        >
          <Text style={styles.chipText}>Primary POA</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, !asPrimary && styles.chipOn]}
          onPress={() => setAsPrimary(false)}
        >
          <Text style={styles.chipText}>Secondary</Text>
        </Pressable>
        <Pressable
          style={styles.chip}
          onPress={() => {
            enableSandboxWalletPro();
            setPlan(getDeviceWalletPlan());
          }}
        >
          <Text style={styles.chipText}>Enable WALLET_PRO demo</Text>
        </Pressable>
      </View>

      <Text style={styles.meta}>
        Plan: {plan} · Access: {feed?.accessLevel ?? '—'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.section}>Timeline</Text>
      {(feed?.timeline ?? []).map((e) => (
        <View key={e.id} style={styles.card}>
          <Text style={styles.cardTitle}>{e.summary_non_phi}</Text>
          <Text style={styles.meta}>
            {e.event_type} · {e.occurred_at}
          </Text>
        </View>
      ))}

      {feed?.accessLevel === 'CLINICAL' && plan === 'WALLET_PRO' ? (
        <>
          <Text style={styles.section}>Medications (POA + paid)</Text>
          {feed.medications.map((m) => (
            <View key={m.id} style={styles.card}>
              <Text style={styles.cardTitle}>{m.medication_name}</Text>
              <Text style={styles.meta}>
                {m.dosage ?? '—'} · {m.schedule ?? '—'}
              </Text>
            </View>
          ))}
          <Text style={styles.section}>Vitals</Text>
          {feed.vitals.map((v) => (
            <View key={v.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {v.type}: {v.value} {v.unit ?? ''}
              </Text>
            </View>
          ))}
        </>
      ) : null}

      {plan === 'FREE_FEED' ? (
        <Link href="/family-feed/upgrade" asChild>
          <Pressable style={styles.upgrade}>
            <Text style={styles.upgradeText}>
              Unlock documents, FOI & SBAR — $20/mo
            </Text>
          </Pressable>
        </Link>
      ) : (
        <Link href={`/patient/${feed?.residentId ?? 'demo'}`} asChild>
          <Pressable style={styles.upgrade}>
            <Text style={styles.upgradeText}>Open full health wallet</Text>
          </Pressable>
        </Link>
      )}

      <Link href="/family-feed/upgrade" asChild>
        <Pressable style={styles.link}>
          <Text style={styles.linkText}>Subscription & platforms</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  heading: { fontSize: 26, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 22 },
  section: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#eef4f4',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f3d3e' },
  meta: { fontSize: 13, color: '#5a7374' },
  error: { color: '#8b2e2e', fontSize: 14 },
  rowBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#d9e6e6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipOn: { backgroundColor: '#0f3d3e' },
  chipText: { color: '#0f3d3e', fontWeight: '600', fontSize: 12 },
  upgrade: {
    marginTop: 8,
    backgroundColor: '#0f3d3e',
    borderRadius: 12,
    padding: 14,
  },
  upgradeText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  link: { padding: 8 },
  linkText: { color: '#0f3d3e', fontWeight: '600' },
});
