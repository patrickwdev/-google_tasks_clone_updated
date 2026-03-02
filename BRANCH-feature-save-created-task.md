# Branch: `feature-save-created-task`

Step-by-step overview of what's on this branch.

---

## 1. Branch purpose

This branch focuses on **saving created tasks** so that new tasks are persisted (e.g. to Supabase or local storage) instead of staying in-memory only. Created tasks should survive app restarts and sync where applicable.

---

## 2. Project overview

- **App type:** React Native (Expo) task app with auth and location reminders.
- **Auth:** Supabase Auth (sign up, sign in, sign out).
- **Tasks:** Task list with add, complete, delete; optional date and location reminder (place search + geofencing notifications). This branch adds persistence for created tasks.

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
| Storage         | `AsyncStorage` (auth, geofence metadata); **Supabase** (tasks table) for task persistence |

---

## 4. App structure (step by step)

### 4.1 Entry and layout

- **`app/_layout.tsx`** — Root layout, fonts, splash, AuthProvider, TaskProvider, Stack (index, login, create-account, categories, calendar, settings).

### 4.2 Create task and task context

- **`components/AddTaskModal.tsx`** — Add-task modal: title, details, optional due date, optional "Remind me when I'm near" (place search). On submit, task should be saved via TaskContext.
- **`context/TaskContext.tsx`** — Task state; when user is logged in, tasks are loaded from Supabase and all mutations (add, toggle, delete, update date/location, subtasks) are persisted to Supabase. When not logged in, tasks stay in-memory (default demo tasks).
- **`lib/tasksDb.ts`** — Supabase CRUD for tasks: `fetchTasks`, `insertTask`, `updateTask`, `deleteTaskById`; maps between app `Task` type and DB rows.

### 4.3 Other relevant areas

- **`types/task.ts`** — Task and TaskLocationReminder types.
- **`lib/googlePlaces.ts`**, **`lib/geofencing.ts`** — Place search and geofencing for location reminders.

---

## 5. Flow summary

1. **Create task:** User opens FAB → Add Task modal; enters title (required), optional details, date, location reminder; submit → task is **saved to Supabase** (when logged in) and added to the list; geofences synced if location reminder set.
2. **Persistence:** When logged in, tasks are stored in Supabase `tasks` table (per user, RLS). On app open, tasks are loaded from Supabase. Toggle, delete, and updates (date, location reminder, subtasks) are synced to Supabase.

---

## 6. Features checklist (this branch)

| Feature                              | Status |
| ------------------------------------ | ------ |
| Save created task to Supabase        | ✅     |
| Load tasks from Supabase on app start (when logged in) | ✅ |
| Toggle complete / delete / update synced to Supabase   | ✅ |
| Subtasks and location reminder persisted               | ✅ |

---

## 7. Setup (from README + .env.example)

1. `npm install` then `npm run dev`.
2. Supabase: Project URL and anon key in `.env`.
3. **Create the tasks table:** Run the SQL in `supabase/migrations/001_create_tasks.sql` in your Supabase project (Dashboard → SQL Editor). This creates the `tasks` table and RLS policies so each user only sees their own tasks.
4. (Optional) Google Places API key in `.env` for place search in Add Task.
5. Restart dev server after changing `.env`.

---

## 8. Files touched on this branch (reference)

| Area              | Files |
| ----------------- | ----- |
| Task context      | `context/TaskContext.tsx` |
| Supabase tasks DB | `lib/tasksDb.ts` (fetch, insert, update, delete) |
| Schema / migration| `supabase/migrations/001_create_tasks.sql` |

This document describes the **`feature-save-created-task`** branch and will be updated as features are implemented.
