import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  MOCK_HEALTH_RECORD_CONTEXT,
  SANDBOX_EXAMPLE_PROMPTS,
} from '../../data/mockHealthRecords';
import {
  pingOllama,
  queryLocalLLM,
  SAMD_SYSTEM_PROMPT,
  type LocalLLMModel,
  type LocalLLMResponse,
} from '../../services/localAIClient';

const MODELS: LocalLLMModel[] = ['llama3.2:3b', 'phi3:mini'];

export default function AITestSandboxScreen() {
  const [prompt, setPrompt] = useState(SANDBOX_EXAMPLE_PROMPTS[0]);
  const [context, setContext] = useState(MOCK_HEALTH_RECORD_CONTEXT);
  const [model, setModel] = useState<LocalLLMModel>('llama3.2:3b');
  const [useAndroidHost, setUseAndroidHost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<LocalLLMResponse | null>(null);

  const hostHint = useMemo(
    () =>
      useAndroidHost
        ? 'http://10.0.2.2:11434 (Android emulator → host Ollama)'
        : 'http://localhost:11434 (iOS sim / web / host)',
    [useAndroidHost],
  );

  async function onPing() {
    setBusy(true);
    setStatus(null);
    try {
      const ping = await pingOllama({ useAndroidEmulatorHost: useAndroidHost });
      setStatus(
        ping.ok
          ? `Ollama reachable at ${ping.baseUrl}. Models: ${ping.models.join(', ') || 'none listed'}`
          : `Ollama not reachable at ${ping.baseUrl}. Offline SaMD fallback will be used.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function onAsk() {
    setBusy(true);
    setStatus(null);
    setResult(null);
    try {
      const response = await queryLocalLLM(prompt, context, {
        useAndroidEmulatorHost: useAndroidHost,
        defaultModel: model,
        allowOfflineFallback: true,
      });
      setResult(response);
      setStatus(
        response.source === 'ollama'
          ? `Answered by Ollama (${response.model})`
          : `Ollama offline — used SaMD-safe fallback (${response.baseUrl})`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Local LLM request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.kicker}>Simulator sandbox</Text>
      <Text style={styles.heading}>Local LLM bridge</Text>
      <Text style={styles.lede}>
        Ask educational questions against mock health records via Ollama on your
        developer machine. SaMD system prompt is always enforced.
      </Text>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>SaMD guardrail</Text>
        <Text style={styles.noticeBody}>{SAMD_SYSTEM_PROMPT}</Text>
      </View>

      <Text style={styles.meta}>Endpoint: {hostHint}</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Android emulator host (10.0.2.2)</Text>
        <Switch value={useAndroidHost} onValueChange={setUseAndroidHost} />
      </View>

      <Text style={styles.sectionLabel}>Model</Text>
      <View style={styles.chipRow}>
        {MODELS.map((m) => (
          <Pressable
            key={m}
            onPress={() => setModel(m)}
            style={[styles.chip, model === m && styles.chipActive]}
          >
            <Text style={[styles.chipText, model === m && styles.chipTextActive]}>
              {m}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Mock health-record context</Text>
      <TextInput
        style={[styles.input, styles.contextBox]}
        value={context}
        onChangeText={setContext}
        multiline
      />

      <Text style={styles.sectionLabel}>Example prompts</Text>
      {SANDBOX_EXAMPLE_PROMPTS.map((example) => (
        <Pressable key={example} onPress={() => setPrompt(example)}>
          <Text style={styles.example}>{example}</Text>
        </Pressable>
      ))}

      <Text style={styles.sectionLabel}>Your question</Text>
      <TextInput
        style={[styles.input, styles.promptBox]}
        value={prompt}
        onChangeText={setPrompt}
        multiline
        placeholder="Ask a context-summarization question"
      />

      <View style={styles.actions}>
        <Pressable style={styles.secondaryBtn} onPress={onPing} disabled={busy}>
          <Text style={styles.secondaryBtnText}>Ping Ollama</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={onAsk} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#f4f7f5" />
          ) : (
            <Text style={styles.primaryBtnText}>Ask local LLM</Text>
          )}
        </Pressable>
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      {result ? (
        <View style={styles.answerCard}>
          <Text style={styles.sectionLabel}>Response</Text>
          <Text style={styles.answer}>{result.text}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 10 },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  notice: {
    backgroundColor: '#f7f0dd',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  noticeTitle: { fontWeight: '700', color: '#6b4f1d' },
  noticeBody: { fontSize: 12, color: '#6b4f1d', lineHeight: 17 },
  meta: { fontSize: 13, color: '#5a7374' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchLabel: { flex: 1, color: '#143536', fontSize: 14 },
  sectionLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#9bb5b6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#0f3d3e', borderColor: '#0f3d3e' },
  chipText: { color: '#143536', fontSize: 13 },
  chipTextActive: { color: '#f4f7f5', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#c5d6d6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fbfcfc',
    color: '#143536',
  },
  contextBox: { minHeight: 140, textAlignVertical: 'top', fontSize: 12 },
  promptBox: { minHeight: 90, textAlignVertical: 'top' },
  example: {
    color: '#1d5c5e',
    fontSize: 13,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: '#0f3d3e', fontWeight: '600' },
  status: { fontSize: 13, color: '#355556', lineHeight: 18 },
  answerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 8,
  },
  answer: { fontSize: 15, color: '#143536', lineHeight: 22 },
});
