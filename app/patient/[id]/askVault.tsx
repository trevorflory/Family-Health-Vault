import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
import { listMedicalEventsForPatient } from '../../../db/medicalEvents';
import { askMyVault, type AskVaultCitation } from '../../../services/askVault';
import { SBAR_REGULATORY_NOTICE } from '../../../services/sbarEngine';

export default function AskVaultScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const [question, setQuestion] = useState(
    'What do these kidney function numbers mean in plain educational terms?',
  );
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<AskVaultCitation[]>([]);
  const [source, setSource] = useState<string | null>(null);

  async function onAsk() {
    if (!patientId || !question.trim()) return;
    setBusy(true);
    try {
      const events = await listMedicalEventsForPatient(patientId);
      const result = await askMyVault({
        question: question.trim(),
        events,
      });
      setAnswer(result.answer.text);
      setCitations(result.citations);
      setSource(result.answer.source);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to query local vault LLM';
      Alert.alert('Ask my vault failed', message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Ask my vault</Text>
      <Text style={styles.lede}>
        Natural-language questions over confirmed vault events. Local Ollama when
        available; offline SaMD-safe fallback otherwise. Not a diagnosis.
      </Text>
      <Text style={styles.notice}>{SBAR_REGULATORY_NOTICE}</Text>

      <TextInput
        style={styles.input}
        multiline
        value={question}
        onChangeText={setQuestion}
        placeholder="Ask about labs, meds, or visit notes on file…"
        placeholderTextColor="#6b7c7d"
      />

      <Pressable
        style={[styles.cta, busy && styles.ctaDisabled]}
        disabled={busy}
        onPress={() => void onAsk()}
      >
        {busy ? (
          <ActivityIndicator color="#f4f7f5" />
        ) : (
          <Text style={styles.ctaText}>Ask (educational only)</Text>
        )}
      </Pressable>

      {answer ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Answer{source ? ` · ${source}` : ''}
          </Text>
          <Text style={styles.body}>{answer}</Text>
        </View>
      ) : null}

      {citations.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cited vault events</Text>
          {citations.map((c) => (
            <Text key={c.eventId} style={styles.cite}>
              {c.eventId} · {c.kind} · {c.summary}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  notice: { fontSize: 12, color: '#6b7c7d', lineHeight: 17 },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#c5d4d4',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#ffffff',
    color: '#0f3d3e',
    textAlignVertical: 'top',
  },
  cta: {
    backgroundColor: '#0f3d3e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#f4f7f5', fontWeight: '600', fontSize: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c5d4d4',
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f3d3e' },
  body: { fontSize: 14, color: '#355556', lineHeight: 20 },
  cite: { fontSize: 12, color: '#6b7c7d', lineHeight: 17 },
});
