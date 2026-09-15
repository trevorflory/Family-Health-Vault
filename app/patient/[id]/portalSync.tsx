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
  getAbExportPlaybook,
  getAbSmartAuthStatus,
  importAbFhirJsonExport,
  syncAbSampleToVault,
} from '../../../services/interop/abConnector';
import {
  getBcExportPlaybook,
  getBcSmartAuthStatus,
  importBcFhirJsonExport,
  syncBcSampleToVault,
} from '../../../services/interop/bcConnector';
import {
  getOnExportPlaybook,
  getOnSmartAuthStatus,
  importOnFhirJsonExport,
  syncOnSampleToVault,
} from '../../../services/interop/onConnector';
import {
  getQcExportPlaybook,
  getQcSmartAuthStatus,
  importQcFhirJsonExport,
  syncQcSampleToVault,
} from '../../../services/interop/qcConnector';
import {
  getMbExportPlaybook,
  getMbSmartAuthStatus,
  importMbFhirJsonExport,
  syncMbSampleToVault,
} from '../../../services/interop/mbConnector';
import {
  getNsExportPlaybook,
  getNsSmartAuthStatus,
  importNsFhirJsonExport,
  syncNsSampleToVault,
} from '../../../services/interop/nsConnector';
import {
  getSkExportPlaybook,
  getSkSmartAuthStatus,
  importSkFhirJsonExport,
  syncSkSampleToVault,
} from '../../../services/interop/skConnector';
import {
  REMAINING_CANADA_CONNECTORS,
} from '../../../services/interop/canadaRemainingConnectors';
import type { InteropPullResult } from '../../../types/interop';
import type { CanadianJurisdiction } from '../../../types/foiPayload';
import type { FileImportProvinceKit } from '../../../services/interop/fileImportProvinceKit';

const LEGACY_FHIR_IMPORTERS: Partial<
  Record<
    CanadianJurisdiction,
    (opts: {
      patientId: string;
      jsonText: string;
    }) => Promise<InteropPullResult & { parseError?: string }>
  >
> = {
  SK: importSkFhirJsonExport,
  AB: importAbFhirJsonExport,
  BC: importBcFhirJsonExport,
  ON: importOnFhirJsonExport,
  QC: importQcFhirJsonExport,
  MB: importMbFhirJsonExport,
  NS: importNsFhirJsonExport,
};

