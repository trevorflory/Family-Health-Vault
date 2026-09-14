jest.mock('../db/medicalEvents', () => ({
  listMedicalEventsForPatient: jest.fn(async () => []),
  saveMedicalEvent: jest.fn(),
  getMedicalEventById: jest.fn(async () => null),
}));

import {
  compileSBAR,
  summarizeMedicalEvents,
  SBAR_REGULATORY_NOTICE,
} from '../services/sbarEngine';
import { buildSBARHtml } from '../services/sbarTemplate';
import type { MedicalEventRecord } from '../types/db';

const now = new Date('2026-09-14T12:00:00.000Z');
const stamp = now.toISOString();

function makeEvent(
  partial: Pick<MedicalEventRecord, 'id' | 'patientId' | 'kind' | 'status'> & {
    rawText?: string;
    parsed: unknown;
  },
): MedicalEventRecord {
  return {
    id: partial.id,
    patientId: partial.patientId,
    kind: partial.kind,
    sourceUri: null,
    rawText: partial.rawText ?? '',
    parsedJson: JSON.stringify(partial.parsed),
    status: partial.status,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

const dadLabEvent = makeEvent({
  id: 'me_test_lab_dad',
  patientId: 'pt-7801',
  kind: 'LAB_RESULT',
  status: 'CONFIRMED',
  rawText: 'eGFR 55',
  parsed: {
    documentHint: 'lab',
    labs: [
      {
        testName: 'eGFR',
        value: '55',
        units: 'mL/min/1.73m2',
        referenceRange: '60-120',
      },
    ],
    prescriptions: [],
    parserNotes: [],
  },
});

const dadVisitDebrief = makeEvent({
  id: 'me_test_debrief_dad',
  patientId: 'pt-7801',
  kind: 'VISIT_DEBRIEF',
  status: 'CONFIRMED',
  rawText: 'Post-visit memo',
  parsed: {
    eventType: 'VISIT_DEBRIEF',
    discussionSummary:
      'Nephrology discussed ankle swelling and evening fatigue after supper.',
    dosageChanges: [
      {
        medicationName: 'Metformin',
        changeDescription: 'Continue current dose; review at next labs',
      },
    ],
    actionItems: ['Bring blister pack to next visit', 'Track evening ankle size'],
  },
});

describe('summarizeMedicalEvents', () => {
  it('folds VISIT_DEBRIEF into assessment extras and OCR labs into background', () => {
    const result = summarizeMedicalEvents([dadLabEvent, dadVisitDebrief]);
    expect(result.sourceEventIds).toEqual(
      expect.arrayContaining(['me_test_lab_dad', 'me_test_debrief_dad']),
    );
    expect(result.backgroundExtras.join(' ')).toMatch(/eGFR 55/);
    expect(result.backgroundExtras.join(' ').toLowerCase()).toMatch(
      /clinician to interpret/,
    );
    expect(result.assessmentExtras.join(' ')).toMatch(/ankle swelling/i);
    expect(result.assessmentExtras.join(' ')).toMatch(/Metformin/i);
    expect(result.documentExtras.join(' ')).toMatch(/visit debrief/i);
  });

  it('skips REJECTED events', () => {
    const rejected = makeEvent({
      id: 'me_rejected',
      patientId: 'pt-7801',
      kind: 'LAB_RESULT',
      status: 'REJECTED',
      parsed: {
        documentHint: 'lab',
        labs: [{ testName: 'K', value: '9', units: 'mmol/L' }],
        prescriptions: [],
        parserNotes: [],
      },
    });
    const result = summarizeMedicalEvents([rejected]);
    expect(result.sourceEventIds).toHaveLength(0);
    expect(result.backgroundExtras).toHaveLength(0);
  });
});

describe('sbarEngine', () => {
  it('compiles a senior nephrology SBAR with appointment context', async () => {
    const doc = await compileSBAR(
      'pt-7801',
      {
        visitReason: 'Nephrology follow-up — review kidney labs',
        caregiverNotes:
          'Dad more fatigued after supper; ankles look puffier than last week.',
        appointmentId: 'appt-dad-gp',
        includeMedicalEvents: false,
      },
      { now },
    );

    expect(doc.patientDisplayName).toMatch(/Robert|Bob/i);
    expect(doc.appointment?.appointmentId).toBe('appt-dad-gp');
    expect(doc.appointment?.title).toMatch(/nephrology/i);
    expect(doc.sections.situation).toMatch(/Nephrology follow-up/i);
    expect(doc.sections.background).toMatch(/Metformin/i);
    expect(doc.sections.background).toMatch(/CKD|Diabetes/i);
    expect(doc.sections.assessment).toMatch(/fatigued|ankles/i);
    expect(doc.sections.assessment.toLowerCase()).toMatch(/not a clinical/);
    expect(doc.sections.recommendation).toMatch(/warning signs/i);
    expect(doc.documentsToBring.some((d) => /FOI/i.test(d))).toBe(true);
    expect(doc.sourceEventIds).toEqual([]);
    expect(doc.regulatoryNotice).toBe(SBAR_REGULATORY_NOTICE);

    const blob = `${doc.sections.situation} ${doc.sections.background} ${doc.sections.assessment} ${doc.sections.recommendation}`.toLowerCase();
    expect(blob).not.toMatch(
      /you have been diagnosed|prescribe|take \d+mg|differential diagnosis/,
    );
  });

  it('folds injectable MedicalEvents into Background and Assessment', async () => {
    const doc = await compileSBAR(
      'pt-7801',
      {
        visitReason: 'Nephrology follow-up',
        appointmentId: 'appt-dad-gp',
      },
      { now, medicalEvents: [dadLabEvent, dadVisitDebrief] },
    );

    expect(doc.sourceEventIds).toEqual(
      expect.arrayContaining(['me_test_lab_dad', 'me_test_debrief_dad']),
    );
    expect(doc.sourceEventSummaries.join(' ')).toMatch(/lab OCR|eGFR/i);
    expect(doc.sourceEventSummaries.join(' ')).toMatch(/visit debrief/i);
    expect(doc.sections.background).toMatch(/eGFR 55/);
    expect(doc.sections.assessment).toMatch(/ankle swelling|dosage change/i);
    expect(doc.documentsToBring.join(' ')).toMatch(/visit debrief|OCR lab/i);
    expect(doc.sections.background.toLowerCase()).not.toMatch(
      /you have been diagnosed|prescribe \d/,
    );
  });

  it('compiles a pediatric well-child SBAR for Leo', async () => {
    const doc = await compileSBAR(
      'pt-leo-04',
      {
        visitReason: 'Well-child visit — immunizations',
        caregiverNotes: 'Leo had a mild runny nose yesterday, energy normal.',
        appointmentId: 'appt-leo-well',
        includeMedicalEvents: false,
      },
      { now },
    );

    expect(doc.patientDisplayName).toMatch(/Leo/i);
    expect(doc.sections.situation).toMatch(/4y|son/i);
    expect(doc.sections.background).not.toMatch(/Metformin|CKD|Diabetes/i);
    expect(doc.sections.background).toMatch(/multivitamin/i);
    expect(doc.appointment?.appointmentId).toBe('appt-leo-well');
    expect(doc.regulatoryNotice).toContain('Educational Context Summarizer');
  });

  it('tolerates nullish medication dose/frequency without crashing', async () => {
    const doc = await compileSBAR(
      'pt-7801',
      { visitReason: 'General follow-up', includeMedicalEvents: false },
      { now },
    );
    expect(doc.sections.background).toMatch(/Vitamin D/i);
    expect(doc.sections.background).not.toMatch(/undefined|null/i);
  });

  it('rejects unknown patient ids', async () => {
    await expect(
      compileSBAR('pt-missing', { visitReason: 'Check-up' }, { now }),
    ).rejects.toThrow(/Unknown patientId/i);
  });
});

describe('sbarTemplate', () => {
  it('renders all four SBAR headings and the regulatory notice', async () => {
    const doc = await compileSBAR(
      'pt-7801',
      {
        visitReason: 'Clinic prep',
        caregiverNotes: 'Asking about swelling.',
        appointmentId: 'appt-dad-gp',
        includeMedicalEvents: false,
      },
      { now },
    );
    const html = buildSBARHtml(doc);
    expect(html).toMatch(/<h2>Situation<\/h2>/i);
    expect(html).toMatch(/<h2>Background<\/h2>/i);
    expect(html).toMatch(/<h2>Assessment<\/h2>/i);
    expect(html).toMatch(/<h2>Recommendation<\/h2>/i);
    expect(html).toContain(doc.regulatoryNotice);
    expect(html).toMatch(/Documents to bring/i);
  });
});
