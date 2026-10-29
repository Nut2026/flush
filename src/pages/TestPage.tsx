import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  fetchDeck, fetchFlashcards,
  updateStreak, addGems, addExp, saveTestResult, fetchTestHistory, clearTestHistory,
  checkAndAwardBadges, countMasteredCards,
  updateProfile, checkAndCompleteDailyGoals,
  syncFireClub, recordRobinEarlyAction, recordAcePerfectScore,
  fetchUserCharms,
  type UserCharm
} from '@/services/flush/flushService';
import { STARTER_GUEST_DECKS } from '@/services/flush/guestData';
import type { Deck, Flashcard, TestResult } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ArrowLeft, Timer, RotateCcw, History } from 'lucide-react';

type QuestionDetail = { front: string; back: string; correct: boolean };
type TestMode = 'select' | 'testing' | 'done';
type QuestionCount = 'quarter' | 'half' | 'three-quarters' | 'all';
type TestDirection = 'front-back' | 'back-front';

const MOTIVATIONAL_MESSAGES_TEST = [
  "You're on fire! Keep it up! 🔥",
  "10 questions answered — unstoppable! ⚡",
  "Amazing focus! Keep going! 💪",
  "You're crushing it! 🌟",
  "Incredible streak! Don't stop now! 🚀",
  "Your brain is in overdrive — awesome! 🧠",
  "Legend status loading… keep answering! 🏆",
];

function weightedShuffle(cards: Flashcard[]): Flashcard[] {
  const weighted: Flashcard[] = [];
  cards.forEach(c => {
    const weight = Math.max(1, 7 - c.mastery_level);
    for (let i = 0; i < weight; i++) weighted.push(c);
  });
  const shuffled = weighted.sort(() => Math.random() - 0.5);
  const seen = new Set<string>();
  const result: Flashcard[] = [];
  for (const c of shuffled) {
    if (!seen.has(c.id)) { seen.add(c.id); result.push(c); }
  }
  return result;
}

