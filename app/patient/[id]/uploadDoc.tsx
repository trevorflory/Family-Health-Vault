import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  confirmParsedMedicalEvent,
  ingestDocumentFromImage,
} from '../../../services/ocrParser';
import {
  inferMedicalEventKind,
  parseOcrDocument,
} from '../../../services/ocrTextParsers';
import type { LabResultParsed, OcrParsedPayload, PrescriptionParsed } from '../../../types/db';

type Stage = 'capture' | 'ocr' | 'verify' | 'saved';

export default function UploadDocScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('capture');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<OcrParsedPayload | null>(null);
  const [eventId, setEventId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const canConfirm = useMemo(() => Boolean(parsed && rawText.trim()), [parsed, rawText]);

  async function ensureLibraryPermission(): Promise<boolean> {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted) return true;
    const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return req.granted;
  }

  async function ensureCameraPermission(): Promise<boolean> {
    const current = await ImagePicker.getCameraPermissionsAsync();
    if (current.granted) return true;
    const req = await ImagePicker.requestCameraPermissionsAsync();
    return req.granted;
  }

  async function runOcrPipeline(uri: string) {
    if (!patientId) return;
    setStage('ocr');
    setError(null);
    setImageUri(uri);
    try {
      const result = await ingestDocumentFromImage({
        patientId,
        imageSource: uri,
        status: 'PENDING_REVIEW',
      });
      setRawText(result.rawText);
      setParsed(result.parsed);
      setEventId(result.record.id);
      setStage('verify');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Local OCR failed. You can still paste text to verify.';
      setError(message);
      // Fallback: allow manual text entry on verification screen
      setRawText('');
      setParsed(parseOcrDocument(''));
      setStage('verify');
    }
  }

  async function pickFromLibrary() {
    const ok = await ensureLibraryPermission();
    if (!ok) {
      Alert.alert('Permission needed', 'Photo library access is required to upload documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await runOcrPipeline(result.assets[0].uri);
    }
  }

  async function snapWithCamera() {
    const ok = await ensureCameraPermission();
    if (!ok) {
      Alert.alert('Permission needed', 'Camera access is required to snap prescription or lab photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await runOcrPipeline(result.assets[0].uri);
    }
  }

  function updateLab(index: number, patch: Partial<LabResultParsed>) {
    setParsed((prev) => {
      if (!prev) return prev;
      const labs = prev.labs.map((lab, i) => (i === index ? { ...lab, ...patch } : lab));
      return { ...prev, labs };
    });
  }

  function updateRx(index: number, patch: Partial<PrescriptionParsed>) {
    setParsed((prev) => {
      if (!prev) return prev;
      const prescriptions = prev.prescriptions.map((rx, i) =>
        i === index ? { ...rx, ...patch } : rx,
      );
      return { ...prev, prescriptions };
    });
  }

  function reparseFromRaw(nextRaw: string) {
    setRawText(nextRaw);
    setParsed(parseOcrDocument(nextRaw));
  }

  async function onConfirmSave() {
    if (!patientId || !parsed) return;
    try {
      const record = await confirmParsedMedicalEvent({
        patientId,
        sourceUri: imageUri,
        rawText,
        parsed,
        eventId,
      });
      setEventId(record.id);
      setStage('saved');
    } catch (err) {
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : 'Unable to save MedicalEvents row',
      );
    }
  }

  if (stage === 'ocr') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f3d3e" />
        <Text style={styles.heading}>Extracting text</Text>
        <Text style={styles.lede}>
          Running local OCR on your document. Nothing leaves this device.
        </Text>
      </View>
    );
  }

  if (stage === 'saved') {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Saved to MedicalEvents</Text>
        <Text style={styles.lede}>
          Confirmed OCR payload stored locally for patient {patientId}.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Done</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => {
            setStage('capture');
            setImageUri(null);
            setRawText('');
            setParsed(null);
            setEventId(undefined);
            setError(null);
          }}
        >
          <Text style={styles.secondaryBtnText}>Upload another</Text>
        </Pressable>
      </View>
    );
  }

  if (stage === 'verify' && parsed) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>Verify before saving</Text>
        <Text style={styles.heading}>Review extracted values</Text>
        <Text style={styles.lede}>
          Edit any OCR mistakes, then confirm to write raw text + parsed JSON into
          MedicalEvents.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
        ) : null}

        <Text style={styles.sectionLabel}>Raw OCR text</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={rawText}
          onChangeText={reparseFromRaw}
          multiline
          placeholder="Paste or correct OCR text"
        />

        <Text style={styles.meta}>
          Inferred kind: {inferMedicalEventKind(parsed)}
          {parsed.labs[0]?.code ? ` · first lab code ${parsed.labs[0].code}` : ''}
        </Text>

        <Text style={styles.sectionLabel}>Lab results ({parsed.labs.length})</Text>
        {parsed.labs.length === 0 ? (
          <Text style={styles.meta}>None detected</Text>
        ) : (
          parsed.labs.map((lab, index) => (
            <View key={`lab-${index}`} style={styles.card}>
              <Field
                label="Test name"
                value={lab.testName}
                onChange={(v) => updateLab(index, { testName: v })}
              />
              <Field
                label="Value"
                value={lab.value}
                onChange={(v) => updateLab(index, { value: v })}
              />
              <Field
                label="Units"
                value={lab.units}
                onChange={(v) => updateLab(index, { units: v })}
              />
              <Field
                label="Reference range"
                value={lab.referenceRange ?? ''}
                onChange={(v) => updateLab(index, { referenceRange: v })}
              />
            </View>
          ))
        )}

        <Text style={styles.sectionLabel}>
          Prescriptions ({parsed.prescriptions.length})
        </Text>
        {parsed.prescriptions.length === 0 ? (
          <Text style={styles.meta}>None detected</Text>
        ) : (
          parsed.prescriptions.map((rx, index) => (
            <View key={`rx-${index}`} style={styles.card}>
              <Field
                label="Medication"
                value={rx.medicationName}
                onChange={(v) => updateRx(index, { medicationName: v })}
              />
              <Field
                label="Dosage"
                value={rx.dosage}
                onChange={(v) => updateRx(index, { dosage: v })}
              />
              <Field
                label="Frequency"
                value={rx.frequency}
                onChange={(v) => updateRx(index, { frequency: v })}
              />
              <Field
                label="Prescribing doctor"
                value={rx.prescribingDoctor}
                onChange={(v) => updateRx(index, { prescribingDoctor: v })}
              />
            </View>
          ))
        )}

        {parsed.parserNotes.map((note) => (
          <Text key={note} style={styles.note}>
            {note}
          </Text>
        ))}

        <Pressable
          style={[styles.primaryBtn, !canConfirm && styles.disabled]}
          disabled={!canConfirm}
          onPress={onConfirmSave}
        >
          <Text style={styles.primaryBtnText}>Confirm & save</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => setStage('capture')}>
          <Text style={styles.secondaryBtnText}>Retake / choose another</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Local OCR ingestion</Text>
      <Text style={styles.heading}>Upload medical document</Text>
      <Text style={styles.lede}>
        Snap or choose a prescription bottle, paper lab report, or portal
        screenshot. Text is extracted on-device with tesseract.js.
      </Text>

      <Pressable style={styles.primaryBtn} onPress={snapWithCamera}>
        <Text style={styles.primaryBtnText}>Camera snap</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={pickFromLibrary}>
        <Text style={styles.secondaryBtnText}>Choose from library</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} />
    </View>
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
  error: {
    backgroundColor: '#fde8e6',
    color: '#8a2b1e',
    padding: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  note: { fontSize: 12, color: '#6b4f1d' },
  sectionLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#dfeaea',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 10,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#5a7374' },
  input: {
    borderWidth: 1,
    borderColor: '#c5d6d6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fbfcfc',
    color: '#143536',
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  primaryBtn: {
    backgroundColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#0f3d3e', fontWeight: '600', fontSize: 16 },
  disabled: { opacity: 0.45 },
});
