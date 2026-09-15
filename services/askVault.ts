/**
 * SaMD-safe “ask my vault” context builder + local LLM call.
 * Confirmed / pending-review events only; citations back to MedicalEvent ids.
 */

import type { MedicalEventRecord, OcrParsedPayload, VisitDebriefParsed } from '../types/db';
import {
  queryLocalLLM,
  type LocalAIClientConfig,
  type LocalLLMResponse,
} from './localAIClient';

export interface AskVaultCitation {
  eventId: string;
  kind: string;
  status: string;
  summary: string;
}

export interface AskVaultResult {
  answer: LocalLLMResponse;
  citations: AskVaultCitation[];
  contextUsed: string;
}

function clip(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function summarizeEvent(event: MedicalEventRecord): AskVaultCitation {
  let summary = `${event.kind} (${event.status})`;
  try {
    const parsed = JSON.parse(event.parsedJson) as
      | OcrParsedPayload
      | VisitDebriefParsed;
    if ('labs' in parsed && parsed.labs?.length) {
      summary = `Labs: ${parsed.labs
        .slice(0, 3)
        .map((l) => `${l.testName} ${l.value}`)
        .join('; ')}`;
    } else if ('prescriptions' in parsed && parsed.prescriptions?.length) {
      summary = `Rx: ${parsed.prescriptions
        .slice(0, 2)
        .map((r) => r.medicationName)
        .join(', ')}`;
    } else if ('discussionSummary' in parsed && parsed.discussionSummary) {
      summary = clip(parsed.discussionSummary, 120);
    } else if (event.rawText.trim()) {
      summary = clip(event.rawText, 120);
    }
  } catch {
    summary = clip(event.rawText || event.kind, 120);
  }
  return {
    eventId: event.id,
    kind: event.kind,
    status: event.status,
    summary,
  };
}

export function buildAskVaultContext(events: MedicalEventRecord[]): {
  context: string;
  citations: AskVaultCitation[];
} {
  const usable = events.filter(
    (e) => e.status === 'CONFIRMED' || e.status === 'PENDING_REVIEW',
  );
  const citations = usable.map(summarizeEvent);
  const lines = citations.map(
    (c, i) =>
      `[${i + 1}] id=${c.eventId} kind=${c.kind} status=${c.status}: ${c.summary}`,
  );
  return {
    citations,
    context: [
      'Patient vault excerpts (educational context only — not a diagnosis):',
      ...lines,
      '',
      'When answering, cite event ids from the list above. Do not invent labs or medications.',
    ].join('\n'),
  };
}

export async function askMyVault(options: {
  question: string;
  events: MedicalEventRecord[];
  config?: LocalAIClientConfig;
}): Promise<AskVaultResult> {
  const { context, citations } = buildAskVaultContext(options.events);
  const answer = await queryLocalLLM(options.question, context, {
    allowOfflineFallback: true,
    ...options.config,
  });
  return { answer, citations, contextUsed: context };
}
