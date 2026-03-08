import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

function getTaskIdFromNotification(data: Record<string, unknown> | null): string | null {
  if (!data || typeof data !== 'object') return null;
  const taskId = data.taskId;
  return typeof taskId === 'string' && taskId ? taskId : null;
}

/**
 * Listens for notification taps and navigates to the task detail screen when
 * the notification has a taskId (reminder or location reminder). Also handles
 * app opened from a notification (e.g. app was killed).
 * No-op on web (expo-notifications is not supported there).
 */
export function useNotificationNavigation() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const navigateToTask = (taskId: string) => {
      router.push(`/task/${taskId}`);
    };

    // Handle tap when app is in foreground or background
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | null;
      const taskId = getTaskIdFromNotification(data);
      if (taskId) navigateToTask(taskId);
    });

    // Handle app opened from notification (e.g. app was killed)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, unknown> | null;
      const taskId = getTaskIdFromNotification(data);
      if (taskId) {
        // Small delay so the navigator is ready
        setTimeout(() => navigateToTask(taskId), 100);
      }
    });

    return () => subscription.remove();
  }, [router]);
}
