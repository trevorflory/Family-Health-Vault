import * as Notifications from 'expo-notifications';
import type { DigestNotificationDeepLink } from '../types/digest';
import { DEMO_CAREGIVER_ID } from '../data/caregiverHousehold';

export const DAILY_DIGEST_NOTIFICATION_ID = 'digest-daily-0700';
export const WEEKLY_DIGEST_NOTIFICATION_ID = 'digest-weekly-sun-1600';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function dailyDigestDeepLink(
  caregiverId: string = DEMO_CAREGIVER_ID,
): DigestNotificationDeepLink {
  return {
    kind: 'daily',
    pathname: '/digest/daily',
    caregiverId,
  };
}

export function weeklyDigestDeepLink(
  caregiverId: string = DEMO_CAREGIVER_ID,
): DigestNotificationDeepLink {
  return {
    kind: 'weekly',
    pathname: '/digest/weekly',
    caregiverId,
  };
}

/**
 * Request notification permissions. Returns whether scheduling may proceed.
 */
export async function ensureNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return Boolean(
    requested.granted ||
      requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
  );
}

/**
 * Schedule recurring local notifications:
 * - Daily Morning Digest @ 07:00
 * - Weekly Sunday Overview @ 16:00
 * Deep-link payloads open app/digest/daily or app/digest/weekly.
 */
export async function scheduleDigestNotifications(
  caregiverId: string = DEMO_CAREGIVER_ID,
): Promise<{ dailyId: string; weeklyId: string }> {
  const allowed = await ensureNotificationPermissions();
  if (!allowed) {
    throw new Error('Notification permissions not granted');
  }

  // Replace prior digest schedules to avoid duplicates
  await Notifications.cancelScheduledNotificationAsync(DAILY_DIGEST_NOTIFICATION_ID).catch(
    () => undefined,
  );
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_DIGEST_NOTIFICATION_ID).catch(
    () => undefined,
  );

  const dailyData = dailyDigestDeepLink(caregiverId) as unknown as Record<
    string,
    unknown
  >;
  const weeklyData = weeklyDigestDeepLink(caregiverId) as unknown as Record<
    string,
    unknown
  >;

  const dailyId = await Notifications.scheduleNotificationAsync({
    identifier: DAILY_DIGEST_NOTIFICATION_ID,
    content: {
      title: 'Daily Morning Digest',
      body: 'Meds, 72-hour visits, and overdue caregiver tasks are ready.',
      data: dailyData,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 7,
      minute: 0,
    },
  });

  const weeklyId = await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_DIGEST_NOTIFICATION_ID,
    content: {
      title: 'Weekly Sunday Overview',
      body: '7-day vitals, adherence, and next week’s household schedule.',
      data: weeklyData,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday in expo-notifications (1=Sunday … 7=Saturday)
      hour: 16,
      minute: 0,
    },
  });

  return { dailyId, weeklyId };
}

export async function cancelDigestNotifications(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_DIGEST_NOTIFICATION_ID).catch(
    () => undefined,
  );
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_DIGEST_NOTIFICATION_ID).catch(
    () => undefined,
  );
}

/** Map a notification data payload to an Expo Router digest href. */
export function resolveDigestPathFromNotificationData(
  data: Record<string, unknown> | undefined,
): '/digest/daily' | '/digest/weekly' | null {
  if (!data) return null;
  if (data.pathname === '/digest/daily' || data.kind === 'daily') return '/digest/daily';
  if (data.pathname === '/digest/weekly' || data.kind === 'weekly') {
    return '/digest/weekly';
  }
  return null;
}

export interface DigestNotificationHref {
  pathname: '/digest/daily' | '/digest/weekly';
  params?: { caregiverId: string };
}

/**
 * Build a router.push target from notification content.data
 * (cold start or tap while app is open).
 */
export function digestHrefFromNotificationData(
  data: Record<string, unknown> | undefined,
): DigestNotificationHref | null {
  const pathname = resolveDigestPathFromNotificationData(data);
  if (!pathname) return null;
  const caregiverId =
    typeof data?.caregiverId === 'string' && data.caregiverId.trim()
      ? data.caregiverId.trim()
      : undefined;
  return caregiverId ? { pathname, params: { caregiverId } } : { pathname };
}

/**
 * Subscribe to digest notification taps and handle the last response (cold start).
 * Returns an unsubscribe function.
 */
export function subscribeDigestNotificationRouting(
  navigate: (href: DigestNotificationHref) => void,
): () => void {
  const handle = (data: Record<string, unknown> | undefined) => {
    const href = digestHrefFromNotificationData(data);
    if (href) navigate(href);
  };

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handle(
      response.notification.request.content.data as Record<string, unknown>,
    );
  });

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return;
    handle(
      response.notification.request.content.data as Record<string, unknown>,
    );
  });

  return () => {
    sub.remove();
  };
}
