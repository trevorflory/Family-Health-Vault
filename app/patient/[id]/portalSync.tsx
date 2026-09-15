import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
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
import {
  getSkExportPlaybook,
  getSkSmartAuthStatus,
  importSkFhirJsonExport,
  syncSkSampleToVault,
} from '../../../services/interop/skConnector';
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
  const playbook = useMemo(() => getSkExportPlaybook(), []);
  const smart = useMemo(() => getSkSmartAuthStatus(), []);

  async function onSyncSample() {
    if (!patientId) return;
    setBusy(true);
    try {
      const { auth, result: pull } = await syncSkSampleToVault({ patientId });
      setResult(pull);
      Alert.alert(
        'SK sample FHIR sync',
        `${auth.message}\nImported ${pull.importedCount} event(s).`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      Alert.alert('SK connector failed', message);
    } finally {
      setBusy(false);
    }
  }

  async function onImportFhirJsonFile() {
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
      const pull = await importSkFhirJsonExport({
        patientId,
        jsonText,
      });
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
      const message = err instanceof Error ? err.message : 'Import failed';
      Alert.alert('FHIR file import failed', message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Saskatchewan connector</Text>
      <Text style={styles.lede}>
        MySaskHealthRecord is FILE_IMPORT today (PDF/lab export). Optional FHIR
        JSON for partner/sandbox bundles. SMART is not public — FOI remains the
        fallback.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {sha?.name ?? 'Saskatchewan Health Authority'}
        </Text>
        <Text style={styles.body}>
          Mode: {sha?.interop?.syncMode ?? 'MANUAL_ONLY'}
          {'\n'}
          Portal: {sha?.interop?.portalLabel ?? '—'}
          {'\n'}
          SMART: {smart.readiness.availability} — {smart.message}
        </Text>
        <Pressable
          style={[styles.cta, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onSyncSample()}
        >
          {busy ? (
            <ActivityIndicator color="#f4f7f5" />
          ) : (
            <Text style={styles.ctaText}>Run SK sample FHIR sync</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.secondary, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onImportFhirJsonFile()}
        >
          <Text style={styles.secondaryText}>Import FHIR JSON file</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>MySask export playbook</Text>
        {playbook.map((step, index) => (
          <Text key={step.id} style={styles.body}>
            {index + 1}. {step.title} — {step.detail}
          </Text>
        ))}
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
      <Link href={`/patient/${patientId}/uploadDoc`} asChild>
        <Pressable style={styles.secondary}>
          <Text style={styles.secondaryText}>Upload MySask lab PDF / OCR</Text>
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
