import * as Print from 'expo-print';
import type { FOIRequestPayload } from '../types/foiPayload';
import { buildFOIRequestHtml } from './foiTemplate';

export { buildFOIRequestHtml, getLegalMeta, scopeLabel } from './foiTemplate';

/**
 * Generate a printable FOI request PDF via expo-print.
 * Returns a file URI (preferred on device) or base64 payload depending on platform/options.
 */
export async function generateFOIPDF(
  payload: FOIRequestPayload,
): Promise<string> {
  if (!payload.jurisdiction) {
    throw new Error('FOI payload requires a jurisdiction');
  }
  if (!payload.facility?.id) {
    throw new Error('FOI payload requires a target facility');
  }
  if (!payload.scope?.length) {
    throw new Error('FOI payload requires at least one scope item');
  }

  const html = buildFOIRequestHtml(payload);

  const result = await Print.printToFileAsync({
    html,
    base64: false,
  });

  if (result.uri) {
    return result.uri;
  }

  // Fallback path: some environments may only provide base64 when requested.
  const withBase64 = await Print.printToFileAsync({
    html,
    base64: true,
  });

  if (withBase64.base64) {
    return `data:application/pdf;base64,${withBase64.base64}`;
  }

  throw new Error('expo-print did not return a URI or base64 PDF payload');
}
