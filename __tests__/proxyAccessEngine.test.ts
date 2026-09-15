import {
  DEMO_CAREGIVER_ID,
} from '../data/caregiverHousehold';
import {
  DEMO_SIBLING_ID,
  DEMO_SIBLING_NAME,
} from '../data/proxyGrants';
import { __resetProxyAccessDbForTests } from '../db/proxyAccess';
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
  beforeEach(async () => {
    __resetProxyAccessDbForTests();
    await resetProxyAccessStore(new Date('2026-09-14T12:00:00.000Z'));
  });

  it('seeds Primary POA, Sibling Coordinator, and Emergency Pass grants', async () => {
    const dadGrants = await listProxyGrants('pt-7801');
    expect(dadGrants.some((g) => g.role === 'PRIMARY_POA')).toBe(true);
    expect(dadGrants.some((g) => g.role === 'SIBLING_COORDINATOR')).toBe(true);
    expect(dadGrants.some((g) => g.role === 'EMERGENCY_PASS')).toBe(true);
    const leo = await listProxyGrants('pt-leo-04');
    expect(leo).toHaveLength(1);
    expect(leo[0]?.role).toBe('PRIMARY_POA');
  });

  it('permits Primary POA to manage proxies and export SBAR', async () => {
    const manage = await checkPermission(
      DEMO_CAREGIVER_ID,
      'pt-7801',
      'MANAGE_PROXIES',
    );
    expect(manage.permitted).toBe(true);
    const sbar = await checkPermission(
      DEMO_CAREGIVER_ID,
      'pt-7801',
      'EXPORT_SBAR',
    );
    expect(sbar.permitted).toBe(true);
  });

  it('denies Sibling Coordinator manage-proxies while allowing SBAR export', async () => {
    const manage = await checkPermission(
      DEMO_SIBLING_ID,
      'pt-7801',
      'MANAGE_PROXIES',
    );
    expect(manage.permitted).toBe(false);
    const sbar = await checkPermission(
      DEMO_SIBLING_ID,
      'pt-7801',
      'EXPORT_SBAR',
    );
    expect(sbar.permitted).toBe(true);
  });

  it('appends immutable access log entries that cannot be cleared by revoke', async () => {
    await checkPermission(DEMO_CAREGIVER_ID, 'pt-7801', 'READ_VAULT');
    const before = (await listAccessLog('pt-7801')).length;
    expect(before).toBeGreaterThan(0);

    const siblingGrant = (await listProxyGrants('pt-7801')).find(
      (g) => g.role === 'SIBLING_COORDINATOR',
    )!;
    await revokeProxyGrant(siblingGrant.grantId, DEMO_CAREGIVER_ID);
    const after = await listAccessLog('pt-7801');
    expect(after.length).toBeGreaterThan(before);
    expect(after.some((e) => e.action === 'REVOKE_GRANT')).toBe(true);
    expect(after.some((e) => e.action === 'CHECK_READ_VAULT')).toBe(true);
  });

  it('expires emergency pass grants after expiresAt', async () => {
    const now = new Date('2026-09-14T12:00:00.000Z');
    await resetProxyAccessStore(now);
    const later = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const result = await checkPermission(
      'er-temp-pass',
      'pt-7801',
      'READ_VAULT',
      later,
    );
    expect(result.permitted).toBe(false);
  });

  it('evaluates Leo age-out as not due and supports demo force hand-off', async () => {
    const evaluation = evaluateAgeOut('pt-leo-04');
    expect(evaluation.due).toBe(false);
    expect(evaluation.ageYears).toBe(4);

    await expect(
      executeAgeOutHandOff('pt-leo-04', DEMO_CAREGIVER_ID),
    ).rejects.toThrow(/not due/i);

    const result = await executeAgeOutHandOff(
      'pt-leo-04',
      DEMO_CAREGIVER_ID,
      16,
      new Date(),
      { force: true },
    );
    expect(result.revokedGrantIds.length).toBe(1);
    const leoGrants = await listProxyGrants('pt-leo-04');
    expect(leoGrants.every((g) => g.status === 'AGED_OUT')).toBe(true);
    expect(
      (await listAccessLog('pt-leo-04')).some(
        (e) => e.action === 'AGE_OUT_HAND_OFF',
      ),
    ).toBe(true);
  });

  it('requires expiresAt for new EMERGENCY_PASS grants', async () => {
    await expect(
      grantProxyAccess({
        patientId: 'pt-7801',
        granteeId: 'er-2',
        granteeDisplayName: 'ER Pass 2',
        role: 'EMERGENCY_PASS',
        createdBy: DEMO_CAREGIVER_ID,
      }),
    ).rejects.toThrow(/expiresAt/i);
  });

  it('records sibling invite in grants and access log', async () => {
    const grant = await grantProxyAccess({
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
      (await listAccessLog('pt-leo-04')).some(
        (e) => e.action === 'GRANT_SIBLING_COORDINATOR',
      ),
    ).toBe(true);
  });

  it('keeps access log append-only via appendAccessLog', async () => {
    const first = await appendAccessLog({
      grantId: 'g1',
      patientId: 'pt-7801',
      actorId: DEMO_CAREGIVER_ID,
      actorDisplayName: 'Alex Ellis',
      action: 'CUSTOM',
      permitted: true,
    });
    const snapshot = (await listAccessLog('pt-7801')).map((e) => e.logId);
    expect(snapshot).toContain(first.logId);
    await appendAccessLog({
      grantId: 'g1',
      patientId: 'pt-7801',
      actorId: DEMO_CAREGIVER_ID,
      actorDisplayName: 'Alex Ellis',
      action: 'CUSTOM_2',
      permitted: true,
    });
    expect(
      (await listAccessLog('pt-7801')).find((e) => e.logId === first.logId)
        ?.action,
    ).toBe('CUSTOM');
  });

  it('persists grant status across list after age-out', async () => {
    await executeAgeOutHandOff(
      'pt-leo-04',
      DEMO_CAREGIVER_ID,
      16,
      new Date('2026-09-14T12:00:00.000Z'),
      { force: true },
    );
    const again = await listProxyGrants('pt-leo-04');
    expect(again[0]?.status).toBe('AGED_OUT');
  });
});
