# Branch: `feature-notifications`

Step-by-step overview of what's on this branch.

---

## 1. Branch purpose

This branch adds **notifications support** to the Google Tasks–style app. Users can receive reminders or alerts for tasks (e.g. due dates, custom reminders).

---

## 2. Project overview

- **App type:** React Native (Expo) task app with notifications.
- **Auth:** Supabase Auth, as configured on the auth branch.
- **Tasks:** Tasks can have associated notification/reminder settings; the app integrates with device notification APIs (e.g. Expo Notifications).

---

## 3. Tech stack

| Layer           | Technology                          |
| --------------- | ------------------------------------ |
| Framework       | Expo (React Native)                 |
| Router          | Expo Router (file-based)            |
| Auth backend    | Supabase Auth                       |
| Notifications   | Expo Notifications (push/local)     |
| Database        | Supabase Postgres (tasks/reminders as needed) |

---

## 4. App structure (notifications-related)

### 4.1 Data model

- **Tasks / reminders**
  - Tasks may have reminder times or due-date-based notification preferences.
  - Optional table or columns for storing scheduled notification identifiers.

### 4.2 Context and hooks

- Task/notification context or hooks to:
  - Schedule, update, and cancel local (or push) notifications for tasks.
  - Request notification permissions and handle token/registration if using push.

### 4.3 Screens and UI

- **Task creation/editing**
  - Option to set a reminder or “notify me at” time for a task.
- **Settings**
  - Notification permission status and preference toggles (if applicable).

---

## 5. Flow summary

1. User grants notification permission when prompted.
2. When creating or editing a task, user can set a reminder time.
3. App schedules a local (or push) notification for that time.
4. User receives the notification on the device at the scheduled time.

---

## 6. Setup / migration notes

1. Install and configure Expo Notifications (`expo-notifications`).
2. Add any Supabase migrations if storing reminder data or notification metadata.
3. Run the app as usual (`npm install`, then `npm run dev` or the existing start command).
4. Ensure notification permissions are requested and handled in the app flow.

---

## 7. Files touched on this branch (reference)

*(Keep this list updated as you work on the branch.)*

| Area        | Files (expected) |
| ----------- | ---------------- |
| Notifications | `expo-notifications` config, notification service/helper |
| Context     | Task/notification context or hooks for scheduling |
| Screens     | Task create/edit screens (reminder UI), settings if needed |
| Components  | Reminder picker, permission prompt UI |

This document describes the current state of the **`feature-notifications`** branch step by step.
