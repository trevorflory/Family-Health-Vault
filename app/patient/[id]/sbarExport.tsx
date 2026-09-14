import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  compileSBAR,
  SBAR_REGULATORY_NOTICE,
} from '../../../services/sbarEngine';
import { generateSBARPDF } from '../../../services/sbarGenerator';
import type { SBARDocument } from '../../../types/sbar';

export default function SbarExportScreen() {
  const { id: patientId, appointmentId } = useLocalSearchParams<{
    id: string;
    appointmentId?: string;
  }>();

  const profile = getPatientVaultProfile(patientId ?? '');
  const [visitReason, setVisitReason] = useState(
    appointmentId ? 'Upcoming clinic visit prep' : '',
  );
  const [caregiverNotes, setCaregiverNotes] = useState('');
  const [doc, setDoc] = useState<SBARDocument | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const subtitle = useMemo(() => {
    if (!profile) return 'Patient not found in vault';
    return `${profile.fullName} · ${profile.ageYears}y · ${profile.relationshipLabel}`;
  }, [profile]);

  const canGenerate = Boolean(profile) && visitReason.trim().length > 0;

  async function onGenerate() {
    if (!patientId || !canGenerate) return;
    try {
      setBusy(true);
      const compiled = await compileSBAR(patientId, {
        visitReason: visitReason.trim(),
        caregiverNotes: caregiverNotes.trim() || undefined,
        appointmentId:
          typeof appointmentId === 'string' ? appointmentId : undefined,
        includeMedicalEvents: true,
      });
      setDoc(compiled);
      const uri = await generateSBARPDF(compiled);
      setPdfUri(uri);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to compile SBAR';
      Alert.alert('SBAR export failed', message);
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!pdfUri) {
      Alert.alert('No PDF yet', 'Generate the SBAR PDF first.');
      return;
    }
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(
        'Sharing unavailable',
        `This environment cannot open the system share sheet. PDF URI:\n${pdfUri}`,
      );
      return;
    }
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Visit SBAR PDF',
      UTI: 'com.adobe.pdf',
    });
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Export Visit SBAR</Text>
        <Text style={styles.lede}>No vault profile for patient {patientId}.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Physician-ready 1-page summary</Text>
      <Text style={styles.heading}>Export Visit SBAR</Text>
      <Text style={styles.lede}>{subtitle}</Text>
      <Text style={styles.notice}>{SBAR_REGULATORY_NOTICE}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Visit reason</Text>
        <TextInput
          style={styles.input}
          value={visitReason}
          onChangeText={(v) => {
            setVisitReason(v);
            setDoc(null);
            setPdfUri(null);
          }}
          placeholder="e.g. Nephrology follow-up — review eGFR trend"
          placeholderTextColor="#8aa0a1"
        />
        {appointmentId ? (
          <Text style={styles.meta}>Linked appointment: {appointmentId}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Caregiver debrief / voice memo text</Text>
        <Text style={styles.hint}>
          Paste post-visit notes or a Whisper transcript. Used only as caregiver
          observations — never as a diagnosis.
        </Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={caregiverNotes}
          onChangeText={(v) => {
            setCaregiverNotes(v);
            setDoc(null);
            setPdfUri(null);
          }}
          placeholder="Dad more tired after evenings; asking about ankle swelling…"
          placeholderTextColor="#8aa0a1"
          multiline
          textAlignVertical="top"
        />
      </View>

      <Pressable
        style={[styles.primaryBtn, (!canGenerate || busy) && styles.btnDisabled]}
        onPress={onGenerate}
        disabled={!canGenerate || busy}
      >
        {busy ? (
          <ActivityIndicator color="#f4f7f5" />
        ) : (
          <Text style={styles.primaryBtnText}>Generate 1-page SBAR</Text>
        )}
      </Pressable>

      {doc ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Preview</Text>
          {doc.sourceEventSummaries.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Vault sources included</Text>
              {doc.sourceEventSummaries.map((line) => (
                <Text key={line} style={styles.bullet}>
                  • {line}
                </Text>
              ))}
            </>
          ) : (
            <Text style={styles.body}>
              No CONFIRMED / PENDING_REVIEW MedicalEvents on file for this
              patient yet. Vault profile context still fills Background.
            </Text>
          )}
          <Text style={styles.sectionLabel}>Situation</Text>
          <Text style={styles.body}>{doc.sections.situation}</Text>
          <Text style={styles.sectionLabel}>Background</Text>
          <Text style={styles.body}>{doc.sections.background}</Text>
          <Text style={styles.sectionLabel}>Assessment</Text>
          <Text style={styles.body}>{doc.sections.assessment}</Text>
          <Text style={styles.sectionLabel}>Recommendation</Text>
          <Text style={styles.body}>{doc.sections.recommendation}</Text>
          <Text style={styles.sectionLabel}>Documents to bring</Text>
          {doc.documentsToBring.map((d) => (
            <Text key={d} style={styles.bullet}>
              • {d}
            </Text>
          ))}
          <Text style={styles.finePrint}>{doc.regulatoryNotice}</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.secondaryBtn, !pdfUri && styles.btnDisabled]}
        onPress={onShare}
        disabled={!pdfUri}
      >
        <Text style={styles.secondaryBtnText}>Share / Save PDF</Text>
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
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#143536' },
  hint: { fontSize: 13, color: '#5a7374', lineHeight: 18 },
  meta: { fontSize: 12, color: '#5a7374' },
  input: {
    borderWidth: 1,
    borderColor: '#c5d6d6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#143536',
    backgroundColor: '#fbfdfd',
  },
  multiline: { minHeight: 110 },
  primaryBtn: {
    backgroundColor: '#1d5c5e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f3d3e',
  },
  secondaryBtnText: { color: '#0f3d3e', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.45 },
  previewCard: {
    backgroundColor: '#0b2c2d',
    borderRadius: 14,
    padding: 20,
    gap: 8,
  },
  previewLabel: {
    color: '#9ec4c5',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  sectionLabel: {
    marginTop: 8,
    color: '#9ec4c5',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  body: { color: '#e4efef', fontSize: 15, lineHeight: 22 },
  bullet: { color: '#e4efef', fontSize: 14, lineHeight: 20 },
  finePrint: {
    marginTop: 8,
    color: '#8ab0b1',
    fontSize: 11,
    lineHeight: 16,
  },
});
