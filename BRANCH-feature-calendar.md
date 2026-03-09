# Branch: `feature-calendar`

Step-by-step overview of what's on this branch.

---

## 1. Branch purpose

This branch adds **calendar** support to the Google Tasks–style app. Users can view and manage tasks in a calendar view (e.g. by due date or reminders).

---

## 2. Project overview

- **App type:** React Native (Expo) task app with calendar view.
- **Auth:** Supabase Auth, as configured on the auth branch.
- **Tasks:** Tasks (with due dates/reminders where applicable) displayed and navigable via a calendar.

---

## 3. Tech stack

| Layer        | Technology                          |
| ------------ | ------------------------------------ |
| Framework    | Expo (React Native)                 |
| Router       | Expo Router (file-based)            |
| Auth backend | Supabase Auth                       |
| Database     | Supabase Postgres (`tasks` table)   |
| Calendar UI  | react-native-calendars (already in package.json) |

---

## 4. App structure (calendar-related)

### 4.1 Data model

- **Tasks table**
  - Uses existing `due_date` and reminder fields where present.
  - Calendar view may filter/aggregate tasks by date.

### 4.2 Context and hooks

- Task-related context/hooks used to:
  - Fetch tasks for a date range or by due date.
  - Support navigation from calendar date to task list or task detail.

### 4.3 Screens and UI

- **Calendar screen**
  - Calendar component (e.g. react-native-calendars) showing dates with tasks.
  - Tapping a date shows tasks due (or relevant) on that day.
- **Integration**
  - Link from Home/Today or tabs to Calendar view.
  - Optional: create task from a selected date with due date pre-filled.

---

## 5. Flow summary

1. User signs in (existing auth flow).
2. User opens the Calendar view.
3. User sees a calendar with markers or counts for dates that have tasks.
4. User selects a date to see tasks for that day (and optionally create/edit tasks).

---

## 6. Setup / migration notes

1. No new migrations required unless calendar-specific fields are added.
2. Run the app as usual (`npm install`, then `npm run dev`).
3. Ensure Supabase env vars are configured as per `.env.example`.

---

## 7. Files touched on this branch (reference)

*(Keep this list updated as you work on the branch.)*

| Area        | Files (expected) |
| ----------- | ---------------- |
| Screens     | `app/calendar.tsx` or calendar route, tab config |
| Components  | Calendar component, date picker or list-by-date |
| Context/API | Task hooks/context for date-range or by-date queries |

This document describes the current state of the **`feature-calendar`** branch step by step.