export default function TestPage() {
  const { user, isGuest, refreshProfile } = useAuth();
  const { triggerGemAnimation } = useApp();
  const { enterContext } = useTheme();
  useEffect(() => enterContext('study'), []);
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { setSessionActive } = useSession();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [testCards, setTestCards] = useState<Flashcard[]>([]);
  const [mode, setMode] = useState<TestMode>('select');
  const [qCountMode, setQCountMode] = useState<QuestionCount>('half');
  const [testDirection, setTestDirection] = useState<TestDirection>('front-back');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Per-question tracking for history
  const [, setQuestionDetails] = useState<QuestionDetail[]>([]);
  const questionDetailsRef = useRef<QuestionDetail[]>([]);

  // Test history
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Stop Test confirmation modal
  const [stopTestOpen, setStopTestOpen] = useState(false);

  // Timer — starts immediately when test begins (no waiting for first answer)
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  // Refs to avoid stale closures in timer callback
  const correctCountRef = useRef(0);
  const [chatCharmActive, setChatCharmActive] = useState(false);
  const [, setChatPopupMsg] = useState<string | null>(null);
  const chatCounterRef = useRef<number>(0);
  const [, setEquippedCharms] = useState<UserCharm[]>([]);
  const testCardsRef = useRef<Flashcard[]>([]);

  // Load equipped charms (chat charm support)
  useEffect(() => {
    if (!user || isGuest) return;
    fetchUserCharms(user.id).then(charms => {
      setEquippedCharms(charms.filter(ch => ch.is_equipped));
      setChatCharmActive(charms.some(ch => ch.charm_name === 'chat' && ch.is_equipped));
    });
  }, [user, isGuest]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isGuest) {
          const raw = sessionStorage.getItem('guest_decks');
          const guestDecks = raw ? JSON.parse(raw) : STARTER_GUEST_DECKS;
          const d = guestDecks.find((gd: any) => gd.id === deckId);
          if (d) { setDeck(d); setAllCards(d.cards || []); }
          setLoading(false);
          return;
        }
        if (!deckId || !user) return;
        const [d, c] = await Promise.all([
          fetchDeck(deckId),
          fetchFlashcards(deckId),
        ]);
        if (d) setDeck(d);
        setAllCards(c);
      } catch (err) {
        toast.error('Failed to load test');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [deckId, user, isGuest]);

  // Load test history for logged-in users
  useEffect(() => {
    if (!user || isGuest) return;
    setHistoryLoading(true);
    fetchTestHistory(user.id, deckId).then(h => { setTestHistory(h); setHistoryLoading(false); });
  }, [user, isGuest]);


  const getQCount = useCallback(() => {
    const n = allCards.length;
    const map: Record<QuestionCount, number> = {
      quarter: Math.floor(n / 4),
      half: Math.floor(n / 2),
      'three-quarters': Math.floor(n * 3 / 4),
      all: n,
    };
    return map[qCountMode];
  }, [allCards.length, qCountMode]);

  const startTest = () => {
    const count = getQCount();
    const shuffled = weightedShuffle(allCards).slice(0, count);
    setTestCards(shuffled);
    testCardsRef.current = shuffled;
    setCurrentIdx(0);
    setAnswer('');
    setSubmitted(false);
    setCorrectCount(0);
    setWrongCount(0);
    correctCountRef.current = 0;
    setQuestionDetails([]);
    questionDetailsRef.current = [];
    setTimeLeft(count * 60);
    setMode('testing');
    setSessionActive(true, () => setStopTestOpen(true));
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Timer logic — starts as soon as testing mode begins; uses refs to avoid stale closures
  useEffect(() => {
    if (mode !== 'testing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          finishTest(correctCountRef.current, testCardsRef.current, true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [mode]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitted) { nextQuestion(); return; }

    const card = testCards[currentIdx];
    // Strip everything except letters and digits, then lowercase
    const normalize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const expected = testDirection === 'front-back' ? card.back_text : card.front_text;
    const correct = normalize(answer) === normalize(expected);
    setIsCorrect(correct);
    setSubmitted(true);

    // Increment counters immediately using refs to avoid stale closure
    if (correct) {
      correctCountRef.current += 1;
      setCorrectCount(correctCountRef.current);
    } else {
      setWrongCount(w => w + 1);
    }

    // Chat charm: motivational popup every 10 answered
    if (chatCharmActive) {
      chatCounterRef.current += 1;
      if (chatCounterRef.current % 10 === 0) {
        const msg = MOTIVATIONAL_MESSAGES_TEST[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES_TEST.length)];
        setChatPopupMsg(msg);
        setTimeout(() => setChatPopupMsg(null), 4000);
      }
    }

    // Track per-question detail for history
    const detail: QuestionDetail = { front: card.front_text, back: card.back_text, correct };
    questionDetailsRef.current = [...questionDetailsRef.current, detail];
    setQuestionDetails(q => [...q, detail]);
  };

  const nextQuestion = useCallback(() => {
    if (currentIdx >= testCards.length - 1) {
      finishTest(correctCountRef.current, testCards, false);
    } else {
      setCurrentIdx(i => i + 1);
      setAnswer('');
      setSubmitted(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, testCards]);

  // Global Enter listener — Enter submits when not submitted, Enter advances when submitted
  useEffect(() => {
    if (mode !== 'testing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      // Only intercept when input is focused (submit) or after submission (advance)
      if (submitted) {
        e.preventDefault();
        nextQuestion();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, submitted, nextQuestion]);

  const finishTest = async (finalCorrect: number, cards: Flashcard[], timedOut: boolean) => {
    clearInterval(timerRef.current!);
    setMode('done');
    setSessionActive(false);

    const total = cards.length;
    const pct = total > 0 ? Math.round((finalCorrect / total) * 100) : 0;

    if (!user || isGuest) return;

    try {
      // EXP: 2 per question regardless of right/wrong
      const expEarned = total * 2;

      // Gems: tiered by score
      let gemsEarned = 0;
      if (pct === 100) gemsEarned = 20;
      else if (pct >= 90) gemsEarned = 10;
      else if (pct >= 80) gemsEarned = 5;

      const [streakResult] = await Promise.all([
        updateStreak(user.id),
        saveTestResult(user.id, deckId || null, pct, finalCorrect, total, questionDetailsRef.current),
        addExp(user.id, expEarned),
      ]);

      // Award test gems
      if (gemsEarned > 0) {
        await addGems(user.id, gemsEarned);
        triggerGemAnimation(gemsEarned);
      }

      // Award streak milestone gems
      if (streakResult.milestoneGems > 0) {
        await addGems(user.id, streakResult.milestoneGems);
        triggerGemAnimation(streakResult.milestoneGems);
        if (streakResult.streakUpdated) {
          if (streakResult.milestoneGems > 0) {
            toast.success(`🔥 ${streakResult.newStreak}-day streak! +${streakResult.milestoneGems}💎`, { position: 'top-right' });
          } else {
            const v = [`🔥 ${streakResult.newStreak}-day streak! Keep it going!`, `${streakResult.newStreak} days in a row! 🔥`, `Streak: ${streakResult.newStreak} day${streakResult.newStreak !== 1 ? 's' : ''}! 💪`];
            toast.success(v[Math.floor(Math.random() * v.length)], { position: 'top-right' });
          }
        }
      }

      const masteredCards = await countMasteredCards(user.id);
      await checkAndAwardBadges(user.id, [], {
        streakDays: streakResult.newStreak,
        testScore: pct,
        masteredCards,
      });

      // Club sync
      await Promise.all([
        syncFireClub(user.id, streakResult.newStreak),
        recordRobinEarlyAction(user.id, 'test'),
        ...(pct >= 95 && deckId ? [recordAcePerfectScore(user.id, deckId)] : []),
      ]);

      // Check daily goals
      const goalResult = await checkAndCompleteDailyGoals(user.id, { testScore: pct });
      if (goalResult.gemsAwarded > 0) {
        triggerGemAnimation(goalResult.gemsAwarded);
        toast.success(
          `🎯 Daily quest ${goalResult.totalCompletedToday}/3 complete! +${goalResult.gemsAwarded}💎`,
          {
            position: 'top-right',
            action: {
              label: 'View Quests',
              onClick: () => {
                sessionStorage.setItem('scroll_to_goals', '1');
                navigate('/');
              },
            },
          }
        );
      }

      const toastParts: string[] = [`${pct}%`];
      if (gemsEarned > 0) toastParts.push(`+${gemsEarned}💎`);
      if (expEarned > 0) toastParts.push(`+${expEarned} EXP`);
      if (toastParts.length > 1) {
        toast.success(toastParts.join(' · '));
      }

      await updateProfile(user.id, { last_studied_deck_id: deckId || null });
      await refreshProfile();

      // Refresh history list
      fetchTestHistory(user.id, deckId).then(setTestHistory);
    } catch (err) {
      console.error('Test finish error:', err);
    }
    void timedOut;
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const timerWarning = timeLeft <= 30 && timeLeft > 0;

  // Stop Test: score answered questions; unanswered count as wrong, then go to done
  const handleStopTestConfirm = () => {
    setStopTestOpen(false);
    clearInterval(timerRef.current!);
    // Answered cards already tracked in questionDetailsRef; unanswered = rest
    const answeredCount = questionDetailsRef.current.length;
    const remaining = testCards.slice(answeredCount);
    remaining.forEach(card => {
      const detail: QuestionDetail = { front: card.front_text, back: card.back_text, correct: false };
      questionDetailsRef.current = [...questionDetailsRef.current, detail];
    });
    setQuestionDetails(questionDetailsRef.current);
    finishTest(correctCountRef.current, testCards, false);
  };

  const currentCard = testCards[currentIdx];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  // ── Select ─────────────────────────────────────────────────────────────────
  if (mode === 'select') {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground text-balance">{deck?.title} — Test</h1>
          <p className="text-sm text-muted-foreground mt-1">{allCards.length} cards available</p>
        </div>

        <div className="flex flex-col items-center gap-6">
          {/* Direction selector */}
          <div className="w-full max-w-sm space-y-2">
            <p className="text-sm font-medium text-muted-foreground text-center">Test direction</p>
            <div className="grid grid-cols-2 gap-3">
              {(['front-back', 'back-front'] as TestDirection[]).map(d => (
                <button
                  key={d}
                  onClick={() => setTestDirection(d)}
                  className={`p-3 rounded-xl border-2 transition-all ${testDirection === d ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                >
                  <p className="font-semibold text-sm text-foreground">{d === 'front-back' ? "Front → Back" : "Back → Front"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d === 'front-back' ? "See the front — type the back." : "See the back — type the front."}</p>
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm font-medium text-muted-foreground">Number of questions</p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {(['quarter', 'half', 'three-quarters', 'all'] as QuestionCount[]).map(opt => {
              const n = allCards.length;
              const count = opt === 'quarter' ? Math.floor(n / 4)
                : opt === 'half' ? Math.floor(n / 2)
                : opt === 'three-quarters' ? Math.floor(n * 3 / 4)
                : n;
              return (
                <button
                  key={opt}
                  onClick={() => setQCountMode(opt)}
                  className={`p-4 rounded-xl border-2 transition-all ${qCountMode === opt ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                >
                  <p className="font-semibold text-foreground">{count} questions</p>
                  <p className="text-xs text-muted-foreground capitalize">{opt === 'quarter' ? "Quarter" : opt === 'half' ? "Half" : opt === 'three-quarters' ? "Three quarters" : "All"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{count} min timer</p>
                </button>
              );
            })}
          </div>
          <Button size="lg" onClick={startTest} disabled={allCards.length === 0} className="mt-2 px-10">
            Start test
          </Button>
          {allCards.length === 0 && (
            <p className="text-sm text-destructive mt-2">This deck has no cards to study yet.</p>
          )}
        </div>

        {/* ── Test History (logged-in users only) ── */}
        {!isGuest && user && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Previous tests
              </h2>
              {testHistory.length > 0 && (
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive text-xs h-7" onClick={async () => { if (deckId) { await clearTestHistory(user.id, deckId); } setTestHistory([]); }}>
                  Clear history
                </Button>
              )}
            </div>

            {historyLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 bg-muted w-full" />)}
              </div>
            ) : testHistory.length === 0 ? (
              <div className="text-center py-10 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground text-sm">No tests yet. Take your first one!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {testHistory.map(result => {
                  const pctColor = result.score_percent >= 80 ? 'text-green-500' : result.score_percent >= 50 ? 'text-yellow-500' : 'text-destructive';
                  return (
                    <div key={result.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-base font-bold shrink-0 ${pctColor}`}>{result.score_percent}%</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{deck?.title ?? 'Test'}</p>
                          <p className="text-xs text-muted-foreground">{new Date(result.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {`${result.questions_correct}/${result.questions_total} correct`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Guest prompt — removed: history section not shown for guests */}
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  if (mode === 'done') {
    const finalPct = testCards.length > 0 ? Math.round((correctCount / testCards.length) * 100) : 0;
    const gemsEarned = finalPct === 100 ? 20 : finalPct >= 90 ? 10 : finalPct >= 80 ? 5 : 0;
    const expEarned = testCards.length * 2;
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto text-center">
        <div className="py-12">
          <div className="text-6xl mb-4">{finalPct >= 90 ? '🏆' : finalPct >= 80 ? '🎉' : finalPct >= 50 ? '👍' : '💪'}</div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Test complete!</h1>
          <p className="text-4xl font-bold text-primary mb-1">{finalPct}%</p>
          <p className="text-muted-foreground mb-2">You answered {correctCount} of {testCards.length} correctly.</p>        {!isGuest && (            <p className="text-primary font-semibold mb-6 text-sm">
              {gemsEarned > 0 ? `+${gemsEarned}💎 · ` : ''}+{expEarned} EXP earned
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button onClick={startTest}><RotateCcw className="w-4 h-4 mr-2" />Retry test</Button>
            <Button variant="outline" onClick={() => navigate(deckId ? `/decks/${deckId}/view` : '/decks')}>Back to deck</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Testing ────────────────────────────────────────────────────────────────
  // Progress: advances to 100% once the last question is submitted
  const progressValue = testCards.length > 0
    ? ((currentIdx + (submitted ? 1 : 0)) / testCards.length) * 100
    : 0;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setStopTestOpen(true)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{currentIdx + 1} / {testCards.length}</span>
            <span className={`font-mono font-bold ${timerWarning ? 'text-destructive' : 'text-foreground'}`}>
              <Timer className="w-3.5 h-3.5 inline mr-1" />
              {formatTime(timeLeft)}
            </span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-4 min-h-[120px] flex flex-col justify-center">          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Question {currentIdx + 1} : </p>
        <p className="text-xl font-semibold text-foreground text-center text-balance">
          {testDirection === 'front-back' ? currentCard?.front_text : currentCard?.back_text}
        </p>
      </div>

      {/* Answer input — Enter submits answer; second Enter moves to next question */}
      <form
        onSubmit={handleSubmit}
        className="space-y-3"
      >
        <div className={`rounded-xl border-2 transition-colors ${submitted ? (isCorrect ? 'border-green-500' : 'border-destructive') : 'border-border focus-within:border-primary'}`}>
          <Input
            ref={inputRef}
            placeholder={testDirection === 'front-back' ? "Type the back…" : "Type the front…"}
            value={answer}
            onChange={e => { if (!submitted) setAnswer(e.target.value); }}
            disabled={submitted}
            className="border-0 bg-transparent text-base h-12"
          />
        </div>

        {submitted && (
          <div className={`rounded-xl p-3 text-sm ${isCorrect ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-destructive/10 border border-destructive/30 text-destructive'}`}>
            {isCorrect ? (
              <p>✓ Correct. Answer: <strong>{testDirection === 'front-back' ? currentCard?.back_text : currentCard?.front_text}</strong></p>
            ) : (
              <p>✗ Incorrect. Answer: <strong>{testDirection === 'front-back' ? currentCard?.back_text : currentCard?.front_text}</strong></p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {!submitted ? (
            <Button type="submit" className="flex-1" disabled={!answer.trim()}>
              Submit
            </Button>
          ) : (
            <Button type="button" onClick={nextQuestion} className="flex-1">
              {currentIdx >= testCards.length - 1 ? "See results" : `Next question →`}
              <span className="ml-2 text-xs opacity-60 hidden md:inline">Enter ↵</span>
            </Button>
          )}
        </div>
      </form>

      {/* Score tracker — correct/wrong always ≥ 0 */}
      <div className="flex justify-center gap-6 mt-6 text-sm text-muted-foreground">
        <span>✓ {correctCount} correct</span>
        <span>✗ {wrongCount} wrong</span>
      </div>

      {/* End Test modal */}
      <AlertDialog open={stopTestOpen} onOpenChange={setStopTestOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>End test?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-lg font-bold text-foreground">
                      {questionDetailsRef.current.length}/{testCards.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Answered</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-lg font-bold text-foreground">
                      {testCards.length > 0 ? Math.round((questionDetailsRef.current.length / testCards.length) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Ending now scores only the questions you answered.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Absolutely not</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleStopTestConfirm}
            >
              Absolutely yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
