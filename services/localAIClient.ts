/**
 * Canadian SaMD-compliant system prompt for local LLM bridge.
 * Educational context summarizer only — never diagnose or prescribe.
 */
export const SAMD_SYSTEM_PROMPT = [
  'Act solely as an educational context summarizer.',
  'Never prescribe or offer clinical diagnoses.',
  'Never recommend starting, stopping, or changing medications or treatments.',
  'Never assign acuity, triage urgency, or tell the user what care setting to choose.',
  'You may restate facts present in the provided health-record context, define general educational terms, and suggest questions the caregiver could ask a clinician or 811 nurse.',
  'If asked for a diagnosis or treatment plan, refuse and redirect to a qualified clinician.',
  'This tool supports Canadian Health Canada SaMD safeguard expectations for non-device educational summarization only.',
].join(' ');

export type LocalLLMModel = 'llama3.2:3b' | 'phi3:mini' | string;

export interface LocalAIClientConfig {
  /** Primary Ollama base URL (developer host / iOS sim). */
  hostUrl?: string;
  /** Android emulator loopback to host machine. */
  androidEmulatorUrl?: string;
  /** Prefer Android emulator host mapping when true. */
  useAndroidEmulatorHost?: boolean;
  defaultModel?: LocalLLMModel;
  fetchImpl?: typeof fetch;
  /** When Ollama is unreachable, return a deterministic SaMD-safe mock reply. */
  allowOfflineFallback?: boolean;
}

export interface LocalLLMRequest {
  prompt: string;
  context: string;
  model?: LocalLLMModel;
}

export interface LocalLLMResponse {
  text: string;
  model: string;
  source: 'ollama' | 'offline-fallback';
  baseUrl: string;
}

const DEFAULT_HOST = 'http://localhost:11434';
const DEFAULT_ANDROID = 'http://10.0.2.2:11434';
const DEFAULT_MODEL: LocalLLMModel = 'llama3.2:3b';

export function resolveOllamaBaseUrl(config: LocalAIClientConfig = {}): string {
  if (config.useAndroidEmulatorHost) {
    return config.androidEmulatorUrl ?? DEFAULT_ANDROID;
  }
  return (
    config.hostUrl ??
    process.env.EXPO_PUBLIC_OLLAMA_URL ??
    DEFAULT_HOST
  );
}

export function buildOllamaChatPayload(input: {
  model: string;
  prompt: string;
  context: string;
  systemPrompt?: string;
}): Record<string, unknown> {
  const system = input.systemPrompt ?? SAMD_SYSTEM_PROMPT;
  return {
    model: input.model,
    stream: false,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          'Health-record context (read-only facts for summarization):',
          input.context.trim() || '(no context provided)',
          '',
          'Caregiver question:',
          input.prompt.trim(),
          '',
          'Respond only as an educational context summarizer. Do not diagnose or prescribe.',
        ].join('\n'),
      },
    ],
    options: {
      temperature: 0.2,
    },
  };
}

function offlineFallbackReply(prompt: string, context: string): string {
  const egfr = context.match(/eGFR[^\d]{0,12}(\d+(?:\.\d+)?)/i)?.[1];
  const diabetes = /diabetes/i.test(context);
  const asksMeaning = /mean|interpret|explain|what does/i.test(prompt);

  const lines = [
    'Educational summary only — not a diagnosis or treatment recommendation.',
    egfr
      ? `From the provided record context, an eGFR value of ${egfr} is listed.`
      : 'I can only restate facts present in the supplied record context.',
    diabetes
      ? 'The context also lists Type 2 Diabetes among chronic conditions.'
      : null,
    asksMeaning
      ? 'What an eGFR number means for diabetes care must be interpreted by a clinician or pharmacist who knows the full chart; this assistant will not advise treatment changes.'
      : null,
    'Helpful next step: ask the care team or an 811 nurse how this lab fits with the documented history.',
  ].filter(Boolean);

  return lines.join(' ');
}

/**
 * Local Ollama bridge for simulator / emulator testing.
 * Targets developer-host Ollama (`localhost:11434`) or Android emulator
 * host alias (`10.0.2.2:11434`).
 */
export async function queryLocalLLM(
  prompt: string,
  context: string,
  config: LocalAIClientConfig = {},
): Promise<LocalLLMResponse> {
  const baseUrl = resolveOllamaBaseUrl(config).replace(/\/$/, '');
  const model = config.defaultModel ?? DEFAULT_MODEL;
  const fetchImpl = config.fetchImpl ?? fetch;
  const allowFallback = config.allowOfflineFallback ?? true;

  if (!prompt?.trim()) {
    throw new Error('queryLocalLLM requires a non-empty prompt');
  }

  const payload = buildOllamaChatPayload({ model, prompt, context });

  try {
    const response = await fetchImpl(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Ollama responded ${response.status}`);
    }

    const body = (await response.json()) as {
      message?: { content?: string };
      response?: string;
    };
    const text = (body.message?.content ?? body.response ?? '').trim();
    if (!text) {
      throw new Error('Ollama returned an empty completion');
    }

    return { text, model, source: 'ollama', baseUrl };
  } catch (err) {
    if (!allowFallback) {
      throw err instanceof Error ? err : new Error('Ollama request failed');
    }
    return {
      text: offlineFallbackReply(prompt, context),
      model,
      source: 'offline-fallback',
      baseUrl,
    };
  }
}

/** Probe whether an Ollama server is reachable. */
export async function pingOllama(
  config: LocalAIClientConfig = {},
): Promise<{ ok: boolean; baseUrl: string; models: string[] }> {
  const baseUrl = resolveOllamaBaseUrl(config).replace(/\/$/, '');
  const fetchImpl = config.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(`${baseUrl}/api/tags`);
    if (!response.ok) {
      return { ok: false, baseUrl, models: [] };
    }
    const body = (await response.json()) as {
      models?: Array<{ name?: string }>;
    };
    const models = (body.models ?? [])
      .map((m) => m.name ?? '')
      .filter(Boolean);
    return { ok: true, baseUrl, models };
  } catch {
    return { ok: false, baseUrl, models: [] };
  }
}
