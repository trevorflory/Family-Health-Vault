import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  confirmVisitDebrief,
  processVisitDebrief,
  startDebriefRecording,
  stopDebriefRecording,
  type DebriefRecordingSession,
} from '../../../services/audioDebrief';
import type { VisitDebriefParsed } from '../../../types/db';

type Stage = 'idle' | 'recording' | 'processing' | 'review' | 'saved';

function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function Waveform({ active, seed }: { active: boolean; seed: number }) {
  const bars = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const wave = Math.abs(Math.sin((seed / 180) + i * 0.55));
      const height = active ? 10 + wave * 28 : 8;
      return height;
    });
  }, [active, seed]);

  return (
    <View style={styles.waveRow} accessibilityLabel="Recording waveform">
      {bars.map((h, i) => (
        <View
          key={`bar-${i}`}
          style={[
            styles.waveBar,
            {
              height: h,
              opacity: active ? 0.75 + (h / 50) * 0.25 : 0.35,
              backgroundColor: active ? '#f4f7f5' : '#9ec4c5',
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function VoiceDebriefScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [tick, setTick] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [extracted, setExtracted] = useState<VisitDebriefParsed | null>(null);
  const [eventId, setEventId] = useState<string | undefined>();
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);

  const sessionRef = useRef<DebriefRecordingSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function onStartRecording() {
    try {
      const session = await startDebriefRecording();
      sessionRef.current = session;
      setElapsedMs(0);
      setTick(0);
      setStage('recording');
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - session.startedAt);
        setTick((t) => t + 1);
      }, 120);
    } catch (err) {
      Alert.alert(
        'Recording unavailable',
        err instanceof Error ? err.message : 'Could not start microphone recording',
      );
    }
  }

  async function onStopAndProcess() {
    if (!sessionRef.current || !patientId) return;
    clearTimer();
    setStage('processing');
    try {
      const stopped = await stopDebriefRecording(sessionRef.current);
      sessionRef.current = null;
      setAudioUri(stopped.uri);

      const result = await processVisitDebrief({
        patientId,
        audioUri: stopped.uri,
        status: 'PENDING_REVIEW',
      });

      setTranscript(result.transcript);
      setExtracted(result.extracted);
      setEventId(result.record.id);
      setSourceLabel(
        result.transcriptionSource === 'whisper'
          ? 'Local Whisper'
          : result.transcriptionSource === 'override'
            ? 'Provided transcript'
            : 'Simulator mock transcript',
      );
      setStage('review');
    } catch (err) {
      setStage('idle');
      Alert.alert(
        'Debrief processing failed',
        err instanceof Error ? err.message : 'Unable to transcribe or save debrief',
      );
    }
  }

  function updateActionItem(index: number, value: string) {
    setExtracted((prev) => {
      if (!prev) return prev;
      const actionItems = prev.actionItems.map((item, i) =>
        i === index ? value : item,
      );
      return { ...prev, actionItems };
    });
  }

  function addActionItem() {
    setExtracted((prev) => {
      if (!prev) return prev;
      return { ...prev, actionItems: [...prev.actionItems, ''] };
    });
  }

  function removeActionItem(index: number) {
    setExtracted((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        actionItems: prev.actionItems.filter((_, i) => i !== index),
      };
    });
  }

  async function onConfirm() {
    if (!patientId || !extracted) return;
    try {
      const record = await confirmVisitDebrief({
        patientId,
        audioUri,
        transcript,
        extracted: {
          ...extracted,
          eventType: 'VISIT_DEBRIEF',
          actionItems: extracted.actionItems.map((a) => a.trim()).filter(Boolean),
        },
        eventId,
      });
      setEventId(record.id);
      setStage('saved');
    } catch (err) {
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : 'Unable to confirm visit debrief',
      );
    }
  }

  if (stage === 'processing') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f3d3e" />
        <Text style={styles.heading}>Transcribing debrief</Text>
        <Text style={styles.lede}>
          Routing audio to local Whisper (or simulator mock), then extracting
          discussion, dosage changes, and action items.
        </Text>
      </View>
    );
  }

  if (stage === 'saved') {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Visit debrief saved</Text>
        <Text style={styles.lede}>
          Stored in MedicalEvents as VISIT_DEBRIEF for patient {patientId}.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  if (stage === 'review' && extracted) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>Review & edit</Text>
        <Text style={styles.heading}>Visit debrief</Text>
        {sourceLabel ? (
          <Text style={styles.meta}>Transcript source: {sourceLabel}</Text>
        ) : null}

        <Text style={styles.sectionLabel}>Transcript</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={transcript}
          onChangeText={setTranscript}
          multiline
        />

        <Text style={styles.sectionLabel}>Discussion summary</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={extracted.discussionSummary}
          onChangeText={(v) =>
            setExtracted((prev) =>
              prev ? { ...prev, discussionSummary: v } : prev,
            )
          }
          multiline
        />

        <Text style={styles.sectionLabel}>Dosage changes / new prescriptions</Text>
        {extracted.dosageChanges.length === 0 ? (
          <Text style={styles.meta}>None extracted</Text>
        ) : (
          extracted.dosageChanges.map((change, index) => (
            <View key={`${change.medicationName}-${index}`} style={styles.card}>
              <Text style={styles.cardTitle}>{change.medicationName}</Text>
              <Text style={styles.line}>{change.changeDescription}</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionLabel}>Action items</Text>
        {extracted.actionItems.map((item, index) => (
          <View key={`action-${index}`} style={styles.actionRow}>
            <TextInput
              style={[styles.input, styles.actionInput]}
              value={item}
              onChangeText={(v) => updateActionItem(index, v)}
              placeholder="Action item"
            />
            <Pressable onPress={() => removeActionItem(index)} hitSlop={8}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <Pressable style={styles.secondaryBtn} onPress={addActionItem}>
          <Text style={styles.secondaryBtnText}>Add action item</Text>
        </Pressable>

        <Pressable style={styles.primaryBtn} onPress={onConfirm}>
          <Text style={styles.primaryBtnText}>Confirm & save debrief</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => {
            setStage('idle');
            setExtracted(null);
            setTranscript('');
            setAudioUri(null);
          }}
        >
          <Text style={styles.secondaryBtnText}>Record again</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Post-visit voice capture</Text>
      <Text style={styles.heading}>Visit debrief</Text>
      <Text style={styles.lede}>
        Record a quick voice note after the appointment. We transcribe locally
        (Whisper mock on simulator) and pull out discussion points, dosage
        changes, and follow-up actions.
      </Text>

      <View style={[styles.recorderCard, stage === 'recording' && styles.recorderActive]}>
        <Text style={styles.timer}>{formatTimer(elapsedMs)}</Text>
        <Waveform active={stage === 'recording'} seed={tick} />
        {stage === 'recording' ? (
          <Pressable style={styles.stopBtn} onPress={onStopAndProcess}>
            <Text style={styles.stopBtnText}>Stop & transcribe</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.recordBtn} onPress={onStartRecording}>
            <Text style={styles.recordBtnText}>Record Visit Debrief</Text>
          </Pressable>
        )}
      </View>
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
  sectionLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  recorderCard: {
    backgroundColor: '#0b2c2d',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 18,
    marginTop: 8,
  },
  recorderActive: {
    borderWidth: 2,
    borderColor: '#c45c4a',
  },
  timer: {
    fontSize: 40,
    fontWeight: '700',
    color: '#f4f7f5',
    fontVariant: ['tabular-nums'],
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    gap: 3,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  recordBtn: {
    backgroundColor: '#c45c4a',
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 28,
    minWidth: '100%',
    alignItems: 'center',
  },
  recordBtnText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  stopBtn: {
    backgroundColor: '#f4f7f5',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 28,
    minWidth: '100%',
    alignItems: 'center',
  },
  stopBtnText: { color: '#0f3d3e', fontWeight: '800', fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#c5d6d6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fbfcfc',
    color: '#143536',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 4,
  },
  cardTitle: { fontWeight: '700', color: '#143536' },
  line: { color: '#355556', fontSize: 14, lineHeight: 20 },
  actionRow: { gap: 6 },
  actionInput: { flex: 1 },
  remove: { color: '#8a2b1e', fontWeight: '600', fontSize: 13 },
  primaryBtn: {
    backgroundColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
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
});
