import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  addLocalVital,
  listLocalVitals,
  type LocalVitalType,
} from '../../../db/localVitals';
import type { CareObservation } from '../../../types/careObservation';

const TYPES: LocalVitalType[] = [
  'BP_SYS',
  'BP_DIA',
  'WEIGHT',
  'GLUCOSE',
  'HR',
];

/**
 * Caregiver-entered vitals for local full-test (feeds CareObservations + MedicalEvents).
 */
export default function VitalsEditorScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const [type, setType] = useState<LocalVitalType>('BP_SYS');
  const [value, setValue] = useState('');
  const [rows, setRows] = useState<CareObservation[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) return;
    setRows(await listLocalVitals(patientId));
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onAdd() {
    const n = Number(value);
    if (!patientId || !Number.isFinite(n)) {
      Alert.alert('Enter a numeric value');
      return;
    }
    setBusy(true);
    try {
      await addLocalVital({ patientId, type, value: n });
      setValue('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Vitals (local)</Text>
      <Text style={styles.lede}>
        Enter point-of-care style readings for QA. Saved on-device and mirrored
        into MedicalEvents for Insights / SBAR — not a diagnosis.
      </Text>

      <Text style={styles.label}>Type</Text>
      <View style={styles.chips}>
        {TYPES.map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, type === t && styles.chipOn]}
            onPress={() => setType(t)}
          >
            <Text style={styles.chipText}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Value</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        placeholder="e.g. 128"
      />
      <Pressable style={styles.primary} onPress={() => void onAdd()}>
        <Text style={styles.primaryText}>{busy ? 'Saving…' : 'Add vital'}</Text>
      </Pressable>

      <Text style={styles.section}>Recent ({rows.length})</Text>
      {rows.slice(0, 20).map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {r.display}: {r.numericValue} {r.unit}
          </Text>
          <Text style={styles.meta}>{r.effectiveDateTimeISO}</Text>
        </View>
      ))}

      <Link href={`/patient/${patientId}/events`} asChild>
        <Pressable style={styles.linkRow}>
          <Text style={styles.link}>MedicalEvents inbox →</Text>
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
  label: { fontSize: 12, fontWeight: '700', color: '#5a7374' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#d9e6e6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipOn: { backgroundColor: '#0f3d3e' },
  chipText: { fontWeight: '600', fontSize: 12, color: '#0f3d3e' },
  input: {
    borderWidth: 1,
    borderColor: '#d5e2e2',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  primary: {
    backgroundColor: '#0f3d3e',
    borderRadius: 12,
    padding: 14,
  },
  primaryText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  section: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#eef4f4',
    borderRadius: 10,
    padding: 12,
    gap: 2,
  },
  cardTitle: { fontWeight: '600', color: '#0f3d3e' },
  meta: { fontSize: 12, color: '#5a7374' },
  linkRow: { paddingVertical: 8 },
  link: { color: '#1d5c5e', fontWeight: '600' },
});
