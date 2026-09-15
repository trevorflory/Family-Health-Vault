/**
 * Pure FHIR export JSON parsers (Jest-friendly, no SQLite).
 */

import type { FhirBundle, FhirImportResource } from '../../types/interop';
import { flattenFhirBundle } from './fhirMapper';

export type ParsedFhirExport =
  | { ok: true; resources: FhirImportResource[]; format: 'bundle' | 'array' | 'resource' }
  | { ok: false; error: string };

function isResource(value: unknown): value is FhirImportResource {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { resourceType?: unknown }).resourceType === 'string'
  );
}

/**
 * Parse a MySask-partner / sandbox FHIR JSON export (Bundle, array, or single resource).
 */
export function parseFhirExportJson(raw: string): ParsedFhirExport {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Empty FHIR export JSON' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Invalid JSON — expected a FHIR Bundle or resource export' };
  }

  if (Array.isArray(parsed)) {
    const resources = parsed.filter(isResource);
    if (!resources.length) {
      return { ok: false, error: 'JSON array contained no FHIR resources' };
    }
    return { ok: true, resources, format: 'array' };
  }

  if (
    parsed &&
    typeof parsed === 'object' &&
    (parsed as FhirBundle).resourceType === 'Bundle'
  ) {
    const resources = flattenFhirBundle(parsed as FhirBundle);
    if (!resources.length) {
      return { ok: false, error: 'FHIR Bundle contained no importable entries' };
    }
    return { ok: true, resources, format: 'bundle' };
  }

  if (isResource(parsed)) {
    return { ok: true, resources: [parsed], format: 'resource' };
  }

  return {
    ok: false,
    error: 'Unrecognized FHIR export shape (need Bundle, resource, or resource array)',
  };
}
