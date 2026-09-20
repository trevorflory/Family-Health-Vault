import { stripPhi, hashUserId } from './stripPhi';

export interface StructuredLogEvent {
  event: string;
  status: 'ok' | 'error' | 'denied';
  execution_time_ms?: number;
  user_id_hash?: string;
  [key: string]: unknown;
}

/**
 * Structured JSON logger — never emits raw PHI.
 * Sink is injectable for tests; default is a no-op collector.
 */
const defaultSink: StructuredLogEvent[] = [];

let sink: (entry: StructuredLogEvent) => void = (entry) => {
  defaultSink.push(entry);
};

export function setPhiSafeLogSink(
  next: (entry: StructuredLogEvent) => void,
): void {
  sink = next;
}

export function resetPhiSafeLogSink(): void {
  defaultSink.length = 0;
  sink = (entry) => {
    defaultSink.push(entry);
  };
}

export function getPhiSafeLogBuffer(): readonly StructuredLogEvent[] {
  return defaultSink;
}

export function logStructured(
  event: string,
  status: StructuredLogEvent['status'],
  fields: Record<string, unknown> = {},
): void {
  const { userId, execution_time_ms, ...rest } = fields;
  const safe = stripPhi(rest as Record<string, unknown>);
  const entry: StructuredLogEvent = {
    event,
    status,
    ...safe,
  };
  if (typeof execution_time_ms === 'number') {
    entry.execution_time_ms = execution_time_ms;
  }
  if (typeof userId === 'string' && userId.length > 0) {
    entry.user_id_hash = hashUserId(userId);
  }
  sink(entry);
}
