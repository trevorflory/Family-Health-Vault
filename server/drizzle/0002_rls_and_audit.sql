-- 0002_rls_and_audit.sql
-- Family RLS from EHR-derived poa_scopes; append-only audit + med admin logs

ALTER TABLE medication_administration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE poa_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_audit ENABLE ROW LEVEL SECURITY;

-- Ingestion service role bypasses via BYPASSRLS or SET ROLE; family uses session vars:
--   app.actor_type = 'FAMILY'
--   app.family_account_id = <uuid>

CREATE OR REPLACE FUNCTION app_family_account_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.family_account_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_family() RETURNS boolean AS $$
  SELECT current_setting('app.actor_type', true) = 'FAMILY';
$$ LANGUAGE sql STABLE;

-- Primary POA: clinical + schedule. Secondary: appointments + non-clinical timeline only.
CREATE OR REPLACE FUNCTION family_can_access_resident(p_resident_id uuid, clinical boolean)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM poa_scopes s
    WHERE s.resident_id = p_resident_id
      AND s.family_account_id = app_family_account_id()
      AND s.delivery_enabled = true
      AND (
        (clinical = false)
        OR (s.is_legal_poa = true AND s.clinical_access_granted = true)
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY family_timeline_select ON resident_timeline_events
  FOR SELECT USING (
    app_is_family()
    AND family_can_access_resident(resident_id, false)
    AND (
      event_type IN ('APPOINTMENT', 'NOTE_FAMILY', 'SCHEDULE')
      OR family_can_access_resident(resident_id, true)
    )
  );

CREATE POLICY family_appointments_select ON appointment_records
  FOR SELECT USING (
    app_is_family() AND family_can_access_resident(resident_id, false)
  );

CREATE POLICY family_meds_select ON medication_records
  FOR SELECT USING (
    app_is_family() AND family_can_access_resident(resident_id, true)
  );

CREATE POLICY family_med_admin_select ON medication_administration_logs
  FOR SELECT USING (
    app_is_family() AND family_can_access_resident(resident_id, true)
  );

CREATE POLICY family_vitals_select ON vital_records
  FOR SELECT USING (
    app_is_family() AND family_can_access_resident(resident_id, true)
  );

CREATE POLICY family_poa_scopes_select ON poa_scopes
  FOR SELECT USING (
    app_is_family() AND family_account_id = app_family_account_id()
  );

-- Append-only: no UPDATE/DELETE policies for app roles on med admin + audit
REVOKE UPDATE, DELETE ON medication_administration_logs FROM PUBLIC;
REVOKE UPDATE, DELETE ON access_audit FROM PUBLIC;

CREATE POLICY family_audit_insert ON access_audit
  FOR INSERT WITH CHECK (app_is_family());

CREATE POLICY family_audit_select ON access_audit
  FOR SELECT USING (
    app_is_family() AND family_account_id = app_family_account_id()
  );
