import { Link, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  facilitiesForJurisdiction,
  getFacilityById,
} from '../../../data/healthAuthorities';
import { syncShaPilotSample } from '../../../services/interop/shaPilot';
import type { InteropPullResult } from '../../../types/interop';
import type { CanadianJurisdiction } from '../../../types/foiPayload';

const PILOT_JURISDICTION: CanadianJurisdiction = 'SK';

export default function PortalSyncScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InteropPullResult | null>(null);

  const facilities = useMemo(
    () => facilitiesForJurisdiction(PILOT_JURISDICTION),
    [],
  );
  const sha = getFacilityById('sk-sha');

  async function onSyncShaPilot() {
    if (!patientId) return;
    setBusy(true);
    try {
      const { auth, result: pull } = await syncShaPilotSample({ patientId });
      setResult(pull);
      Alert.alert(
        'SHA pilot sync complete',
        `${auth.message}\nImported ${pull.importedCount} event(s). Review pending items in Upload / Insights.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      Alert.alert('Portal sync failed', message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Authority / portal sync</Text>
      <Text style={styles.lede}>
        Connect to the clinical source of truth when a connector exists. Read /
        import only — FOI remains the fallback when portals will not export.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {sha?.name ?? 'Saskatchewan Health Authority'} (pilot)
        </Text>
        <Text style={styles.body}>
          Mode: {sha?.interop?.syncMode ?? 'MANUAL_ONLY'}
          {'\n'}
          Portal: {sha?.interop?.portalLabel ?? '—'}
          {'\n'}
          {sha?.interop?.notes}
        </Text>
        <Pressable
          style={[styles.cta, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onSyncShaPilot()}
        >
          {busy ? (
            <ActivityIndicator color="#f4f7f5" />
          ) : (
            <Text style={styles.ctaText}>Run SHA sample FHIR sync</Text>
          )}
        </Pressable>
      </View>

      {result ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last pull</Text>
          <Text style={styles.body}>
            Imported {result.importedCount} · skipped {result.skippedCount}
            {'\n'}
            Synced at {result.syncedAt}
            {result.notes.length
              ? `\nNotes: ${result.notes.slice(0, 3).join('; ')}`
              : ''}
          </Text>
        </View>
      ) : null}

      <Text style={styles.section}>SK custodians</Text>
      {facilities.map((f) => (
        <View key={f.id} style={styles.row}>
          <Text style={styles.rowTitle}>{f.name}</Text>
          <Text style={styles.body}>
            {(f.interop?.syncMode ?? 'MANUAL_ONLY') +
              (f.interop?.portalLabel ? ` · ${f.interop.portalLabel}` : '')}
          </Text>
        </View>
      ))}

      <Link href={`/patient/${patientId}/foiWizard`} asChild>
        <Pressable style={styles.secondary}>
          <Text style={styles.secondaryText}>FOI fallback wizard</Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${patientId}/insights`} asChild>
        <Pressable style={styles.secondary}>
          <Text style={styles.secondaryText}>Open Insights</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  section: { fontSize: 16, fontWeight: '700', color: '#0f3d3e', marginTop: 8 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c5d4d4',
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f3d3e' },
  body: { fontSize: 14, color: '#355556', lineHeight: 20 },
  row: { gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#0f3d3e' },
  cta: {
    backgroundColor: '#0f3d3e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#f4f7f5', fontWeight: '600', fontSize: 16 },
  secondary: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryText: { color: '#0f3d3e', fontWeight: '600', fontSize: 16 },
});
