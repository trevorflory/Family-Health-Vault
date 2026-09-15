import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getPatientVaultProfile } from '../../../data/patientVault';
import {
  ACUTE_SYMPTOM_OPTIONS,
  generate811Script,
} from '../../../services/triage811Engine';
import type { Triage811Output } from '../../../types/triage811';

export default function Call811PrepScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const profile = getPatientVaultProfile(patientId ?? '');

  const [selected, setSelected] = useState<string[]>([
    'Sudden onset confusion',
    'Mild fever',
  ]);
  const [output, setOutput] = useState<Triage811Output | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleSymptom = useCallback((symptom: string) => {
    setSelected((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom],
    );
    setOutput(null);
  }, []);

  const canGenerate = selected.length > 0 && Boolean(profile);

  const subtitle = useMemo(() => {
    if (!profile) return 'Patient not found in vault';
    return `${profile.fullName} · ${profile.ageYears}y · ${profile.relationshipLabel}`;
  }, [profile]);

  async function onGenerate() {
    if (!patientId || !canGenerate) return;
    try {
      setBusy(true);
      const result = await generate811Script(patientId, selected);
      setOutput(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to build script';
      Alert.alert('811 prep failed', message);
    } finally {
      setBusy(false);
    }
  }

  async function onCall811() {
    const url = 'tel:811';
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          'Calling unavailable',
          'This device cannot place a phone call. Dial 811 manually (Health811 ON / 811 SK).',
        );
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Calling unavailable', 'Unable to open the phone dialer. Dial 811 manually.');
    }
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>811 Call Prep</Text>
        <Text style={styles.lede}>No vault profile for patient {patientId}.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Caregiver Script Assistant</Text>
      <Text style={styles.heading}>Prepare your 811 call</Text>
      <Text style={styles.lede}>{subtitle}</Text>
      <Text style={styles.notice}>
        811 nurses follow a dispatcher script and will ask you questions. This
        prep fills vault-backed answers so you can respond. It does not diagnose
        or prescribe.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current acute symptoms</Text>
        {ACUTE_SYMPTOM_OPTIONS.map((symptom) => {
          const checked = selected.includes(symptom);
          return (
            <Pressable
              key={symptom}
              onPress={() => toggleSymptom(symptom)}
              style={styles.checkRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                {checked ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.checkLabel}>{symptom}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.primaryBtn, (!canGenerate || busy) && styles.btnDisabled]}
        onPress={onGenerate}
        disabled={!canGenerate || busy}
      >
        {busy ? (
          <ActivityIndicator color="#f4f7f5" />
        ) : (
          <Text style={styles.primaryBtnText}>Build call cue sheet</Text>
        )}
      </Pressable>

      {output ? (
        <View style={styles.teleprompterCard}>
          <Text style={styles.teleprompterLabel}>Opening (when they ask why you’re calling)</Text>
          <Text style={styles.teleprompter}>{output.spokenIntroScript}</Text>

          <Text style={styles.sectionLabel}>They will ask — your ready answers</Text>
          <Text style={styles.metaLine}>
            Follow their script. Read the matching answer when they ask.
          </Text>
          {output.dispatcherCueSheet.map((cue, i) => (
            <View key={cue.dispatcherAsks} style={styles.cueBlock}>
              <Text style={styles.cueAsk}>
                {i + 1}. Nurse: {cue.dispatcherAsks}
              </Text>
              <Text style={styles.cueAnswer}>You: {cue.readyAnswer}</Text>
            </View>
          ))}

          <Text style={styles.sectionLabel}>Mention if they probe further</Text>
          {output.historicalRedFlags.length === 0 ? (
            <Text style={styles.metaLine}>None flagged from vault.</Text>
          ) : (
            output.historicalRedFlags.map((flag) => (
              <Text key={flag} style={styles.bullet}>
                • {flag}
              </Text>
            ))
          )}

          <Text style={styles.sectionLabel}>After their script — clarify if needed</Text>
          {output.questionsToAskNurse.map((q, i) => (
            <Text key={q} style={styles.bullet}>
              {i + 1}. {q}
            </Text>
          ))}

          <Text style={styles.finePrint}>{output.regulatoryNotice}</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.callBtn, !output && styles.btnDisabled]}
        onPress={onCall811}
        disabled={!output}
        accessibilityRole="button"
        accessibilityLabel="Call 811"
      >
        <Text style={styles.callBtnText}>Call 811</Text>
        <Text style={styles.callBtnSub}>Health811 ON · 811 SK · tel:811</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 12 },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  notice: {
    fontSize: 13,
    color: '#6b4f1d',
    backgroundColor: '#f7f0dd',
    borderRadius: 8,
    padding: 12,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#143536', marginBottom: 4 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#0f3d3e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#0f3d3e' },
  checkMark: { color: '#fff', fontWeight: '700' },
  checkLabel: { flex: 1, fontSize: 16, color: '#143536' },
  primaryBtn: {
    backgroundColor: '#1d5c5e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.45 },
  teleprompterCard: {
    backgroundColor: '#0b2c2d',
    borderRadius: 14,
    padding: 20,
    gap: 10,
  },
  teleprompterLabel: {
    color: '#9ec4c5',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  teleprompter: {
    color: '#f4f7f5',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '600',
  },
  sectionLabel: {
    marginTop: 10,
    color: '#9ec4c5',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cueBlock: {
    gap: 4,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f4a4b',
  },
  cueAsk: { color: '#9ec4c5', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  cueAnswer: { color: '#f4f7f5', fontSize: 17, lineHeight: 24, fontWeight: '600' },
  bullet: { color: '#e4efef', fontSize: 15, lineHeight: 22 },
  metaLine: { color: '#9ec4c5', fontSize: 14 },
  finePrint: {
    marginTop: 8,
    color: '#8ab0b1',
    fontSize: 11,
    lineHeight: 16,
  },
  callBtn: {
    backgroundColor: '#b42318',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  callBtnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  callBtnSub: { color: '#f8d4d0', fontSize: 12, marginTop: 4 },
});
