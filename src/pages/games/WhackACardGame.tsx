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
import { ArrowLeft, CheckCircle, XCircle, Hammer } from 'lucide-react';

type GameState = 'select' | 'playing' | 'done';
type Direction = 'front-back' | 'back-front';

interface HoleCard {
  id: string;
  holeIdx: number;
  card: Flashcard;
  isCorrect: boolean;
  squishing: boolean;
  whackResult: 'none' | 'correct' | 'wrong'; // visual feedback state
}

export default function WhackACardGame() {
  const { user, isGuest, refreshProfile } = useAuth();
  const { triggerGemAnimation } = useApp();
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { setSessionActive } = useSession();
  const [endNowOpen, setEndNowOpen] = useState(false);

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [deckTitle, setDeckTitle] = useState('');
  const [gameState, setGameState] = useState<GameState>('select');
  const [direction, setDirection] = useState<Direction>('front-back');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [activeCards, setActiveCards] = useState<HoleCard[]>([]);
  const [currentTarget, setCurrentTarget] = useState<Flashcard | null>(null);
  const [loading, setLoading] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);

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
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(60);
    setActiveCards([]);
    // Pick initial target
    const tgt = cards[Math.floor(Math.random() * cards.length)];
    setCurrentTarget(tgt);
    setGameState('playing');
    setSessionActive(true, () => setEndNowOpen(true));
  };

  const getPrompt = (card: Flashcard) => direction === 'front-back' ? card.front_text : card.back_text;
  const getAnswer = (card: Flashcard) => direction === 'front-back' ? card.back_text : card.front_text;

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { endGame(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [gameState]);

  // Card spawner — randomly position correct answer; never always first
  useEffect(() => {
    if (gameState !== 'playing') return;
    spawnRef.current = setInterval(() => {
      setActiveCards(prev => {
        if (prev.length >= 3) return prev;
        const occupiedHoles = new Set(prev.map(c => c.holeIdx));
        const availHoles = [0,1,2,3,4,5,6,7,8].filter(h => !occupiedHoles.has(h));
        if (availHoles.length === 0) return prev;
        const holeIdx = availHoles[Math.floor(Math.random() * availHoles.length)];

        // Ensure at least one correct card is present if none currently visible
        const hasCorrect = prev.some(c => c.isCorrect);
        const spawnCorrect = !hasCorrect ? (Math.random() < 0.55) : (Math.random() < 0.35);

        let card: Flashcard;
        if (spawnCorrect && currentTarget) {
          card = currentTarget;
        } else {
          const wrongs = cards.filter(c => c.id !== currentTarget?.id);
          if (wrongs.length === 0) {
            card = currentTarget ?? cards[0];
          } else {
            card = wrongs[Math.floor(Math.random() * wrongs.length)];
          }
        }

        const newCard: HoleCard = {
          id: `${Date.now()}-${holeIdx}`,
          holeIdx,
          card,
          isCorrect: card.id === currentTarget?.id,
          squishing: false,
          whackResult: 'none',
        };
        // Remove after 2.4s
        setTimeout(() => {
          setActiveCards(prev2 => prev2.filter(c => c.id !== newCard.id));
        }, 2400);
        return [...prev, newCard];
      });
    }, 1600);
    return () => clearInterval(spawnRef.current!);
  }, [gameState, currentTarget, cards]);

  const endGame = useCallback(async () => {
    clearInterval(timerRef.current!);
    clearInterval(spawnRef.current!);
    setGameState('done');
    setSessionActive(false);
    setActiveCards([]);

    if (!user || isGuest) return;
    try {
      const { beatHighScore, beatDeckBest } = await upsertGameHighScore(user.id, 'whackacard', deckId!, scoreRef.current);
      await saveGameSession(user.id, 'whackacard', deckId || null, scoreRef.current, beatHighScore, beatDeckBest);
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

  const handleWhack = (holeCard: HoleCard) => {
    if (holeCard.squishing || holeCard.whackResult !== 'none') return;

    const result: HoleCard['whackResult'] = holeCard.isCorrect ? 'correct' : 'wrong';

    // Apply squish + result flash immediately
    setActiveCards(prev => prev.map(c =>
      c.id === holeCard.id ? { ...c, squishing: true, whackResult: result } : c
    ));

    // Remove card after brief flash (200ms)
    setTimeout(() => {
      setActiveCards(prev => prev.filter(c => c.id !== holeCard.id));
    }, 200);

    if (holeCard.isCorrect) {
      const newScore = Math.max(0, scoreRef.current + 10);
      scoreRef.current = newScore;
      setScore(newScore);
      const newTarget = cards[Math.floor(Math.random() * cards.length)];
      setCurrentTarget(newTarget);
    } else {
      const newScore = Math.max(0, scoreRef.current - 5);
      scoreRef.current = newScore;
      setScore(newScore);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;

  // Select mode
  if (gameState === 'select') {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/arcade')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />Back to games
        </Button>
        <div className="text-center mb-8">
          <div className="mb-3"><Hammer className="w-10 h-10 text-primary mx-auto" /></div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Whack-a-Card</h1>
          <p className="text-sm text-muted-foreground mt-1">{deckTitle} · {cards.length} cards</p>
          <p className="text-xs text-muted-foreground mt-2">60s · +10 / -5</p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            {(['front-back', 'back-front'] as Direction[]).map(d => (
              <button key={d} onClick={() => setDirection(d)}
                className={`p-4 rounded-xl border-2 transition-all ${direction === d ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                <p className="font-semibold text-sm text-foreground">{d === 'front-back' ? "Front → Back" : "Back → Front"}</p>
              </button>
            ))}
          </div>
          <Button size="lg" onClick={() => startGame()} disabled={cards.length < 2} className="px-10">
            Start game
          </Button>
        </div>
      </div>
    );
  }

  // Done
  if (gameState === 'done') {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto text-center">
        <div className="py-12">
          <div className="mb-4"><Hammer className="w-12 h-12 text-primary mx-auto" /></div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Time is up!</h1>
          <p className="text-5xl font-bold text-primary mb-1">{scoreRef.current}</p>
          <p className="text-muted-foreground mb-4">points</p>

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

  // Playing
  const prompt = currentTarget ? getPrompt(currentTarget) : '';

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto select-none">
      {/* HUD */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => setEndNowOpen(true)}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">SCORE</p>
          <p className="text-2xl font-bold text-primary">{score}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">TIME</p>
          <p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-destructive' : 'text-foreground'}`}>{timeLeft}s</p>
        </div>
      </div>

      {/* Prompt */}
      <div className="rounded-2xl border border-border bg-card p-4 text-center mb-6">
        <p className="text-xs text-muted-foreground mb-1">Whack the answer to:</p>
        <p className="text-lg font-bold text-foreground text-balance">{prompt}</p>
      </div>

      {/* 3×3 Grid */}
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
        {Array.from({ length: 9 }, (_, i) => {
          const holeCard = activeCards.find(c => c.holeIdx === i);
          return (
            <div
              key={i}
              className="aspect-square rounded-2xl flex items-center justify-center bg-secondary border-2 border-border overflow-hidden cursor-pointer relative"
              onClick={() => holeCard && handleWhack(holeCard)}
            >
      {holeCard ? (
                <div className={`absolute inset-1 rounded-xl border flex items-center justify-center p-2 text-center transition-transform
                  ${holeCard.squishing ? 'scale-75 whack-squish' : 'scale-100'}
                  ${holeCard.whackResult === 'correct'
                    ? 'bg-green-500/30 border-green-500 correct-flash'
                    : holeCard.whackResult === 'wrong'
                    ? 'bg-destructive/30 border-destructive shake'
                    : 'bg-card border-primary/50'}
                `}>
                  {holeCard.whackResult === 'correct' ? (
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  ) : holeCard.whackResult === 'wrong' ? (
                    <XCircle className="w-8 h-8 text-destructive" />
                  ) : (
                    <p className="text-xs font-semibold text-foreground text-balance leading-tight">
                      {getAnswer(holeCard.card)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="w-12 h-6 rounded-full bg-border/50" />
              )}
            </div>
          );
        })}
      </div>
      {/* End Now? modal */}
      <AlertDialog open={endNowOpen} onOpenChange={setEndNowOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle>End Now?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-center mt-1">
                <div className="bg-secondary rounded-lg p-4 inline-block min-w-[120px]">
                  <p className="text-2xl font-bold text-foreground">{scoreRef.current}</p>
                  <p className="text-xs text-muted-foreground mt-1">Current Score</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEndNowOpen(false)}>Impossible!</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => { setEndNowOpen(false); endGame(); }}
            >Sure</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
