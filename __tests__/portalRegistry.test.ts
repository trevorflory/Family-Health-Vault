jest.mock('../db/client', () => ({}));
jest.mock('../db/medicalEvents', () => ({
  saveMedicalEvent: jest.fn(),
  findMedicalEventByExternalId: jest.fn(async () => null),
  listMedicalEventsForPatient: jest.fn(async () => []),
  getMedicalEventById: jest.fn(async () => null),
}));

import {
  getPortalConnector,
  PORTAL_CONNECTOR_REGISTRY,
} from '../services/interop/portalRegistry';

describe('portal connector registry (front door)', () => {
  it('lists all 13 Canadian subdivisions once', () => {
    expect(PORTAL_CONNECTOR_REGISTRY).toHaveLength(13);
    const codes = PORTAL_CONNECTOR_REGISTRY.map((e) => e.jurisdiction).sort();
    expect(codes).toEqual([
      'AB',
      'BC',
      'MB',
      'NB',
      'NL',
      'NS',
      'NT',
      'NU',
      'ON',
      'PE',
      'QC',
      'SK',
      'YT',
    ]);
  });

  it('resolves BC Health Gateway for detail view', () => {
    const bc = getPortalConnector('bc');
    expect(bc?.authorityId).toBe('bc-health-gateway');
    expect(bc?.getPlaybook().length).toBeGreaterThanOrEqual(4);
  });
});
