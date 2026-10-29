import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  fetchDeck, fetchFlashcards, updateMastery,
  updateStreak, recordCardsStudied, addGems, addExp, checkAndAwardBadges,
  countMasteredCards, updateProfile, checkAndCompleteDailyGoals,
  saveStudySession, fetchStudyHistory, clearStudyHistory,
  syncFireClub, recordRobinEarlyAction,
  fetchUserCharms, type UserCharm,
} from '@/services/flush/flushService';
import { STARTER_GUEST_DECKS } from '@/services/flush/guestData';
import type { Deck, Flashcard, StudySession } from '@/types/types';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, History, BookOpen, Clock } from 'lucide-react';

type StudyMode = 'select' | 'studying' | 'done';
type Direction = 'front-back' | 'back-front';

const MASTERY_LABELS: Record<number, string> = {
  1: 'New', 2: 'Learning', 3: 'Familiar', 4: 'Good', 5: 'Great', 6: 'Mastered'
};
const MASTERY_COLORS: Record<number, string> = {
  1: 'text-red-400', 2: 'text-orange-400', 3: 'text-yellow-400',
  4: 'text-blue-400', 5: 'text-green-400', 6: 'text-primary'
};

export default function StudyPage() {
  const { user, isGuest, refreshProfile } = useAuth();
  const { triggerGemAnimation } = useApp();
  const { enterContext } = useTheme();
  useEffect(() => enterContext('study'), []);
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { setSessionActive } = useSession();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  const [mode, setMode] = useState<StudyMode>('select');
  const [sessionExpEarned, setSessionExpEarned] = useState(0);
  const [direction, setDirection] = useState<Direction>('front-back');
  const [currentIdx, setCurrentIdx] = useState(0);
  // displayIdx tracks which card's content is shown — lags behind currentIdx during flip
  const [displayIdx, setDisplayIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [chatCharmActive, setChatCharmActive] = useState(false);
  const chatCounterRef = useRef<number>(0);
  const [, setEquippedCharms] = useState<UserCharm[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stopOpen, setStopOpen] = useState(false);
  const flipAnimatingRef = useRef(false);

  // Session timer
  const sessionStartRef = useRef<number>(0);
  // Load equipped charms
  useEffect(() => {
    if (!user || isGuest) return;
    fetchUserCharms(user.id).then(charms => {
      setEquippedCharms(charms.filter(ch => ch.is_equipped));
      setChatCharmActive(charms.some(ch => ch.charm_name === 'chat' && ch.is_equipped));
    });
  }, [user, isGuest]);

  const MOTIVATIONAL_MESSAGES_STUDY = [
    "You're on fire! Keep it up! 🔥",
    "10 cards studied — unstoppable! ⚡",
    "Amazing focus! Keep going! 💪",
    "You're crushing it! 🌟",
    "Incredible streak! Don't stop now! 🚀",
    "Your brain is in overdrive — awesome! 🧠",
    "Legend status loading… keep going! 🏆",
  ];

  // Track actual answered cards (not total deck size)
  const cardsAnsweredRef = useRef<number>(0);

  // Study history
  const [studyHistory, setStudyHistory] = useState<StudySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isGuest) {
          const raw = sessionStorage.getItem('guest_decks');
          const guestDecks = raw ? JSON.parse(raw) : STARTER_GUEST_DECKS;
          const d = guestDecks.find((gd: any) => gd.id === deckId);
          if (d) { setDeck(d); setCards(d.cards || []); }
          setLoading(false);
          return;
        }
        if (!deckId) return;
        const [d, c] = await Promise.all([fetchDeck(deckId), fetchFlashcards(deckId)]);
        if (d) setDeck(d);
        setCards(c);
      } catch {
        toast.error('Failed to load deck');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [deckId, isGuest]);

  // Load study history for logged-in users
  useEffect(() => {
    if (!user || isGuest) return;
    setHistoryLoading(true);
    fetchStudyHistory(user.id, deckId, 10).then(h => { setStudyHistory(h); setHistoryLoading(false); });
  }, [user, isGuest]);

  // Keyboard shortcuts
  useEffect(() => {
    if (mode !== 'studying') return;
    const onKey = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); setFlipped(f => !f); }
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === '1' && flipped) { e.preventDefault(); handleAnswer(false); }
      if (e.key === '2' && flipped) { e.preventDefault(); handleAnswer(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, flipped, currentIdx]);

  const startStudy = () => {
    // Weight by lower mastery: sort ascending by mastery_level
    const sorted = [...cards].sort((a, b) => a.mastery_level - b.mastery_level);
    setStudyCards(sorted);
    setCurrentIdx(0);
    setDisplayIdx(0);
    setFlipped(false);
    setCorrectCount(0);
    setReviewCount(0);
    sessionStartRef.current = Date.now();
    cardsAnsweredRef.current = 0;
    flipAnimatingRef.current = false;
    setMode('studying');
    setSessionActive(true, () => setStopOpen(true));
  };

  const handleAnswer = async (correct: boolean) => {
    const card = studyCards[currentIdx];
    if (!card) return;

    cardsAnsweredRef.current += 1;
    // Chat charm: motivational popup every 10 answered
    if (chatCharmActive) {
      chatCounterRef.current += 1;
      if (chatCounterRef.current % 10 === 0) {
        const msg = MOTIVATIONAL_MESSAGES_STUDY[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES_STUDY.length)];
        toast.info(msg, { id: 'study-charm' });
      }
    }
    const newCorrectCount = correct ? correctCount + 1 : correctCount;
    if (correct) {
      setCorrectCount(newCorrectCount);
    } else {
      setReviewCount(c => c + 1);
    }

    if (!isGuest && deckId) {
      try {
        const newLevel = await updateMastery(card.id, card.mastery_level, correct);
        setStudyCards(prev => prev.map((c, i) => i === currentIdx ? { ...c, mastery_level: newLevel as any } : c));
      } catch (err) {
        console.error('Mastery update error:', err);
      }
    }

    if (currentIdx >= studyCards.length - 1) {
      await finishSession(newCorrectCount);
    } else {
      // Flip card face-down first — back content stays on current card while flipping
      // After the CSS flip animation (~320ms), update displayIdx so next card's front appears
      setFlipped(false);
      flipAnimatingRef.current = true;
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setTimeout(() => {
        setDisplayIdx(nextIdx);
        flipAnimatingRef.current = false;
      }, 320);
    }
  };

  const finishSession = async (finalCorrectCount?: number, actualCardsAnswered?: number) => {
    const durationSeconds = sessionStartRef.current
      ? Math.round((Date.now() - sessionStartRef.current) / 1000)
      : 0;
    const resolvedCorrect = finalCorrectCount ?? correctCount;
    setMode('done');
    setSessionActive(false);
    if (!user || isGuest) return;

    try {
      const answeredCount = actualCardsAnswered ?? cardsAnsweredRef.current;
      if (answeredCount === 0) { setMode('done'); return; }

      // EXP: 1 per card answered (correct or review)
      const expEarned = answeredCount;

      const [streakResult] = await Promise.all([
        updateStreak(user.id),
        recordCardsStudied(user.id, answeredCount, deckId),
        saveStudySession(user.id, deckId || null, answeredCount, resolvedCorrect, durationSeconds),
        addExp(user.id, expEarned),
      ]);

      let totalGems = 0;

      // Streak toast (always on new streak day)
      if (streakResult.streakUpdated) {
        if (streakResult.milestoneGems > 0) {
          const variants2 = [
            `🔥 ${streakResult.newStreak}-day streak! +${streakResult.milestoneGems}💎`,
            `${streakResult.newStreak} days! Milestone bonus +${streakResult.milestoneGems}💎 🔥`,
          ];
          toast.success(variants2[Math.floor(Math.random() * variants2.length)], { position: 'top-right' });
        } else {
          const variants = [
            `🔥 ${streakResult.newStreak}-day streak! Keep it going!`,
            `${streakResult.newStreak} days in a row! 🔥`,
            `Streak continues: ${streakResult.newStreak} day${streakResult.newStreak !== 1 ? 's' : ''}! 💪`,
            `${streakResult.newStreak} day streak active! Don't stop now 🔥`,
          ];
          toast.success(variants[Math.floor(Math.random() * variants.length)], { position: 'top-right' });
        }
      }

      if (streakResult.milestoneGems > 0) {
        totalGems += streakResult.milestoneGems;
      }

      if (totalGems > 0) {
        await addGems(user.id, totalGems);
        triggerGemAnimation(totalGems);
      }

      // Sync clubs
      await Promise.all([
        syncFireClub(user.id, streakResult.newStreak),
        recordRobinEarlyAction(user.id, 'study'),
      ]);

      await updateProfile(user.id, { last_studied_deck_id: deckId || null });

      const masteredCards = await countMasteredCards(user.id);
      await checkAndAwardBadges(user.id, [], {
        streakDays: streakResult.newStreak,
        masteredCards,
      });

      const goalResult = await checkAndCompleteDailyGoals(user.id);
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

      setSessionExpEarned(expEarned);
      await refreshProfile();

      fetchStudyHistory(user.id, deckId, 10).then(setStudyHistory);
    } catch (err) {
      console.error('Session finish error:', err);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      const prevIdx = currentIdx - 1;
      setFlipped(false);
      flipAnimatingRef.current = true;
      setCurrentIdx(prevIdx);
      setTimeout(() => { setDisplayIdx(prevIdx); flipAnimatingRef.current = false; }, 320);
    }
  };
  const handleNext = () => {
    if (currentIdx < studyCards.length - 1) {
      const nextIdx = currentIdx + 1;
      setFlipped(false);
      flipAnimatingRef.current = true;
      setCurrentIdx(nextIdx);
      setTimeout(() => { setDisplayIdx(nextIdx); flipAnimatingRef.current = false; }, 320);
    }
  };

  const currentCard = studyCards[displayIdx];
  const front = currentCard ? (direction === 'front-back' ? currentCard.front_text : currentCard.back_text) : '';
  const back = currentCard ? (direction === 'front-back' ? currentCard.back_text : currentCard.front_text) : '';
  const progress = studyCards.length > 0 ? ((currentIdx) / studyCards.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Mode: Select ──────────────────────────────────────────────────────────
  if (mode === 'select') {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground text-balance">{deck?.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{cards.length} cards · {deck?.subject}</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-sm font-medium">Study direction</p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            <button
              onClick={() => setDirection('front-back')}
              className={`p-4 rounded-xl border-2 transition-all ${
                direction === 'front-back'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <p className="font-semibold text-sm text-foreground">Front → Back</p>
              <p className="text-xs text-muted-foreground mt-1">Type your answer, then check it.</p>
            </button>
            <button
              onClick={() => setDirection('back-front')}
              className={`p-4 rounded-xl border-2 transition-all ${
                direction === 'back-front'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <p className="font-semibold text-sm text-foreground">Back → Front</p>
              <p className="text-xs text-muted-foreground mt-1">Think of the answer, then flip the card to check.</p>
            </button>
          </div>
          <Button size="lg" onClick={startStudy} disabled={cards.length === 0} className="mt-4 px-10">
            Start studying
          </Button>
          {cards.length === 0 && (
            <p className="text-sm text-destructive">This deck has no cards to study yet.</p>
          )}
        </div>

        {/* ── Study History (logged-in users only) ── */}
        {!isGuest && user && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Recent sessions
              </h2>
              {studyHistory.length > 0 && (
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive text-xs h-7" onClick={async () => { if (deckId) { await clearStudyHistory(user.id, deckId); } setStudyHistory([]); }}>
                  Clear history
                </Button>
              )}
            </div>

            {historyLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-muted w-full" />)}
              </div>
            ) : studyHistory.length === 0 ? (
              <div className="text-center py-10 rounded-xl border border-dashed border-border">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No study sessions yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {studyHistory.map(session => {
                  const durationMin = Math.max(1, Math.round(session.duration_seconds / 60));
                  const masteredDelta = session.cards_correct;
                  return (
                    <div key={session.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <BookOpen className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {deck?.title ?? "Study session"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.created_at).toLocaleDateString(
                              'en-GB',
                              { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                        <span className="text-xs bg-muted rounded-full px-2 py-1 text-muted-foreground">
                          {session.cards_reviewed} cards reviewed
                        </span>
                        <span className="text-xs bg-green-500/10 text-green-600 rounded-full px-2 py-1">
                          {masteredDelta} mastered
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />{durationMin} min
                        </span>
                      </div>
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

  // ── Mode: Done ─────────────────────────────────────────────────────────────
  // Chat charm popup overlay (fixed, rendered on top)

  if (mode === 'done') {
    const pct = Math.round((correctCount / studyCards.length) * 100);
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto text-center">
        <div className="py-12">
          <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
          <h1 className="text-3xl font-bold text-foreground text-balance mb-2">Session complete!</h1>
          <p className="text-muted-foreground mb-4">
            Mastered <span className="text-green-400 font-bold">{correctCount}</span> studied,{' '}
            <span className="text-yellow-400 font-bold">{reviewCount}</span> need practice.
          </p>
          {!isGuest && sessionExpEarned > 0 && (
            <p className="text-primary font-semibold mb-6 text-sm">+{sessionExpEarned} EXP earned</p>
          )}

          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-8">
            {[
              { label: "Got it right", value: correctCount },
              { label: "Need review", value: reviewCount },
            ].map(s => (
              <div key={s.label} className="bg-secondary rounded-xl p-4">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => { setMode('select'); setSessionExpEarned(0); }}>
              <RotateCcw className="w-4 h-4 mr-2" />Study again
            </Button>
            <Button variant="outline" onClick={() => navigate(deckId ? `/decks/${deckId}/view` : '/decks')}>
              Back to deck
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Mode: Studying ─────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Stop Session confirmation dialog */}
      <AlertDialog open={stopOpen} onOpenChange={setStopOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>End this session?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Here is how this session went.</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-lg font-bold text-foreground">{currentIdx + 1}</p>
                    <p className="text-xs text-muted-foreground">Studied</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-lg font-bold text-green-500">{correctCount}</p>
                    <p className="text-xs text-muted-foreground">I knew this one</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-lg font-bold text-yellow-500">{reviewCount}</p>
                    <p className="text-xs text-muted-foreground">I need to review this one</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {studyCards.length > 0
                    ? `${Math.round(((currentIdx + 1) / studyCards.length) * 100)}% of deck completed.`
                    : ''}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep studying</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => finishSession(correctCount, cardsAnsweredRef.current)}
            >
              End session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setStopOpen(true)} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{currentIdx + 1} / {studyCards.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Card */}
      <div
        className="card-flip-container cursor-pointer mx-auto mb-6"
        onClick={() => setFlipped(f => !f)}
        style={{ maxWidth: '500px', height: 'clamp(280px, 40vh, 420px)' }}
      >
        <div className={`card-flip-inner ${flipped ? 'flipped' : ''}`} style={{ width: '100%', height: '100%' }}>
          {/* Front */}
          <div className="card-face rounded-2xl border border-border bg-card shadow-card flex flex-col">
            <p className="text-xs text-muted-foreground px-6 pt-5 pb-2 uppercase tracking-wider text-center shrink-0">
              {direction === 'front-back' ? "Front" : "Back"}
            </p>
            <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-2">
              <div className="min-h-full flex items-center justify-center py-3">
                <p className="text-xl font-semibold text-foreground text-center text-balance w-full">{front}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pb-4 text-center shrink-0">Tap the card to flip it</p>
          </div>
          {/* Back */}
          <div className="card-face card-face-back rounded-2xl border border-primary/30 bg-primary/5 shadow-card flex flex-col">
            <p className="text-xs text-muted-foreground px-6 pt-5 pb-2 uppercase tracking-wider text-center shrink-0">
              {direction === 'front-back' ? "Back" : "Front"}
            </p>
            <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-2">
              <div className="min-h-full flex flex-col items-center justify-center py-3 gap-3">
                <p className="text-xl font-semibold text-foreground text-center text-balance w-full">{back}</p>
                {currentCard?.notes && (
                  <div className="w-full border-t border-primary/20 pt-3 shrink-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 text-center">Notes</p>
                    <p className="text-sm text-foreground/80 text-center text-pretty">{currentCard.notes}</p>
                  </div>
                )}
              </div>
            </div>
            {currentCard && (
              <div className={`pb-4 text-xs font-medium text-center shrink-0 ${MASTERY_COLORS[currentCard.mastery_level]}`}>
                Mastery: {MASTERY_LABELS[currentCard.mastery_level]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentIdx === 0}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm text-muted-foreground">{currentIdx + 1}/{studyCards.length}</span>
        <Button variant="ghost" size="sm" onClick={handleNext} disabled={currentIdx >= studyCards.length - 1}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Answer buttons (shown only when flipped) */}
      {flipped && (
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              onClick={() => handleAnswer(false)}
            >
              Need review
            </Button>
            <Button
              size="lg"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAnswer(true)}
            >
              Got it right
            </Button>
          </div>
          <div className="flex gap-3 justify-center">
            <span className="flex-1 text-center text-xs text-muted-foreground">Press <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-xs font-mono">1</kbd></span>
            <span className="flex-1 text-center text-xs text-muted-foreground">Press <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-xs font-mono">2</kbd></span>
          </div>
        </div>
      )}
    </div>
  );
}
