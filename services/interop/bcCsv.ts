/**
 * Pure BC Health Gateway CSV lab export parser (Download records → CSV/XLSX).
 * Column names vary; we tolerate common Health Gateway / lab export headers.
 */

import type { LabResultParsed } from '../../types/db';
import { enrichLabWithCode } from '../labCodes';

const HEADER_ALIASES: Record<string, string[]> = {
  testName: ['test', 'test name', 'analyte', 'description', 'lab test', 'name'],
  value: ['result', 'value', 'result value', 'observation value'],
  units: ['units', 'unit', 'uom'],
  referenceRange: [
    'reference',
    'reference range',
    'ref range',
    'normal range',
    'range',
  ],
  collectedAt: [
    'collection date',
    'collected',
    'date collected',
    'observation date',
    'result date',
    'date',
  ],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function mapHeaderIndex(headers: string[]): Record<string, number> {
  const normalized = headers.map(normalizeHeader);
  const out: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx >= 0) out[field] = idx;
  }
  return out;
}

export interface BcCsvParseResult {
  labs: LabResultParsed[];
  rowCount: number;
  notes: string[];
}

/**
 * Parse a Health Gateway–style lab CSV into structured labs.
 * Requires at least a test name + value column.
 */
export function parseBcHealthGatewayCsv(csvText: string): BcCsvParseResult {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return {
      labs: [],
      rowCount: 0,
      notes: ['CSV has no data rows'],
    };
  }
  const headers = splitCsvLine(lines[0]);
  const idx = mapHeaderIndex(headers);
  if (idx.testName === undefined || idx.value === undefined) {
    return {
      labs: [],
      rowCount: 0,
      notes: [
        'Unrecognized CSV headers — need Test/Result (or aliases). Prefer PDF OCR if export shape differs.',
      ],
    };
  }

  const labs: LabResultParsed[] = [];
  const notes: string[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const testName = cells[idx.testName]?.trim();
    const value = cells[idx.value]?.trim();
    if (!testName || !value) continue;
    const units = idx.units !== undefined ? cells[idx.units]?.trim() : '';
    const referenceRange =
      idx.referenceRange !== undefined
        ? cells[idx.referenceRange]?.trim()
        : undefined;
    const lab = enrichLabWithCode({
      testName,
      value,
      units: units || '',
      referenceRange: referenceRange || undefined,
    });
    labs.push(lab);
  }

  if (!labs.length) {
    notes.push('No lab rows parsed from CSV body');
  } else {
    notes.push(
      `Parsed ${labs.length} lab row(s) from Health Gateway–style CSV (${lines.length - 1} data line(s)).`,
    );
  }

  return { labs, rowCount: lines.length - 1, notes };
}

/** Representative Download-records CSV fixture for tests / sandbox. */
export const BC_SAMPLE_HEALTH_GATEWAY_CSV = [
  'Test Name,Result,Units,Reference Range,Collection Date',
  'eGFR,62,mL/min/1.73m2,60-120,2026-07-10',
  'HbA1c,6.4,%,4.0-6.0,2026-07-10',
  'LDL,2.4,mmol/L,<3.5,2026-07-10',
].join('\n');
