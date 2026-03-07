import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task } from '../types/task';

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }),
});

const GEOFENCING_TASK_NAME = 'location-reminder-geofencing';
const DEFAULT_RADIUS_METERS = 152; // ~500 ft
const FEET_TO_METERS = 0.3048;
const MIN_RADIUS_METERS = 3;    // ~10 ft
const MAX_RADIUS_METERS = 1524; // ~5000 ft
const STORAGE_KEY_GEOFENCE_DETAILS = 'geofence_task_details';
const STORAGE_KEY_ALREADY_NOTIFIED_PREFIX = 'geofence_already_notified_';
const ALREADY_INSIDE_THROTTLE_MS = 60 * 60 * 1000; // 1 hour — don't re-notify "already inside" more than once per hour per task
const ALREADY_INSIDE_RADIUS_BUFFER = 1.4; // treat user as "inside" if within 1.4x radius (GPS drift / inaccuracy)
const ANDROID_CHANNEL_ID = 'location-reminders';

/** Distance in meters between two lat/lng points (Haversine) */
function distanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Ensure Android notification channel exists so "You're nearby" shows as a visible push notification */
async function ensureLocationReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Location reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: true,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
  });
}

/** Schedule the "You're nearby" push notification (used from background geofence task and "already inside" check) */
async function scheduleNearbyPushNotification(taskId: string, title: string, locationName: string): Promise<void> {
  await ensureLocationReminderChannel();
  // trigger: null = show immediately. Using { channelId } alone is not a valid "fire now" trigger and can prevent the notification from showing.
  // On Android we use a 1s delay with channelId so the notification uses our high-priority channel and still appears reliably.
  const trigger: Notifications.NotificationTriggerInput =
    Platform.OS === 'android'
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: ANDROID_CHANNEL_ID }
      : null;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "You're nearby",
      body: `${title} — ${locationName}`,
      data: { taskId },
    },
    trigger,
  });
}

/** Must be defined at top level for background execution */
TaskManager.defineTask(GEOFENCING_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const event = data as { eventType: 'enter' | 'exit'; region: { identifier: string } };
  if (event?.eventType !== 'enter' || !event.region?.identifier) return;

  const taskId = event.region.identifier;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_GEOFENCE_DETAILS);
    const details = raw ? (JSON.parse(raw) as Record<string, { title: string; locationName: string }>) : {};
    const info = details[taskId];
    const title = info?.title ?? 'Task reminder';
    const locationName = info?.locationName ?? 'your location';

    await scheduleNearbyPushNotification(taskId, title, locationName);
  } catch (_) {
    // Fallback if storage read fails
    await scheduleNearbyPushNotification(taskId, 'Task reminder', 'your location');
  }
});

/** Geocode a place name to coordinates using OpenStreetMap Nominatim (no API key) */
export async function geocodePlaceName(placeName: string): Promise<{ latitude: number; longitude: number } | null> {
  const trimmed = placeName.trim();
  if (!trimmed) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'TaskWorksApp/1.0' },
    });
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!Array.isArray(data) || data.length === 0) return null;
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/** Sync geofences with current tasks that have location reminders (iOS/Android only) */
export async function syncGeofencesForTasks(tasks: Task[]): Promise<void> {
  if (Platform.OS === 'web') return;

  const withLocation = tasks.filter(
    (t) => !t.isCompleted && t.locationReminder && t.locationReminder.latitude != null && t.locationReminder.longitude != null
  );

  const details: Record<string, { title: string; locationName: string }> = {};
  const regions: Location.GeofencingRegion[] = withLocation.map((t) => {
    const r = t.locationReminder!;
    const radiusMeters = r.radiusFeet != null
      ? Math.min(MAX_RADIUS_METERS, Math.max(MIN_RADIUS_METERS, r.radiusFeet * FEET_TO_METERS))
      : DEFAULT_RADIUS_METERS;
    details[t.id] = { title: t.title, locationName: r.locationName };
    return {
      identifier: t.id,
      latitude: r.latitude,
      longitude: r.longitude,
      radius: radiusMeters,
      notifyOnEnter: true,
      notifyOnExit: false,
    };
  });

  await AsyncStorage.setItem(STORAGE_KEY_GEOFENCE_DETAILS, JSON.stringify(details));

  const { status: locStatus } = await Location.getForegroundPermissionsAsync();
  if (locStatus !== 'granted') return;

  const notifStatus = await Notifications.getPermissionsAsync();
  if (notifStatus.status !== 'granted') return;

  if (regions.length === 0) {
    await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
    return;
  }

  await ensureLocationReminderChannel();
  await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, regions);

  // If user is already inside a geofence (e.g. they added a task at their current location), the OS won't fire "enter".
  // Check once and notify for any region we're already inside (throttled per task).
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      maxAge: 30000,
      timeout: 8000,
    });
    const userLat = pos.coords.latitude;
    const userLon = pos.coords.longitude;
    const now = Date.now();
    for (const t of withLocation) {
      const r = t.locationReminder!;
      const radiusMeters = r.radiusFeet != null
        ? Math.min(MAX_RADIUS_METERS, Math.max(MIN_RADIUS_METERS, r.radiusFeet * FEET_TO_METERS))
        : DEFAULT_RADIUS_METERS;
      const dist = distanceMeters(userLat, userLon, r.latitude, r.longitude);
      const effectiveRadius = radiusMeters * ALREADY_INSIDE_RADIUS_BUFFER; // buffer for GPS drift
      if (__DEV__) {
        console.log('[geofencing] already-inside check', { taskId: t.id, distM: Math.round(dist), radiusM: Math.round(radiusMeters), inside: dist <= effectiveRadius });
      }
      if (dist > effectiveRadius) continue;
      const throttleKey = STORAGE_KEY_ALREADY_NOTIFIED_PREFIX + t.id;
      const lastRaw = await AsyncStorage.getItem(throttleKey);
      const last = lastRaw ? parseInt(lastRaw, 10) : 0;
      if (now - last < ALREADY_INSIDE_THROTTLE_MS) continue;
      await scheduleNearbyPushNotification(t.id, t.title, r.locationName);
      await AsyncStorage.setItem(throttleKey, String(now));
      if (__DEV__) console.log('[geofencing] Fired "already inside" notification for task', t.id);
    }
  } catch (e) {
    if (__DEV__) console.warn('[geofencing] already-inside check failed', e);
    // Enter event will still fire when they leave and come back
  }
}

/** Request permissions needed for location reminders (location, background location, and notifications) so you get a push when within the selected distance */
export async function requestLocationReminderPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: loc } = await Location.requestForegroundPermissionsAsync();
  if (loc !== 'granted') return false;
  // Request background location so geofencing can trigger the push when the app is in background or closed
  await Location.requestBackgroundPermissionsAsync();
  const { status: notif } = await Notifications.requestPermissionsAsync();
  if (notif !== 'granted') return false;
  await ensureLocationReminderChannel();
  return true;
}
