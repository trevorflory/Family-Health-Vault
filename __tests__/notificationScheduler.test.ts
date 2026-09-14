const scheduleNotificationAsync = jest.fn();
const cancelScheduledNotificationAsync = jest.fn();
const getPermissionsAsync = jest.fn();
const requestPermissionsAsync = jest.fn();
const setNotificationHandler = jest.fn();

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
  },
  IosAuthorizationStatus: { PROVISIONAL: 2 },
  setNotificationHandler: (...args: unknown[]) => setNotificationHandler(...args),
  getPermissionsAsync: (...args: unknown[]) => getPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) => requestPermissionsAsync(...args),
  scheduleNotificationAsync: (...args: unknown[]) => scheduleNotificationAsync(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) =>
    cancelScheduledNotificationAsync(...args),
}));

import {
  DAILY_DIGEST_NOTIFICATION_ID,
  WEEKLY_DIGEST_NOTIFICATION_ID,
  dailyDigestDeepLink,
  resolveDigestPathFromNotificationData,
  scheduleDigestNotifications,
  weeklyDigestDeepLink,
} from '../services/notificationScheduler';

describe('notificationScheduler', () => {
  beforeEach(() => {
    scheduleNotificationAsync.mockReset();
    cancelScheduledNotificationAsync.mockReset();
    getPermissionsAsync.mockReset();
    requestPermissionsAsync.mockReset();
    cancelScheduledNotificationAsync.mockResolvedValue(undefined);
    getPermissionsAsync.mockResolvedValue({ granted: true });
    scheduleNotificationAsync
      .mockResolvedValueOnce(DAILY_DIGEST_NOTIFICATION_ID)
      .mockResolvedValueOnce(WEEKLY_DIGEST_NOTIFICATION_ID);
  });

  it('builds deep links to daily and weekly digest routes', () => {
    expect(dailyDigestDeepLink('cg-sandwich-01')).toEqual({
      kind: 'daily',
      pathname: '/digest/daily',
      caregiverId: 'cg-sandwich-01',
    });
    expect(weeklyDigestDeepLink('cg-sandwich-01').pathname).toBe('/digest/weekly');
  });

  it('schedules daily 7:00 and Sunday 16:00 local notifications with deep-link data', async () => {
    const result = await scheduleDigestNotifications('cg-sandwich-01');

    expect(result.dailyId).toBe(DAILY_DIGEST_NOTIFICATION_ID);
    expect(result.weeklyId).toBe(WEEKLY_DIGEST_NOTIFICATION_ID);
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(2);

    const dailyCall = scheduleNotificationAsync.mock.calls[0][0];
    expect(dailyCall.trigger).toEqual({
      type: 'daily',
      hour: 7,
      minute: 0,
    });
    expect(dailyCall.content.data.pathname).toBe('/digest/daily');

    const weeklyCall = scheduleNotificationAsync.mock.calls[1][0];
    expect(weeklyCall.trigger).toEqual({
      type: 'weekly',
      weekday: 1,
      hour: 16,
      minute: 0,
    });
    expect(weeklyCall.content.data.pathname).toBe('/digest/weekly');
  });

  it('resolves notification taps to digest routes', () => {
    expect(
      resolveDigestPathFromNotificationData({ kind: 'daily', pathname: '/digest/daily' }),
    ).toBe('/digest/daily');
    expect(resolveDigestPathFromNotificationData({ kind: 'weekly' })).toBe(
      '/digest/weekly',
    );
    expect(resolveDigestPathFromNotificationData({})).toBeNull();
  });

  it('refuses to schedule without permission', async () => {
    getPermissionsAsync.mockResolvedValue({ granted: false, ios: {} });
    requestPermissionsAsync.mockResolvedValue({ granted: false, ios: {} });
    await expect(scheduleDigestNotifications()).rejects.toThrow(/permissions/i);
  });
});
