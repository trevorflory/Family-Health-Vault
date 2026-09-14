import {
  DEMO_CAREGIVER_ID,
} from '../data/caregiverHousehold';
import {
  DEMO_SIBLING_ID,
  DEMO_SIBLING_NAME,
} from '../data/proxyGrants';
import {
  appendAccessLog,
  checkPermission,
  evaluateAgeOut,
  executeAgeOutHandOff,
  grantProxyAccess,
  listAccessLog,
  listProxyGrants,
  resetProxyAccessStore,
  revokeProxyGrant,
} from '../services/proxyAccessEngine';

describe('proxyAccessEngine', () => {
  beforeEach(() => {
    resetProxyAccessStore(new Date('2026-09-14T12:00:00.000Z'));
  });

  it('seeds Primary POA, Sibling Coordinator, and Emergency Pass grants', () => {
    const dadGrants = listProxyGrants('pt-7801');
    expect(dadGrants.some((g) => g.role === 'PRIMARY_POA')).toBe(true);
    expect(dadGrants.some((g) => g.role === 'SIBLING_COORDINATOR')).toBe(true);
    expect(dadGrants.some((g) => g.role === 'EMERGENCY_PASS')).toBe(true);
    const leo = listProxyGrants('pt-leo-04');
    expect(leo).toHaveLength(1);
    expect(leo[0]?.role).toBe('PRIMARY_POA');
  });

  it('permits Primary POA to manage proxies and export SBAR', () => {
    const manage = checkPermission(
      DEMO_CAREGIVER_ID,
      'pt-7801',
      'MANAGE_PROXIES',
    );
    expect(manage.permitted).toBe(true);
    const sbar = checkPermission(DEMO_CAREGIVER_ID, 'pt-7801', 'EXPORT_SBAR');
    expect(sbar.permitted).toBe(true);
  });

  it('denies Sibling Coordinator manage-proxies while allowing SBAR export', () => {
    const manage = checkPermission(
      DEMO_SIBLING_ID,
      'pt-7801',
      'MANAGE_PROXIES',
    );
    expect(manage.permitted).toBe(false);
    const sbar = checkPermission(DEMO_SIBLING_ID, 'pt-7801', 'EXPORT_SBAR');
    expect(sbar.permitted).toBe(true);
  });

  it('appends immutable access log entries that cannot be cleared by revoke', () => {
    checkPermission(DEMO_CAREGIVER_ID, 'pt-7801', 'READ_VAULT');
    const before = listAccessLog('pt-7801').length;
    expect(before).toBeGreaterThan(0);

    const siblingGrant = listProxyGrants('pt-7801').find(
      (g) => g.role === 'SIBLING_COORDINATOR',
    )!;
    revokeProxyGrant(siblingGrant.grantId, DEMO_CAREGIVER_ID);
    const after = listAccessLog('pt-7801');
    expect(after.length).toBeGreaterThan(before);
    expect(after.some((e) => e.action === 'REVOKE_GRANT')).toBe(true);
    // Prior CHECK_* rows remain
    expect(after.some((e) => e.action === 'CHECK_READ_VAULT')).toBe(true);
  });

  it('expires emergency pass grants after expiresAt', () => {
    const now = new Date('2026-09-14T12:00:00.000Z');
    resetProxyAccessStore(now);
    const later = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const result = checkPermission(
      'er-temp-pass',
      'pt-7801',
      'READ_VAULT',
      later,
    );
    expect(result.permitted).toBe(false);
  });

  it('evaluates Leo age-out as not due and supports demo force hand-off', () => {
    const evaluation = evaluateAgeOut('pt-leo-04');
    expect(evaluation.due).toBe(false);
    expect(evaluation.ageYears).toBe(4);

    expect(() =>
      executeAgeOutHandOff('pt-leo-04', DEMO_CAREGIVER_ID),
    ).toThrow(/not due/i);

    const result = executeAgeOutHandOff(
      'pt-leo-04',
      DEMO_CAREGIVER_ID,
      16,
      new Date(),
      { force: true },
    );
    expect(result.revokedGrantIds.length).toBe(1);
    const leoGrants = listProxyGrants('pt-leo-04');
    expect(leoGrants.every((g) => g.status === 'AGED_OUT')).toBe(true);
    expect(
      listAccessLog('pt-leo-04').some((e) => e.action === 'AGE_OUT_HAND_OFF'),
    ).toBe(true);
  });

  it('requires expiresAt for new EMERGENCY_PASS grants', () => {
    expect(() =>
      grantProxyAccess({
        patientId: 'pt-7801',
        granteeId: 'er-2',
        granteeDisplayName: 'ER Pass 2',
        role: 'EMERGENCY_PASS',
        createdBy: DEMO_CAREGIVER_ID,
      }),
    ).toThrow(/expiresAt/i);
  });

  it('records sibling invite in grants and access log', () => {
    const grant = grantProxyAccess({
      patientId: 'pt-leo-04',
      granteeId: DEMO_SIBLING_ID,
      granteeDisplayName: DEMO_SIBLING_NAME,
      role: 'SIBLING_COORDINATOR',
      createdBy: DEMO_CAREGIVER_ID,
      notes: 'Help with Leo well-child visit',
    });
    expect(grant.permissions).toContain('EXPORT_SBAR');
    expect(grant.permissions).not.toContain('MANAGE_PROXIES');
    expect(
      listAccessLog('pt-leo-04').some((e) => e.action === 'GRANT_SIBLING_COORDINATOR'),
    ).toBe(true);
  });

  it('keeps access log append-only via appendAccessLog', () => {
    const first = appendAccessLog({
      grantId: 'g1',
      patientId: 'pt-7801',
      actorId: DEMO_CAREGIVER_ID,
      actorDisplayName: 'Alex Ellis',
      action: 'CUSTOM',
      permitted: true,
    });
    const snapshot = listAccessLog('pt-7801').map((e) => e.logId);
    expect(snapshot).toContain(first.logId);
    appendAccessLog({
      grantId: 'g1',
      patientId: 'pt-7801',
      actorId: DEMO_CAREGIVER_ID,
      actorDisplayName: 'Alex Ellis',
      action: 'CUSTOM_2',
      permitted: true,
    });
    expect(listAccessLog('pt-7801').find((e) => e.logId === first.logId)?.action).toBe(
      'CUSTOM',
    );
  });
});
