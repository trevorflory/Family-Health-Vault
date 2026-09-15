import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { subscribeDigestNotificationRouting } from '../services/notificationScheduler';

/**
 * Open daily/weekly digest screens when the caregiver taps a scheduled
 * local notification (foreground/background) or launches from a cold-start tap.
 */
export function useDigestNotificationRouting(): void {
  const router = useRouter();

  useEffect(() => {
    return subscribeDigestNotificationRouting((href) => {
      router.push(href);
    });
  }, [router]);
}
