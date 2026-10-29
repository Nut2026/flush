import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import { useApp } from '@/contexts/AppContext';
import {
  fetchFlashcards, fetchDeck, upsertGameHighScore,
  addGems, addExp, updateStreak, checkAndAwardBadges, recordGamePlayed, checkAndCompleteDailyGoals, saveGameSession,
  syncFireClub, recordRobinEarlyAction, useGameToken,
} from '@/services/flush/flushService';
import { STARTER_GUEST_DECKS } from '@/services/flush/guestData';
import type { Flashcard } from '@/types/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Timer, Grid3X3 } from 'lucide-react';

type GameState = 'select' | 'playing' | 'done';

interface MatchCard {
  id: string;
  cardId: string;
  side: 'front' | 'back';
  text: string;
  matched: boolean;
  flipped: boolean;
  flipping: boolean;
}

function buildGrid(cards: Flashcard[], gridSize: 8 | 18): MatchCard[] {
  const selected = [...cards].sort(() => Math.random() - 0.5).slice(0, gridSize);
  const grid: MatchCard[] = [];
  selected.forEach(c => {
    grid.push({ id: `${c.id}-front`, cardId: c.id, side: 'front', text: c.front_text, matched: false, flipped: false, flipping: false });
    grid.push({ id: `${c.id}-back`, cardId: c.id, side: 'back', text: c.back_text, matched: false, flipped: false, flipping: false });
  });
  return grid.sort(() => Math.random() - 0.5);
}

