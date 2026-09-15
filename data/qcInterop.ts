/**
 * Québec Carnet santé interop catalog (data only).
 * Public path is viewing lab/imaging results in Carnet santé Québec — print/save
 * from the browser or FOI to the treating establishment. No public SMART FHIR API.
 */

import type { HealthAuthorityInterop } from '../types/interop';

export const QC_CARNET_AUTHORITY_ID = 'qc-carnet-sante';

export const QC_CARNET_PORTAL = {
  label: 'Carnet santé Québec',
  url: 'https://carnetsante.gouv.qc.ca/portail',
  infoUrl: 'https://www.quebec.ca/sante/vos-informations-de-sante/carnet-sante-quebec',
} as const;

export const QC_CARNET_EXPORT_PLAYBOOK = [
  {
    id: 'login',
    title: 'Se connecter à Carnet santé Québec',
    detail: `Ouvrir ${QC_CARNET_PORTAL.url} via le Service d’authentification gouvernementale.`,
  },
  {
    id: 'labs',
    title: 'Consulter les résultats de prélèvements',
    detail:
      'Afficher les analyses de laboratoire (et imagerie au besoin). Un téléchargement PDF natif n’est pas toujours offert — imprimer / enregistrer la page au besoin.',
  },
  {
    id: 'import-vault',
    title: 'Importer dans Family Health Vault',
    detail:
      'OCR / collage du texte des résultats, ou import JSON FHIR si un export partenaire/sandbox est disponible. Confirmer les événements PENDING_REVIEW avant digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'Demande d’accès lorsque le carnet est incomplet',
    detail:
      'Utiliser l’assistant FOI contre le CIUSSS / Santé Québec (LSSSS / AIPDP) pour le dossier de l’établissement traitant.',
  },
] as const;

export const QC_SMART_READINESS = {
  availability: 'NOT_PUBLIC' as const,
  message:
    'Carnet santé Québec does not publish a patient-facing SMART on FHIR launch for third-party apps. Live OAuth sync requires a Québec / Santé Québec partnership.',
  requiredForLiveSync: [
    'Registered SMART client with Québec health authorities',
    'Authorized FHIR R4 base URL and patient/*.read scopes',
    'Expo auth redirect URI',
    'Data-sharing agreement as required',
  ],
};

export const QC_CARNET_INTEROP: HealthAuthorityInterop = {
  syncMode: 'FILE_IMPORT',
  portalLabel: QC_CARNET_PORTAL.label,
  patientPortalUrl: QC_CARNET_PORTAL.url,
  notes:
    'Primary path: Carnet santé lab/imaging view → print/OCR or text import. Optional FHIR JSON for partner/sandbox. FOI to treating CIUSSS when incomplete. No public SMART endpoint.',
};
