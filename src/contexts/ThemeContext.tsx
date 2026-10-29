import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/flush/flushService';
import { THEMES, resolveThemeVars, type ThemeVars } from '@/contexts/themeVars';
import type { ThemeName } from '@/types/types';

interface ThemeContextType {
  theme: ThemeName;
  studyTheme: ThemeName;
  deckTheme: ThemeName;
  darkMode: boolean;
  setTheme: (theme: ThemeName) => Promise<void>;
  setStudyTheme: (theme: ThemeName) => Promise<void>;
  setDeckTheme: (theme: ThemeName) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  setDarkMode: (dark: boolean) => void;
  /** Call on pages that use a context-specific theme layer. Returns cleanup fn. */
  enterContext: (ctx: 'study' | 'deck') => () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ── CSS variable injection ──────────────────────────────────────────────────
// Directly write computed CSS custom properties into a <style> tag, bypassing
// any CSS-class cascade ambiguity.  The class approach stays for special effects.
function injectThemeVars(vars: ThemeVars): void {
  let el = document.getElementById('flush-theme-vars') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'flush-theme-vars';
    document.head.appendChild(el);
  }

  el.textContent = `:root {
  --background: ${vars.background};
  --foreground: ${vars.foreground};
  --card: ${vars.card};
  --card-foreground: ${vars.cardForeground};
  --popover: ${vars.popover};
  --popover-foreground: ${vars.popoverForeground};
  --primary: ${vars.primary};
  --primary-foreground: ${vars.primaryForeground};
  --secondary: ${vars.secondary};
  --secondary-foreground: ${vars.secondaryForeground};
  --muted: ${vars.muted};
  --muted-foreground: ${vars.mutedForeground};
  --accent: ${vars.accent};
  --accent-foreground: ${vars.accentForeground};
  --destructive: ${vars.destructive};
  --destructive-foreground: ${vars.destructiveForeground};
  --border: ${vars.border};
  --input: ${vars.input};
  --ring: ${vars.ring};
  --success: ${vars.success};
  --warning: ${vars.warning};
  --info: ${vars.info};
  --sidebar-background: ${vars.sidebarBackground};
  --sidebar-foreground: ${vars.sidebarForeground};
  --sidebar-primary: ${vars.sidebarPrimary};
  --sidebar-primary-foreground: ${vars.sidebarPrimaryForeground};
  --sidebar-accent: ${vars.sidebarAccent};
  --sidebar-accent-foreground: ${vars.sidebarAccentForeground};
  --sidebar-border: ${vars.sidebarBorder};
  --sidebar-ring: ${vars.sidebarRing};
  --chart-1: ${vars.chart1};
  --chart-2: ${vars.chart2};
  --chart-3: ${vars.chart3};
  --chart-4: ${vars.chart4};
  --chart-5: ${vars.chart5};
  --shadow-card: ${vars.shadowCard};
  --shadow-hover: ${vars.shadowHover};
  --theme-glow: ${vars.themeGlow};
  --gradient-primary: ${vars.gradientPrimary};
}`;
}

