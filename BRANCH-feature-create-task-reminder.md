# Branch: `feature-create-task-reminder`

Step-by-step overview of what's on this branch.

---

## 1. Branch purpose

This branch adds **task reminder creation** to the Google Tasks–style app. Users can set a reminder (date/time) when creating a task so they get notified at the chosen time.

---

## 2. Project overview

- **App type:** React Native (Expo) task app.
- **Auth:** Supabase Auth (as configured on the auth branch).
- **Tasks:** Tasks can have an associated reminder; the create-task flow includes UI and logic to set and persist reminders.

---

## 3. Tech stack

| Layer        | Technology                |
| ------------ | ------------------------- |
| Framework    | Expo (React Native)       |
| Router       | Expo Router (file-based)  |
| Auth backend | Supabase Auth             |
| Database     | Supabase Postgres (tasks) |
| Notifications| Expo Notifications (if reminders trigger alerts) |

---

## 4. App structure (reminder-related)

### 4.1 Data model

- **Tasks**
  - Task records support a reminder date/time (and optionally notification IDs if using Expo Notifications).

### 4.2 Context and hooks

- Task context or hooks to create/update tasks including reminder fields; optional notification scheduling when a reminder is set.

### 4.3 Screens and UI

- **Create task screen**
  - Optional “Set reminder” or “Remind me at” control (date/time picker or similar).
  - Reminder value saved with the task on create.

---

## 5. Flow summary

1. User opens the create-task screen.
2. User enters task details and optionally sets a reminder date/time.
3. On save, the task is created with the reminder stored (and optionally a notification scheduled).
4. User can later be reminded at the set time (if notifications are implemented).

---

## 6. Setup / migration notes

1. Ensure task schema supports reminder fields (migration if needed).
2. Add reminder UI to the create-task flow.
3. Optionally wire to Expo Notifications for actual alerts.
4. Run the app as usual (`npm install`, then `npm run dev` or the existing start command).

---

## 7. Files touched on this branch (reference)

*(Keep this list updated as you work on the branch.)*

| Area       | Files (expected)                                      |
| ---------- | ----------------------------------------------------- |
| Create task| Create-task screen, form, validation                   |
| Data       | Task types, Supabase insert/update (reminder field)   |
| Components | Reminder picker, date/time input                      |
| Context    | Task context or hooks (create task with reminder)     |

This document describes the current state of the **`feature-create-task-reminder`** branch step by step.
