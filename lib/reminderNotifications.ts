import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const ANDROID_CHANNEL_ID = 'task-reminders';
const ID_PREFIX = 'reminder-';

/** Ensure Android notification channel exists for time-based task reminders */
async function ensureReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Task reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: true,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
  });
}

/** Build identifier for a single reminder so we can cancel it later */
function reminderIdentifier(taskId: string, reminderDate: Date): string {
  return `${ID_PREFIX}${taskId}-${reminderDate.getTime()}`;
}

/** Cancel all scheduled reminder notifications for a task (e.g. when reminders are updated or task is deleted) */
export async function cancelReminderNotificationsForTask(taskId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const prefix = `${ID_PREFIX}${taskId}-`;
    for (const req of scheduled) {
      if (req.identifier.startsWith(prefix)) {
        await Notifications.cancelScheduledNotificationAsync(req.identifier);
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[reminderNotifications] cancelReminderNotificationsForTask failed', e);
  }
}

/**
 * Schedule local push notifications for each reminder date.
 * Call after creating a task with reminders or after updating a task's reminders.
 * Cancels any existing reminders for this task first, then schedules the new set.
 */
export async function scheduleReminderNotifications(
  taskId: string,
  title: string,
  reminders: Date[]
): Promise<void> {
  if (Platform.OS === 'web' || !reminders?.length) return;
  const now = Date.now();
  const futureReminders = reminders.filter((d) => d.getTime() > now);
  if (futureReminders.length === 0) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      if (requested !== 'granted') return;
    }

    await cancelReminderNotificationsForTask(taskId);
    await ensureReminderChannel();

    for (const date of futureReminders) {
      const id = reminderIdentifier(taskId, date);
      const trigger: Notifications.DateTriggerInput =
        Platform.OS === 'android'
          ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: ANDROID_CHANNEL_ID }
          : { type: Notifications.SchedulableTriggerInputTypes.DATE, date };

      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: 'Task reminder',
          body: title,
          data: { taskId },
          sound: true,
        },
        trigger,
      });
    }
  } catch (e) {
    if (__DEV__) console.warn('[reminderNotifications] scheduleReminderNotifications failed', e);
  }
}
