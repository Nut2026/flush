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
import { ArrowLeft, Building2 } from 'lucide-react';

type GameState = 'select' | 'playing' | 'done';
type Direction = 'front-back' | 'back-front';

// ── Tower color progression ───────────────────────────────────────────────────
// Score 1-5: all purple. 6-10: deep purple spreads up. 11-15: dark violet. 16-20: royal purple.
const TIER_COLORS = ['#8A2BE2', '#5B0A91', '#4B0082', '#6A0DAD'];

function getTowerFloorColor(floorPos: number, totalScore: number): string {
  // floorPos: 1 = bottom, 5 = top
  if (totalScore === 0) return TIER_COLORS[0];
  const tier = Math.floor((totalScore - 1) / 5);           // 0,1,2,3
  const withinTier = (totalScore - 1) % 5 + 1;             // how many floors have tier color (from bottom)
  const clampedTier = Math.min(tier, TIER_COLORS.length - 1);
  if (floorPos <= withinTier) return TIER_COLORS[clampedTier];
  return TIER_COLORS[Math.max(0, clampedTier - 1)];
}

export default function SkyscraperGame() {
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
  const [wrongCount, setWrongCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  // MCQ choices: 4 cards, one is correct
  const [choices, setChoices] = useState<Flashcard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [loading, setLoading] = useState(true);
  const [shaking, setShaking] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);
  const wrongRef = useRef(0);

  // Track which card ids have been used (to avoid repeating questions)
  const usedIds = useRef<Set<string>>(new Set());

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

  const pickCard = useCallback((used: Set<string>) => {
    const avail = cards.filter(c => !used.has(c.id));
    if (avail.length === 0) return cards[Math.floor(Math.random() * cards.length)];
    return avail[Math.floor(Math.random() * avail.length)];
  }, [cards]);

  // Build 4 MCQ choices: 1 correct + 3 random distractors (no repeats)
  const buildChoices = useCallback((correct: Flashcard): Flashcard[] => {
    const pool = cards.filter(c => c.id !== correct.id);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const distractors = shuffled.slice(0, 3);
    const all = [...distractors, correct].sort(() => Math.random() - 0.5);
    return all;
  }, [cards]);

  const startGame = async (skipTokenCharge = false) => {
    if (!isGuest && user && !skipTokenCharge) {
      await useGameToken(user.id);
      await refreshProfile();
    }
    scoreRef.current = 0;
    wrongRef.current = 0;
    usedIds.current = new Set();
    setScore(0);
    setWrongCount(0);
    setFeedback(null);
    setSelectedId(null);
    setShaking(false);
    setGameOver(false);
    const first = cards[Math.floor(Math.random() * cards.length)];
    usedIds.current.add(first.id);
    setCurrentCard(first);
    setChoices(buildChoices(first));
    setTimeLeft(10);
    setGameState('playing');
    setSessionActive(true, () => setEndNowOpen(true));
  };

  // Per-question timer
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;
    clearInterval(timerRef.current!);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleTimeOut();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [currentCard, gameState, gameOver]);

  const handleTimeOut = () => {
    wrongRef.current += 1;
    setWrongCount(wrongRef.current);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
    if (wrongRef.current >= 3) { endGame(); return; }
    nextCard();
  };

  const handleChoiceSelect = (chosen: Flashcard) => {
    if (!currentCard || gameOver || gameState !== 'playing' || feedback !== null) return;
    clearInterval(timerRef.current!);
    setSelectedId(chosen.id);

    const correct = chosen.id === currentCard.id;
    if (correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setFeedback('correct');
    } else {
      wrongRef.current += 1;
      setWrongCount(wrongRef.current);
      setFeedback('wrong');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }

    if (wrongRef.current >= 3) { setTimeout(endGame, 800); return; }

    setTimeout(() => {
      setFeedback(null);
      setSelectedId(null);
      nextCard();
    }, 900);
  };

  const nextCard = () => {
    const next = pickCard(usedIds.current);
    usedIds.current.add(next.id);
    setCurrentCard(next);
    setChoices(buildChoices(next));
    setTimeLeft(10);
  };

  const endGame = useCallback(async () => {
    clearInterval(timerRef.current!);
    setGameOver(true);
    setGameState('done');
    setSessionActive(false);

    if (!user || isGuest) return;
    try {
      const { beatHighScore, beatDeckBest } = await upsertGameHighScore(user.id, 'skyscraper', deckId!, scoreRef.current);
      await saveGameSession(user.id, 'skyscraper', deckId || null, scoreRef.current, beatHighScore, beatDeckBest);
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

  const prompt = currentCard ? (direction === 'front-back' ? currentCard.front_text : currentCard.back_text) : '';
  // For MCQ: label of each choice is the answer side
  const choiceLabel = (c: Flashcard) => direction === 'front-back' ? c.back_text : c.front_text;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (gameState === 'select') return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate('/arcade')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />Back to games
      </Button>
      <div className="text-center mb-8">
        <div className="mb-3"><Building2 className="w-10 h-10 text-primary mx-auto" /></div>
        <h1 className="text-2xl font-bold text-foreground">Build a Skyscraper</h1>
        <p className="text-sm text-muted-foreground mt-1">{deckTitle} · {cards.length} cards</p>
        <p className="text-xs text-muted-foreground mt-2">Answer correctly to stack floors, and build your tower higher.</p>
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
        <Button size="lg" onClick={() => startGame()} disabled={cards.length < 2} className="px-10">Start game</Button>
      </div>
    </div>
  );

  if (gameState === 'done') {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto text-center">
        <div className="py-12">
          <div className="mb-4"><Building2 className="w-12 h-12 text-primary mx-auto" /></div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Your tower topped out!</h1>
          <p className="text-5xl font-bold text-primary mb-1">{scoreRef.current}</p>
          <p className="text-muted-foreground mb-4">floors built</p>

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
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      {/* HUD */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => setEndNowOpen(true)}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">FLOOR</p>
            <p className="text-2xl font-bold text-primary">{score}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">TIME</p>
            <p className={`text-2xl font-bold ${timeLeft <= 3 ? 'text-destructive' : 'text-foreground'}`}>{timeLeft}s</p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full ${i < wrongCount ? 'bg-destructive' : 'bg-secondary border border-border'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Skyscraper visual — max 5 floors, color-coded by progression tier */}
      <div className="flex justify-center mb-4">
        <div className="flex flex-col-reverse items-center gap-[3px]" style={{ minHeight: '8rem' }}>
          {Array.from({ length: Math.min(score, 5) }, (_, i) => {
            const floorPos = i + 1; // 1 = bottom
            const floorColor = getTowerFloorColor(floorPos, score);
            return (
              <div
                key={i}
                className={`h-6 rounded-sm border border-white/10 transition-all duration-300 ${shaking ? 'animate-[shake_0.1s_ease-in-out_3]' : ''}`}
                style={{
                  width: `${Math.max(48, 90 - i * 8)}px`,
                  backgroundColor: floorColor,
                  boxShadow: `0 0 6px ${floorColor}88`,
                }}
              />
            );
          })}
          {score === 0 && (
            <div className="text-xs text-muted-foreground italic">Stack floors by answering correctly</div>
          )}
        </div>
      </div>

      {/* Question */}
      <div className={`rounded-2xl border p-5 mb-4 text-center transition-colors ${
        feedback === 'correct' ? 'border-green-500 bg-green-500/10'
          : feedback === 'wrong' ? 'border-destructive bg-destructive/10'
          : 'border-border bg-card'
      }`}>
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
          {direction === 'front-back' ? "Front" : "Back"}:
        </p>
        <p className="text-xl font-bold text-foreground text-balance">{prompt}</p>
        {feedback === 'correct' && <p className="text-green-400 text-sm mt-2 font-semibold">✓ Correct!</p>}
        {feedback === 'wrong' && currentCard && (
          <p className="text-sm text-destructive mt-2">
            ✗ Correct answer: <strong>{direction === 'front-back' ? currentCard.back_text : currentCard.front_text}</strong>
          </p>
        )}
      </div>

      {/* MCQ choices */}
      <div className="grid grid-cols-2 gap-3">
        {choices.map(c => {
          const isCorrect = c.id === currentCard?.id;
          const isSelected = selectedId === c.id;
          let btnClass = 'w-full p-3 rounded-xl border-2 text-sm font-medium transition-all text-left ';
          if (feedback === null) {
            btnClass += 'border-border bg-card hover:border-primary hover:bg-primary/5 cursor-pointer';
          } else if (isCorrect) {
            btnClass += 'border-green-500 bg-green-500/15 text-green-400';
          } else if (isSelected) {
            btnClass += 'border-destructive bg-destructive/15 text-destructive';
          } else {
            btnClass += 'border-border bg-card opacity-50';
          }
          return (
            <button
              key={c.id}
              className={btnClass}
              onClick={() => handleChoiceSelect(c)}
              disabled={feedback !== null}
            >
              <span className="line-clamp-3">{choiceLabel(c)}</span>
            </button>
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
