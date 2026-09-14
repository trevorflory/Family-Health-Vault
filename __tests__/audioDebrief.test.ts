const requestPermissionsAsync = jest.fn();
const setAudioModeAsync = jest.fn();
const prepareToRecordAsync = jest.fn();
const startAsync = jest.fn();
const stopAndUnloadAsync = jest.fn();
const getURI = jest.fn();

jest.mock('expo-av', () => {
  class Recording {
    prepareToRecordAsync = prepareToRecordAsync;
    startAsync = startAsync;
    stopAndUnloadAsync = stopAndUnloadAsync;
    getURI = getURI;
  }
  return {
    Audio: {
      requestPermissionsAsync: (...args: unknown[]) =>
        requestPermissionsAsync(...args),
      setAudioModeAsync: (...args: unknown[]) => setAudioModeAsync(...args),
      Recording,
      RecordingOptionsPresets: { HIGH_QUALITY: {} },
    },
  };
});

jest.mock('../db/medicalEvents', () => ({
  saveMedicalEvent: jest.fn(async (input: Record<string, unknown>) => ({
    id: input.id ?? 'me_debrief_1',
    patientId: input.patientId,
    kind: input.kind,
    sourceUri: input.sourceUri ?? null,
    rawText: input.rawText,
    parsedJson: JSON.stringify(input.parsed),
    status: input.status,
    createdAt: '2026-09-14T16:00:00.000Z',
    updatedAt: '2026-09-14T16:00:00.000Z',
  })),
}));

import { saveMedicalEvent } from '../db/medicalEvents';
import {
  processVisitDebrief,
  startDebriefRecording,
  stopDebriefRecording,
  transcribeAudio,
} from '../services/audioDebrief';

describe('audioDebrief', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestPermissionsAsync.mockResolvedValue({ granted: true });
    setAudioModeAsync.mockResolvedValue(undefined);
    prepareToRecordAsync.mockResolvedValue(undefined);
    startAsync.mockResolvedValue(undefined);
    stopAndUnloadAsync.mockResolvedValue(undefined);
    getURI.mockReturnValue('file:///tmp/debrief.m4a');
    (globalThis as { fetch?: typeof fetch }).fetch = undefined;
  });

  it('starts and stops expo-av recording sessions', async () => {
    const session = await startDebriefRecording();
    expect(requestPermissionsAsync).toHaveBeenCalled();
    expect(prepareToRecordAsync).toHaveBeenCalled();
    expect(startAsync).toHaveBeenCalled();

    const stopped = await stopDebriefRecording(session);
    expect(stopped.uri).toBe('file:///tmp/debrief.m4a');
    expect(stopAndUnloadAsync).toHaveBeenCalled();
  });

  it('falls back to simulator mock transcript when Whisper is offline', async () => {
    (globalThis as { fetch: typeof fetch }).fetch = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
    const result = await transcribeAudio({
      audioUri: 'file:///tmp/debrief.m4a',
    });
    expect(result.source).toBe('mock-fallback');
    expect(result.transcript).toMatch(/Schedule follow-up ultrasound/i);
  });

  it('persists VISIT_DEBRIEF MedicalEvents from transcript override', async () => {
    const result = await processVisitDebrief({
      patientId: 'pt-7801',
      audioUri: 'file:///tmp/debrief.m4a',
      transcriptOverride:
        'We discussed CKD. Decreased Metformin to 500 mg. Schedule follow-up ultrasound in 2 weeks.',
    });

    expect(result.transcriptionSource).toBe('override');
    expect(result.extracted.eventType).toBe('VISIT_DEBRIEF');
    expect(saveMedicalEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'pt-7801',
        kind: 'VISIT_DEBRIEF',
        status: 'PENDING_REVIEW',
        parsed: expect.objectContaining({ eventType: 'VISIT_DEBRIEF' }),
      }),
    );
    expect(result.record.kind).toBe('VISIT_DEBRIEF');
  });
});
