import * as Print from 'expo-print';
import type { SBARDocument } from '../types/sbar';
import { buildSBARHtml } from './sbarTemplate';

export { buildSBARHtml } from './sbarTemplate';

/**
 * Generate a printable 1-page SBAR PDF via expo-print.
 * Returns a file URI (preferred) or base64 data URI fallback.
 */
export async function generateSBARPDF(doc: SBARDocument): Promise<string> {
  if (!doc.sections?.situation || !doc.sections?.background) {
    throw new Error('SBAR document requires Situation and Background sections');
  }
  if (!doc.sections.assessment || !doc.sections.recommendation) {
    throw new Error('SBAR document requires Assessment and Recommendation sections');
  }

  const html = buildSBARHtml(doc);

  const result = await Print.printToFileAsync({
    html,
    base64: false,
  });

  if (result.uri) {
    return result.uri;
  }

  const withBase64 = await Print.printToFileAsync({
    html,
    base64: true,
  });

  if (withBase64.base64) {
    return `data:application/pdf;base64,${withBase64.base64}`;
  }

  throw new Error('expo-print did not return a URI or base64 PDF payload');
}
