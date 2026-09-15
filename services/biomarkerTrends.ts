/**
 * Biomarker trend compilation from confirmed / pending MedicalEvents.
 * Educational context for Insights / digests — not clinical interpretation.
 */

import type { LabResultParsed, MedicalEventRecord, OcrParsedPayload } from '../types/db';
import {
  TREND_BIOMARKER_CODES,
  type TrendBiomarkerCode,
  resolveLabCode,
} from './labCodes';

export interface BiomarkerPoint {
  code: TrendBiomarkerCode;
  displayName: string;
  value: number;
  units: string;
  observedAt: string;
  eventId: string;
  sourceType: string;
  loinc?: string;
}

export interface BiomarkerSeries {
  code: TrendBiomarkerCode;
  displayName: string;
  loinc?: string;
  points: BiomarkerPoint[];
}

function isOcrPayload(parsed: unknown): parsed is OcrParsedPayload {
  return (
    !!parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as OcrParsedPayload).labs)
  );
}

function parseLabs(event: MedicalEventRecord): LabResultParsed[] {
  try {
    const parsed = JSON.parse(event.parsedJson) as unknown;
    if (isOcrPayload(parsed)) return parsed.labs;
  } catch {
    /* ignore */
  }
  return [];
}

function toNumber(value: string): number | null {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build multi-event biomarker series for visit-prep Insights.
 * Includes LAB_RESULT and PORTAL_SCREENSHOT events with structured labs.
 */
export function compileBiomarkerTrends(
  events: MedicalEventRecord[],
  options?: { codes?: readonly TrendBiomarkerCode[] },
): BiomarkerSeries[] {
  const codes = options?.codes ?? TREND_BIOMARKER_CODES;
  const usable = events.filter(
    (e) =>
      (e.status === 'CONFIRMED' || e.status === 'PENDING_REVIEW') &&
      (e.kind === 'LAB_RESULT' ||
        e.kind === 'PORTAL_SCREENSHOT' ||
        e.kind === 'UNSTRUCTURED_DOC'),
  );

  const buckets = new Map<TrendBiomarkerCode, BiomarkerPoint[]>();

  for (const event of usable) {
    for (const lab of parseLabs(event)) {
      const def = resolveLabCode(lab.code ?? lab.testName);
      if (!def) continue;
      if (!codes.includes(def.code as TrendBiomarkerCode)) continue;
      const value = toNumber(lab.value);
      if (value == null) continue;
      const code = def.code as TrendBiomarkerCode;
      const point: BiomarkerPoint = {
        code,
        displayName: def.displayName,
        value,
        units: lab.units,
        observedAt: event.lastSyncedAt ?? event.updatedAt ?? event.createdAt,
        eventId: event.id,
        sourceType: event.sourceType ?? 'OCR',
        ...(def.loinc ? { loinc: def.loinc } : {}),
      };
      const list = buckets.get(code) ?? [];
      list.push(point);
      buckets.set(code, list);
    }
  }

  return codes
    .map((code) => {
      const points = (buckets.get(code) ?? []).sort((a, b) =>
        a.observedAt.localeCompare(b.observedAt),
      );
      const def = resolveLabCode(code);
      return {
        code,
        displayName: def?.displayName ?? code,
        ...(def?.loinc ? { loinc: def.loinc } : {}),
        points,
      };
    })
    .filter((s) => s.points.length > 0);
}
