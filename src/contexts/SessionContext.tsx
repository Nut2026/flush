/**
 * SessionContext
 * Tracks whether the user is in an active Study/Test/Arcade session.
 * Pages that have a live session call `setSessionActive(true, cb)` where
 * `cb` is the function that shows their own "End?" modal.
 * AppLayout intercepts sidebar/logo/avatar clicks and calls `requestStop`
 * which either proceeds or delegates to the page's modal.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface SessionContextValue {
  /** True while the user is mid-session (Study studying, Test testing, Arcade playing). */
  isSessionActive: boolean;
  /**
   * Register an active session.  Pass a callback that shows the page's own
   * "End?" confirmation modal.  Call `setSessionActive(false)` when done.
   */
  setSessionActive: (active: boolean, onRequestStop?: () => void) => void;
  /**
   * Called by AppLayout when the user clicks a blocked element.
   * Invokes the registered page modal instead of navigating.
   */
  requestStop: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isSessionActive, setActive] = useState(false);
  const stopCallbackRef = useRef<(() => void) | null>(null);

  const setSessionActive = useCallback((active: boolean, onRequestStop?: () => void) => {
    setActive(active);
    stopCallbackRef.current = active && onRequestStop ? onRequestStop : null;
  }, []);

  const requestStop = useCallback(() => {
    if (stopCallbackRef.current) {
      stopCallbackRef.current();
    }
  }, []);

  return (
    <SessionContext.Provider value={{ isSessionActive, setSessionActive, requestStop }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be inside SessionProvider');
  return ctx;
}
