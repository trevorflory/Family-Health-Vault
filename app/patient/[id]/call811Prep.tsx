import { Link, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
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
  SYMPTOM_GUIDE_CATEGORIES,
  composeGuidedSymptoms,
  generate811Script,
} from '../../../services/triage811Engine';
import type { Triage811Output } from '../../../types/triage811';

type Step = 'lifeThreat' | 'category' | 'followups' | 'script' | 'emergency911';

/**
 * Symptom Checker — life-threatening gate first, then 811 prep path.
 */
export default function Call811PrepScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const profile = getPatientVaultProfile(patientId ?? '');

  const [step, setStep] = useState<Step>('lifeThreat');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [output, setOutput] = useState<Triage811Output | null>(null);
  const [busy, setBusy] = useState(false);

  const category = useMemo(
    () => SYMPTOM_GUIDE_CATEGORIES.find((c) => c.id === categoryId) ?? null,
    [categoryId],
  );

  const toggleFollowUp = useCallback((item: string) => {
    setFollowUps((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
    setOutput(null);
  }, []);

  const subtitle = useMemo(() => {
    if (!profile) return 'Patient not found in vault';
    return `${profile.fullName} · ${profile.ageYears}y · ${profile.relationshipLabel}`;
  }, [profile]);

  async function onGenerate() {
    if (!patientId || !categoryId) return;
    try {
      setBusy(true);
      const symptoms = composeGuidedSymptoms({
        categoryId,
        followUps,
      });
      const result = await generate811Script(patientId, symptoms, {
        emergencyFlags: [],
      });
      setOutput(result);
      setStep('script');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to build script';
      Alert.alert('Symptom Checker failed', message);
    } finally {
      setBusy(false);
    }
  }

  async function onCall(number: '811' | '911') {
    const url = `tel:${number}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          'Calling unavailable',
          `This device cannot place a phone call. Dial ${number} manually.`,
        );
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Calling unavailable',
        `Unable to open the phone dialer. Dial ${number} manually.`,
      );
    }
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Symptom Checker</Text>
        <Text style={styles.lede}>No vault profile for patient {patientId}.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Educational script assistant</Text>
      <Text style={styles.heading}>Symptom Checker</Text>
      <Text style={styles.lede}>{subtitle}</Text>
      <Text style={styles.notice}>
        First we ask if something life-threatening is happening now. If not, we
        help you prepare an 811 caregiver script from vault context. This does
        not diagnose or decide where to go.
      </Text>

      {step === 'lifeThreat' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Is something life-threatening happening right now?
          </Text>
          <Text style={styles.metaLine}>
            You decide. If yes, we show emergency tools. If no, we continue with
            symptom questions for a possible 811 call.
          </Text>
          <Pressable
            style={styles.call911Btn}
            onPress={() => setStep('emergency911')}
          >
            <Text style={styles.call911Text}>Yes — show 911 tools</Text>
          </Pressable>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => setStep('category')}
          >
            <Text style={styles.primaryBtnText}>No — continue Symptom Checker</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'emergency911' ? (
        <View style={styles.emergencyCard}>
          <Text style={styles.emergencyTitle}>Emergency tools</Text>
          <Text style={styles.emergencyBody}>
            If you believe this is life-threatening, call 911. You can also open
            an Emergency Pass QR for EMS / ER. We do not decide for you.
          </Text>
          <Pressable
            style={styles.call911Btn}
            onPress={() => void onCall('911')}
          >
            <Text style={styles.call911Text}>Call 911</Text>
          </Pressable>
          <Link href={`/patient/${patientId}/emergencyPass`} asChild>
            <Pressable style={styles.passBtn}>
              <Text style={styles.passBtnText}>
                Open Emergency Pass QR for EMS / ER
              </Text>
            </Pressable>
          </Link>
          <Pressable
            style={styles.secondaryBtnFull}
            onPress={() => setStep('lifeThreat')}
          >
            <Text style={styles.secondaryBtnText}>Back</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtnFull}
            onPress={() => setStep('category')}
          >
            <Text style={styles.secondaryBtnText}>
              Continue to 811 prep instead
            </Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'category' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            1 · What are you most concerned about?
          </Text>
          {SYMPTOM_GUIDE_CATEGORIES.map((c) => (
            <Pressable
              key={c.id}
              style={[
                styles.choiceRow,
                categoryId === c.id && styles.choiceRowOn,
              ]}
              onPress={() => {
                setCategoryId(c.id);
                setFollowUps([]);
                setOutput(null);
              }}
            >
              <Text
                style={[
                  styles.choiceLabel,
                  categoryId === c.id && styles.choiceLabelOn,
                ]}
              >
                {c.label}
              </Text>
            </Pressable>
          ))}
          <View style={styles.rowBtns}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => setStep('lifeThreat')}
            >
              <Text style={styles.secondaryBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtnFlex, !categoryId && styles.btnDisabled]}
              disabled={!categoryId}
              onPress={() => setStep('followups')}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === 'followups' && category ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2 · Any of these also true?</Text>
          <Text style={styles.metaLine}>
            Optional — answers only shape the 811 script wording.
          </Text>
          {category.followUps.map((item) => {
            const checked = followUps.includes(item);
            return (
              <Pressable
                key={item}
                onPress={() => toggleFollowUp(item)}
                style={styles.checkRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
              >
                <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                  {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
                <Text style={styles.checkLabel}>{item}</Text>
              </Pressable>
            );
          })}
          <View style={styles.rowBtns}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => setStep('category')}
            >
              <Text style={styles.secondaryBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtnFlex, busy && styles.btnDisabled]}
              onPress={() => void onGenerate()}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#f4f7f5" />
              ) : (
                <Text style={styles.primaryBtnText}>Build 811 cue sheet</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === 'script' && output ? (
        <>
          <View style={styles.teleprompterCard}>
            <Text style={styles.teleprompterLabel}>
              Opening (when they ask why you’re calling)
            </Text>
            <Text style={styles.teleprompter}>{output.spokenIntroScript}</Text>

            <Text style={styles.sectionLabel}>
              They will ask — your ready answers
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
              <Text style={styles.metaLineDark}>None flagged from vault.</Text>
            ) : (
              output.historicalRedFlags.map((flag) => (
                <Text key={flag} style={styles.bullet}>
                  • {flag}
                </Text>
              ))
            )}

            <Text style={styles.sectionLabel}>
              After their script — clarify if needed
            </Text>
            {output.questionsToAskNurse.map((q, i) => (
              <Text key={q} style={styles.bullet}>
                {i + 1}. {q}
              </Text>
            ))}

            <Text style={styles.finePrint}>{output.regulatoryNotice}</Text>
          </View>

          <Pressable
            style={styles.callBtn}
            onPress={() => void onCall('811')}
            accessibilityRole="button"
            accessibilityLabel="Call 811"
          >
            <Text style={styles.callBtnText}>Call 811</Text>
            <Text style={styles.callBtnSub}>
              Health811 ON · 811 SK · tel:811
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtnFull}
            onPress={() => {
              setStep('lifeThreat');
              setOutput(null);
              setCategoryId(null);
              setFollowUps([]);
            }}
          >
            <Text style={styles.secondaryBtnText}>Start over</Text>
          </Pressable>
        </>
      ) : null}
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
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#143536',
    marginBottom: 4,
  },
  choiceRow: {
    borderWidth: 1,
    borderColor: '#d5e2e2',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  choiceRowOn: {
    backgroundColor: '#0f3d3e',
    borderColor: '#0f3d3e',
  },
  choiceLabel: { fontSize: 16, color: '#143536', fontWeight: '600' },
  choiceLabelOn: { color: '#f4f7f5' },
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
  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  primaryBtn: {
    backgroundColor: '#1d5c5e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnFlex: {
    flex: 1,
    backgroundColor: '#1d5c5e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnFull: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#0f3d3e', fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },
  emergencyCard: {
    backgroundColor: '#2a1210',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  emergencyTitle: {
    color: '#f8d4d0',
    fontWeight: '800',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  emergencyBody: { color: '#f0c4bf', fontSize: 13, lineHeight: 18 },
  call911Btn: {
    backgroundColor: '#b42318',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  call911Text: { color: '#fff', fontWeight: '800', fontSize: 16 },
  passBtn: {
    borderWidth: 1,
    borderColor: '#f8d4d0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  passBtnText: { color: '#f8d4d0', fontWeight: '700' },
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
  cueAnswer: {
    color: '#f4f7f5',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  bullet: { color: '#e4efef', fontSize: 15, lineHeight: 22 },
  metaLine: { color: '#5a7374', fontSize: 13, lineHeight: 18 },
  metaLineDark: { color: '#9ec4c5', fontSize: 14 },
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
