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
import { listMedicalEventsForPatient } from '../../../db/medicalEvents';
import {
  compileBiomarkerTrends,
  type BiomarkerSeries,
} from '../../../services/biomarkerTrends';
import { queryLocalLLM } from '../../../services/localAIClient';
import { SBAR_REGULATORY_NOTICE } from '../../../services/sbarEngine';
import type { MedicalEventRecord } from '../../../types/db';

export default function InsightsScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const [series, setSeries] = useState<BiomarkerSeries[]>([]);
  const [events, setEvents] = useState<MedicalEventRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [eduBusy, setEduBusy] = useState(false);
  const [eduText, setEduText] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId) return;
    setBusy(true);
    try {
      const rows = await listMedicalEventsForPatient(patientId);
      setEvents(rows);
      setSeries(compileBiomarkerTrends(rows));
      const lastSync = rows
        .map((r) => r.lastSyncedAt)
        .filter(Boolean)
        .sort()
        .at(-1);
      const authority = rows.find((r) => r.sourceAuthorityId)?.sourceAuthorityId;
      setSyncNote(
        lastSync
          ? `Last custodian sync${authority ? ` (${authority})` : ''}: ${lastSync}`
          : 'No automatic custodian sync yet — upload OCR or run portal sync.',
      );
    } finally {
      setBusy(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onEducationalRestatement() {
    const labBits = series
      .flatMap((s) => s.points.slice(-1))
      .map((p) => `${p.displayName} ${p.value} ${p.units}`)
      .join('; ');
    if (!labBits) return;
    setEduBusy(true);
    try {
      const reply = await queryLocalLLM(
        'Restate these lab values in plain educational language. Do not diagnose or prescribe.',
        labBits,
        { allowOfflineFallback: true },
      );
      setEduText(reply.text);
    } finally {
      setEduBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Visit Prep Insights</Text>
      <Text style={styles.lede}>
        Biomarker trends from confirmed vault labs and portal/FHIR imports.
        Educational context only — bring Export Visit SBAR to the clinician.
      </Text>
      <Text style={styles.notice}>{SBAR_REGULATORY_NOTICE}</Text>
      {syncNote ? <Text style={styles.sync}>{syncNote}</Text> : null}

      {busy ? (
        <ActivityIndicator color="#0f3d3e" />
      ) : series.length === 0 ? (
        <Text style={styles.empty}>
          No trendable labs yet. Upload a lab/portal screenshot or sync from a
          health authority.
        </Text>
      ) : (
        series.map((s) => (
          <View key={s.code} style={styles.card}>
            <Text style={styles.cardTitle}>
              {s.displayName}
              {s.loinc ? ` · LOINC ${s.loinc}` : ''}
            </Text>
            {s.points.map((p) => (
              <Text key={`${p.eventId}-${p.observedAt}`} style={styles.point}>
                {p.value} {p.units} · {p.observedAt.slice(0, 10)} · {p.sourceType}
              </Text>
            ))}
          </View>
        ))
      )}

      <Pressable
        style={[styles.cta, (!series.length || eduBusy) && styles.ctaDisabled]}
        disabled={!series.length || eduBusy}
        onPress={() => void onEducationalRestatement()}
      >
        {eduBusy ? (
          <ActivityIndicator color="#f4f7f5" />
        ) : (
          <Text style={styles.ctaText}>Plain-language lab restatement</Text>
        )}
      </Pressable>
      {eduText ? <Text style={styles.edu}>{eduText}</Text> : null}

      <Link href={`/patient/${patientId}/sbarExport`} asChild>
        <Pressable style={styles.secondary}>
          <Text style={styles.secondaryText}>Export Visit SBAR</Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${patientId}/portalSync`} asChild>
        <Pressable style={styles.secondary}>
          <Text style={styles.secondaryText}>Authority / portal sync</Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${patientId}/askVault`} asChild>
        <Pressable style={styles.secondary}>
          <Text style={styles.secondaryText}>Ask my vault</Text>
        </Pressable>
      </Link>
      <Text style={styles.meta}>{events.length} vault events loaded</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  notice: { fontSize: 12, color: '#6b7c7d', lineHeight: 17 },
  sync: { fontSize: 13, color: '#0f3d3e', fontWeight: '600' },
  empty: { fontSize: 14, color: '#355556' },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c5d4d4',
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f3d3e' },
  point: { fontSize: 14, color: '#355556' },
  cta: {
    backgroundColor: '#0f3d3e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#f4f7f5', fontWeight: '600', fontSize: 16 },
  edu: { fontSize: 14, color: '#0f3d3e', lineHeight: 20 },
  secondary: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryText: { color: '#0f3d3e', fontWeight: '600', fontSize: 16 },
  meta: { fontSize: 12, color: '#6b7c7d' },
});
