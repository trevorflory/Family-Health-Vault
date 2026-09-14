import { Audio } from 'expo-av';
import { saveMedicalEvent } from '../db/medicalEvents';
import type { MedicalEventRecord, VisitDebriefParsed } from '../types/db';
import { extractVisitDebrief } from './visitDebriefExtract';

export { extractVisitDebrief } from './visitDebriefExtract';

/** Default local Whisper mock used by simulators / web. */
export const LOCAL_WHISPER_MOCK_URL =
  process.env.EXPO_PUBLIC_WHISPER_URL ?? 'http://127.0.0.1:8765/transcribe';

export interface DebriefRecordingSession {
  recording: Audio.Recording;
  startedAt: number;
}

/**
 * Request mic permission and start an in-app recording via expo-av.
 */
export async function startDebriefRecording(): Promise<DebriefRecordingSession> {
  const permission = await Audio.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Microphone permission is required to record a visit debrief');
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  await recording.startAsync();

  return { recording, startedAt: Date.now() };
}

/**
 * Stop recording and return the local audio file URI.
 */
export async function stopDebriefRecording(
  session: DebriefRecordingSession,
): Promise<{ uri: string; durationMs: number }> {
  await session.recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  const uri = session.recording.getURI();
  if (!uri) {
    throw new Error('Recording produced no audio file URI');
  }
  return {
    uri,
    durationMs: Math.max(0, Date.now() - session.startedAt),
  };
}

export interface TranscribeAudioOptions {
  audioUri: string;
  /** Override Whisper endpoint (local mock by default). */
  whisperUrl?: string;
  /**
   * Simulator / unit-test bypass — when the mock endpoint is unreachable,
   * use this transcript instead of failing hard.
   */
  fallbackTranscript?: string;
}

/**
 * Route recorded audio to a local Whisper instance or mock API.
 * Falls back to a simulator transcript when the local endpoint is offline.
 */
export async function transcribeAudio(
  options: TranscribeAudioOptions,
): Promise<{ transcript: string; source: 'whisper' | 'mock-fallback' }> {
  const url = options.whisperUrl ?? LOCAL_WHISPER_MOCK_URL;

  try {
    const form = new FormData();
    form.append('file', {
      uri: options.audioUri,
      name: 'debrief.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
    form.append('model', 'whisper-1');

    const response = await fetch(url, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Whisper mock responded ${response.status}`);
    }

    const payload = (await response.json()) as { text?: string; transcript?: string };
    const transcript = (payload.text ?? payload.transcript ?? '').trim();
    if (!transcript) {
      throw new Error('Whisper mock returned an empty transcript');
    }
    return { transcript, source: 'whisper' };
  } catch {
    if (options.fallbackTranscript?.trim()) {
      return {
        transcript: options.fallbackTranscript.trim(),
        source: 'mock-fallback',
      };
    }
    // Deterministic simulator mock when no local Whisper is running
    return {
      transcript: buildSimulatorMockTranscript(options.audioUri),
      source: 'mock-fallback',
    };
  }
}

function buildSimulatorMockTranscript(audioUri: string): string {
  return [
    'We discussed Dad\'s kidney function and the recent eGFR trend.',
    'The doctor decreased Metformin to 500 mg once daily.',
    'Schedule follow-up ultrasound in 2 weeks.',
    'Pick up the new prescription at the pharmacy tomorrow.',
    `Audio reference: ${audioUri}`,
  ].join(' ');
}

export interface ProcessVisitDebriefInput {
  patientId: string;
  audioUri: string;
  /** Optional precomputed transcript (skips Whisper). */
  transcriptOverride?: string;
  whisperUrl?: string;
  fallbackTranscript?: string;
  status?: MedicalEventRecord['status'];
}

/**
 * Transcribe → extract → persist MedicalEvents row with kind VISIT_DEBRIEF.
 */
export async function processVisitDebrief(
  input: ProcessVisitDebriefInput,
): Promise<{
  record: MedicalEventRecord;
  transcript: string;
  extracted: VisitDebriefParsed;
  transcriptionSource: 'whisper' | 'mock-fallback' | 'override';
}> {
  let transcript: string;
  let transcriptionSource: 'whisper' | 'mock-fallback' | 'override';

  if (input.transcriptOverride?.trim()) {
    transcript = input.transcriptOverride.trim();
    transcriptionSource = 'override';
  } else {
    const result = await transcribeAudio({
      audioUri: input.audioUri,
      whisperUrl: input.whisperUrl,
      fallbackTranscript: input.fallbackTranscript,
    });
    transcript = result.transcript;
    transcriptionSource = result.source;
  }

  const extracted = extractVisitDebrief(transcript);
  const record = await saveMedicalEvent({
    patientId: input.patientId,
    kind: 'VISIT_DEBRIEF',
    sourceUri: input.audioUri,
    rawText: transcript,
    parsed: extracted,
    status: input.status ?? 'PENDING_REVIEW',
  });

  return { record, transcript, extracted, transcriptionSource };
}

/**
 * Save caregiver-edited debrief fields as CONFIRMED.
 */
export async function confirmVisitDebrief(input: {
  patientId: string;
  audioUri?: string | null;
  transcript: string;
  extracted: VisitDebriefParsed;
  eventId?: string;
}): Promise<MedicalEventRecord> {
  return saveMedicalEvent({
    id: input.eventId,
    patientId: input.patientId,
    kind: 'VISIT_DEBRIEF',
    sourceUri: input.audioUri,
    rawText: input.transcript,
    parsed: {
      ...input.extracted,
      eventType: 'VISIT_DEBRIEF',
    },
    status: 'CONFIRMED',
  });
}
