import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

function createSessionFromUrl(url: string): Promise<Session | null> {
  const hashPart = url.includes('#') ? url.split('#')[1] : '';
  const params = new URLSearchParams(hashPart);
  const errorCode = params.get('error');
  if (errorCode) {
    const desc = params.get('error_description') || errorCode;
    console.warn('Auth deep link error:', desc);
    return Promise.resolve(null);
  }
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token) return Promise.resolve(null);
  return supabase.auth
    .setSession({ access_token, refresh_token: refresh_token ?? '' })
    .then(({ data, error }) => {
      if (error) {
        console.warn('setSession from URL failed:', error.message);
        return null;
      }
      return data.session;
    });
}

export type User = {
  id: string;
  email: string;
  fullName: string;
};

function mapSupabaseUser(sbUser: SupabaseUser | null): User | null {
  if (!sbUser?.email) return null;
  const fullName =
    (sbUser.user_metadata?.full_name as string)?.trim() ||
    sbUser.email.split('@')[0] ||
    'User';
  return {
    id: sbUser.id,
    email: sbUser.email,
    fullName,
  };
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signUp: (fullName: string, email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string; hasSession?: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authErrorMessage(err: AuthError): string {
  const msg = err.message?.toLowerCase() ?? '';
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return 'Invalid email or password.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please check your email and confirm your account.';
  }
  if (
    msg.includes('already registered') ||
    msg.includes('already in use') ||
    msg.includes('duplicate') ||
    msg.includes('already exists') ||
    err.code === 'signup_duplicate_identity'
  ) {
    return 'An account with this email already exists. Please sign in or use a different email.';
  }
  if (msg.includes('password')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('email rate limit')) {
    return 'Too many sign-up attempts. Please wait an hour and try again, or use a different email.';
  }
  return err.message || 'Something went wrong. Please try again.';
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setSession = useCallback((session: Session | null) => {
    setUser(mapSupabaseUser(session?.user ?? null));
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl.includes('access_token')) {
          const session = await createSessionFromUrl(initialUrl);
          if (session) setSession(session);
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession]);

  // Handle auth deep link when app is already open (e.g. user switches back from email app)
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url && url.includes('access_token')) createSessionFromUrl(url);
    });
    return () => sub.remove();
  }, []);

  const signUp = useCallback(
    async (fullName: string, email: string, password: string): Promise<{ error?: string; needsConfirmation?: boolean }> => {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = fullName.trim();
      if (!trimmedName || !trimmedEmail || !password) {
        return { error: 'Please fill in all fields.' };
      }
      if (password.length < 6) {
        return { error: 'Password must be at least 6 characters.' };
      }
      try {
        const redirectTo = Linking.createURL('');
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { full_name: trimmedName },
            emailRedirectTo: redirectTo,
          },
        });
        if (error) return { error: authErrorMessage(error) };
        // Supabase may return success with empty identities when email is already registered (e.g. when confirmation is enabled)
        const identities = data.user?.identities ?? [];
        if (identities.length === 0) {
          return { error: 'An account with this email already exists. Please sign in or use a different email.' };
        }
        // Only set user when we have a real session (no redirect when confirmation required)
        if (data.session) {
          setUser(mapSupabaseUser(data.user));
          return {};
        }
        return { needsConfirmation: true };
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : 'Could not create account. Please try again.',
        };
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string; hasSession?: boolean }> => {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !password) {
        return { error: 'Please enter email and password.' };
      }
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) return { error: authErrorMessage(error) };
        if (data.session) {
          setUser(mapSupabaseUser(data.user));
          return { hasSession: true };
        }
        return {};
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : 'Something went wrong. Please try again.',
        };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
