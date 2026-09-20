export { DomainError, isDomainError } from './DomainError';
export type { DomainErrorCode } from './DomainError';

export { stripPhi, hashUserId } from './privacy/stripPhi';

export {
  MONTREAL_REGION,
  LEGACY_REGIONS,
  assertMontrealResidency,
  isAllowedCloudRegion,
} from './residency';
export type { AllowedCloudRegion } from './residency';

export {
  platformsForPlan,
  featuresForPlan,
  assertWalletFeature,
  assertPlatform,
  WALLET_PRO_PLATFORMS,
  PHONE_VIEWPORTS_2022,
  DEMO_WALLET_PRO_ENTITLEMENT,
} from './entitlements';
export type {
  WalletPlan,
  ClientPlatform,
  WalletFeature,
} from './entitlements';

export {
  MedicationRecordSchema,
  type MedicationRecord,
} from './schemas/medicationRecord';
export {
  AppointmentRecordSchema,
  type AppointmentRecord,
} from './schemas/appointmentRecord';
export { VitalRecordSchema, type VitalRecord } from './schemas/vitalRecord';
export { POAScopeSchema, type POAScope } from './schemas/poaScope';
export {
  EhrVendorSchema,
  EhrIngestEnvelopeSchema,
  type EhrVendor,
  type EhrIngestEnvelope,
} from './schemas/ehrIngestEnvelope';

export {
  logStructured,
  resetPhiSafeLogSink,
  getPhiSafeLogBuffer,
  setPhiSafeLogSink,
  type StructuredLogEvent,
} from './privacy/phiSafeLogger';

export {
  ConsentKindSchema,
  type ConsentKind,
  assertConsentGranted,
} from './consent';
