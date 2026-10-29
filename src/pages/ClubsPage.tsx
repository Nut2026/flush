import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchClubMemberships,
  fetchPendingRewards,
  breakGeode,
  getClubLevelCaps,
  fetchStudyDates,
  fetchRobinEarlyDates,
  fetchAcePerfectDecks,
} from '@/services/flush/flushService';
import { fetchDecks } from '@/services/flush/flushService';
import type { ClubMembership, PendingReward, ClubName, Deck } from '@/types/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Lock, Flame, Sword, Moon, Gift, X, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import { GuestGate } from '@/components/common/GuestGate';

// ── Club config ────────────────────────────────────────────────────────────
// Config is now built dynamically from translations — see getClubConfig() in component
type ClubConfigEntry = {
  icon: React.ReactNode;
  name: string;
  color: string;
  borderColor: string;
  unlockDesc: string;
  lockedDesc: string;
  permanent: boolean;
};

const LEVEL_CAPS = getClubLevelCaps();

// Static club presentation config shared by every club sub-component
function buildClubConfig(): Record<ClubName, ClubConfigEntry> {
  const joinName = (base: string) => `${base} club`;
  return {
    fire: {
      icon: <Flame className="w-5 h-5" />,
      name: joinName("Fire Keepers"),
      color: 'text-orange-400',
      borderColor: 'border-orange-500/40',
      unlockDesc: "Keep a 7-day streak to unlock the Fire Keepers.",
      lockedDesc: "Reach a 7-day streak to join the Fire Keepers.",
      permanent: false,
    },
    ace: {
      icon: <Sword className="w-5 h-5" />,
      name: joinName("Aces"),
      color: 'text-yellow-400',
      borderColor: 'border-yellow-500/40',
      unlockDesc: "Keep a 30-day streak to unlock the Aces.",
      lockedDesc: "Reach a 30-day streak to join the Aces.",
      permanent: true,
    },
    robin: {
      icon: <Moon className="w-5 h-5" />,
      name: joinName("Robins"),
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/40',
      unlockDesc: "Keep a 3-day streak to unlock the Robins.",
      lockedDesc: "Reach a 3-day streak to join the Robins.",
      permanent: true,
    },
  };
}

function getNextLevelInfo(currentLevel: number, currentProgress: number) {
  const nextCap = LEVEL_CAPS[currentLevel];
  if (nextCap === undefined) return { nextCap: null, pct: 100, progress: currentProgress, prevCap: 0 };
  const prevCap = currentLevel === 0 ? 0 : LEVEL_CAPS[currentLevel - 1];
  const range = nextCap - prevCap;
  const progress = currentProgress - prevCap;
  const pct = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
  return { nextCap, prevCap, pct, range, progress: Math.max(0, progress) };
}

