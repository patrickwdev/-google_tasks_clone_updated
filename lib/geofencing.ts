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

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "You're nearby",
        body: `${title} — ${locationName}`,
        data: { taskId },
      },
      trigger: null,
    });
  } catch (_) {
    // Fallback if storage read fails
    await Notifications.scheduleNotificationAsync({
      content: { title: "You're nearby", body: 'You have a task near this location.', data: { taskId } },
      trigger: null,
    });
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

  await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, regions);
}

/** Request permissions needed for location reminders (location + notifications) */
export async function requestLocationReminderPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: loc } = await Location.requestForegroundPermissionsAsync();
  if (loc !== 'granted') return false;
  const { status: notif } = await Notifications.requestPermissionsAsync();
  return notif === 'granted';
}