// ── Apply theme to DOM ──────────────────────────────────────────────────────
function applyThemeDOM(theme: ThemeName, darkMode: boolean): void {
  const root = document.documentElement;

  // 1. Inject CSS custom properties for the computed theme + mode
  const vars = resolveThemeVars(theme, darkMode);
  injectThemeVars(vars);

  // 2. Add/remove theme class for special effects (stars, glows, animations)
  THEMES.forEach((t: { name: string }) => {
    if (t.name !== 'default') root.classList.remove(`theme-${t.name}`);
  });
  if (theme !== 'default') root.classList.add(`theme-${theme}`);

  // 3. Dark / light class (used by some shadcn components)
  if (darkMode) {
    root.classList.remove('light');
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }

  // 4. Aurora animated background → apply to body so it's not covered
  const body = document.body;
  if (theme === 'aurora') {
    root.classList.add('aurora-bg');
    body.classList.add('aurora-bg');
  } else {
    root.classList.remove('aurora-bg');
    body.classList.remove('aurora-bg');
  }

  // 5. data-theme attribute for CSS [data-theme] selectors
  root.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const profile = auth?.profile ?? null;
  const isGuest = auth?.isGuest ?? false;

  const [theme, setThemeState] = useState<ThemeName>(() => {
    return (localStorage.getItem('flush_theme') as ThemeName) || 'default';
  });
  const [studyTheme, setStudyThemeState] = useState<ThemeName>('default');
  const [deckTheme, setDeckThemeState] = useState<ThemeName>('default');
  // Active context: null = main, 'study' = study/test/arcade, 'deck' = edit/view deck
  const [activeCtx, setActiveCtx] = useState<'study' | 'deck' | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('flush_dark_mode');
    return stored === null ? true : stored === 'true';
  });

  // Track the profile id we have already synced from DB.
  // We only pull from DB on a brand-new login (profile.id changes).
  // After that, the local state is authoritative to avoid race conditions.
  const syncedProfileId = useRef<string | null>(null);
  // Whether the user explicitly called setTheme in this session.
  const userSetThemeRef = useRef(false);
  // Track previous user to detect sign-out transition
  const prevUserRef = useRef<typeof user>(user);

  // Apply theme to DOM whenever theme or darkMode changes — also re-apply when context changes
  useEffect(() => {
    const activeTheme = activeCtx === 'study' && studyTheme !== 'default'
      ? studyTheme
      : activeCtx === 'deck' && deckTheme !== 'default'
      ? deckTheme
      : theme;
    applyThemeDOM(activeTheme, darkMode);
    localStorage.setItem('flush_theme', theme);
    localStorage.setItem('flush_dark_mode', String(darkMode));
  }, [theme, studyTheme, deckTheme, darkMode, activeCtx]);

  // Detect sign-out: when user transitions from non-null → null (and not guest),
  // immediately revert to Default theme + dark mode.
  useEffect(() => {
    const wasLoggedIn = prevUserRef.current !== null;
    const nowSignedOut = user === null && !isGuest;
    if (wasLoggedIn && nowSignedOut) {
      setThemeState('default');
      setDarkMode(true);
      localStorage.setItem('flush_theme', 'default');
      localStorage.setItem('flush_dark_mode', 'true');
      userSetThemeRef.current = false;
      syncedProfileId.current = null;
    }
    prevUserRef.current = user;
  }, [user, isGuest]);

  // Guest mode: always lock to default theme + dark mode
  useEffect(() => {
    if (isGuest) {
      setThemeState('default');
      setDarkMode(true);
      localStorage.setItem('flush_theme', 'default');
      localStorage.setItem('flush_dark_mode', 'true');
      userSetThemeRef.current = false;
    }
  }, [isGuest]);

  // Sync from DB: only on a new login, and only if the user hasn't already
  // explicitly chosen a theme in this session.
  useEffect(() => {
    if (!profile?.id) return;
    const isNewLogin = syncedProfileId.current !== profile.id;
    if (!isNewLogin) return;
    syncedProfileId.current = profile.id;

    // Only override local state with DB value on fresh login
    // and only if user hasn't interacted yet this session.
    if (!userSetThemeRef.current) {
      const dbTheme = (profile.selected_theme as ThemeName) || 'default';
      const dbDark = profile.dark_mode !== undefined ? profile.dark_mode : true;
      setThemeState(dbTheme);
      setDarkMode(dbDark);
    }
    // Always sync study/deck themes from DB on login
    setStudyThemeState((profile.study_theme as ThemeName) || 'default');
    setDeckThemeState((profile.deck_theme as ThemeName) || 'default');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

const DARK_ONLY_THEMES: string[] = ['cyberpunk', 'midnight-galaxy'];

  const setTheme = async (newTheme: ThemeName) => {
    // Guests are locked to default
    if (isGuest) return;
    userSetThemeRef.current = true;
    setThemeState(newTheme);
    localStorage.setItem('flush_theme', newTheme);
    // Dark-only themes must force dark mode
    if (DARK_ONLY_THEMES.includes(newTheme as string) && !darkMode) {
      setDarkMode(true);
      localStorage.setItem('flush_dark_mode', 'true');
      if (user) {
        try { await updateProfile(user.id, { selected_theme: newTheme, dark_mode: true }); }
        catch (err) { console.error('[ThemeContext] Failed to persist theme+darkMode to DB:', err); }
      }
      return;
    }
    if (user) {
      try {
        await updateProfile(user.id, { selected_theme: newTheme });
      } catch (err) {
        console.error('[ThemeContext] Failed to persist theme to DB:', err);
      }
    }
  };

  const toggleDarkMode = async () => {
    // Dark-only themes cannot switch to light
    if (DARK_ONLY_THEMES.includes(theme as string) && darkMode) {
      const { toast } = await import('sonner');
      const themeName = (theme as string).split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      toast.info(`${themeName} is a dark-only theme.`);
      return;
    }
    const next = !darkMode;
    userSetThemeRef.current = true;
    setDarkMode(next);
    localStorage.setItem('flush_dark_mode', String(next));
    if (user) {
      try {
        await updateProfile(user.id, { dark_mode: next });
      } catch (err) {
        console.error('[ThemeContext] Failed to persist dark_mode to DB:', err);
      }
    }
  };

  const setStudyTheme = async (newTheme: ThemeName) => {
    if (isGuest || !user) return;
    setStudyThemeState(newTheme);
    try { await updateProfile(user.id, { study_theme: newTheme }); }
    catch (err) { console.error('[ThemeContext] Failed to persist study_theme:', err); }
  };

  const setDeckTheme = async (newTheme: ThemeName) => {
    if (isGuest || !user) return;
    setDeckThemeState(newTheme);
    try { await updateProfile(user.id, { deck_theme: newTheme }); }
    catch (err) { console.error('[ThemeContext] Failed to persist deck_theme:', err); }
  };

  /** Called by study/test/arcade pages and deck edit/view pages on mount. */
  const enterContext = (ctx: 'study' | 'deck'): (() => void) => {
    setActiveCtx(ctx);
    return () => setActiveCtx(null);
  };

  return (
    <ThemeContext.Provider value={{
      theme, studyTheme, deckTheme, darkMode,
      setTheme, setStudyTheme, setDeckTheme,
      toggleDarkMode, setDarkMode, enterContext,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