export default function MatchingGame() {
  const { user, isGuest, refreshProfile } = useAuth();
  const { triggerGemAnimation } = useApp();
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { setSessionActive } = useSession();
  const [endNowOpen, setEndNowOpen] = useState(false);

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [deckTitle, setDeckTitle] = useState('');
  const [gameState, setGameState] = useState<GameState>('select');
  const [grid, setGrid] = useState<MatchCard[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      if (isGuest) {
        const raw = sessionStorage.getItem('guest_decks');
        const guestDecks = raw ? JSON.parse(raw) : STARTER_GUEST_DECKS;
        const d = guestDecks.find((gd: any) => gd.id === deckId);
        if (d) { setCards(d.cards || []); setDeckTitle(d.title); }
        setLoading(false); return;
      }
      if (!deckId) return;
      const [d, c] = await Promise.all([fetchDeck(deckId), fetchFlashcards(deckId), user ?(user.id) : Promise.resolve(3)]);
      if (d) setDeckTitle(d.title);
      setCards(c);
      setLoading(false);
    };
    load();
  }, [deckId, isGuest, user]);

  const startGame = async (skipTokenCharge = false) => {
    if (!isGuest && user && !skipTokenCharge) {
      await useGameToken(user.id);
      await refreshProfile();
    }
    const count = cards.length;
    const gridSize: 8 | 18 = count >= 18 ? 18 : 8;
    const newGrid = buildGrid(cards, gridSize);
    setGrid(newGrid);
    setSelected([]);
    setMatchedCount(0);
    setTotalPairs(gridSize);
    setElapsed(0);
    elapsedRef.current = 0;
    startedRef.current = false;
    setTimerStarted(false);
    setAnimating(false);
    setGameState('playing');
    setSessionActive(true, () => setEndNowOpen(true));
  };

  // Timer
  useEffect(() => {
    if (gameState !== 'playing' || !timerStarted) return;
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [gameState, timerStarted]);

  const handleFlip = (cardId: string) => {
    if (animating) return;
    const mc = grid.find(c => c.id === cardId);
    if (!mc || mc.matched || mc.flipped) return;

    if (!startedRef.current) {
      startedRef.current = true;
      setTimerStarted(true);
    }

    const newSelected = [...selected, cardId];
    setGrid(prev => prev.map(c => c.id === cardId ? { ...c, flipped: true } : c));
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setAnimating(true);
      const [id1, id2] = newSelected;
      const c1 = grid.find(c => c.id === id1)!;
      const c2 = grid.find(c => c.id === id2)!;

      if (c1.cardId === c2.cardId && c1.side !== c2.side) {
        // Match!
        setTimeout(() => {
          setGrid(prev => prev.map(c =>
            c.id === id1 || c.id === id2 ? { ...c, matched: true } : c
          ));
          const newMatched = matchedCount + 1;
          setMatchedCount(newMatched);
          setSelected([]);
          setAnimating(false);
          if (newMatched === totalPairs) {
            clearInterval(timerRef.current!);
            endGame(elapsedRef.current);
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setGrid(prev => prev.map(c =>
            c.id === id1 || c.id === id2 ? { ...c, flipped: false } : c
          ));
          setSelected([]);
          setAnimating(false);
        }, 1000);
      }
    }
  };

  const endGame = useCallback(async (time: number) => {
    // For matching: score IS the time in seconds (lower = better)
    const finalTime = Math.max(1, time);
    setGameState('done');
    setSessionActive(false);

    if (!user || isGuest) return;
    try {
      const { beatHighScore, beatDeckBest } = await upsertGameHighScore(user.id, 'matching', deckId!, finalTime, true);
      await saveGameSession(user.id, 'matching', deckId || null, finalTime, beatHighScore, beatDeckBest);
      if (beatHighScore) {
        await addGems(user.id, 15);
        triggerGemAnimation(15);
        toast.success('🏆 New high score! +15💎', { duration: 6000 });
        await checkAndAwardBadges(user.id, [], { beatHighScore: true });
      } else if (beatDeckBest) {
        await addGems(user.id, 10);
        triggerGemAnimation(10);
        toast.success('🥈 New deck best! +10💎', { duration: 6000 });
      }
      const streakResult = await updateStreak(user.id);
      if (streakResult.streakUpdated) {
        if (streakResult.milestoneGems > 0) {
          toast.success(`🔥 ${streakResult.newStreak}-day streak! +${streakResult.milestoneGems}💎`, { position: 'top-right' });
        } else {
          const sv = [`🔥 ${streakResult.newStreak}-day streak! Keep it going!`, `${streakResult.newStreak} days in a row! 🔥`, `Streak: ${streakResult.newStreak} day${streakResult.newStreak !== 1 ? 's' : ''}! 💪`];
          toast.success(sv[Math.floor(Math.random() * sv.length)], { position: 'top-right' });
        }
      }
      if (streakResult.milestoneGems > 0) {
        await addGems(user.id, streakResult.milestoneGems);
        triggerGemAnimation(streakResult.milestoneGems);
        toast.success(`🔥 ${streakResult.newStreak}-day streak! +${streakResult.milestoneGems}💎`, { duration: 6000 });
      }
      await addExp(user.id, 5);
      await recordGamePlayed(user.id);
      const goalResult = await checkAndCompleteDailyGoals(user.id, { beatHighScore });

      // Club sync
      await Promise.all([
        syncFireClub(user.id, streakResult.newStreak),
        recordRobinEarlyAction(user.id, 'game'),
      ]);
      if (goalResult.gemsAwarded > 0) {
        triggerGemAnimation(goalResult.gemsAwarded);
        toast.success(
          `🎯 Daily quest ${goalResult.totalCompletedToday}/3 complete! +${goalResult.gemsAwarded}💎`,
          {
            position: 'top-right',
            action: {
              label: "View goals",
              onClick: () => {
                sessionStorage.setItem('scroll_to_goals', '1');
                navigate('/');
              },
            },
          }
        );
      }
      await refreshProfile();
    } catch (err) {
      console.error('Game end error:', err);
    }
  }, [user, deckId, isGuest]);

  const finalScore = totalPairs > 0 ? Math.round((matchedCount / Math.max(1, elapsedRef.current)) * 1000) : 0;
  void finalScore; // kept for session display only
  const gridCols = totalPairs === 8 ? 'grid-cols-4' : 'grid-cols-6';

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;

  if (gameState === 'select') {
    const count = cards.length;
    const disabled = count < 8;
    const gridSize = count >= 18 ? `6×6 (18 pairs)` : `4×4 (8 pairs)`;
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/arcade')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />Back to games
        </Button>
        <div className="text-center mb-8">
          <div className="mb-3"><Grid3X3 className="w-10 h-10 text-primary mx-auto" /></div>
          <h1 className="text-2xl font-bold text-foreground">Matching Magic</h1>
          <p className="text-sm text-muted-foreground mt-1">{deckTitle} · {count} cards</p>
          {!disabled && <p className="text-xs text-muted-foreground mt-2">Grid: {gridSize}</p>}
        </div>
        {disabled ? (
          <div className="text-center p-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
            <p className="text-yellow-400 font-semibold">This game needs at least 8 cards.</p>
            <p className="text-sm text-muted-foreground mt-1">This deck needs at least 8 cards to play.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(`/decks/${deckId}/edit`)}>Edit deck</Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button size="lg" onClick={() => startGame()} className="px-10">Start matching</Button>
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'done') {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto text-center">
        <div className="py-12">
          <div className="mb-4"><Grid3X3 className="w-12 h-12 text-primary mx-auto" /></div>
          <h1 className="text-3xl font-bold text-foreground mb-2">All pairs matched!</h1>
          <p className="text-5xl font-bold text-primary mb-1">Time: {elapsedRef.current}s</p>
          <p className="text-sm text-muted-foreground mb-4">{matchedCount}/{totalPairs} pairs</p>

          {/* Guest upsell banner */}
          {isGuest && (
            <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 mb-6 text-sm text-primary text-center">
              Sign up or log in to save your scores!{' '}
              <button className="underline font-semibold" onClick={() => navigate('/auth', { state: { mode: 'signup' } })}>Sign up free →</button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => startGame()}>Play again</Button>
            <Button variant="outline" onClick={() => navigate('/arcade')}>Back to the arcade</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* HUD */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => setEndNowOpen(true)}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">MATCHED</p>
            <p className="text-xl font-bold text-primary">{matchedCount}/{totalPairs}</p>
          </div>
          <div className="text-center flex items-center gap-1">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <p className="text-xl font-bold text-foreground">{elapsed}s</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className={`grid ${gridCols} gap-2`}>
        {grid.map(mc => (
          <button
            key={mc.id}
            onClick={() => handleFlip(mc.id)}
            disabled={mc.matched || animating}
            className={`
              aspect-square rounded-xl border-2 text-xs font-medium p-1.5 transition-all duration-300
              flex items-center justify-center text-center leading-tight
              ${mc.matched
                ? 'border-green-500/50 bg-green-500/10 text-green-400 opacity-60 cursor-default'
                : mc.flipped
                ? 'border-primary bg-primary/10 text-foreground scale-105'
                : 'border-border bg-secondary hover:border-primary/50 text-secondary-foreground'}
            `}
          >
            {mc.flipped || mc.matched ? (
              <span className="text-balance">{mc.text}</span>
            ) : (
              <span className="text-2xl">?</span>
            )}
          </button>
        ))}
      </div>
      {/* End Now? modal */}
      <AlertDialog open={endNowOpen} onOpenChange={setEndNowOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle>End Now?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-center mt-1">
                <div className="bg-secondary rounded-lg p-4 inline-block min-w-[120px]">
                  <p className="text-2xl font-bold text-foreground">{elapsed}s</p>
                  <p className="text-xs text-muted-foreground mt-1">Current Time</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEndNowOpen(false)}>Impossible!</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => { setEndNowOpen(false); clearInterval(timerRef.current!); navigate('/arcade'); }}
            >Sure</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
