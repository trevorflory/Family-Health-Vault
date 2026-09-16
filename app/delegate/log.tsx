import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DEMO_CAREGIVER_ID } from '../../data/caregiverHousehold';
import { submitShiftHandover } from '../../services/shiftHandover';

/**
 * High-contrast 30-second Shift Handover Log for aides.
 * Least-privilege: no vault navigation.
 */
export default function DelegateShiftHandoverLogScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [medsVerified, setMedsVerified] = useState(true);
  const [medsNote, setMedsNote] = useState('');
  const [intakeSummary, setIntakeSummary] = useState('');
  const [moodBehaviorSummary, setMoodBehaviorSummary] = useState('');
  const [tellTheFamily, setTellTheFamily] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [mealPercent, setMealPercent] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!token) {
      Alert.alert('Missing token', 'Open this screen from a valid aide link.');
      return;
    }
    if (!intakeSummary.trim() || !moodBehaviorSummary.trim()) {
      Alert.alert(
        'Almost there',
        'Intake and mood / behavior are required for a shift handover.',
      );
      return;
    }
    try {
      setBusy(true);
      const result = await submitShiftHandover({
        tokenId: token,
        medsVerified,
        medsNote: medsNote.trim() || undefined,
        intakeSummary: intakeSummary.trim(),
        moodBehaviorSummary: moodBehaviorSummary.trim(),
        tellTheFamily: tellTheFamily.trim() || undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        systolicMmHg: systolic ? Number(systolic) : undefined,
        diastolicMmHg: diastolic ? Number(diastolic) : undefined,
        mealPercent: mealPercent ? Number(mealPercent) : undefined,
      }, { caregiverId: DEMO_CAREGIVER_ID });
      Alert.alert(
        'Handover saved',
        `${result.observations.length} observations recorded for the family morning digest.`,
        [{ text: 'Done', onPress: () => router.replace(`/delegate/${token}`) }],
      );
    } catch (err) {
      Alert.alert(
        'Could not save',
        err instanceof Error ? err.message : 'Handover failed',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>30-second shift handover</Text>
      <Text style={styles.heading}>Log this shift</Text>
      <Text style={styles.lede}>
        Meds, intake, and mood only. This does not open the family vault chart.
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>Medications verified</Text>
        <Switch
          value={medsVerified}
          onValueChange={setMedsVerified}
          trackColor={{ true: '#0f3d3e', false: '#c5d0cc' }}
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Meds note (optional)"
        placeholderTextColor="#7a8a85"
        value={medsNote}
        onChangeText={setMedsNote}
      />

      <Text style={styles.label}>Fluid / meal intake *</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="e.g. Ate 75% lunch; 400 mL fluids"
        placeholderTextColor="#7a8a85"
        value={intakeSummary}
        onChangeText={setIntakeSummary}
        multiline
      />

      <Text style={styles.label}>Mood / behavior *</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="e.g. Mild evening confusion, otherwise calm"
        placeholderTextColor="#7a8a85"
        value={moodBehaviorSummary}
        onChangeText={setMoodBehaviorSummary}
        multiline
      />

      <Text style={styles.label}>Tell the family (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Anything the adult child should know"
        placeholderTextColor="#7a8a85"
        value={tellTheFamily}
        onChangeText={setTellTheFamily}
        multiline
      />

      <Text style={styles.label}>Optional vitals</Text>
      <TextInput
        style={styles.input}
        placeholder="Weight kg"
        placeholderTextColor="#7a8a85"
        keyboardType="decimal-pad"
        value={weightKg}
        onChangeText={setWeightKg}
      />
      <View style={styles.bpRow}>
        <TextInput
          style={[styles.input, styles.bpInput]}
          placeholder="Systolic"
          placeholderTextColor="#7a8a85"
          keyboardType="number-pad"
          value={systolic}
          onChangeText={setSystolic}
        />
        <TextInput
          style={[styles.input, styles.bpInput]}
          placeholder="Diastolic"
          placeholderTextColor="#7a8a85"
          keyboardType="number-pad"
          value={diastolic}
          onChangeText={setDiastolic}
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Meal % (0–100)"
        placeholderTextColor="#7a8a85"
        keyboardType="number-pad"
        value={mealPercent}
        onChangeText={setMealPercent}
      />

      <Pressable
        style={[styles.cta, busy && styles.ctaDisabled]}
        onPress={onSubmit}
        disabled={busy}
      >
        <Text style={styles.ctaText}>
          {busy ? 'Saving…' : 'Submit shift handover'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 48,
    gap: 10,
    backgroundColor: '#f4f7f5',
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#5a6b66',
  },
  heading: { fontSize: 28, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 16, lineHeight: 24, color: '#1b2b28', marginBottom: 8 },
  label: { fontSize: 15, fontWeight: '600', color: '#0f3d3e', marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#0f3d3e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    color: '#0a1f1e',
    backgroundColor: '#ffffff',
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  bpRow: { flexDirection: 'row', gap: 10 },
  bpInput: { flex: 1 },
  cta: {
    marginTop: 16,
    backgroundColor: '#0f3d3e',
    paddingVertical: 18,
    borderRadius: 10,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: '#f4f7f5',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
