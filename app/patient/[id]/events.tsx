import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { listMedicalEventsForPatient } from '../../../db/medicalEvents';
import { updateMedicalEventReview } from '../../../services/medicalEventReview';
import type { MedicalEventRecord } from '../../../types/db';

/**
 * Local QA inbox — review / confirm / reject MedicalEvents.
 */
export default function MedicalEventsInboxScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const [rows, setRows] = useState<MedicalEventRecord[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rawEdit, setRawEdit] = useState('');

  const load = useCallback(async () => {
    if (!patientId) return;
    setRows(await listMedicalEventsForPatient(patientId));
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function setStatus(
    id: string,
    status: 'CONFIRMED' | 'REJECTED' | 'PENDING_REVIEW',
  ) {
    await updateMedicalEventReview({ id, status });
    await load();
  }

  async function saveRaw(id: string) {
    await updateMedicalEventReview({ id, rawText: rawEdit });
    setExpanded(null);
    await load();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>MedicalEvents inbox</Text>
      <Text style={styles.lede}>
        Confirm or reject vault events for local full-test. Digests and SBAR
        prefer CONFIRMED rows.
      </Text>

      {rows.length === 0 ? (
        <Text style={styles.meta}>No events yet — upload, portal sync, or vitals.</Text>
      ) : null}

      {rows.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {r.kind} · {r.status}
          </Text>
          <Text style={styles.meta}>
            {r.sourceType}
            {r.sourceAuthorityId ? ` · ${r.sourceAuthorityId}` : ''}
          </Text>
          <Text style={styles.snippet} numberOfLines={3}>
            {r.rawText}
          </Text>
          <View style={styles.row}>
            <Pressable onPress={() => void setStatus(r.id, 'CONFIRMED')}>
              <Text style={styles.ok}>Confirm</Text>
            </Pressable>
            <Pressable onPress={() => void setStatus(r.id, 'PENDING_REVIEW')}>
              <Text style={styles.link}>Pending</Text>
            </Pressable>
            <Pressable onPress={() => void setStatus(r.id, 'REJECTED')}>
              <Text style={styles.danger}>Reject</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setExpanded(expanded === r.id ? null : r.id);
                setRawEdit(r.rawText);
              }}
            >
              <Text style={styles.link}>Edit text</Text>
            </Pressable>
          </View>
          {expanded === r.id ? (
            <View style={styles.editBox}>
              <TextInput
                style={styles.input}
                value={rawEdit}
                onChangeText={setRawEdit}
                multiline
              />
              <Pressable
                style={styles.primary}
                onPress={() => void saveRaw(r.id)}
              >
                <Text style={styles.primaryText}>Save raw text</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}

      <Link href={`/patient/${patientId}/vitals`} asChild>
        <Pressable style={styles.linkRow}>
          <Text style={styles.link}>Add vitals →</Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${patientId}`} asChild>
        <Pressable style={styles.linkRow}>
          <Text style={styles.link}>← Care hub</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  meta: { fontSize: 12, color: '#5a7374' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 4,
  },
  cardTitle: { fontWeight: '700', color: '#0f3d3e' },
  snippet: { fontSize: 13, color: '#355556', lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 6 },
  ok: { color: '#1d5c5e', fontWeight: '700' },
  link: { color: '#1d5c5e', fontWeight: '600' },
  danger: { color: '#8b2e2e', fontWeight: '600' },
  editBox: { gap: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d5e2e2',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primary: {
    backgroundColor: '#0f3d3e',
    borderRadius: 10,
    padding: 12,
  },
  primaryText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  linkRow: { paddingVertical: 6 },
});
