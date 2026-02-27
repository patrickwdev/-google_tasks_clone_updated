# Branch: `create-task-places`

Step-by-step overview of what’s on this branch.

---

## 1. Branch purpose

This branch adds **create-task** flows with **optional due date** and **“remind me when I’m near” location reminders** (Google Places + geofencing). User auth (Supabase) is in place; tasks are still in-memory (no Supabase persistence yet).

---

## 2. Project overview

- **App type:** React Native (Expo) task app with auth and location reminders.
- **Auth:** Supabase Auth (sign up, sign in, sign out).
- **Tasks:** In-memory task list with add, complete, delete; optional date and location reminder (place search + geofencing notifications).

---

## 3. Tech stack

| Layer           | Technology                                |
| --------------- | ----------------------------------------- |
| Framework       | Expo (React Native)                       |
| Router          | Expo Router (file-based)                  |
| Auth backend    | Supabase Auth                             |
| Places / search | Google Places API (autocomplete, details) |
| Location        | `expo-location`, `expo-task-manager`      |
| Notifications   | `expo-notifications`                     |
| Fonts           | Inter (`@expo-google-fonts/inter`)        |
| Icons           | `lucide-react-native`                     |
| Storage         | `AsyncStorage` (auth, geofence metadata)  |

---

## 4. App structure (step by step)

### 4.1 Entry and layout

- **`app/_layout.tsx`**
  - Loads Inter fonts; splash (“TASK WORKS”).
  - Wraps app in `AuthProvider` then `TaskProvider`.
  - Imports `../lib/geofencing` to register background geofencing task and notification handler.
  - Stack: `index`, `login`, `create-account`, `categories`, `calendar`, `settings`.
  - Header hidden; fade animation.

### 4.2 Environment and Supabase

- **`.env.example`**
  - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  - Optional: Google Places API key for location search (e.g. `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`).

- **`lib/supabase.ts`**
  - Supabase client; AsyncStorage for auth persistence; session refresh on foreground.

### 4.3 Auth context and screens

- **`context/AuthContext.tsx`**
  - User: `id`, `email`, `fullName`.
  - `signUp`, `signIn`, `signOut`; email uniqueness handling; deep link for confirmation.

- **`app/index.tsx` (Home)**
  - Redirects to `/login` if no session/user.
  - Greeting with user’s first name; “X tasks to complete today.”
  - Month + week strip (Mon–Sun), today highlighted.
  - “Today’s Tasks” list (incomplete first, then by date).
  - Search button (UI only).
  - Bottom nav: My Day (active), Categories, Calendar, Settings.
  - FAB (+) opens Add Task modal.

- **`app/login.tsx`**, **`app/create-account.tsx`**
  - Sign in and sign up with Supabase.

### 4.4 Task context and types

- **`types/task.ts`**
  - `Task`: `id`, `title`, `details?`, `isCompleted`, `date?`, `listId`, `locationReminder?`.
  - `TaskLocationReminder`: `locationName`, `latitude`, `longitude`.
  - `TaskContextType`: `tasks`, `addTask`, `toggleTask`, `deleteTask`.

- **`context/TaskContext.tsx`**
  - In-memory task list (no Supabase DB).
  - `addTask(title, details?, date?, locationReminder?)`.
  - `toggleTask(id)`, `deleteTask(id)`.
  - On task change, calls `syncGeofencesForTasks(tasks)` so geofences match tasks with location reminders.

### 4.5 Create task and location reminders

- **`components/AddTaskModal.tsx`**
  - Title (required), details (optional).
  - Optional due date: calendar picker (`react-native-calendars`).
  - Optional “Remind me when I’m near”: place search (Google Places autocomplete + place details for lat/lng), permission flow, then `onAdd(..., locationReminder)`.
  - Uses `lib/googlePlaces.ts` when API key is set; otherwise location reminder can be skipped or simplified.

- **`lib/googlePlaces.ts`**
  - `isGooglePlacesConfigured()`, `fetchAutocompleteSuggestions(query)`, `fetchPlaceDetails(placeId)`.
  - Returns place name and coordinates for `TaskLocationReminder`.

- **`lib/geofencing.ts`**
  - `requestLocationReminderPermissions()`: background location + notifications.
  - `syncGeofencesForTasks(tasks)`: registers geofences for tasks that have `locationReminder`; stores task title/location name in AsyncStorage for the background task.
  - Background task (top-level `TaskManager.defineTask`): on region **enter**, reads task info from storage and schedules a local notification (“You’re nearby — [task title] — [location name]”).
  - Geofence radius ~200 m.

### 4.6 Task list UI

- **`components/TaskItem.tsx`**
  - Checkbox (complete/incomplete), title, optional details, optional date (formatted), optional location pin.
  - `onToggle`, `onDelete`.

### 4.7 Other screens

- **`app/categories.tsx`** — Categories/lists (placeholder or simple list).
- **`app/calendar.tsx`** — Calendar view (placeholder or simple calendar).
- **`app/settings.tsx`** — User options, sign out → `/login`.

---

## 5. Flow summary

1. **Cold start** → Splash → AuthProvider restores session (or not).
2. **No session** → Home redirects to **Login**.
3. **Login / Create account** → Supabase auth → Home.
4. **Home** → Task list; FAB opens **Add Task** modal.
5. **Add Task** → Title (required); optional details, date, “remind me when I’m near” (place search → permission → geofence). Submit → task added in memory; geofences synced.
6. **Task list** → Toggle complete, delete. Entering a geofence → background task fires → notification.
7. **Categories / Calendar / Settings** → Navigation only (Settings: sign out).

---

## 6. Features checklist (this branch)

| Feature                          | Status |
| --------------------------------- | ------ |
| User auth (Supabase sign up/login)| ✅     |
| Home / My Day with task list     | ✅     |
| Create task (title, details)     | ✅     |
| Optional due date (calendar)     | ✅     |
| “Remind me when I’m near” (place)| ✅     |
| Google Places autocomplete       | ✅     |
| Geofencing + background task     | ✅     |
| Notification when entering zone  | ✅     |
| Toggle complete / delete task    | ✅     |
| Categories / Calendar / Settings | ✅ (screens) |
| Tasks persisted in Supabase      | ❌ (in-memory only) |

---

## 7. Setup (from README + .env.example)

1. `npm install` then `npm run dev`.
2. Supabase: Project URL and anon key in `.env`.
3. (Optional) Google Places API key in `.env` for place search in Add Task.
4. Restart dev server after changing `.env`.

---

## 8. Files touched on this branch (reference)

| Area        | Files |
| ----------- | ----- |
| Layout      | `app/_layout.tsx` |
| Auth        | `context/AuthContext.tsx`, `app/login.tsx`, `app/create-account.tsx` |
| Home / tasks| `app/index.tsx`, `context/TaskContext.tsx`, `components/TaskItem.tsx`, `components/AddTaskModal.tsx` |
| Types       | `types/task.ts` |
| Location    | `lib/geofencing.ts`, `lib/googlePlaces.ts` |
| Config      | `.env.example`, `app.config.js`, `app.json`, `package.json`, `package-lock.json` |

This document describes the current state of the **`create-task-places`** branch.
