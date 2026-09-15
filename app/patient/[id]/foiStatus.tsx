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
import { listFOIRequestsForPatient } from '../../../db/foiRequests';
import { getLegalMeta } from '../../../services/foiTemplate';
import type { FOIRequestRecord } from '../../../types/foiPayload';

function ageDays(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(
    0,
    Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000)),
  );
}

export default function FoiStatusScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const [rows, setRows] = useState<FOIRequestRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId) return;
    try {
      setBusy(true);
      setError(null);
      const list = await listFOIRequestsForPatient(patientId);
      setRows(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load FOI requests');
    } finally {
      setBusy(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (busy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f3d3e" />
        <Text style={styles.meta}>Loading FOI requests…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Vault-backed FOI status</Text>
      <Text style={styles.heading}>FOI / Access requests</Text>
      <Text style={styles.lede}>
        Drafts older than 30 days surface on the daily digest. Dispatch keeps the
        append-only record as DISPATCHED.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {rows.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.meta}>
            No FOI requests saved for this patient yet. Digest may still show
            fixture reminders until you create a real draft.
          </Text>
        </View>
      ) : (
        rows.map((r) => {
          const legal = getLegalMeta(r.jurisdiction);
          const days = ageDays(r.createdAt);
          const overdueDraft = r.status === 'DRAFT' && days > 30;
          return (
            <View key={r.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {r.jurisdiction} · {legal.actShortName}
              </Text>
              <Text style={styles.line}>Facility: {r.facilityId}</Text>
              <Text style={styles.line}>
                Status:{' '}
                <Text
                  style={
                    overdueDraft ? styles.statusOverdue : styles.statusOk
                  }
                >
                  {r.status}
                  {overdueDraft ? ` · overdue ${days}d` : ` · ${days}d old`}
                </Text>
              </Text>
              <Text style={styles.meta}>Updated {r.updatedAt}</Text>
              {r.pdfUri ? (
                <Text style={styles.meta} numberOfLines={1}>
                  PDF: {r.pdfUri}
                </Text>
              ) : null}
            </View>
          );
        })
      )}

      <Link href={`/patient/${patientId}/foiWizard`} asChild>
        <Pressable style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Start / continue FOI wizard</Text>
        </Pressable>
      </Link>

      <Pressable style={styles.secondaryBtn} onPress={load}>
        <Text style={styles.secondaryBtnText}>Refresh</Text>
      </Pressable>
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
    letterSpacing: 0.5,
  },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  meta: { fontSize: 13, color: '#5a7374' },
  error: { color: '#8a2b1e', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 4,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#143536' },
  line: { fontSize: 14, color: '#143536', lineHeight: 20 },
  statusOverdue: { color: '#8a2b1e', fontWeight: '700' },
  statusOk: { color: '#0f3d3e', fontWeight: '700' },
  primaryBtn: {
    backgroundColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#0f3d3e', fontWeight: '600' },
});
