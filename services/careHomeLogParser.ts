/**
 * Pure care-home daily log text parser.
 * Educational ingestion only — not clinical interpretation (SaMD).
 * Blood pressure → two Observations (systolic + diastolic LOINC).
 */

import { getCareLoinc } from '../data/careLoinc';
import type {
  CareObservation,
  CareObservationCategory,
} from '../types/careObservation';

export interface ParseCareHomeLogOptions {
  caretakerId?: string;
  now?: Date;
  status?: CareObservation['status'];
  jurisdiction?: string;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseEffectiveDate(rawText: string, fallback: Date): string {
  const m =
    rawText.match(
      /(?:date|dated|for)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ) ?? rawText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (!m) return fallback.toISOString();
  const raw = m[1];
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T12:00:00`).toISOString();
  }
  const parts = raw.split(/[\/\-]/).map(Number);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const year = c < 100 ? 2000 + c : c;
    // Prefer YMD-like when first part > 12; else assume D/M/Y Canadian-ish
    const day = a > 12 ? a : b;
    const month = a > 12 ? b : a;
    return new Date(year, month - 1, day, 12, 0, 0).toISOString();
  }
  return fallback.toISOString();
}

function obsBase(
  patientId: string,
  performerId: string,
  effectiveDateTimeISO: string,
  opts: ParseCareHomeLogOptions,
): Pick<
  CareObservation,
  | 'patientId'
  | 'performerId'
  | 'effectiveDateTimeISO'
  | 'source'
  | 'status'
  | 'jurisdiction'
  | 'dataResidency'
  | 'createdAt'
> {
  return {
    patientId,
    performerId,
    effectiveDateTimeISO,
    source: 'CARE_HOME_LOG_PARSE',
    status: opts.status ?? 'PENDING_REVIEW',
    jurisdiction: opts.jurisdiction,
    dataResidency: 'DEVICE',
    createdAt: (opts.now ?? new Date()).getTime(),
  };
}

function makeObs(
  partial: {
    category: CareObservationCategory;
    loincCode?: string;
    display: string;
    numericValue?: number;
    unit?: string;
    textValue?: string;
  },
  base: ReturnType<typeof obsBase>,
): CareObservation {
  return {
    id: newId('cobs'),
    patientId: base.patientId,
    performerId: base.performerId,
    effectiveDateTimeISO: base.effectiveDateTimeISO,
    source: base.source,
    status: base.status,
    jurisdiction: base.jurisdiction,
    dataResidency: 'DEVICE',
    createdAt: base.createdAt,
    category: partial.category,
    loincCode: partial.loincCode,
    display: partial.display,
    numericValue: partial.numericValue,
    unit: partial.unit,
    textValue: partial.textValue,
  };
}

/**
 * Extract structured CareObservations from care-home daily summary text
 * (email/PDF OCR paste). Does not touch the database.
 */
export function parseCareHomeLog(
  rawText: string,
  patientId: string,
  options: ParseCareHomeLogOptions = {},
): CareObservation[] {
  const now = options.now ?? new Date();
  const performerId = options.caretakerId?.trim() || 'care-home-parser';
  const effective = parseEffectiveDate(rawText, now);
  const base = obsBase(patientId, performerId, effective, { ...options, now });
  const out: CareObservation[] = [];
  const text = rawText.replace(/\r\n/g, '\n');

  const weight =
    text.match(
      /(?:body\s*)?weight\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(kg|lbs?|pounds?)?/i,
    ) ?? text.match(/\b(\d+(?:\.\d+)?)\s*(kg)\b/i);
  if (weight) {
    let kg = Number(weight[1]);
    const unitRaw = (weight[2] ?? 'kg').toLowerCase();
    if (/lb|pound/.test(unitRaw)) kg = Math.round(kg * 0.453592 * 10) / 10;
    const def = getCareLoinc('BODY_WEIGHT')!;
    out.push(
      makeObs(
        {
          category: def.category,
          loincCode: def.loinc,
          display: def.display,
          numericValue: kg,
          unit: 'kg',
        },
        base,
      ),
    );
  }

  const meal =
    text.match(
      /(?:ate|meal(?:s)?|lunch|dinner|breakfast|intake)\s*(?:of\s*)?(?:about\s*)?(\d{1,3})\s*%/i,
    ) ?? text.match(/(\d{1,3})\s*%\s*(?:of\s*)?(?:meal|lunch|dinner|breakfast|intake)/i);
  if (meal) {
    const pct = Math.min(100, Math.max(0, Number(meal[1])));
    const def = getCareLoinc('MEAL_INTAKE_PCT')!;
    out.push(
      makeObs(
        {
          category: def.category,
          loincCode: def.loinc,
          display: def.display,
          numericValue: pct,
          unit: '%',
          textValue: `Meal intake ${pct}%`,
        },
        base,
      ),
    );
  }

  const fluid = text.match(
    /(?:fluid|fluids|water)\s*(?:intake)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mL|ml|oz)?/i,
  );
  if (fluid) {
    let ml = Number(fluid[1]);
    if (/oz/i.test(fluid[2] ?? '')) ml = Math.round(ml * 29.5735);
    const def = getCareLoinc('FLUID_INTAKE')!;
    out.push(
      makeObs(
        {
          category: def.category,
          loincCode: def.loinc,
          display: def.display,
          numericValue: ml,
          unit: 'mL',
        },
        base,
      ),
    );
  }

  const bp = text.match(
    /(?:b\.?p\.?|blood\s*pressure)\s*[:\-]?\s*(\d{2,3})\s*[\/\-]\s*(\d{2,3})/i,
  );
  if (bp) {
    const sys = Number(bp[1]);
    const dia = Number(bp[2]);
    const sysDef = getCareLoinc('BP_SYSTOLIC')!;
    const diaDef = getCareLoinc('BP_DIASTOLIC')!;
    out.push(
      makeObs(
        {
          category: sysDef.category,
          loincCode: sysDef.loinc,
          display: sysDef.display,
          numericValue: sys,
          unit: 'mm[Hg]',
        },
        base,
      ),
      makeObs(
        {
          category: diaDef.category,
          loincCode: diaDef.loinc,
          display: diaDef.display,
          numericValue: dia,
          unit: 'mm[Hg]',
        },
        base,
      ),
    );
  }

  const meds = text.match(
    /(?:med(?:ication)?s?\s*(?:given|verified|administered)|medications?\s*given)\s*[:\-]?\s*(yes|no|y|n|given|refused)/i,
  );
  if (meds) {
    const yes = /^(yes|y|given)$/i.test(meds[1].trim());
    const def = getCareLoinc('MEDS_VERIFIED')!;
    out.push(
      makeObs(
        {
          category: def.category,
          loincCode: def.loinc,
          display: def.display,
          textValue: yes ? 'Medications verified given' : 'Medications not given / refused',
          numericValue: yes ? 1 : 0,
        },
        base,
      ),
    );
  }

  const mood =
    text.match(
      /(?:mood|behavior|behaviour|mental\s*status)\s*[:\-]?\s*(.+)$/im,
    ) ?? text.match(/\b((?:mild|moderate)?\s*confusion[^\n.]*)/i);
  if (mood) {
    const note = mood[1].trim().replace(/\s+/g, ' ').slice(0, 240);
    if (note) {
      const def = getCareLoinc('MOOD_BEHAVIOR')!;
      out.push(
        makeObs(
          {
            category: def.category,
            loincCode: def.loinc,
            display: def.display,
            textValue: note,
          },
          base,
        ),
      );
    }
  }

  return out;
}

/** Alias matching external prompt naming — still text-in, not PDF bytes. */
export const parseCareHomePDF = parseCareHomeLog;

export interface IngestCareHomeLogResult {
  sourceEventId: string;
  observations: CareObservation[];
}

/**
 * Persist care-home log text as MedicalEvents provenance + CareObservations.
 * Injectable savers keep unit tests free of SQLite.
 */
export async function ingestCareHomeLogText(
  rawText: string,
  patientId: string,
  options: ParseCareHomeLogOptions & {
    sourceUri?: string | null;
    saveMedicalEvent?: (input: {
      patientId: string;
      kind: 'UNSTRUCTURED_DOC';
      rawText: string;
      sourceUri?: string | null;
      parsed: {
        eventType: 'CARE_HOME_DAILY_LOG';
        effectiveDateISO?: string;
        observationCount: number;
        parserNotes: string[];
      };
      status: 'PENDING_REVIEW';
      sourceType: 'OCR' | 'MANUAL';
    }) => Promise<{ id: string }>;
    saveObservations?: (rows: CareObservation[]) => Promise<void>;
  } = {},
): Promise<IngestCareHomeLogResult> {
  const observations = parseCareHomeLog(rawText, patientId, options);
  const notes: string[] = [];
  if (observations.length === 0) {
    notes.push('No structured metrics detected — review raw text manually.');
  } else {
    notes.push(`Extracted ${observations.length} observation(s) for caregiver review.`);
  }

  const effectiveDateISO = observations[0]?.effectiveDateTimeISO;

  let sourceEventId = newId('me_care');
  if (options.saveMedicalEvent) {
    const saved = await options.saveMedicalEvent({
      patientId,
      kind: 'UNSTRUCTURED_DOC',
      rawText,
      sourceUri: options.sourceUri ?? null,
      parsed: {
        eventType: 'CARE_HOME_DAILY_LOG',
        effectiveDateISO,
        observationCount: observations.length,
        parserNotes: notes,
      },
      status: 'PENDING_REVIEW',
      sourceType: 'OCR',
    });
    sourceEventId = saved.id;
  }

  const linked = observations.map((o) => ({
    ...o,
    sourceEventId,
  }));

  if (options.saveObservations) {
    await options.saveObservations(linked);
  }

  return { sourceEventId, observations: linked };
}
