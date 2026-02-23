# Branch: `feature-user-auth-signup-login`

Step-by-step overview of what’s on this branch.

---

## 1. Branch purpose

This branch adds **user authentication (sign up and log in)** to the Google Tasks–style app. Auth is handled by **Supabase** (email/password, optional email confirmation, session persistence).

---

## 2. Project overview

- **App type:** React Native (Expo) task app with auth.
- **Auth:** Supabase Auth (sign up, sign in, sign out, email confirmation, deep links).
- **Tasks:** In-memory task list (add, complete, delete) with a simple home UI, categories, and calendar screens.

---

## 3. Tech stack

| Layer        | Technology                          |
| ------------ | ------------------------------------ |
| Framework    | Expo (React Native)                  |
| Router       | Expo Router (file-based)            |
| Auth backend | Supabase Auth                       |
| Fonts        | Inter (via `@expo-google-fonts/inter`) |
| Icons        | `lucide-react-native`               |
| Storage      | `AsyncStorage` for auth (non-web)   |

---

## 4. App structure (step by step)

### 4.1 Entry and layout

- **`app/_layout.tsx`**
  - Loads Inter fonts.
  - Shows a short splash (“TASK WORKS”).
  - Wraps the app in `AuthProvider` then `TaskProvider`.
  - Defines the stack: `index`, `login`, `create-account`, `check-email`, `categories`, `calendar`, `settings`.
  - Header hidden; fade animation between screens.

### 4.2 Environment and Supabase client

- **`.env.example`**
  - Documents required vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  - Notes adding redirect URL in Supabase (e.g. `myapp://**`) for email confirmation deep link.

- **`lib/supabase.ts`**
  - Creates Supabase client with URL and anon key from env (or `app.config.js` extra).
  - Uses `AsyncStorage` for auth persistence on native; session refresh on app foreground.

### 4.3 Auth context and flows

- **`context/AuthContext.tsx`**
  - **User type:** `id`, `email`, `fullName` (from Supabase user + `user_metadata.full_name`).
  - **Session:** Restored from storage and from auth deep link (confirmation link).
  - **`signUp(fullName, email, password)`**
    1. Trims and lowercases email; validates non-empty and password length (≥ 6).
    2. Calls `supabase.auth.signUp` with `emailRedirectTo` for confirmation.
    3. On error: maps Supabase errors to friendly messages (invalid credentials, email not confirmed, **email already exists**, rate limit, etc.).
    4. **Email uniqueness:** If Supabase returns success but `data.user.identities` is empty (e.g. when confirmation is on), treats it as “email already registered” and returns a clear error so only one user per email can sign up.
  - **`signIn(email, password)`:** `signInWithPassword`; on success sets user and returns `hasSession: true`.
  - **`signOut()`:** Signs out in Supabase and clears local user state.
  - **Deep link:** Parses `access_token` / `refresh_token` from URL and calls `setSession` so confirmation links log the user in.

### 4.4 Auth screens (step by step)

- **`app/index.tsx` (Home)**
  - If not authenticated (no session / no user), redirects to `/login`.
  - Shows task list, week strip, “Today’s Tasks”, FAB to add task, bottom nav (My Day, Categories, Calendar, Settings).

- **`app/login.tsx`**
  - Email + password fields; “Log In” calls `signIn`.
  - On success → replace to `/`.
  - Link to “Create Account” → `/create-account`.
  - Errors (e.g. invalid credentials, email not confirmed) shown inline.

- **`app/create-account.tsx`**
  - Full name, email, password; “Sign Up” calls `signUp`.
  - On error (including “email already exists”) → show message.
  - On `needsConfirmation` → replace to `/check-email` with `email` param.
  - On immediate session (e.g. confirmation off) → replace to `/`.
  - Link to “Log In” → `/login`.

- **`app/check-email.tsx`**
  - Shown after sign up when email confirmation is required.
  - Displays “Check your email” and the email address from params.
  - Button to go back to `/login` after user confirms.

### 4.5 Task context and UI

- **`context/TaskContext.tsx`**
  - In-memory task list (no Supabase DB yet).
  - Actions: `addTask`, `toggleTask`, `deleteTask`.
  - Task shape: `id`, `title`, `details`, `isCompleted`, `listId`, `date`.

- **`app/index.tsx` (continued)**
  - Uses `useTasks()` and `useAuth()`; shows user’s first name and avatar initial.
  - Renders `TaskItem` list and `AddTaskModal` (FAB opens modal).

- **`components/TaskItem.tsx`**  
  - One task row: checkbox, title, optional details; toggle and delete.

- **`components/AddTaskModal.tsx`**  
  - Modal to enter title/details (and optional date); calls `addTask` on submit.

### 4.6 Other screens

- **`app/categories.tsx`**  
  - Categories/lists screen (placeholder or simple list).

- **`app/calendar.tsx`**  
  - Calendar view (placeholder or simple calendar).

- **`app/settings.tsx`**
  - Uses `useAuth()` and `useTasks()`; shows user-related options.
  - **Sign out:** Calls `signOut()` and redirects to `/login`.
  - Can include toggles (e.g. dark mode) and links (help, privacy).

---

## 5. Email uniqueness (one user per email)

- **Backend:** Supabase Auth already allows only one account per email.
- **When Supabase returns an error** (e.g. “User already registered”): `authErrorMessage()` in `AuthContext` maps it to: *“An account with this email already exists. Please sign in or use a different email.”*
- **When Supabase returns success but email is already taken** (e.g. with email confirmation on): After `signUp`, the app checks `data.user.identities`. If it’s empty, it returns the same “already exists” message and does not treat sign up as successful.
- **Result:** Only one user per email can sign up; duplicate attempts get a clear, consistent message.

---

## 6. Flow summary

1. **Cold start** → Splash → Layout loads → `AuthProvider` restores session (or not).
2. **No session** → Home redirects to **Login**.
3. **Login** → User enters email/password → `signIn` → success → Home.
4. **Create account** → User enters name, email, password → `signUp` →  
   - If email already exists → error message (no new account).  
   - If confirmation required → **Check email** screen → user taps link → deep link → session set → Home.  
   - If no confirmation → session set → Home.
5. **Home** → Tasks, add/toggle/delete, navigate to Categories / Calendar / Settings.
6. **Settings** → Sign out → `signOut` → redirect to Login.

---

## 7. Setup (from README + .env.example)

1. `npm install` then `npm run dev`.
2. Create a Supabase project; copy **Project URL** and **anon** key.
3. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. (Optional) In Supabase: **Auth → URL Configuration → Redirect URLs** add `myapp://**` (or your scheme) for email confirmation deep link.
5. Restart dev server after changing `.env`.

---

## 8. Files touched on this branch (reference)

| Area        | Files |
| ----------- | ----- |
| Layout      | `app/_layout.tsx` |
| Auth        | `context/AuthContext.tsx`, `lib/supabase.ts` |
| Screens     | `app/index.tsx`, `app/login.tsx`, `app/create-account.tsx`, `app/check-email.tsx`, `app/settings.tsx`, `app/categories.tsx`, `app/calendar.tsx` |
| Tasks       | `context/TaskContext.tsx`, `components/TaskItem.tsx`, `components/AddTaskModal.tsx` |
| Config/docs | `.env.example`, `README.md`, `app.config.js` |

This document describes the current state of the **`feature-user-auth-signup-login`** branch step by step.
