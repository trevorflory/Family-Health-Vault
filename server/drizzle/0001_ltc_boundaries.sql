-- 0001_ltc_boundaries.sql
-- Family Health Vault — LTC multi-tenant boundaries (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  jurisdiction CHAR(2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ehr_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  vendor TEXT NOT NULL CHECK (vendor IN ('POINTCLICKCARE','MEDITECH_EXPANSE','YARDI_LTC')),
  status TEXT NOT NULL CHECK (status IN ('PENDING','ACTIVE','REVOKED','ERROR')),
  token_ciphertext TEXT,
  external_facility_id TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, vendor)
);

CREATE TABLE residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  patient_id UUID NOT NULL,
  external_resident_id TEXT NOT NULL,
  display_name_ciphertext TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','DISCHARGED')),
  UNIQUE (facility_id, external_resident_id),
  UNIQUE (facility_id, patient_id)
);

CREATE TABLE poa_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  resident_id UUID NOT NULL REFERENCES residents(id),
  contact_id TEXT NOT NULL,
  family_account_id UUID,
  is_legal_poa BOOLEAN NOT NULL DEFAULT false,
  clinical_access_granted BOOLEAN NOT NULL DEFAULT false,
  delivery_enabled BOOLEAN NOT NULL DEFAULT true,
  raw_relationship TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, resident_id, contact_id)
);

CREATE TABLE medication_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  resident_id UUID NOT NULL REFERENCES residents(id),
  external_id TEXT NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  schedule TEXT,
  last_administered_at TIMESTAMPTZ,
  source_vendor TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, external_id)
);

CREATE TABLE medication_administration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  resident_id UUID NOT NULL REFERENCES residents(id),
  external_id TEXT NOT NULL,
  medication_name TEXT NOT NULL,
  result TEXT NOT NULL,
  administered_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, external_id)
);

CREATE TABLE appointment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  resident_id UUID NOT NULL REFERENCES residents(id),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  provider TEXT,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, external_id)
);

CREATE TABLE vital_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  resident_id UUID NOT NULL REFERENCES residents(id),
  external_id TEXT NOT NULL,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  recorded_at TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, external_id)
);

CREATE TABLE resident_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  resident_id UUID NOT NULL REFERENCES residents(id),
  event_type TEXT NOT NULL,
  summary_non_phi TEXT NOT NULL,
  payload_ciphertext TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallet_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('FREE_FEED','WALLET_PRO')),
  platforms TEXT[] NOT NULL DEFAULT '{mobile}',
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','CANCELED','PAST_DUE')),
  renews_at TIMESTAMPTZ,
  UNIQUE (family_account_id, patient_id)
);

CREATE TABLE access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id UUID,
  resident_id UUID,
  action TEXT NOT NULL,
  permitted BOOLEAN NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_poa_scopes_family ON poa_scopes (family_account_id)
  WHERE family_account_id IS NOT NULL;
CREATE INDEX idx_timeline_resident ON resident_timeline_events (resident_id, occurred_at DESC);
CREATE INDEX idx_meds_resident ON medication_records (resident_id);
