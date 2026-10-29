import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { FlushLogo } from '@/components/common/FlushLogo';
import { toast } from 'sonner';
import { STARTER_GUEST_DECKS } from '@/services/flush/guestData';


const FLAIR_DEFS: { key: string; bg: string; text: string }[] = [
  { key: 'Cards',       bg: '#B026FF', text: '#ffffff' },
  { key: 'World',       bg: '#00D4FF', text: '#0a0a0a' },
  { key: 'Clubs',       bg: '#FF6B6B', text: '#ffffff' },
  { key: 'Eggs',        bg: '#FFB800', text: '#0a0a0a' },
  { key: 'Glow',        bg: '#00C9A7', text: '#0a0a0a' },
  { key: 'Mods',        bg: '#6A0DAD', text: '#ffffff' },
  { key: 'Smart',       bg: '#20B2AA', text: '#ffffff' },
  { key: 'Boards',      bg: '#FF8C00', text: '#ffffff' },
  { key: 'StayFlushed', bg: '#1E1E2E', text: '#ffffff' },
];

function FlipWordCard({ words }: { words: string[] }) {
  // `current` = word currently visible; `next` = word coming in
  const [current, setCurrent] = useState(0);
  const [, setNext]       = useState(1);
  // phase: 'idle' | 'exit' | 'enter'
  const [phase, setPhase]     = useState<'idle' | 'exit' | 'enter'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        // 1. Flip current word OUT (rotateY 0 → 90)
        setPhase('exit');
        timerRef.current = setTimeout(() => {
          // 2. Swap word while card is edge-on, then flip IN (rotateY -90 → 0)
          setCurrent(n => (n + 1) % words.length);
          setNext(n => (n + 1) % words.length);
          setPhase('enter');
          timerRef.current = setTimeout(() => {
            setPhase('idle');
            schedule();
          }, 300);
        }, 300);
      }, 3000);
    };
    schedule();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length]);

  const rotation =
    phase === 'exit'  ? 'rotateY(90deg)'  :
    phase === 'enter' ? 'rotateY(-90deg)' :
    'rotateY(0deg)';

  // Fix width to longest word "unstoppable" + padding — prevents layout shift
  return (
    <span className="inline-block align-middle" style={{ perspective: '600px' }}>
      <span
        className="inline-flex items-center justify-center rounded-lg px-3 py-1 mx-1 font-bold gradient-text whitespace-nowrap"
        style={{
          border: '1.5px solid hsl(var(--primary)/0.4)',
          background: 'hsl(var(--primary)/0.08)',
          minWidth: '9rem',        // wide enough for "unstoppable"
          width: '9rem',           // fixed — no layout shift
          transformStyle: 'preserve-3d',
          transform: rotation,
          transition: phase === 'idle' ? 'none' : 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          display: 'inline-block',
          textAlign: 'center',
        }}
      >
        {words[current]}
      </span>
    </span>
  );
}

function FlairRow() {
  const labels: Record<string, string> = { flairOwned: 'Owner', flairMod: 'Mod', flairPurchased: 'Purchased' };
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-10 mt-4">
      {FLAIR_DEFS.map(f => (
        <span
          key={f.key}
          className="rounded-full px-3 py-1 text-xs font-semibold shadow-sm select-none whitespace-nowrap"
          style={{ backgroundColor: f.bg, color: f.text }}
        >
          {(labels[f.key] as string | undefined) ?? f.key}
        </span>
      ))}
    </div>
  );
}

type Mode = 'landing' | 'login' | 'signup';


export default function LandingPage() {
  const { signInWithUsername, signUpWithUsername, setGuest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>('landing');

  useEffect(() => {
    const state = location.state as { mode?: Mode } | null;
    if (state?.mode === 'signup' || state?.mode === 'login') {
      setMode(state.mode);
    } else if (location.pathname === '/auth') {
      setMode('signup');
    }
  }, [location.state, location.pathname]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateUsername = (u: string) => /^[a-zA-Z0-9_]{3,20}$/.test(u);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateUsername(username)) { setError("Usernames are 3-20 characters: letters, numbers and underscores only."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address."); return;
    }
    setLoading(true);
    const { error: err } = await signInWithUsername(username, password, email);
    setLoading(false);
    if (err) {
      setError("Incorrect username, password, or email.");
    } else {
      navigate('/dashboard');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateUsername(username)) { setError("Usernames are 3-20 characters: letters, numbers and underscores only."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address."); return;
    }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error: err, emailExists, usernameExists } = await signUpWithUsername(username, email, password);
    setLoading(false);
    if (err) {
      if (emailExists) {
        setError("This email is already registered. Log in instead.");
      } else if (usernameExists) {
        setError("Username already taken. Try another.");
      } else {
        setError(err.message);
      }
    } else {
      toast.success("Account created! Welcome to Flush 🎉");
      navigate('/dashboard');
    }
  };

  const handleGuest = () => {
    setGuest(true);
    sessionStorage.setItem('guest_decks', JSON.stringify(STARTER_GUEST_DECKS));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {mode === 'landing' ? (
        /* ── Landing Hero ── */
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="flex items-center gap-3 mb-6">
            <FlushLogo size={52} />
            <h1 className="text-5xl font-extrabold gradient-text">Flush</h1>
          </div>

          {/* Animated flip-word hero line */}
          <p className="text-lg md:text-xl font-semibold text-foreground mb-1 text-center text-balance leading-relaxed max-w-md">
            Make <FlipWordCard words={['studying', 'flashcards', 'revision', 'practice', 'learning']} /> feel like a game.
          </p>

          {/* Static flair chips */}
          <FlairRow />

          <div className="flex gap-3">
            <Button size="lg" className="h-12 px-8" onClick={() => setMode('signup')}>
              Sign Up
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8" onClick={() => setMode('login')}>
              Log In
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-3 text-muted-foreground" onClick={handleGuest}>
            Continue as Guest
          </Button>
        </div>
      ) : (
        /* ── Auth Forms ── */
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-[calc(100%-2rem)] md:max-w-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <FlushLogo size={28} />
                <span className="font-bold gradient-text">Flush</span>
              </div>
              <CardTitle className="text-balance">
                {mode === 'login' ? "Log In" : "Sign Up"}
              </CardTitle>
              <CardDescription>
                {mode === 'login' ? "Welcome back" : "Create a free account"}{' '}
                <button
                  className="text-primary hover:underline font-medium"
                  onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setEmail(''); setUsername(''); setPassword(''); setConfirmPassword(''); }}
                >
                  {mode === 'login' ? "Sign Up" : "Log In"}
                </button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-sm font-normal">Username</Label>
                  <Input
                    id="username"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">Usernames are 3-20 characters: letters, numbers and underscores only.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-normal">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-normal">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                </div>
                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-sm font-normal">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Loading…" : (mode === 'login' ? "Log In" : "Sign Up")}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button type="button" variant="outline" className="w-full" onClick={handleGuest}>
                  Continue as Guest
                </Button>
              </form>

              <button
                className="mt-4 text-sm text-muted-foreground hover:text-foreground w-full text-center"
                onClick={() => setMode('landing')}
              >
                Back
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

