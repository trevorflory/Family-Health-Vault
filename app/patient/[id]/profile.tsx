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
import { getPatientVaultProfile } from '../../../data/patientVault';
import {
  getProfileOverride,
  setProfileOverride,
} from '../../../db/profileOverrides';

/**
 * Local profile basics editor — not an EHR source of truth.
 */
export default function ProfileEditScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const base = patientId ? getPatientVaultProfile(patientId) : undefined;
  const [preferredName, setPreferredName] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId) return;
    const ov = await getProfileOverride(patientId);
    setPreferredName(ov?.preferredName ?? base?.preferredName ?? '');
    setConditionsText(
      ov?.conditionsText ?? (base?.chronicConditions ?? []).join(', '),
    );
    setAllergiesText(ov?.allergiesText ?? '');
  }, [patientId, base?.preferredName, base?.chronicConditions]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onSave() {
    if (!patientId) return;
    const row = await setProfileOverride({
      patientId,
      preferredName,
      conditionsText,
      allergiesText,
    });
    setSavedAt(row.updatedAt);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Profile (local)</Text>
      <Text style={styles.lede}>
        Overrides for {base?.fullName ?? patientId}. Local full-test only —
        facility EHR remains source of truth when connected.
      </Text>
      <Text style={styles.label}>Preferred name</Text>
      <TextInput
        style={styles.input}
        value={preferredName}
        onChangeText={setPreferredName}
      />
      <Text style={styles.label}>Conditions (comma-separated)</Text>
      <TextInput
        style={[styles.input, styles.multi]}
        value={conditionsText}
        onChangeText={setConditionsText}
        multiline
      />
      <Text style={styles.label}>Allergies note</Text>
      <TextInput
        style={[styles.input, styles.multi]}
        value={allergiesText}
        onChangeText={setAllergiesText}
        multiline
      />
      <Pressable style={styles.primary} onPress={() => void onSave()}>
        <Text style={styles.primaryText}>Save local overrides</Text>
      </Pressable>
      {savedAt ? (
        <Text style={styles.meta}>Saved {savedAt}</Text>
      ) : null}
      <Link href={`/patient/${patientId}`} asChild>
        <Pressable style={styles.linkRow}>
          <Text style={styles.link}>← Care hub</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '700', color: '#5a7374' },
  input: {
    borderWidth: 1,
    borderColor: '#d5e2e2',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  multi: { minHeight: 72, textAlignVertical: 'top' },
  primary: {
    marginTop: 8,
    backgroundColor: '#0f3d3e',
    borderRadius: 12,
    padding: 14,
  },
  primaryText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  meta: { fontSize: 12, color: '#5a7374' },
  linkRow: { paddingVertical: 8 },
  link: { color: '#1d5c5e', fontWeight: '600' },
});
