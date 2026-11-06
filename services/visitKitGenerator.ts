import * as Print from 'expo-print';
import type { BiomarkerSeries } from './biomarkerTrends';
import type { SBARDocument } from '../types/sbar';
import { buildVisitKitHtml } from './visitKitTemplate';

export { buildVisitKitHtml, VISIT_KIT_NOTICE } from './visitKitTemplate';

/**
 * Generate Visit Kit PDF (SBAR + biomarker summary) via expo-print.
 */
export async function generateVisitKitPDF(
  sbar: SBARDocument,
  series: BiomarkerSeries[],
): Promise<string> {
  if (!sbar.sections?.situation || !sbar.sections?.assessment) {
    throw new Error(
      'Visit kit requires a compiled SBAR with Situation and Assessment',
    );
  }

  const html = buildVisitKitHtml(sbar, series);
  const result = await Print.printToFileAsync({ html, base64: false });
  if (result.uri) return result.uri;

  const withBase64 = await Print.printToFileAsync({ html, base64: true });
  if (withBase64.base64) {
    return `data:application/pdf;base64,${withBase64.base64}`;
  }
  throw new Error('expo-print did not return a URI or base64 PDF payload');
}
