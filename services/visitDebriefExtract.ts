import type {
  VisitDebriefDosageChange,
  VisitDebriefParsed,
} from '../types/db';

/**
 * Heuristic extraction from a visit debrief transcript.
 * Summarizer only — does not diagnose or prescribe.
 */
export function extractVisitDebrief(transcript: string): VisitDebriefParsed {
  const text = (transcript ?? '').replace(/\s+/g, ' ').trim();
  const sentences = splitSentences(text);

  const dosageChanges = extractDosageChanges(text, sentences);
  const actionItems = extractActionItems(sentences);
  const discussionSummary = buildDiscussionSummary(sentences, dosageChanges, actionItems);

  return {
    eventType: 'VISIT_DEBRIEF',
    discussionSummary,
    dosageChanges,
    actionItems,
  };
}

function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractDosageChanges(
  text: string,
  sentences: string[],
): VisitDebriefDosageChange[] {
  const changes: VisitDebriefDosageChange[] = [];
  const seen = new Set<string>();

  const patterns: RegExp[] = [
    /(?:increase[d]?|decrease[d]?|reduce[d]?|raise[d]?|lower(?:ed)?|change[d]?|start(?:ed)?|stop(?:ped)?|discontinue[d]?|switch(?:ed)?)\s+(?:the\s+)?([A-Z][A-Za-z\-]+(?:\s+\d+\s*mg)?)\s*(?:to\s+(\d+(?:\.\d+)?\s*mg))?/gi,
    /new\s+prescription(?:\s+for)?\s+([A-Z][A-Za-z\-]+)(?:\s+(\d+(?:\.\d+)?\s*mg))?/gi,
    /([A-Z][A-Za-z\-]+)\s+(?:was\s+)?(?:increased|decreased|reduced|changed)\s+to\s+(\d+(?:\.\d+)?\s*mg)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const medicationName = (match[1] ?? '').trim();
      if (!medicationName || /^(the|a|an|his|her|their)$/i.test(medicationName)) {
        continue;
      }
      const dose = (match[2] ?? '').trim();
      const changeDescription = dose
        ? `${match[0].trim()}`.replace(/\s+/g, ' ')
        : match[0].trim().replace(/\s+/g, ' ');
      const key = `${medicationName.toLowerCase()}|${changeDescription.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      changes.push({ medicationName, changeDescription });
    }
  }

  // Sentence-level fallback for "prescribed X"
  for (const sentence of sentences) {
    const prescribed = sentence.match(
      /prescribed\s+([A-Z][A-Za-z\-]+)(?:\s+(\d+(?:\.\d+)?\s*mg))?/i,
    );
    if (prescribed) {
      const medicationName = prescribed[1];
      const changeDescription = sentence.trim();
      const key = `${medicationName.toLowerCase()}|${changeDescription.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        changes.push({ medicationName, changeDescription });
      }
    }
  }

  return changes;
}

function extractActionItems(sentences: string[]): string[] {
  const items: string[] = [];
  const actionCue =
    /^(?:schedule|book|call|follow[\s-]?up|order|get|pick\s+up|return|monitor|check|complete|need to|we (?:should|need to)|remember to)\b/i;
  const embeddedCue =
    /\b(?:schedule|book|follow[\s-]?up|ultrasound|blood work|lab|referral|return in|come back)\b/i;

  for (const sentence of sentences) {
    if (actionCue.test(sentence) || embeddedCue.test(sentence)) {
      const cleaned = sentence.replace(/^[\-\*\d\.\)]\s*/, '').trim();
      if (cleaned && !items.includes(cleaned)) {
        items.push(cleaned);
      }
    }
  }

  // Explicit "action item:" labels
  for (const match of sentences.join(' ').matchAll(/action items?[:\s]+([^.!?]+)/gi)) {
    const cleaned = match[1].trim();
    if (cleaned && !items.includes(cleaned)) items.push(cleaned);
  }

  return items.slice(0, 8);
}

function buildDiscussionSummary(
  sentences: string[],
  dosageChanges: VisitDebriefDosageChange[],
  actionItems: string[],
): string {
  const discussionCue =
    /\b(discuss(?:ed|ion)?|diagnos(?:is|ed)|concern|review(?:ed)?|explained|about|regarding|assessment)\b/i;

  const discussionSentences = sentences.filter(
    (s) =>
      discussionCue.test(s) &&
      !dosageChanges.some((d) => s.includes(d.changeDescription.slice(0, 20))) &&
      !actionItems.includes(s),
  );

  if (discussionSentences.length > 0) {
    return discussionSentences.slice(0, 3).join(' ');
  }

  if (sentences.length > 0) {
    return sentences.slice(0, 2).join(' ');
  }

  return 'No discussion summary extracted from transcript.';
}