// ── Calendar Component ─────────────────────────────────────────────────────
function StreakCalendar({
  activeDates,
  accentColorActive,
  accentColorPast,
}: {
  activeDates: Set<string>;
  accentColorActive: string;
  accentColorPast: string;
  label: string;
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-based
  // tooltip state: { date: string, cellIndex: number } | null
  const [tooltip, setTooltip] = useState<{ text: string; idx: number } | null>(null);

  // Max 5 months back from today
  const minDate = new Date(now.getFullYear(), now.getMonth() - 4, 1);

  const canGoBack = new Date(viewYear, viewMonth - 1, 1) >= minDate;
  const canGoForward = viewYear < now.getFullYear() || viewMonth < now.getMonth();

  const goBack = () => {
    if (!canGoBack) return;
    setTooltip(null);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goForward = () => {
    if (!canGoForward) return;
    setTooltip(null);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const monthName = `${["January","February","March","April","May","June","July","August","September","October","November","December"][viewMonth]} ${viewYear}`;

  // Build days grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthIsNow = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const days: Array<{ date: string; isActive: boolean; isFuture: boolean } | null> = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isFuture = dateStr > todayStr;
    days.push({ date: dateStr, isActive: activeDates.has(dateStr), isFuture });
  }

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${["January","February","March","April","May","June","July","August","September","October","November","December"][m - 1]} ${d}, ${y}`;
  };

  return (
    <div className="mt-2 select-none max-w-[120px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={goBack}
          disabled={!canGoBack}
          className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-2.5 h-2.5" />
        </button>
        <span className="text-[9px] font-medium text-foreground leading-none">{monthName}</span>
        <button
          onClick={goForward}
          disabled={!canGoForward}
          className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <ChevronRight className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Days grid — tiny squares */}
      <div className="grid grid-cols-7 gap-[2px]">
        {days.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} className="w-[13px] h-[13px]" />;
          const isToday = currentMonthIsNow && cell.date === todayStr;
          let bg = 'bg-muted/40';
          if (cell.isFuture) bg = 'bg-transparent';
          else if (cell.isActive && isToday) bg = accentColorActive;
          else if (cell.isActive) bg = accentColorPast;
          const isOpen = tooltip?.idx === i;
          return (
            <div key={cell.date} className="relative">
              {isOpen && (
                <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded bg-popover border border-border shadow-md text-[10px] text-popover-foreground whitespace-nowrap pointer-events-none">
                  {formatDate(cell.date)}
                </div>
              )}
              <button
                className={`w-[13px] h-[13px] rounded-[1px] transition-colors
                  ${bg}
                  ${cell.isFuture ? 'opacity-15 cursor-default' : 'cursor-pointer hover:opacity-80'}
                  ${isToday ? 'ring-[1px] ring-primary/70' : ''}
                `}
                onMouseEnter={() => !cell.isFuture && setTooltip({ text: formatDate(cell.date), idx: i })}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => !cell.isFuture && setTooltip(p => p?.idx === i ? null : { text: formatDate(cell.date), idx: i })}
                aria-label={formatDate(cell.date)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Ace Perfect Decks List ─────────────────────────────────────────────────
function AcePerfectDecksList({
  records,
  decks,
}: {
  records: { deck_id: string; achieved_at: string }[];
  decks: Deck[];
}) {
  if (records.length === 0) return (
    <p className="text-xs text-muted-foreground italic mt-2">Get a perfect score to earn progress.</p>
  );
  return (
    <div className="mt-3 border border-border rounded-md overflow-hidden">
      <div className="overflow-y-auto" style={{ maxHeight: '10rem' }}>
        {records.map((r, i) => {
          const deck = decks.find(d => d.id === r.deck_id);
          const dt = new Date(r.achieved_at);
          const date = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
          return (
            <div
              key={r.deck_id}
              className={`flex items-center justify-between px-3 py-2 text-xs ${i < records.length - 1 ? 'border-b border-border/50' : ''}`}
            >
              <span className="font-medium text-foreground truncate flex-1 min-w-0 mr-2">
                {deck?.title ?? 'Fossilised Deck'}
              </span>
              <span className="text-muted-foreground shrink-0">{date}</span>
              <span className="ml-2 text-yellow-400 shrink-0">95%+ 🏆</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Geode rock-smash animation ─────────────────────────────────────────────
interface GeodeAnimState {
  phase: 'idle' | 'shaking' | 'breaking' | 'result' | 'done';
  gemsEarned: number;
  geodesRemaining: number;
}

function GeodeAnimation({
  reward,
  onBreak,
  onNext,
  onClose,
}: {
  reward: PendingReward;
  onBreak: () => Promise<{ gemsEarned: number; geodesRemaining: number }>;
  onNext: () => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<GeodeAnimState>({
    phase: 'idle',
    gemsEarned: 0,
    geodesRemaining: reward.geodes_remaining,
  });
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(async () => {
    if (state.phase === 'idle') {
      setState(s => ({ ...s, phase: 'shaking' }));
      setTimeout(async () => {
        setState(s => ({ ...s, phase: 'breaking' }));
        try {
          const result = await onBreak();
          setTimeout(() => {
            setState({ phase: 'result', gemsEarned: result.gemsEarned, geodesRemaining: result.geodesRemaining });
            resultTimerRef.current = setTimeout(() => {
              setState(s => ({ ...s, phase: 'done' }));
            }, 4000);
          }, 500);
        } catch {
          toast.error('Failed to break geode');
          setState(s => ({ ...s, phase: 'idle' }));
        }
      }, 400);
    }
  }, [state.phase, onBreak]);

  // "Another Geode" — reset to idle so user can smash the next one in place
  const handleAnother = useCallback(() => {
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    onNext(); // updates parent reward state
    setState({ phase: 'idle', gemsEarned: 0, geodesRemaining: state.geodesRemaining });
  }, [onNext, state.geodesRemaining]);

  const gems = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 360;
    const dist = 60 + Math.random() * 40;
    const x = Math.cos((angle * Math.PI) / 180) * dist;
    const y = Math.sin((angle * Math.PI) / 180) * dist;
    return { x, y, delay: i * 40 };
  });

  const cfg = buildClubConfig()[reward.club_name as ClubName];
  // Total geodes for this reward never changes; remaining decrements
  const totalGeodes = reward.geodes_total;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>
      <p className={`text-lg font-semibold mb-2 ${cfg.color}`}>{cfg.name} club reward</p>
      <p className="text-sm text-muted-foreground mb-8">
        {state.phase === 'idle'
          ? state.geodesRemaining > 0
            ? `${totalGeodes} geodes · ${state.geodesRemaining} left`
            : "No geodes left today."
          : state.phase === 'shaking' || state.phase === 'breaking'
          ? `${totalGeodes} geodes · ${state.geodesRemaining} left`
          : `${totalGeodes} geodes · ${state.geodesRemaining} left`}
      </p>
      <div className="relative flex items-center justify-center w-48 h-48">
        {(state.phase === 'breaking' || state.phase === 'result' || state.phase === 'done') &&
          gems.map((g, i) => (
            <div
              key={i}
              className="absolute text-xl pointer-events-none"
              style={{
                left: '50%', top: '50%',
                transform: `translate(calc(-50% + ${g.x}px), calc(-50% + ${g.y}px))`,
                opacity: state.phase === 'breaking' ? 1 : 0,
                transition: `all 0.6s ease-out ${g.delay}ms`,
                fontSize: '1.25rem',
              }}
            >💎</div>
          ))}
        <div
          className="absolute text-7xl select-none"
          style={{
            transform:
              state.phase === 'shaking' ? 'translateX(-3px) rotate(-5deg)' :
              state.phase === 'breaking' || state.phase === 'result' || state.phase === 'done'
                ? 'translateX(-60px) translateY(-20px) rotate(-30deg)' : 'translateX(0)',
            transition:
              state.phase === 'shaking' ? 'transform 0.1s ease-in-out' :
              'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            fontSize: '4rem', lineHeight: 1,
            filter: state.phase === 'shaking' ? 'drop-shadow(0 0 12px #B026FF)' : 'none',
          }}
        >🪨</div>
        {(state.phase === 'breaking' || state.phase === 'result' || state.phase === 'done') && (
          <div
            className="absolute text-7xl select-none"
            style={{ transform: 'translateX(60px) translateY(-10px) rotate(25deg)', transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)', fontSize: '3rem', lineHeight: 1 }}
          >🪨</div>
        )}
        {(state.phase === 'idle' || state.phase === 'shaking') && (
          <button className="absolute inset-0 rounded-full cursor-pointer" onClick={handleClick} aria-label="Break geode" />
        )}
      </div>
      {(state.phase === 'result' || state.phase === 'done') && (
        <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-3xl font-bold text-yellow-400 mb-1">+{state.gemsEarned} 💎</p>
          <p className="text-lg text-foreground font-semibold">{`${state.gemsEarned} gems earned`}</p>
        </div>
      )}
      {state.phase === 'idle' && (
        <button onClick={handleClick} className="mt-8 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          Tap the geode to smash it open
        </button>
      )}
      {(state.phase === 'result' || state.phase === 'done') && state.geodesRemaining > 0 && (
        <div className="mt-6 flex gap-3">
          <Button onClick={handleAnother}>Open another geode</Button>
          <Button variant="outline" onClick={onClose}>Save for later</Button>
        </div>
      )}
      {(state.phase === 'result' || state.phase === 'done') && state.geodesRemaining === 0 && (
        <Button className="mt-6" onClick={onClose}>Done</Button>
      )}
    </div>
  );
}

// ── Reward Tiers Modal ─────────────────────────────────────────────────────
function RewardTiersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const caps = getClubLevelCaps();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reward tiers</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Smashers (members) */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top smashers</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-muted-foreground">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-4 whitespace-nowrap font-medium text-foreground">Level</th>
                    <th className="text-left py-1.5 pr-4 whitespace-nowrap font-medium text-foreground">geodes</th>
                    <th className="text-left py-1.5 whitespace-nowrap font-medium text-foreground">Gems</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4].map(i => {
                    const cap = caps[i];
                    const geodes = i + 1;
                    const gemMin = 2 + i * 2;
                    const gemMax = 10 + i * 2;
                    return (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 pr-4 whitespace-nowrap">Level {i + 1} (at {cap})</td>
                        <td className="py-1.5 pr-4 whitespace-nowrap">{geodes} 🪨</td>
                        <td className="py-1.5 whitespace-nowrap">{gemMin}–{gemMax} 💎</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={3} className="pt-2 text-muted-foreground/60 italic">Higher tiers hold better rewards.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Toppers – Coming Soon */}
          <div className="relative">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Toppers</p>
            <div className="overflow-x-auto opacity-30 select-none pointer-events-none">
              <table className="w-full text-xs text-muted-foreground">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-4 whitespace-nowrap font-medium text-foreground">Rank</th>
                    <th className="text-left py-1.5 pr-4 whitespace-nowrap font-medium text-foreground">Reward</th>
                    <th className="text-left py-1.5 whitespace-nowrap font-medium text-foreground">Gems</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-1.5 pr-4 whitespace-nowrap">🥇 Top 1</td>
                    <td className="py-1.5 pr-4 whitespace-nowrap">Gold Geode</td>
                    <td className="py-1.5 whitespace-nowrap">100–200 💎</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-1.5 pr-4 whitespace-nowrap">🥈 Top 2</td>
                    <td className="py-1.5 pr-4 whitespace-nowrap">Silver Geode</td>
                    <td className="py-1.5 whitespace-nowrap">80–100 💎</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4 whitespace-nowrap">🥉 Top 3</td>
                    <td className="py-1.5 pr-4 whitespace-nowrap">Bronze Geode</td>
                    <td className="py-1.5 whitespace-nowrap">50–80 💎</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-foreground bg-card/90 px-4 py-2 rounded-lg border border-border shadow">Coming Soon</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Pending Geodes Section ─────────────────────────────────────────────────
function PendingRewardsSection({
  rewards,
  userId,
  onRewardUpdated,
}: {
  rewards: PendingReward[];
  userId: string;
  onRewardUpdated: (updatedId: string, newRemaining: number) => void;
}) {
  const [activeReward, setActiveReward] = useState<PendingReward | null>(null);
  const [tiersOpen, setTiersOpen] = useState(false);
  const { refreshProfile } = useAuth();

  const handleBreak = useCallback(async () => {
    if (!activeReward) return { gemsEarned: 0, geodesRemaining: 0 };
    const result = await breakGeode(userId, activeReward.id);
    onRewardUpdated(activeReward.id, result.geodesRemaining);
    await refreshProfile();
    return result;
  }, [activeReward, userId, onRewardUpdated, refreshProfile]);

  const handleNext = useCallback(() => {
    if (!activeReward) return;
    const updated = rewards.find(r => r.id === activeReward.id);
    if (updated && updated.geodes_remaining > 0) setActiveReward({ ...updated });
    else setActiveReward(null);
  }, [activeReward, rewards]);

  return (
    <>
      <RewardTiersModal open={tiersOpen} onClose={() => setTiersOpen(false)} />
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="w-4 h-4 text-primary" />
            Geodes waiting to be opened
            <button
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setTiersOpen(true)}
              aria-label="View reward tiers"
            >
              <Info className="w-4 h-4" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No geodes yet.
            </p>
          ) : (
            <div className="space-y-2">
              {rewards.map(reward => {
                const cfg = buildClubConfig()[reward.club_name as ClubName];
                return (
                  <div
                    key={reward.id}
                    className="flex items-center gap-3 p-3 rounded-md border border-border bg-background"
                  >
                    <div className={`shrink-0 ${cfg.color}`}>{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {cfg.name} · Level {reward.level_reached}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reward.geodes_remaining} Geode{reward.geodes_remaining !== 1 ? 's' : ''} ·{' '}
                        {reward.gem_min}–{reward.gem_max} geodes
                        {reward.geodes_remaining < reward.geodes_total && (
                          <span className="ml-1 text-primary font-medium">({reward.geodes_remaining} left)</span>
                        )}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setActiveReward(reward)} className="shrink-0">
                      Break <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {activeReward && (
        <GeodeAnimation
          reward={activeReward}
          onBreak={handleBreak}
          onNext={handleNext}
          onClose={() => setActiveReward(null)}
        />
      )}
    </>
  );
}

// ── Club Card ──────────────────────────────────────────────────────────────
function ClubCard({
  membership,
  studyDates,
  robinDates,
  acePerfectRecords,
  decks,
}: {
  membership: ClubMembership;
  studyDates: Set<string>;
  robinDates: Set<string>;
  acePerfectRecords: { deck_id: string; achieved_at: string }[];
  decks: Deck[];
}) {
  const cfg = buildClubConfig()[membership.club_name];
  const { nextCap, pct, progress } = getNextLevelInfo(membership.current_level, membership.current_progress);

  return (
    <Card className={`border ${membership.is_member ? cfg.borderColor : 'border-border'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              membership.is_member ? 'bg-primary/10 ' + cfg.color : 'bg-muted text-muted-foreground'
            }`}
          >
            {membership.is_member ? cfg.icon : <Lock className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className={`font-semibold text-sm ${membership.is_member ? cfg.color : 'text-muted-foreground'}`}>
                {cfg.name}
              </h3>
              {membership.is_member ? (
                <Badge variant="outline" className={`text-xs border-current ${cfg.color}`}>
                  Level {membership.current_level}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">Locked</Badge>
              )}
              {cfg.permanent && <span className="text-xs text-muted-foreground">· permanent</span>}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {membership.is_member
                ? (membership.club_name === 'fire' ? "Keep a 7-day streak to unlock the Fire Keepers."
                  : membership.club_name === 'ace' ? "Keep a 30-day streak to unlock the Aces."
                  : "Keep a 3-day streak to unlock the Robins.")
                : (membership.club_name === 'fire' ? "Reach a 7-day streak to join the Fire Keepers."
                  : membership.club_name === 'ace' ? "Reach a 30-day streak to join the Aces."
                  : "Reach a 3-day streak to join the Robins.")}
            </p>
            {/* Progress bar */}
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {membership.is_member
                    ? nextCap !== null
                      ? `Progress: ${progress} / ${nextCap - (membership.current_level === 0 ? 0 : LEVEL_CAPS[membership.current_level - 1])} to the next level`
                      : "Max level reached"
                    : `${membership.current_progress} to unlock`}
                </span>
                {membership.is_member && nextCap !== null && <span>{pct}%</span>}
              </div>
              <Progress
                value={membership.is_member ? pct : Math.min(100, (membership.current_progress / 3) * 100)}
                className="h-2"
              />
            </div>

            {/* Fire Club calendar — only if unlocked */}
            {membership.club_name === 'fire' && membership.is_member && (
              <StreakCalendar
                activeDates={studyDates}
                accentColorActive="bg-orange-500"
                accentColorPast="bg-orange-800/70"
                label="streak"
              />
            )}

            {/* Ace Club perfect deck list */}
            {membership.club_name === 'ace' && (
              <AcePerfectDecksList records={acePerfectRecords} decks={decks} />
            )}

            {/* Robin Club calendar — only if unlocked */}
            {membership.club_name === 'robin' && membership.is_member && (
              <StreakCalendar
                activeDates={robinDates}
                accentColorActive="bg-cyan-500"
                accentColorPast="bg-cyan-800/70"
                label="early action"
              />
            )}

          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ClubsPage() {
  const { user, isGuest } = useAuth();


  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [rewards, setRewards] = useState<PendingReward[]>([]);
  const [studyDates, setStudyDates] = useState<Set<string>>(new Set());
  const [robinDates, setRobinDates] = useState<Set<string>>(new Set());
  const [acePerfectRecords, setAcePerfectRecords] = useState<{ deck_id: string; achieved_at: string }[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const allClubs: ClubMembership[] = (['fire', 'ace', 'robin'] as ClubName[]).map(cn => {
    const found = memberships.find(m => m.club_name === cn);
    return found ?? {
      id: cn, user_id: user?.id ?? '', club_name: cn,
      is_unlocked: false, is_member: false,
      current_level: 0, current_progress: 0,
      created_at: '', updated_at: '',
    };
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [m, r, sd, rd, ap, d] = await Promise.all([
        fetchClubMemberships(user.id),
        fetchPendingRewards(user.id),
        fetchStudyDates(user.id),
        fetchRobinEarlyDates(user.id),
        fetchAcePerfectDecks(user.id),
        fetchDecks(user.id),
      ]);
      setMemberships(m);
      setRewards(r);
      setStudyDates(new Set(sd));
      setRobinDates(new Set(rd));
      setAcePerfectRecords(ap);
      setDecks(d);
    } catch (err) {
      console.error('Clubs load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isGuest) { setLoading(false); return; }
    loadData();
  }, [isGuest, loadData]);

  const handleRewardUpdated = useCallback((updatedId: string, newRemaining: number) => {
    setRewards(prev =>
      newRemaining === 0
        ? prev.filter(r => r.id !== updatedId)
        : prev.map(r => r.id === updatedId ? { ...r, geodes_remaining: newRemaining } : r)
    );
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-sm text-muted-foreground text-center mt-0.5">
          Join a club, smash geodes, and collect gems with your streak.
        </p>
      </div>

      {/* Pending rewards — always visible when logged in */}
      {!isGuest && !loading && (
        <PendingRewardsSection
          rewards={rewards}
          userId={user!.id}
          onRewardUpdated={handleRewardUpdated}
        />
      )}


      {/* Club cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : isGuest ? (
        <div className="space-y-3">
          {([
            { cn: 'fire' as ClubName, msg: "Sign up and keep a 7-day streak to join the Fire Keepers." },
            { cn: 'ace'  as ClubName, msg: "Sign up and keep a 30-day streak to join the Aces." },
            { cn: 'robin'as ClubName, msg: "Sign up and reach a 3-day streak to join the Robins." },
          ]).map(({ cn, msg }) => {
            const cfg = buildClubConfig()[cn];
            return (
              <GuestGate key={cn} feature={cfg.name} message={msg}>
                <Card className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{cfg.name}</p>
                        <p className="text-xs text-muted-foreground">{cfg.lockedDesc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </GuestGate>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {allClubs.map(m => (
            <ClubCard
              key={m.club_name}
              membership={m}
              studyDates={studyDates}
              robinDates={robinDates}
              acePerfectRecords={acePerfectRecords}
              decks={decks}
            />
          ))}
        </div>
      )}

      {/* Reward tiers info — moved to info icon modal in Pending Geodes */}
    </div>
  );
}
