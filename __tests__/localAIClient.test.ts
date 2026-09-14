import {
  SAMD_SYSTEM_PROMPT,
  buildOllamaChatPayload,
  queryLocalLLM,
  resolveOllamaBaseUrl,
} from '../services/localAIClient';

describe('localAIClient', () => {
  it('resolves localhost and Android emulator Ollama base URLs', () => {
    expect(resolveOllamaBaseUrl()).toBe('http://localhost:11434');
    expect(resolveOllamaBaseUrl({ useAndroidEmulatorHost: true })).toBe(
      'http://10.0.2.2:11434',
    );
  });

  it('embeds the Canadian SaMD system prompt in chat payloads', () => {
    const payload = buildOllamaChatPayload({
      model: 'llama3.2:3b',
      prompt: "What does Dad's latest eGFR lab result mean for his diabetes treatment?",
      context: 'eGFR 55; Type 2 Diabetes',
    });
    const messages = payload.messages as Array<{ role: string; content: string }>;
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe(SAMD_SYSTEM_PROMPT);
    expect(messages[0].content).toMatch(/Never prescribe or offer clinical diagnoses/i);
    expect(payload.model).toBe('llama3.2:3b');
  });

  it('returns Ollama chat content when the local server responds', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content:
            'Educational summary: the record lists eGFR 55. Ask the clinician how it relates to diabetes care. This is not a diagnosis.',
        },
      }),
    });

    const result = await queryLocalLLM(
      'Summarize the eGFR finding',
      'eGFR 55 mL/min/1.73m2; Type 2 Diabetes',
      { fetchImpl: fetchImpl as unknown as typeof fetch, defaultModel: 'phi3:mini' },
    );

    expect(result.source).toBe('ollama');
    expect(result.model).toBe('phi3:mini');
    expect(result.text).toMatch(/Educational summary/i);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('falls back to a SaMD-safe offline reply when Ollama is down', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await queryLocalLLM(
      "What does Dad's latest eGFR lab result mean for his diabetes treatment?",
      'eGFR 55; Type 2 Diabetes on Metformin',
      { fetchImpl: fetchImpl as unknown as typeof fetch, allowOfflineFallback: true },
    );

    expect(result.source).toBe('offline-fallback');
    expect(result.text).toMatch(/not a diagnosis|Educational summary/i);
    expect(result.text.toLowerCase()).not.toMatch(
      /you should take|i diagnose|start insulin/,
    );
  });
});
