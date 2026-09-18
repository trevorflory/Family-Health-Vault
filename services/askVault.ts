/**
 * SaMD-safe “ask my vault” context builder + local LLM call.
 * Confirmed / pending-review events only; citations back to MedicalEvent ids.
 * Optional proxy gate: READ_VAULT check + append-only access log.
 */

import type { MedicalEventRecord, OcrParsedPayload, VisitDebriefParsed } from '../types/db';
import type { AccessLogEntry, ProxyGrant } from '../types/proxyAccess';
import {
  queryLocalLLM,
  type LocalAIClientConfig,
  type LocalLLMResponse,
} from './localAIClient';
import { checkPermission, appendAccessLog } from './proxyAccessEngine';

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
  accessLog?: AccessLogEntry;
  grant?: ProxyGrant | null;
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
      'Structure every reply as Bottom Line Up Front: start with one short BLUF paragraph, then a blank line, then supporting detail.',
      'Prefix the first paragraph with "BLUF:" and the detail section with "Details:".',
    ].join('\n'),
  };
}

/** Split an Ask Vault reply into BLUF + detail for UI. */
export function formatBlufAnswer(raw: string): { bluf: string; detail: string } {
  const text = raw.trim();
  if (!text) return { bluf: '', detail: '' };

  const blufMatch = text.match(
    /BLUF\s*[:\-–]?\s*([\s\S]*?)(?=\n\s*Details\s*[:\-–]|$)/i,
  );
  const detailMatch = text.match(/Details\s*[:\-–]?\s*([\s\S]*)$/i);
  if (blufMatch) {
    return {
      bluf: blufMatch[1].trim(),
      detail: (detailMatch?.[1] ?? '').trim(),
    };
  }

  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length >= 2) {
    return { bluf: paras[0], detail: paras.slice(1).join('\n\n') };
  }
  const sentenceEnd = text.search(/[.!?](\s|$)/);
  if (sentenceEnd > 0 && sentenceEnd < text.length - 1) {
    return {
      bluf: text.slice(0, sentenceEnd + 1).trim(),
      detail: text.slice(sentenceEnd + 1).trim(),
    };
  }
  return { bluf: text, detail: '' };
}

export async function askMyVault(options: {
  question: string;
  events: MedicalEventRecord[];
  config?: LocalAIClientConfig;
  /** When set, requires an active READ_VAULT grant and appends an access log. */
  proxy?: {
    actorId: string;
    patientId: string;
    now?: Date;
  };
}): Promise<AskVaultResult> {
  let accessLog: AccessLogEntry | undefined;
  let grant: ProxyGrant | null | undefined;

  if (options.proxy) {
    const check = await checkPermission(
      options.proxy.actorId,
      options.proxy.patientId,
      'READ_VAULT',
      options.proxy.now ?? new Date(),
    );
    accessLog = check.log;
    grant = check.grant;
    if (!check.permitted) {
      throw new Error(
        'Ask my vault denied — no active READ_VAULT proxy grant for this actor.',
      );
    }
  }

  const { context, citations } = buildAskVaultContext(options.events);
  const answer = await queryLocalLLM(options.question, context, {
    allowOfflineFallback: true,
    ...options.config,
  });

  if (options.proxy && grant) {
    accessLog = await appendAccessLog({
      grantId: grant.grantId,
      patientId: options.proxy.patientId,
      actorId: options.proxy.actorId,
      actorDisplayName: grant.granteeDisplayName,
      action: 'ASK_MY_VAULT',
      permitted: true,
      detail: `citations=${citations.length}`,
      now: options.proxy.now,
    });
  }

  return { answer, citations, contextUsed: context, accessLog, grant };
}
