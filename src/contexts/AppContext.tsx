import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { GemAnimation } from '@/types/types';

interface AppContextType {
  gemAnimations: GemAnimation[];
  triggerGemAnimation: (amount: number, x?: number, y?: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [gemAnimations, setGemAnimations] = useState<GemAnimation[]>([]);

  const triggerGemAnimation = useCallback((amount: number, x = window.innerWidth / 2, y = window.innerHeight / 2) => {
    const id = `${Date.now()}-${Math.random()}`;
    const anim: GemAnimation = { id, amount, x, y };
    setGemAnimations(prev => [...prev, anim]);
    setTimeout(() => {
      setGemAnimations(prev => prev.filter(a => a.id !== id));
    }, 1200);
  }, []);

  return (
    <AppContext.Provider value={{ gemAnimations, triggerGemAnimation }}>
      {children}
      {/* Gem float animations */}
      {gemAnimations.map(anim => (
        <div
          key={anim.id}
          className="gem-float-animation"
          style={{ left: anim.x, top: anim.y }}
        >
          +{anim.amount} 💎
        </div>
      ))}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
