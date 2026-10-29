import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchDecks, fetchOrCreateDailyGoals } from '@/services/flush/flushService';
import { GOAL_POOL } from '@/services/flush/constants';
import { PROFILE_GRADIENTS } from '@/services/flush/constants';
import type { Deck, DailyGoal } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Trophy, Target, Zap, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { STARTER_GUEST_DECKS } from '@/services/flush/guestData';
import { GuestBanner } from '@/components/common/GuestBanner';
import { GuestGate } from '@/components/common/GuestGate';
import { ProfileCharacter, isProfileIcon } from '@/components/common/ProfileCharacter';

// ── Tier / League helpers ────────────────────────────────────────────────────
const EXP_TIERS_DASH = [
  { name: 'Pin',        emoji: '📌', threshold: 0 },
  { name: 'Clip',       emoji: '🖇️',  threshold: 500 },
  { name: 'Eraser',     emoji: '🧹', threshold: 1_500 },
  { name: 'Sharpener',  emoji: '✏️',  threshold: 4_000 },
  { name: 'Scissors',   emoji: '✂️',  threshold: 10_000 },
  { name: 'Ruler',      emoji: '📏', threshold: 25_000 },
  { name: 'Protractor', emoji: '📐', threshold: 60_000 },
  { name: 'Compass',    emoji: '🧭', threshold: 150_000 },
  { name: 'Highlighter',emoji: '🖊️', threshold: 400_000 },
  { name: 'Notebook',   emoji: '📓', threshold: 1_000_000 },
  { name: 'Stapler',    emoji: '🗄️', threshold: 2_500_000 },
  { name: 'Calculator', emoji: '🧮', threshold: 5_000_000 },
  { name: 'Laminator',  emoji: '🖨️', threshold: 13_000_000 },
];

const ARENA_LEAGUES_DASH = [
  { name: 'Sting',    emoji: '🐝', min: 0 },
  { name: 'Grip',     emoji: '🤝', min: 100 },
  { name: 'Void',     emoji: '🌑', min: 250 },
  { name: 'Grind',    emoji: '⚙️', min: 500 },
  { name: 'Blade',    emoji: '🗡️', min: 900 },
  { name: 'Surge',    emoji: '⚡', min: 1400 },
  { name: 'Gaze',     emoji: '👁️', min: 2000 },
  { name: 'Vector',   emoji: '📐', min: 2750 },
  { name: 'Blaze',    emoji: '🔥', min: 3600 },
  { name: 'Canon',    emoji: '💥', min: 4600 },
  { name: 'Keystone', emoji: '🗝️', min: 6000 },
  { name: 'Apex',     emoji: '🦅', min: 7500 },
  { name: 'Zenith',   emoji: '🌟', min: 9500 },
];

function getExpTierDash(exp: number) {
  let t = EXP_TIERS_DASH[0];
  for (const tier of EXP_TIERS_DASH) { if (exp >= tier.threshold) t = tier; }
  return t;
}
function getArenaLeagueDash(trophies: number) {
  let l = ARENA_LEAGUES_DASH[0];
  for (const league of ARENA_LEAGUES_DASH) { if (trophies >= league.min) l = league; }
  return l;
}
function getNextExpThreshold(exp: number): number | null {
  for (let i = EXP_TIERS_DASH.length - 1; i >= 0; i--) {
    if (exp >= EXP_TIERS_DASH[i].threshold) {
      return i < EXP_TIERS_DASH.length - 1 ? EXP_TIERS_DASH[i + 1].threshold : null;
    }
  }
  return EXP_TIERS_DASH[1].threshold;
}
function getNextLeagueMin(trophies: number): number | null {
  for (let i = ARENA_LEAGUES_DASH.length - 1; i >= 0; i--) {
    if (trophies >= ARENA_LEAGUES_DASH[i].min) {
      return i < ARENA_LEAGUES_DASH.length - 1 ? ARENA_LEAGUES_DASH[i + 1].min : null;
    }
  }
  return ARENA_LEAGUES_DASH[1].min;
}

