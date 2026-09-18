import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getPatientVaultProfile } from '../../../data/patientVault';
import {
  getVaultMedOverrides,
  setVaultMedOverrides,
} from '../../../db/vaultMedOverrides';
import type { MedicationRecord } from '../../../types/triage811';

type EditableMed = MedicationRecord & { key: string };

function toEditable(meds: MedicationRecord[]): EditableMed[] {
  return meds.map((m, i) => ({
    key: `${m.name}-${i}`,
    name: m.name,
    dose: m.dose ?? '',
    frequency: m.frequency ?? '',
  }));
}

/**
 * Editable prescriptions for a person (session/native override over vault sample).
 */
export default function PrescriptionsScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const profile = patientId ? getPatientVaultProfile(patientId) : undefined;
  const [rows, setRows] = useState<EditableMed[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) return;
    const override = await getVaultMedOverrides(patientId);
    const base =
      override ??
      (profile?.activeMedications ?? []).filter(
        (m): m is MedicationRecord => Boolean(m?.name),
      );
    setRows(toEditable(base));
  }, [patientId, profile]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateRow(key: string, patch: Partial<MedicationRecord>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, name: '', dose: '', frequency: '' },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function onSave() {
    if (!patientId) return;
    try {
      setSaving(true);
      await setVaultMedOverrides(
        patientId,
        rows.map(({ name, dose, frequency }) => ({ name, dose, frequency })),
      );
      Alert.alert('Saved', 'Prescriptions updated in this vault session.');
      await load();
    } catch (err) {
      Alert.alert(
        'Could not save',
        err instanceof Error ? err.message : 'Save failed',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Prescriptions</Text>
      <Text style={styles.lede}>
        Add, remove, or adjust medications on file for{' '}
        {profile?.preferredName ?? profile?.fullName ?? 'this person'}. Changes
        stay local to this device session — educational record only.
      </Text>

      {rows.map((row) => (
        <View key={row.key} style={styles.card}>
          <TextInput
            style={styles.input}
            value={row.name}
            onChangeText={(name) => updateRow(row.key, { name })}
            placeholder="Medication name"
            placeholderTextColor="#8aa0a1"
          />
          <TextInput
            style={styles.input}
            value={String(row.dose ?? '')}
            onChangeText={(dose) => updateRow(row.key, { dose })}
            placeholder="Dose (optional)"
            placeholderTextColor="#8aa0a1"
          />
          <TextInput
            style={styles.input}
            value={String(row.frequency ?? '')}
            onChangeText={(frequency) => updateRow(row.key, { frequency })}
            placeholder="Frequency (optional)"
            placeholderTextColor="#8aa0a1"
          />
          <Pressable onPress={() => removeRow(row.key)}>
            <Text style={styles.remove}>Remove</Text>
          </Pressable>
        </View>
      ))}

      <Pressable style={styles.secondaryBtn} onPress={addRow}>
        <Text style={styles.secondaryBtnText}>+ Add medication</Text>
      </Pressable>

      <Pressable
        style={[styles.primary, saving && styles.disabled]}
        disabled={saving}
        onPress={() => void onSave()}
      >
        <Text style={styles.primaryText}>
          {saving ? 'Saving…' : 'Save prescriptions'}
        </Text>
      </Pressable>

      <Link href={`/patient/${patientId}`} asChild>
        <Pressable style={styles.homeLink}>
          <Text style={styles.homeLinkText}>← Care hub</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, paddingBottom: 48 },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c5d4d4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#0f3d3e',
    backgroundColor: '#fff',
  },
  remove: { color: '#8a2b1e', fontWeight: '600', fontSize: 13 },
  primary: {
    backgroundColor: '#0f3d3e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#f4f7f5', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#0f3d3e', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  homeLink: { paddingVertical: 8 },
  homeLinkText: { color: '#1d5c5e', fontWeight: '600' },
});
