import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/types';
import { copyStarterDecksToUser, sendWelcomeNotification } from '@/services/flush/flushService';

async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isGuest: boolean;
  signInWithUsername: (username: string, password: string, email: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, email: string, password: string) => Promise<{ error: Error | null; emailExists?: boolean; usernameExists?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setGuest: (value: boolean) => void;
}

// Persist context identity across Vite HMR re-evaluations.
// When AuthContext.tsx hot-reloads, createContext() would produce a new object,
// breaking any still-mounted consumer that holds a reference to the old one.
// Caching on globalThis via Symbol.for ensures a single stable reference.
const _AUTH_CTX_KEY = Symbol.for('flush.AuthContext');
export const AuthContext: React.Context<AuthContextType | undefined> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any)[_AUTH_CTX_KEY] ??
  ((globalThis as any)[_AUTH_CTX_KEY] = createContext<AuthContextType | undefined>(undefined));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const refreshProfile = async () => {
    if (!user) { setProfile(null); return; }
    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) getProfile(session.user.id).then(setProfile);
      })
      .catch(err => console.error('Session error:', err))
      .finally(() => setLoading(false));

    // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithUsername = async (username: string, password: string, emailAddress: string) => {
    try {
      // Pre-check: verify username + email BEFORE attempting sign-in
      // This prevents any brief dashboard flash on credential mismatch
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('username', username) // exact case-sensitive match
        .maybeSingle();

      // Validate username exists with exact casing
      if (!prof) {
        throw new Error('Incorrect username, password, or email.');
      }

      // Validate email matches BEFORE signing in
      const storedEmail = (prof.email ?? '').toLowerCase();
      const enteredEmail = emailAddress.trim().toLowerCase();
      if (storedEmail && enteredEmail && storedEmail !== enteredEmail) {
        throw new Error('Incorrect username, password, or email.');
      }

      // All pre-checks passed — now attempt password authentication
      const internalEmail = `${username.toLowerCase()}@flush.app`;
      const { error } = await supabase.auth.signInWithPassword({ email: internalEmail, password });
      if (error) throw new Error('Incorrect username, password, or email.');

      setIsGuest(false);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithUsername = async (username: string, emailAddress: string, password: string) => {
    try {
      // Check for duplicate username (case-insensitive)
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();
      if (existingUser) return { error: new Error('Username already taken.'), usernameExists: true };

      // Check for duplicate email
      const { data: existingEmail } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', emailAddress)
        .maybeSingle();
      if (existingEmail) return { error: new Error('Email already registered.'), emailExists: true };

      const internalEmail = `${username.toLowerCase()}@flush.app`;
      const { data, error } = await supabase.auth.signUp({ email: internalEmail, password });
      if (error) throw error;
      if (data?.user) {
        setTimeout(async () => {
          try {
            await supabase.from('profiles').update({
              username,
              email: emailAddress.toLowerCase(),
            }).eq('id', data.user!.id);
            await copyStarterDecksToUser(data.user!.id);
            await sendWelcomeNotification(data.user!.id, username);
          } catch (err) {
            console.error('Starter deck copy error:', err);
          }
        }, 1500);
      }
      setIsGuest(false);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsGuest(false);
  };

  const setGuest = (value: boolean) => setIsGuest(value);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isGuest, signInWithUsername, signUpWithUsername, signOut, refreshProfile, setGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