export default function DashboardPage() {
  const { user, profile, isGuest } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [goals, setGoals] = useState<DailyGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const goalsRef = useRef<HTMLDivElement>(null);

  // Scroll to goals section if flagged via sessionStorage (from goal toast "View Goals" action)
  useEffect(() => {
    if (sessionStorage.getItem('scroll_to_goals')) {
      sessionStorage.removeItem('scroll_to_goals');
      setTimeout(() => goalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, []);

  const gradient = PROFILE_GRADIENTS.find(g => g.id === (profile?.profile_gradient || 'default'));

  // Streak notification — show once per new session day IF user hasn't studied yet today
  useEffect(() => {
    if (!profile || profile.streak_days < 1) return;
    // Only fire if the user hasn't studied today (last_study_date !== today)
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
    if (profile.last_study_date === today) return; // already studied today — skip
    const key = `streak_notif_${profile.streak_days}_${today}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    const days = profile.streak_days;
    const next = days + 1;
    const variants = [
      `Your streak is at ${days} day${days !== 1 ? 's' : ''}! Study today to defend it and reach ${next}! 🔥`,
      `${days}-day streak on the line! One session keeps it alive 💪`,
      `Don't break the chain! Study now to hit ${next} days! 🔥`,
      `${days} days going strong — defend your streak today! 🎯`,
      `You're at ${days} day${days !== 1 ? 's' : ''}! One quick study session to reach ${next}! 🚀`,
      `${days}-day streak at risk! Study now and push to ${next}! 🔥`,
      `Keep it alive! ${days} → ${next} days is one session away 💎`,
    ];
    const msg = variants[Math.floor(Math.random() * variants.length)];
    toast.success(msg, { position: 'top-right' });
  }, [profile?.streak_days, profile?.last_study_date]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isGuest) {
          const raw = sessionStorage.getItem('guest_decks');
          const guestDecks = raw ? JSON.parse(raw) : STARTER_GUEST_DECKS;
          setDecks(guestDecks);
          setLoading(false);
          return;
        }
        if (!user) return;
        const [deckData, goalData] = await Promise.all([
          fetchDecks(user.id),
          fetchOrCreateDailyGoals(user.id),
        ]);
        setDecks(deckData);
        setGoals(goalData);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, isGuest]);

  const lastStudiedDeck = decks.find(d => d.id === profile?.last_studied_deck_id) || decks[0];

  const completedGoals = goals
    ? [goals.goal1_complete, goals.goal2_complete, goals.goal3_complete].filter(Boolean).length
    : 0;

  // Compute goal progress values from profile data
  const today = new Date().toLocaleDateString('en-CA');
  const cardsToday = profile?.daily_cards_studied_date === today ? (profile?.daily_cards_studied ?? 0) : 0;
  const testsToday = profile?.daily_tests_completed_date === today ? (profile?.daily_tests_completed ?? 0) : 0;
  const gamesToday = profile?.daily_games_played_date === today ? (profile?.daily_games_played ?? 0) : 0;
  const decksToday = profile?.daily_decks_studied_date === today ? (profile?.daily_decks_studied_ids?.length ?? 0) : 0;
  const gemsToday = profile?.daily_gems_earned_date === today ? (profile?.daily_gems_earned ?? 0) : 0;

  function getGoalProgress(description: string): { current: number; target: number } {
    const pool = GOAL_POOL.find(p => p.description === description);
    if (!pool) return { current: 0, target: 1 };
    const { type, target } = pool;
    let current = 0;
    if (type === 'cards_studied') current = cardsToday;
    else if (type === 'tests_completed') current = testsToday;
    else if (type === 'test_score_80' || type === 'test_score_100') current = 0; // event-based
    else if (type === 'decks_studied') current = decksToday;
    else if (type === 'gems_earned') current = gemsToday;
    else if (type === 'games_played') current = gamesToday;
    else if (type === 'beat_high_score') current = 0;
    return { current: Math.min(current, target), target };
  }

  const goalItems = goals
    ? [
        { text: goals.goal1, done: goals.goal1_complete, reward: goals.goal1_gem_reward },
        { text: goals.goal2, done: goals.goal2_complete, reward: goals.goal2_gem_reward },
        { text: goals.goal3, done: goals.goal3_complete, reward: goals.goal3_gem_reward },
      ]
    : [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Guest banner */}
      {isGuest && <GuestBanner message="You are browsing as a guest. Sign up to save your streak and gems." />}

      {/* Welcome header */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
          style={{ background: gradient?.css || 'linear-gradient(135deg, #B026FF, #00D4FF)' }}
        >
          <ProfileCharacter
            char={profile?.profile_character || (isGuest ? 'G' : '?')}
            color={profile?.profile_char_color || '#ffffff'}
            size={isProfileIcon(profile?.profile_character) ? 32 : 28}
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground text-balance">
            Welcome back, {profile?.username || (isGuest ? 'Guest' : 'Learner')}!
          </h1>
          <p className="text-sm text-muted-foreground">Keep the streak alive — one small session is enough.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: '💎', label: "Gems", value: profile?.gems ?? 0 },
          { icon: (() => {
            const today = new Date().toLocaleDateString('en-CA');
            const breakDate = profile?.streak_break_date;
            const studiedToday = profile?.last_study_date === today;
            // ❄️ — streak just broke: returned today but streak_break_date is today
            //     OR has not studied today and break was recent (within 7 days)
            const breakRecent = !!breakDate && (() => {
              const d1 = new Date(breakDate); const d2 = new Date(today);
              return Math.abs((d2.getTime() - d1.getTime()) / 86400000) <= 7;
            })();
            if (studiedToday && breakDate === today) return '❄️';
            if (!studiedToday && breakRecent) return '❄️';
            if (!profile?.streak_days || profile.streak_days < 1) return '🥚';
            if (!studiedToday) return '❄️';
            return '🔥';
          })(), label: "Streak", value: `${profile?.streak_days ?? 0}d` },
          { icon: '📚', label: "Decks", value: decks.length },
          { icon: '✅', label: 'Quests Completed', value: `${completedGoals}/3` },
        ].map(stat => (
          <Card key={stat.label} className="h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-xl font-bold text-foreground">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Quests */}
      {!isGuest ? (
        <Card ref={goalsRef}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-primary" />
              Daily goals
              {completedGoals === 3 && <span className="text-xs text-green-400 font-medium ml-auto">✓</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-10 bg-muted" />)
            ) : goalItems.length > 0 ? (
              goalItems.map((g, i) => {
                const { current, target } = getGoalProgress(g.text);
                const pct = g.done ? 100 : Math.min(100, Math.round((current / target) * 100));
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-md border ${
                      g.done ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        g.done ? 'bg-green-500' : 'border-2 border-muted-foreground'
                      }`}>
                        {g.done && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className={`flex-1 text-sm min-w-0 ${g.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {g.text}
                      </span>
                      <span className="text-xs text-primary font-medium shrink-0">+{g.reward}💎</span>
                    </div>
                    <div className="mt-2 ml-8">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{g.done ? "Complete!" : `${current} / ${target}`}</span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">No goals set for today.</p>
            )}
            {goals && !goals.all_complete_bonus_claimed && completedGoals === 3 && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 border border-primary/20 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">Bonus goals</span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Guest: show goals card gated */
        <GuestGate feature="daily quests">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-4 h-4 text-primary" />
                Daily goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { text: "Study 10 cards", reward: 5 },
                { text: "Take a test", reward: 10 },
                { text: "Play an arcade game", reward: 8 },
              ].map((g, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-border bg-secondary/30">
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm min-w-0 text-foreground">{g.text}</span>
                  <span className="text-xs text-primary font-medium shrink-0">+{g.reward}💎</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </GuestGate>
      )}

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Quick Resume */}
        {lastStudiedDeck && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                Pick up where you left off
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="flex items-start justify-between gap-3 cursor-pointer"
                onClick={() => navigate(`/decks/${lastStudiedDeck.id}/view`)}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{lastStudiedDeck.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lastStudiedDeck.flashcard_count} cards · {lastStudiedDeck.subject}
                  </p>
                </div>
                <Button size="sm" asChild onClick={e => e.stopPropagation()}>
                  <Link to={`/decks/${lastStudiedDeck.id}/study`}>
                    <BookOpen className="w-3.5 h-3.5 mr-1" /> Study
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommended deck (lowest mastery – just show one with most cards for now) */}
        {decks.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                Recommended for you
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const rec = [...decks].sort((a, b) => (b.flashcard_count || 0) - (a.flashcard_count || 0))[1];
                return (
                  <div
                    className="flex items-start justify-between gap-3 cursor-pointer"
                    onClick={() => navigate(`/decks/${rec.id}/view`)}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{rec.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rec.flashcard_count} cards · {rec.subject}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild onClick={e => e.stopPropagation()}>
                      <Link to={`/decks/${rec.id}/study`}>
                        <BookOpen className="w-3.5 h-3.5 mr-1" /> Study
                      </Link>
                    </Button>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tier & League display cards */}
      {!isGuest && (
        <div className="grid grid-cols-2 gap-4">
          {/* Current Tier */}
          {(() => {
            const exp = profile?.total_exp ?? 0;
            const tier = getExpTierDash(exp);
            const nextThreshold = getNextExpThreshold(exp);
            const tierIdx = EXP_TIERS_DASH.findIndex(t => t.name === tier.name);
            const prevThreshold = tierIdx > 0 ? EXP_TIERS_DASH[tierIdx].threshold : 0;
            const pct = nextThreshold
              ? Math.min(100, Math.round(((exp - prevThreshold) / (nextThreshold - prevThreshold)) * 100))
              : 100;
            return (
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 flex flex-col items-center gap-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Tier</p>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-5xl md:text-6xl leading-none select-none">{tier.emoji}</span>
                  <p className="text-lg font-bold text-foreground text-balance text-center">{tier.name}</p>
                </div>
                <div className="w-full space-y-1">
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground text-center">
                    {nextThreshold
                      ? `${(nextThreshold - exp).toLocaleString()} EXP to next tier`
                      : 'Max Tier reached!'}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Current League */}
          {(() => {
            const trophies = profile?.trophies ?? 0;
            const league = getArenaLeagueDash(trophies);
            const nextMin = getNextLeagueMin(trophies);
            const lgIdx = ARENA_LEAGUES_DASH.findIndex(l => l.name === league.name);
            const prevMin = lgIdx > 0 ? ARENA_LEAGUES_DASH[lgIdx].min : 0;
            const pct = nextMin
              ? Math.min(100, Math.round(((trophies - prevMin) / (nextMin - prevMin)) * 100))
              : 100;
            return (
              <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent p-5 flex flex-col items-center gap-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">League</p>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-5xl md:text-6xl leading-none select-none">{league.emoji}</span>
                  <p className="text-lg font-bold text-foreground text-balance text-center">{league.name}</p>
                </div>
                <div className="w-full space-y-1">
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground text-center">
                    {nextMin
                      ? `${(nextMin - trophies).toLocaleString()} 🏆 to next league`
                      : 'Max League reached!'}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