export default function PortalSyncScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InteropPullResult | null>(null);

  const skFacilities = useMemo(() => facilitiesForJurisdiction('SK'), []);
  const abFacilities = useMemo(() => facilitiesForJurisdiction('AB'), []);
  const bcFacilities = useMemo(() => facilitiesForJurisdiction('BC'), []);
  const onFacilities = useMemo(() => facilitiesForJurisdiction('ON'), []);
  const qcFacilities = useMemo(() => facilitiesForJurisdiction('QC'), []);
  const mbFacilities = useMemo(() => facilitiesForJurisdiction('MB'), []);
  const nsFacilities = useMemo(() => facilitiesForJurisdiction('NS'), []);
  const nbFacilities = useMemo(() => facilitiesForJurisdiction('NB'), []);
  const nlFacilities = useMemo(() => facilitiesForJurisdiction('NL'), []);
  const peFacilities = useMemo(() => facilitiesForJurisdiction('PE'), []);
  const ytFacilities = useMemo(() => facilitiesForJurisdiction('YT'), []);
  const ntFacilities = useMemo(() => facilitiesForJurisdiction('NT'), []);
  const nuFacilities = useMemo(() => facilitiesForJurisdiction('NU'), []);
  const sha = getFacilityById('sk-sha');
  const ahs = getFacilityById('ab-ahs');
  const bcgw = getFacilityById('bc-health-gateway');
  const onPortals = getFacilityById('on-patient-portals');
  const qcCarnet = getFacilityById('qc-carnet-sante');
  const mbShared = getFacilityById('mb-shared');
  const nsNsha = getFacilityById('ns-nsha');
  const skPlaybook = useMemo(() => getSkExportPlaybook(), []);
  const abPlaybook = useMemo(() => getAbExportPlaybook(), []);
  const bcPlaybook = useMemo(() => getBcExportPlaybook(), []);
  const onPlaybook = useMemo(() => getOnExportPlaybook(), []);
  const qcPlaybook = useMemo(() => getQcExportPlaybook(), []);
  const mbPlaybook = useMemo(() => getMbExportPlaybook(), []);
  const nsPlaybook = useMemo(() => getNsExportPlaybook(), []);
  const skSmart = useMemo(() => getSkSmartAuthStatus(), []);
  const abSmart = useMemo(() => getAbSmartAuthStatus(), []);
  const bcSmart = useMemo(() => getBcSmartAuthStatus(), []);
  const onSmart = useMemo(() => getOnSmartAuthStatus(), []);
  const qcSmart = useMemo(() => getQcSmartAuthStatus(), []);
  const mbSmart = useMemo(() => getMbSmartAuthStatus(), []);
  const nsSmart = useMemo(() => getNsSmartAuthStatus(), []);
  const remainingKits = useMemo(() => [...REMAINING_CANADA_CONNECTORS], []);

  async function onSyncSkSample() {
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
      Alert.alert(
        'SK connector failed',
        err instanceof Error ? err.message : 'Sync failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSyncAbSample() {
    if (!patientId) return;
    setBusy(true);
    try {
      const { auth, result: pull } = await syncAbSampleToVault({ patientId });
      setResult(pull);
      Alert.alert(
        'AB sample FHIR sync',
        `${auth.message}\nImported ${pull.importedCount} event(s).`,
      );
    } catch (err) {
      Alert.alert(
        'AB connector failed',
        err instanceof Error ? err.message : 'Sync failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSyncBcSample() {
    if (!patientId) return;
    setBusy(true);
    try {
      const { auth, result: pull } = await syncBcSampleToVault({ patientId });
      setResult(pull);
      Alert.alert(
        'BC sample FHIR sync',
        `${auth.message}\nImported ${pull.importedCount} event(s).`,
      );
    } catch (err) {
      Alert.alert(
        'BC connector failed',
        err instanceof Error ? err.message : 'Sync failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSyncOnSample() {
    if (!patientId) return;
    setBusy(true);
    try {
      const { auth, result: pull } = await syncOnSampleToVault({ patientId });
      setResult(pull);
      Alert.alert(
        'ON sample FHIR sync',
        `${auth.message}\nImported ${pull.importedCount} event(s).`,
      );
    } catch (err) {
      Alert.alert(
        'ON connector failed',
        err instanceof Error ? err.message : 'Sync failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSyncQcSample() {
    if (!patientId) return;
    setBusy(true);
    try {
      const { auth, result: pull } = await syncQcSampleToVault({ patientId });
      setResult(pull);
      Alert.alert(
        'QC sample FHIR sync',
        `${auth.message}\nImported ${pull.importedCount} event(s).`,
      );
    } catch (err) {
      Alert.alert(
        'QC connector failed',
        err instanceof Error ? err.message : 'Sync failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSyncMbSample() {
    if (!patientId) return;
    setBusy(true);
    try {
      const { auth, result: pull } = await syncMbSampleToVault({ patientId });
      setResult(pull);
      Alert.alert(
        'MB sample FHIR sync',
        `${auth.message}\nImported ${pull.importedCount} event(s).`,
      );
    } catch (err) {
      Alert.alert(
        'MB connector failed',
        err instanceof Error ? err.message : 'Sync failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSyncNsSample() {
    if (!patientId) return;
    setBusy(true);
    try {
      const { auth, result: pull } = await syncNsSampleToVault({ patientId });
      setResult(pull);
      Alert.alert(
        'NS sample FHIR sync',
        `${auth.message}\nImported ${pull.importedCount} event(s).`,
      );
    } catch (err) {
      Alert.alert(
        'NS connector failed',
        err instanceof Error ? err.message : 'Sync failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSyncRemainingKit(kit: FileImportProvinceKit) {
    if (!patientId) return;
    setBusy(true);
    try {
      const { auth, result: pull } = await kit.syncSampleToVault({ patientId });
      setResult(pull);
      Alert.alert(
        `${kit.jurisdiction} sample FHIR sync`,
        `${auth.message}\nImported ${pull.importedCount} event(s).`,
      );
    } catch (err) {
      Alert.alert(
        `${kit.jurisdiction} connector failed`,
        err instanceof Error ? err.message : 'Sync failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onImportFhirJsonFile(jurisdiction: CanadianJurisdiction) {
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
      const remaining = remainingKits.find((k) => k.jurisdiction === jurisdiction);
      const pull = remaining
        ? await remaining.importFhirJsonExport({ patientId, jsonText })
        : await (
            LEGACY_FHIR_IMPORTERS[jurisdiction] ?? importSkFhirJsonExport
          )({ patientId, jsonText });
      setResult(pull);
      if (pull.parseError) {
        Alert.alert('FHIR import failed', pull.parseError);
      } else {
        Alert.alert(
          'FHIR JSON imported',
          `Imported ${pull.importedCount} event(s) from ${asset.name ?? 'export'} (${jurisdiction}).`,
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Provincial connectors</Text>
      <Text style={styles.lede}>
        FILE_IMPORT today (portal PDF/lab export + optional FHIR JSON). SMART is
        not public — FOI remains the fallback. No front-door IA redesign.
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
          SMART: {skSmart.readiness.availability} — {skSmart.message}
        </Text>
        <Pressable
          style={[styles.cta, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onSyncSkSample()}
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
          onPress={() => void onImportFhirJsonFile('SK')}
        >
          <Text style={styles.secondaryText}>Import FHIR JSON (SK)</Text>
        </Pressable>
        <Text style={styles.cardTitle}>MySask export playbook</Text>
        {skPlaybook.map((step, index) => (
          <Text key={step.id} style={styles.body}>
            {index + 1}. {step.title} — {step.detail}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {ahs?.name ?? 'Alberta Health Services'}
        </Text>
        <Text style={styles.body}>
          Mode: {ahs?.interop?.syncMode ?? 'MANUAL_ONLY'}
          {'\n'}
          Portal: {ahs?.interop?.portalLabel ?? '—'}
          {'\n'}
          SMART: {abSmart.readiness.availability} — {abSmart.message}
        </Text>
        <Pressable
          style={[styles.cta, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onSyncAbSample()}
        >
          {busy ? (
            <ActivityIndicator color="#f4f7f5" />
          ) : (
            <Text style={styles.ctaText}>Run AB sample FHIR sync</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.secondary, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onImportFhirJsonFile('AB')}
        >
          <Text style={styles.secondaryText}>Import FHIR JSON (AB)</Text>
        </Pressable>
        <Text style={styles.cardTitle}>MyHealth export playbook</Text>
        {abPlaybook.map((step, index) => (
          <Text key={step.id} style={styles.body}>
            {index + 1}. {step.title} — {step.detail}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {bcgw?.name ?? 'BC Health Gateway'}
        </Text>
        <Text style={styles.body}>
          Mode: {bcgw?.interop?.syncMode ?? 'MANUAL_ONLY'}
          {'\n'}
          Portal: {bcgw?.interop?.portalLabel ?? '—'}
          {'\n'}
          SMART: {bcSmart.readiness.availability} — {bcSmart.message}
        </Text>
        <Pressable
          style={[styles.cta, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onSyncBcSample()}
        >
          {busy ? (
            <ActivityIndicator color="#f4f7f5" />
          ) : (
            <Text style={styles.ctaText}>Run BC sample FHIR sync</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.secondary, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onImportFhirJsonFile('BC')}
        >
          <Text style={styles.secondaryText}>Import FHIR JSON (BC)</Text>
        </Pressable>
        <Text style={styles.cardTitle}>Health Gateway export playbook</Text>
        {bcPlaybook.map((step, index) => (
          <Text key={step.id} style={styles.body}>
            {index + 1}. {step.title} — {step.detail}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {onPortals?.name ?? 'Ontario MyChart / OLIS'}
        </Text>
        <Text style={styles.body}>
          Mode: {onPortals?.interop?.syncMode ?? 'MANUAL_ONLY'}
          {'\n'}
          Portal: {onPortals?.interop?.portalLabel ?? '—'}
          {'\n'}
          SMART: {onSmart.readiness.availability} — {onSmart.message}
        </Text>
        <Pressable
          style={[styles.cta, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onSyncOnSample()}
        >
          {busy ? (
            <ActivityIndicator color="#f4f7f5" />
          ) : (
            <Text style={styles.ctaText}>Run ON sample FHIR sync</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.secondary, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onImportFhirJsonFile('ON')}
        >
          <Text style={styles.secondaryText}>Import FHIR JSON (ON)</Text>
        </Pressable>
        <Text style={styles.cardTitle}>MyChart / OLIS export playbook</Text>
        {onPlaybook.map((step, index) => (
          <Text key={step.id} style={styles.body}>
            {index + 1}. {step.title} — {step.detail}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {qcCarnet?.name ?? 'Carnet santé Québec'}
        </Text>
        <Text style={styles.body}>
          Mode: {qcCarnet?.interop?.syncMode ?? 'MANUAL_ONLY'}
          {'\n'}
          Portal: {qcCarnet?.interop?.portalLabel ?? '—'}
          {'\n'}
          SMART: {qcSmart.readiness.availability} — {qcSmart.message}
        </Text>
        <Pressable
          style={[styles.cta, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onSyncQcSample()}
        >
          {busy ? (
            <ActivityIndicator color="#f4f7f5" />
          ) : (
            <Text style={styles.ctaText}>Run QC sample FHIR sync</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.secondary, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onImportFhirJsonFile('QC')}
        >
          <Text style={styles.secondaryText}>Import FHIR JSON (QC)</Text>
        </Pressable>
        <Text style={styles.cardTitle}>Carnet santé export playbook</Text>
        {qcPlaybook.map((step, index) => (
          <Text key={step.id} style={styles.body}>
            {index + 1}. {step.title} — {step.detail}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {mbShared?.name ?? 'Shared Health Manitoba'}
        </Text>
        <Text style={styles.body}>
          Mode: {mbShared?.interop?.syncMode ?? 'MANUAL_ONLY'}
          {'\n'}
          Portal: {mbShared?.interop?.portalLabel ?? '—'}
          {'\n'}
          SMART: {mbSmart.readiness.availability} — {mbSmart.message}
        </Text>
        <Pressable
          style={[styles.cta, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onSyncMbSample()}
        >
          {busy ? (
            <ActivityIndicator color="#f4f7f5" />
          ) : (
            <Text style={styles.ctaText}>Run MB sample FHIR sync</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.secondary, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onImportFhirJsonFile('MB')}
        >
          <Text style={styles.secondaryText}>Import FHIR JSON (MB)</Text>
        </Pressable>
        <Text style={styles.cardTitle}>eChart / Shared Health export playbook</Text>
        {mbPlaybook.map((step, index) => (
          <Text key={step.id} style={styles.body}>
            {index + 1}. {step.title} — {step.detail}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {nsNsha?.name ?? 'Nova Scotia Health'}
        </Text>
        <Text style={styles.body}>
          Mode: {nsNsha?.interop?.syncMode ?? 'MANUAL_ONLY'}
          {'\n'}
          Portal: {nsNsha?.interop?.portalLabel ?? '—'}
          {'\n'}
          SMART: {nsSmart.readiness.availability} — {nsSmart.message}
        </Text>
        <Pressable
          style={[styles.cta, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onSyncNsSample()}
        >
          {busy ? (
            <ActivityIndicator color="#f4f7f5" />
          ) : (
            <Text style={styles.ctaText}>Run NS sample FHIR sync</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.secondary, busy && styles.ctaDisabled]}
          disabled={busy}
          onPress={() => void onImportFhirJsonFile('NS')}
        >
          <Text style={styles.secondaryText}>Import FHIR JSON (NS)</Text>
        </Pressable>
        <Text style={styles.cardTitle}>YourHealthNS export playbook</Text>
        {nsPlaybook.map((step, index) => (
          <Text key={step.id} style={styles.body}>
            {index + 1}. {step.title} — {step.detail}
          </Text>
        ))}
      </View>

      {remainingKits.map((kit) => {
        const facility = getFacilityById(kit.authorityId);
        const smart = kit.getSmartAuthStatus();
        const playbook = kit.getExportPlaybook();
        return (
          <View key={kit.authorityId} style={styles.card}>
            <Text style={styles.cardTitle}>
              {facility?.name ?? kit.portal.label} ({kit.jurisdiction})
            </Text>
            <Text style={styles.body}>
              Mode: {facility?.interop?.syncMode ?? 'FILE_IMPORT'}
              {'\n'}
              Portal: {kit.portal.label}
              {'\n'}
              SMART: {smart.readiness.availability} — {smart.message}
            </Text>
            <Pressable
              style={[styles.cta, busy && styles.ctaDisabled]}
              disabled={busy}
              onPress={() => void onSyncRemainingKit(kit)}
            >
              {busy ? (
                <ActivityIndicator color="#f4f7f5" />
              ) : (
                <Text style={styles.ctaText}>
                  Run {kit.jurisdiction} sample FHIR sync
                </Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.secondary, busy && styles.ctaDisabled]}
              disabled={busy}
              onPress={() => void onImportFhirJsonFile(kit.jurisdiction)}
            >
              <Text style={styles.secondaryText}>
                Import FHIR JSON ({kit.jurisdiction})
              </Text>
            </Pressable>
            <Text style={styles.cardTitle}>{kit.portal.label} playbook</Text>
            {playbook.map((step, index) => (
              <Text key={step.id} style={styles.body}>
                {index + 1}. {step.title} — {step.detail}
              </Text>
            ))}
          </View>
        );
      })}

      {result ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last pull</Text>
          <Text style={styles.body}>
            {result.authorityId} · Imported {result.importedCount} · skipped{' '}
            {result.skippedCount}
            {'\n'}
            Synced at {result.syncedAt}
            {result.notes.length
              ? `\nNotes: ${result.notes.slice(0, 3).join('; ')}`
              : ''}
          </Text>
        </View>
      ) : null}

      <Text style={styles.section}>All Canadian custodians</Text>
      {[
        ...skFacilities,
        ...abFacilities,
        ...bcFacilities,
        ...onFacilities,
        ...qcFacilities,
        ...mbFacilities,
        ...nsFacilities,
        ...nbFacilities,
        ...nlFacilities,
        ...peFacilities,
        ...ytFacilities,
        ...ntFacilities,
        ...nuFacilities,
      ].map((f) => (
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
          <Text style={styles.secondaryText}>Upload portal lab PDF / OCR</Text>
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
