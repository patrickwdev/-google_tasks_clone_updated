# Branch: `feature-create-task-task-screen`

Step-by-step overview of what’s on this branch.

---

## 1. Branch purpose

This branch focuses on the **create-task flow** and **task screen** UI/UX: the screen or flow where users create and edit tasks (title, details, due date, location reminder, etc.).

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
| Places / search | Google Places API (autocomplete, details)  |
| Location        | `expo-location`, `expo-task-manager`       |
| Notifications   | `expo-notifications`                      |
| Fonts           | Inter (`@expo-google-fonts/inter`)        |
| Icons           | `lucide-react-native`                     |
| Storage         | `AsyncStorage` (auth, geofence metadata)   |

---

## 4. App structure (step by step)

### 4.1 Entry and layout

- **`app/_layout.tsx`** — Root layout, fonts, splash, AuthProvider, TaskProvider, Stack (index, login, create-account, categories, calendar, settings).

### 4.2 Task detail screen (this branch)

- **`app/task/[id].tsx`** — Task detail screen: shows when a task card is tapped on Home or Calendar. Displays title, details, due date, location reminder; toggle complete, delete, and back navigation.
- **`components/TaskItem.tsx`** — Optional `onPress` prop: when set, tapping the task content (title/details) navigates to the task detail screen. Checkbox and delete button keep their existing behavior.

### 4.3 Create task modal

- **`components/AddTaskModal.tsx`** — Add-task modal: title, details, optional due date, optional “Remind me when I’m near” (place search).

### 4.4 Other relevant areas

- **`context/TaskContext.tsx`** — Task state; `addTask`, `toggleTask`, `deleteTask`.
- **`types/task.ts`** — Task and TaskLocationReminder types.
- **`lib/googlePlaces.ts`**, **`lib/geofencing.ts`** — Place search and geofencing for location reminders.

---

## 5. Flow summary

1. **View task:** User taps a task card on Home or Calendar → navigates to **Task detail** screen (`/task/[id]`). Screen shows full title, details, due date, location reminder; user can mark complete or delete, then go back.
2. **Create task:** User opens FAB → Add Task modal; enters title (required), optional details, date, location reminder; submit → task added; geofences synced if location reminder set.

---

## 6. Features checklist (this branch)

| Feature                                    | Status |
| ------------------------------------------ | ------ |
| Task detail screen (`/task/[id]`)          | ✅     |
| Navigate to task from Home on card tap     | ✅     |
| Navigate to task from Calendar on card tap | ✅     |
| TaskItem optional onPress for navigation   | ✅     |

---

## 7. Setup (from README + .env.example)

1. `npm install` then `npm run dev`.
2. Supabase: Project URL and anon key in `.env`.
3. (Optional) Google Places API key in `.env` for place search in Add Task.
4. Restart dev server after changing `.env`.

---

## 8. Files touched on this branch (reference)

| Area              | Files |
| ----------------- | ----- |
| Task detail       | `app/task/[id].tsx` |
| Layout            | `app/_layout.tsx` |
| Task list UI      | `components/TaskItem.tsx`, `app/index.tsx`, `app/calendar.tsx` |

This document describes the **`feature-create-task-task-screen`** branch and will be updated as features are implemented.
