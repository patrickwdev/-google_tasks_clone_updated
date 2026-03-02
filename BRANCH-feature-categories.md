# Branch: `feature-categories`

Step-by-step overview of what’s on this branch.

---

## 1. Branch purpose

This branch adds **task categories/lists support** to the Google Tasks–style app. Tasks can be grouped into categories (lists), and the UI gains category-aware views and filters.

---

## 2. Project overview

- **App type:** React Native (Expo) task app with categories.
- **Auth:** Supabase Auth, as configured on the auth branch.
- **Tasks:** Tasks stored with an associated category/list so users can organize work by list.

---

## 3. Tech stack

| Layer        | Technology                          |
| ------------ | ------------------------------------ |
| Framework    | Expo (React Native)                 |
| Router       | Expo Router (file-based)            |
| Auth backend | Supabase Auth                       |
| Database     | Supabase Postgres (`tasks` table with `category`) |

---

## 4. App structure (categories-related)

### 4.1 Data model

- **Tasks table**
  - Extended to include a `category` (or list identifier) column.
  - Existing tasks are associated with a default category/list.

### 4.2 Context and hooks

- Task-related context/hooks updated to:
  - Carry a `category` field on each task.
  - Support adding tasks into a specific category.
  - Support filtering tasks by category.

### 4.3 Screens and UI

- **Home / Today**
  - Can optionally filter or highlight by category.
- **Categories screen**
  - Shows all categories/lists and counts of tasks per category.
  - Selecting a category shows tasks scoped to that category.
- **Task creation/editing**
  - UI updated to let users choose a category when creating a task.

---

## 5. Flow summary

1. User signs in (existing auth flow).
2. User can view available categories/lists.
3. When creating a task, user selects a category.
4. Home and Categories screens show tasks grouped or filtered by category.

---

## 6. Setup / migration notes

1. Apply Supabase migrations that add the `category` (or list) field to the `tasks` table.
2. Run the app as usual (`npm install`, then `npm run dev` or the existing start command).
3. Ensure environment variables for Supabase are already configured as per `.env.example`.

---

## 7. Files touched on this branch (reference)

*(Keep this list updated as you work on the branch.)*

| Area        | Files (expected) |
| ----------- | ---------------- |
| Database    | `supabase/migrations/002_add_category_to_tasks.sql` (and related) |
| Context     | Task-related context/hooks where `category` is added |
| Screens     | `app/categories.tsx`, `app/index.tsx` (if category filtering added) |
| Components  | Any task creation/edit components that now handle categories |

This document describes the current state of the **`feature-categories`** branch step by step.

