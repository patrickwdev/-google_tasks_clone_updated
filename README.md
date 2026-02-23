# Project Setup

To run this project, follow these steps:

1. Extract the zip file.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the development server.

This project was generated through Alpha. For more information, visit [dualite.dev](https://dualite.dev).

## Supabase (Auth Backend)

Auth uses [Supabase](https://supabase.com) for sign up, sign in, and session storage.

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Copy `.env.example` to `.env`.
3. In Supabase: **Project Settings → API** copy the **Project URL** and **anon public** key into `.env`:
   - `EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`
4. Restart the dev server (`npm run dev`) after changing `.env`.