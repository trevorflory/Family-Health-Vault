import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { subscribeDigestNotificationRouting } from '../services/notificationScheduler';

/**
 * Open daily/weekly digest screens when the caregiver taps a scheduled
 * local notification (foreground/background) or launches from a cold-start tap.
 * No-op on web — expo-notifications response APIs are native-only.
 */
export function useDigestNotificationRouting(): void {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    return subscribeDigestNotificationRouting((href) => {
      router.push(href);
    });
  }, [router]);
}
