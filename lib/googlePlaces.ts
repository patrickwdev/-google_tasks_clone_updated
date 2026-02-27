import { Platform } from 'react-native';
import Constants from 'expo-constants';

type Extra = {
  googlePlacesApiKey?: string;
  googlePlacesApiKeyAndroid?: string;
};
const extra = (Constants.expoConfig as { extra?: Extra })?.extra;
const DEFAULT_KEY = extra?.googlePlacesApiKey ?? process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
const ANDROID_KEY = extra?.googlePlacesApiKeyAndroid ?? process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY_ANDROID ?? '';

const AUTocomplete_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACE_DETAILS_BASE = 'https://places.googleapis.com/v1/places';

export interface PlaceSuggestion {
  placeId: string;
  text: string;
}

export interface PlaceDetails {
  displayName: string;
  latitude: number;
  longitude: number;
}

function getApiKey(): string {
  // Use Android-specific key only if set; otherwise same key as web (must have "None" restriction for Android)
  if (Platform.OS === 'android' && ANDROID_KEY.trim()) return ANDROID_KEY;
  return DEFAULT_KEY;
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(getApiKey().trim());
}

export type AutocompleteResult = { suggestions: PlaceSuggestion[]; error?: string };

/** Optional location to bias suggestions toward (e.g. user's current location) */
export interface LocationBias {
  latitude: number;
  longitude: number;
}

const LOCATION_BIAS_RADIUS_METERS = 50000; // 50 km

/** Fetch autocomplete suggestions for a text query (Places API New). Pass location to bias results near the user. */
export async function fetchAutocompleteSuggestions(
  query: string,
  options?: { location?: LocationBias }
): Promise<AutocompleteResult> {
  const key = getApiKey();
  if (!key.trim()) return { suggestions: [] };

  const trimmed = query.trim();
  if (trimmed.length < 2) return { suggestions: [] };

  const body: Record<string, unknown> = {
    input: trimmed,
    languageCode: 'en',
  };
  if (options?.location) {
    body.locationBias = {
      circle: {
        center: {
          latitude: options.location.latitude,
          longitude: options.location.longitude,
        },
        radius: LOCATION_BIAS_RADIUS_METERS,
      },
    };
  }

  try {
    const res = await fetch(AUTocomplete_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as
      | { suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string } }; queryPrediction?: unknown }> }
      | { error?: { message?: string; status?: string } };
    if (!res.ok) {
      const err = data as { error?: { message?: string } };
      const msg = err?.error?.message ?? `Request failed (${res.status})`;
      return { suggestions: [], error: msg };
    }
    const list = (data as { suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string } } }> }).suggestions ?? [];
    const suggestions = list
      .filter((s): s is { placePrediction: { placeId: string; text: { text: string } } } => Boolean(s.placePrediction?.placeId && s.placePrediction?.text?.text))
      .map((s) => ({
        placeId: s.placePrediction.placeId,
        text: s.placePrediction.text.text,
      }));
    return { suggestions };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error';
    return { suggestions: [], error: message };
  }
}

/** Fetch place details (display name and location) by place ID */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = getApiKey();
  if (!key.trim()) return null;

  try {
    const url = `${PLACE_DETAILS_BASE}/${encodeURIComponent(placeId)}?fields=displayName,location`;
    const res = await fetch(url, {
      headers: { 'X-Goog-Api-Key': key },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      displayName?: { text?: string };
      location?: { latitude?: number; longitude?: number };
    };
    const name = data.displayName?.text ?? '';
    const lat = data.location?.latitude;
    const lng = data.location?.longitude;
    if (name && typeof lat === 'number' && typeof lng === 'number') {
      return { displayName: name, latitude: lat, longitude: lng };
    }
    return null;
  } catch {
    return null;
  }
}
