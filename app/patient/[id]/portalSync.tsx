import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { facilitiesForJurisdiction } from '../../../data/healthAuthorities';
import {
  getPortalConnector,
  PORTAL_CONNECTOR_REGISTRY,
  type PortalConnectorEntry,
} from '../../../services/interop/portalRegistry';
import type { InteropPullResult } from '../../../types/interop';

/**
 * Digital front door for provincial portals:
 * 1) Pick a province/territory (mobile list)
 * 2) Run playbook actions for that connector only
 */
export default function PortalSyncScreen() {
  const router = useRouter();
  const { id: patientId, jurisdiction } = useLocalSearchParams<{
    id: string;
    jurisdiction?: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<InteropPullResult | null>(null);

  const selected = useMemo(
    () => getPortalConnector(jurisdiction),
    [jurisdiction],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PORTAL_CONNECTOR_REGISTRY;
    return PORTAL_CONNECTOR_REGISTRY.filter(
      (e) =>
        e.regionName.toLowerCase().includes(q) ||
        e.portalLabel.toLowerCase().includes(q) ||
        e.jurisdiction.toLowerCase().includes(q),
    );
  }, [query]);

  function openProvince(code: string) {
    if (!patientId) return;
    setResult(null);
    router.push(`/patient/${patientId}/portalSync?jurisdiction=${code}`);
  }

  function clearProvince() {
    if (!patientId) return;
    setResult(null);
    router.replace(`/patient/${patientId}/portalSync`);
  }

  async function onSyncSample(entry: PortalConnectorEntry) {
    if (!patientId) return;
    setBusy(true);
    try {
      const { auth, result: pull } = await entry.syncSample({ patientId });
      setResult(pull);
      Alert.alert(
        `${entry.jurisdiction} sample sync`,
        `${auth.message}\n\nImported ${pull.importedCount} event(s).`,
      );
    } catch (err) {
      Alert.alert(
        `${entry.jurisdiction} sync failed`,
        err instanceof Error ? err.message : 'Sync failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onImportFhirJson(entry: PortalConnectorEntry) {
    if (!patientId) return;
    setBusy(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];
      const jsonText = await readAsStringAsync(asset.uri);
      const pull = await entry.importFhirJson({ patientId, jsonText });
      setResult(pull);
      if (pull.parseError) {
        Alert.alert('FHIR import failed', pull.parseError);
      } else {
        Alert.alert(
          'FHIR JSON imported',
          `Imported ${pull.importedCount} event(s) from ${asset.name ?? 'export'}.`,
        );
      }
    } catch (err) {
      Alert.alert(
        'FHIR file import failed',
        err instanceof Error ? err.message : 'Import failed',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!selected) {
    return (
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>Canadian digital front door</Text>
        <Text style={styles.heading}>Where are the records from?</Text>
        <Text style={styles.lede}>
          Pick a province or territory. You will get a short export playbook,
          optional sample sync, and FOI fallback — SMART is not public.
        </Text>

        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search province or portal…"
          placeholderTextColor="#6b7c7d"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        {filtered.map((entry) => (
          <Pressable
            key={entry.jurisdiction}
            style={styles.pickRow}
            onPress={() => openProvince(entry.jurisdiction)}
          >
            <View style={styles.pickMain}>
              <Text style={styles.pickTitle}>{entry.regionName}</Text>
              <Text style={styles.pickMeta}>
                {entry.portalLabel} · {entry.syncMode.replace('_', ' ')}
              </Text>
              <Text style={styles.pickBlurb}>{entry.blurb}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}

        {!filtered.length ? (
          <Text style={styles.empty}>No matches. Try “BC” or “MyChart”.</Text>
        ) : null}

        <Link href={`/patient/${patientId}/uploadDoc`} asChild>
          <Pressable style={styles.secondary}>
            <Text style={styles.secondaryText}>
              Or upload a portal PDF / screenshot
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    );
  }

  const playbook = selected.getPlaybook();
  const custodians = facilitiesForJurisdiction(selected.jurisdiction);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={clearProvince} hitSlop={8}>
        <Text style={styles.back}>‹ All provinces</Text>
      </Pressable>

      <Text style={styles.kicker}>{selected.jurisdiction}</Text>
      <Text style={styles.heading}>{selected.regionName}</Text>
      <Text style={styles.lede}>
        {selected.portalLabel}. {selected.blurb}
      </Text>

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>SMART status</Text>
        <Text style={styles.bannerBody}>{selected.getSmartMessage()}</Text>
      </View>

      <Pressable
        style={[styles.cta, busy && styles.disabled]}
        disabled={busy}
        onPress={() => void onSyncSample(selected)}
      >
        {busy ? (
          <ActivityIndicator color="#f4f7f5" />
        ) : (
          <Text style={styles.ctaText}>Run sample FHIR sync</Text>
        )}
      </Pressable>

      <Pressable
        style={[styles.secondary, busy && styles.disabled]}
        disabled={busy}
        onPress={() => void onImportFhirJson(selected)}
      >
        <Text style={styles.secondaryText}>Import FHIR JSON file</Text>
      </Pressable>

      <Text style={styles.section}>Export playbook</Text>
      {playbook.map((step, index) => (
        <View key={step.id} style={styles.step}>
          <Text style={styles.stepNum}>{index + 1}</Text>
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDetail}>{step.detail}</Text>
          </View>
        </View>
      ))}

      {result ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last pull</Text>
          <Text style={styles.body}>
            {result.authorityId} · Imported {result.importedCount} · skipped{' '}
            {result.skippedCount}
            {'\n'}
            Synced at {result.syncedAt}
          </Text>
        </View>
      ) : null}

      <Text style={styles.section}>FOI custodians ({selected.jurisdiction})</Text>
      {custodians.map((f) => (
        <View key={f.id} style={styles.custodian}>
          <Text style={styles.custodianTitle}>{f.name}</Text>
          <Text style={styles.body}>
            {(f.interop?.syncMode ?? 'MANUAL_ONLY') +
              (f.interop?.portalLabel ? ` · ${f.interop.portalLabel}` : '')}
          </Text>
        </View>
      ))}

      <Link href={`/patient/${patientId}/foiWizard`} asChild>
        <Pressable style={styles.secondary}>
          <Text style={styles.secondaryText}>FOI / access request wizard</Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${patientId}/uploadDoc`} asChild>
        <Pressable style={styles.secondary}>
          <Text style={styles.secondaryText}>Upload portal lab PDF / OCR</Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${patientId}/insights`} asChild>
        <Pressable style={styles.secondary}>
          <Text style={styles.secondaryText}>Visit Prep Insights</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, paddingBottom: 48 },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  heading: { fontSize: 26, fontWeight: '700', color: '#0f3d3e', letterSpacing: -0.4 },
  lede: { fontSize: 15, color: '#355556', lineHeight: 22 },
  search: {
    borderWidth: 1,
    borderColor: '#c5d4d4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f3d3e',
    backgroundColor: '#ffffff',
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d5e2e2',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  pickMain: { flex: 1, gap: 2 },
  pickTitle: { fontSize: 17, fontWeight: '700', color: '#0f3d3e' },
  pickMeta: { fontSize: 13, color: '#5a7374' },
  pickBlurb: { fontSize: 13, color: '#355556', lineHeight: 18, marginTop: 4 },
  chevron: { fontSize: 28, color: '#0f3d3e', fontWeight: '300', paddingLeft: 4 },
  empty: { color: '#5a7374', fontSize: 14, paddingVertical: 8 },
  back: { fontSize: 16, fontWeight: '600', color: '#0f3d3e', marginBottom: 4 },
  banner: {
    backgroundColor: '#eef5f5',
    borderLeftWidth: 3,
    borderLeftColor: '#0f3d3e',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  bannerTitle: { fontSize: 12, fontWeight: '700', color: '#0f3d3e' },
  bannerBody: { fontSize: 13, color: '#355556', lineHeight: 19 },
  cta: {
    backgroundColor: '#0f3d3e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: { color: '#f4f7f5', fontWeight: '600', fontSize: 16 },
  secondary: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryText: { color: '#0f3d3e', fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.5 },
  section: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0f3d3e',
    color: '#f4f7f5',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '700',
    overflow: 'hidden',
  },
  stepBody: { flex: 1, gap: 2 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: '#0f3d3e' },
  stepDetail: { fontSize: 14, color: '#355556', lineHeight: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c5d4d4',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f3d3e' },
  body: { fontSize: 14, color: '#355556', lineHeight: 20 },
  custodian: { gap: 2, paddingVertical: 4 },
  custodianTitle: { fontSize: 14, fontWeight: '600', color: '#0f3d3e' },
});
