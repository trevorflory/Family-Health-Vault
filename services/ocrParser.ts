import { createWorker, type Worker } from 'tesseract.js';
import { saveMedicalEvent } from '../db/medicalEvents';
import type {
  MedicalEventKind,
  MedicalEventRecord,
  OcrParsedPayload,
} from '../types/db';
import {
  parseLabResults,
  parseOcrDocument,
  parsePrescription,
} from './ocrTextParsers';

export {
  parseLabResults,
  parseOcrDocument,
  parsePrescription,
} from './ocrTextParsers';

export type OcrImageSource = string;

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      return worker;
    })();
  }
  return workerPromise;
}

/** Test helper — tear down cached Tesseract worker. */
export async function __terminateOcrWorker(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}

/**
 * Run local OCR on an image URI/path/data URL via tesseract.js.
 * Pure text parsers remain unit-testable without invoking OCR.
 */
export async function extractTextFromImage(
  imageSource: OcrImageSource,
): Promise<string> {
  const worker = await getWorker();
  const {
    data: { text },
  } = await worker.recognize(imageSource);
  return (text ?? '').trim();
}

function inferKind(parsed: OcrParsedPayload): MedicalEventKind {
  if (parsed.documentHint === 'lab') return 'LAB_RESULT';
  if (parsed.documentHint === 'prescription') return 'PRESCRIPTION';
  return 'UNSTRUCTURED_DOC';
}

export interface IngestOcrOptions {
  patientId: string;
  imageSource: OcrImageSource;
  /** Optional pre-extracted text (skips Tesseract — used by tests / manual paste). */
  rawTextOverride?: string;
  status?: MedicalEventRecord['status'];
}

/**
 * OCR → structured parse → persist raw text + parsed JSON into MedicalEvents.
 */
export async function ingestDocumentFromImage(
  options: IngestOcrOptions,
): Promise<{
  record: MedicalEventRecord;
  parsed: OcrParsedPayload;
  rawText: string;
}> {
  const rawText =
    options.rawTextOverride?.trim() ||
    (await extractTextFromImage(options.imageSource));

  const parsed = parseOcrDocument(rawText);
  const record = await saveMedicalEvent({
    patientId: options.patientId,
    kind: inferKind(parsed),
    sourceUri: options.imageSource,
    rawText,
    parsed,
    status: options.status ?? 'PENDING_REVIEW',
  });

  return { record, parsed, rawText };
}

/**
 * Persist a user-verified (possibly edited) parse payload as CONFIRMED.
 */
export async function confirmParsedMedicalEvent(input: {
  patientId: string;
  sourceUri?: string | null;
  rawText: string;
  parsed: OcrParsedPayload;
  eventId?: string;
}): Promise<MedicalEventRecord> {
  return saveMedicalEvent({
    id: input.eventId,
    patientId: input.patientId,
    kind: inferKind(input.parsed),
    sourceUri: input.sourceUri,
    rawText: input.rawText,
    parsed: input.parsed,
    status: 'CONFIRMED',
  });
}
