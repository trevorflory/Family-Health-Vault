import type { EhrIngestEnvelope } from '@family-health-vault/shared';

const FACILITY = 'pcc-facility-demo-01';
const RESIDENT = 'pcc-res-dad-78';
const NOW = '2026-09-19T14:00:00.000Z';

export const PCC_FIXTURE_ENVELOPES: EhrIngestEnvelope[] = [
  {
    vendor: 'POINTCLICKCARE',
    facility_external_id: FACILITY,
    resource_type: 'CONTACT',
    external_id: 'contact-poa-primary',
    resident_external_id: RESIDENT,
    observed_at: NOW,
    payload: {
      contact_id: 'contact-poa-primary',
      family_account_id: '11111111-1111-4111-8111-111111111111',
      is_legal_poa: true,
      clinical_access_granted: true,
      delivery_enabled: true,
      raw_relationship: 'Primary Legal POA',
      display_name: 'Alex Caregiver',
    },
  },
  {
    vendor: 'POINTCLICKCARE',
    facility_external_id: FACILITY,
    resource_type: 'CONTACT',
    external_id: 'contact-secondary',
    resident_external_id: RESIDENT,
    observed_at: NOW,
    payload: {
      contact_id: 'contact-secondary',
      family_account_id: '22222222-2222-4222-8222-222222222222',
      is_legal_poa: false,
      clinical_access_granted: false,
      delivery_enabled: true,
      raw_relationship: 'Secondary Family',
      display_name: 'Sam Sibling',
    },
  },
  {
    vendor: 'POINTCLICKCARE',
    facility_external_id: FACILITY,
    resource_type: 'MEDICATION',
    external_id: 'med-metformin',
    resident_external_id: RESIDENT,
    observed_at: NOW,
    payload: {
      medication_name: 'Metformin',
      dosage: '500 mg',
      schedule: 'BID with meals',
      last_administered_at: '2026-09-19T12:00:00.000Z',
    },
  },
  {
    vendor: 'POINTCLICKCARE',
    facility_external_id: FACILITY,
    resource_type: 'MED_ADMIN',
    external_id: 'emar-1',
    resident_external_id: RESIDENT,
    observed_at: NOW,
    payload: {
      medication_name: 'Metformin',
      result: 'GIVEN',
      administered_at: '2026-09-19T12:00:00.000Z',
    },
  },
  {
    vendor: 'POINTCLICKCARE',
    facility_external_id: FACILITY,
    resource_type: 'APPOINTMENT',
    external_id: 'appt-physio',
    resident_external_id: RESIDENT,
    observed_at: NOW,
    payload: {
      title: 'Physiotherapy',
      category: 'THERAPY',
      start_time: '2026-09-21T15:00:00.000Z',
      end_time: '2026-09-21T15:45:00.000Z',
      provider: 'PT Clinic',
    },
  },
  {
    vendor: 'POINTCLICKCARE',
    facility_external_id: FACILITY,
    resource_type: 'VITAL',
    external_id: 'vital-bp',
    resident_external_id: RESIDENT,
    observed_at: NOW,
    payload: {
      type: 'BP_SYS',
      value: '132',
      unit: 'mm[Hg]',
      recorded_at: '2026-09-19T08:30:00.000Z',
    },
  },
];
