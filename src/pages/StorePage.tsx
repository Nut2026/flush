import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  fetchOwnedItems, spendGems,
  updateProfile, checkAndAwardBadges,
  claimStreakWager,
  fetchUserSkills, fetchUserCharms,
  purchaseSkill, purchaseCharm,
  hasTier,
  type UserSkill, type UserCharm,
} from '@/services/flush/flushService';
import type { OwnedItem } from '@/types/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Palette, Check, Swords, Sparkles, Info } from 'lucide-react';
import { GuestBanner } from '@/components/common/GuestBanner';
import { GuestGate } from '@/components/common/GuestGate';

// ── Theme catalog (ordered per spec) ─────────────────────────────────────────
const THEMES_ORDERED = [
  { name: 'default',         displayName: 'Flush Theme',     price: 0,  description: "Meet Flush's vibe",    preview: 'linear-gradient(135deg, #1E1E2E, #B026FF)', isDefault: true },
  { name: 'chocolate',       displayName: 'Chocolate',       price: 40, description: 'Warm, cozy',            preview: 'linear-gradient(135deg, #2C1A0E, #C4A265)' },
  { name: 'cotton-candy',    displayName: 'Cotton Candy',    price: 45, description: 'Dreamy, pastel',        preview: 'linear-gradient(135deg, #FFB6C1, #87CEEB)' },
  { name: 'forest',          displayName: 'Forest',          price: 50, description: 'Natural, grounded',     preview: 'linear-gradient(135deg, #1A2F1D, #D4AF37)' },
  { name: 'sunset',          displayName: 'Sunset',          price: 60, description: 'Warm, energetic',       preview: 'linear-gradient(135deg, #2D1B2E, #FF6B6B)' },
  { name: 'ocean',           displayName: 'Ocean',           price: 65, description: 'Deep, serene',          preview: 'linear-gradient(135deg, #0D2B3E, #FF6B4A)' },
  { name: 'midnight-galaxy', displayName: 'Midnight Galaxy', price: 80, description: 'Cosmic, mysterious',    preview: 'linear-gradient(135deg, #0B0B1A, #00D4FF)' },
  { name: 'cyberpunk',       displayName: 'Cyberpunk',       price: 90, description: 'Futuristic, intense',   preview: 'linear-gradient(135deg, #0A0A0F, #00D4FF, #FF006E)' },
] as const;

// ── Arena Skills catalog ───────────────────────────────────────────────────
const SKILL_CATALOG = [
  { id: 'flash',  code: 'S1', name: 'Flash',  cost: 30, description: 'Next correct answer deals +5 damage.' },
  { id: 'mud',    code: 'S2', name: 'Mud',    cost: 40, description: 'If the NEXT answer is correct, deal double damage regardless of skill chosen that turn.' },
  { id: 'draft',  code: 'S3', name: 'Draft',  cost: 35, description: 'Sacrifice 15 HP to block the next incoming hit completely.' },
  { id: 'review', code: 'S4', name: 'Review', cost: 50, description: 'Heals 10HP.' },
  { id: 'cloud',  code: 'S5', name: 'Cloud',  cost: 25, description: "Clouds swarm the opponent's screen, leaving questions barely visible for 5 seconds." },
  { id: 'borrow', code: 'S6', name: 'Borrow', cost: 45, description: 'Randomly picks a Skill from your unequipped collection (excluding another Borrow).' },
] as const;

// ── Arena Charms catalog ───────────────────────────────────────────────────
const CHARM_CATALOG = [
  { id: 'want', code: 'C1', name: 'Want', cost: 60, description: 'Arena: +1 HP extra damage per correct answer. Study/Test/Arcade: +1 EXP per minute spent.' },
  { id: 'tree', code: 'C2', name: 'Tree', cost: 60, description: 'Arena: Heal 3 HP per correct answer. Study/Test/Arcade: +3 EXP per question answered.' },
  { id: 'chat', code: 'C3', name: 'Chat', cost: 55, description: 'Every 10 cards studied or questions answered, receive a motivational pop-up. Arena: sends pop-ups to opponent too.' },
] as const;

interface StoreItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: React.ReactNode;
  category: string;
  limit?: string;
}

const UTILITY_ITEMS: StoreItem[] = [
  {
    id: 'streak_freeze',
    name: 'Streak Stall',
    description: 'Protects 1 missed day within 7 days. For peace of mind.',
    cost: 20,
    icon: <span className="font-bold text-blue-400 text-base">B1</span>,
    category: 'utility',
  },
  {
    id: 'streak_wager',
    name: 'Streak Slap',
    description: 'Bet 25 and win 60 for a 7-day streak. Else...',
    cost: 25,
    icon: <span className="font-bold text-purple-400 text-base">B2</span>,
    category: 'utility',
  },
];

export default function StorePage() {
  const { user, profile, isGuest, refreshProfile } = useAuth();
  const { triggerGemAnimation } = useApp();
  const { theme: currentTheme, setTheme, darkMode, setDarkMode } = useTheme();

  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([]);
  const [, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [claimingWager, setClaimingWager] = useState(false);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [userCharms, setUserCharms] = useState<UserCharm[]>([]);
  const [eventsInfoOpen, setEventsInfoOpen] = useState(false);
  const [boostersInfoOpen, setBoostersInfoOpen] = useState(false);
  const [skillsInfoOpen, setSkillsInfoOpen] = useState(false);
  const [charmsInfoOpen, setCharmsInfoOpen] = useState(false);

  // -- Wager computed state ----------------------------------------------------
  const wagerActive = !!profile?.streak_wager_active;
  const wagerStartDate = profile?.streak_wager_start_date ?? null;
  const wagerCompleted = !!profile?.streak_wager_completed;
  const wagerBrokenSeen = !!profile?.streak_wager_broken_seen;

  // Days elapsed since wager start
  const wagerDaysElapsed = (() => {
    if (!wagerStartDate) return 0;
    const start = new Date(wagerStartDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(diff, 7);
  })();

  // Wager was broken if not active, not completed, and not seen message yet
  const wagerBroken = !wagerActive && !wagerCompleted && !wagerBrokenSeen && !!wagerStartDate;

  // -- Streak Stall (streak_freeze) computed state ----------------------------
  const stallActive = !!profile?.streak_freeze_active;
  const stallActivatedAt = (profile as any)?.streak_stall_activated_at ?? null;
  const stallSavedStreak: number | null = (profile as any)?.streak_stall_saved_streak ?? null;
  const stallExpiredSeen: boolean = (profile as any)?.streak_stall_expired_seen ?? false;
  const STALL_DAYS = 7;

  // Count whole LOCAL calendar days elapsed since activation midnight
  const stallDaysElapsed = (() => {
    if (!stallActivatedAt) return 0;
    const activationMidnight = new Date(stallActivatedAt);
    activationMidnight.setHours(0, 0, 0, 0);
    const nowMidnight = new Date();
    nowMidnight.setHours(0, 0, 0, 0);
    const diff = Math.floor((nowMidnight.getTime() - activationMidnight.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(diff, 0), STALL_DAYS);
  })();
  const stallDaysLeft = Math.max(0, STALL_DAYS - stallDaysElapsed);
  // Expired = active and all 7 days have passed
  const stallExpired = stallActive && stallActivatedAt && stallDaysElapsed >= STALL_DAYS;

  // If stall is active but no activated_at recorded, set it now (backfill)
  useEffect(() => {
    if (!user || !stallActive || stallActivatedAt) return;
    updateProfile(user.id, { streak_stall_activated_at: new Date().toISOString() } as any)
      .then(() => refreshProfile())
      .catch(() => {});
  }, [user, stallActive, stallActivatedAt]);

  // If stall expired, deactivate it
  useEffect(() => {
    if (!user || !stallExpired) return;
    updateProfile(user.id, { streak_freeze_active: false } as any)
      .then(() => refreshProfile())
      .catch(() => {});
  }, [user, stallExpired]);

  const handleDismissStallExpired = async () => {
    if (!user) return;
    await updateProfile(user.id, { streak_stall_expired_seen: true, streak_stall_saved_streak: null } as any);
    await refreshProfile();
  };

  const handleDismissStallSaved = async () => {
    if (!user) return;
    await updateProfile(user.id, { streak_stall_saved_streak: null } as any);
    await refreshProfile();
  };

  const handleDismissBrokenWager = async () => {
    if (!user) return;
    await updateProfile(user.id, { streak_wager_broken_seen: true, streak_wager_start_date: null });
    await refreshProfile();
  };

  const handleClaimWager = async () => {
    if (!user) return;
    setClaimingWager(true);
    try {
      await claimStreakWager(user.id);
      await refreshProfile();
      toast.success('🎉 Claimed 60 gems! Well done on your streak!', { position: 'top-right' });
    } catch {
      toast.error('Failed to claim reward');
    } finally {
      setClaimingWager(false);
    }
  };

  const getItemLabel = (id: string): { name: string; description: string } => {
    const map: Record<string, { name: string; description: string }> = {
      streak_freeze:{ name: "Streak freeze", description: "Protects your streak for one missed day." },
      streak_wager: { name: "Streak wager",  description: "Bet gems that you can keep your streak going." },
    };
    return map[id] ?? { name: id, description: '' };
  };


  useEffect(() => {
    if (!user || isGuest) { setLoading(false); return; }
    Promise.all([
      fetchOwnedItems(user.id),
      fetchUserSkills(user.id),
      fetchUserCharms(user.id),
    ]).then(([items, skills, charms]) => {
      setOwnedItems(items);
      setUserSkills(skills);
      setUserCharms(charms);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, isGuest]);

  const ownedThemes = new Set(ownedItems.filter(i => i.item_type === 'theme').map(i => i.item_name));
  ownedThemes.add('default');

  const handleBuyUtility = async (item: StoreItem) => {
    if (!user || isGuest) { toast.error("Sign in to buy items."); return; }
    const finalCost = applyDiscount(item.cost);
    if ((profile?.gems || 0) < finalCost) { toast.error("You do not have enough gems."); return; }

    if (item.id === 'streak_freeze' && profile?.streak_freeze_active) {
      toast.error('You already have an active Streak Stall.');
      return;
    }
    if (item.id === 'streak_wager' && profile?.streak_wager_active) {
      toast.error('You already have an active Streak Slap.');
      return;
    }

    setPurchasing(item.id);
    try {
      const spent = await spendGems(user.id, finalCost);
      if (!spent) { toast.error('Not enough gems'); return; }

      if (item.id === 'streak_freeze') {
        const activatedAt = new Date().toISOString();
        await updateProfile(user.id, {
          streak_freeze_active: true,
          streak_stall_activated_at: activatedAt,
        } as any);
        toast.success('Streak Stall activated! ❄️ 7 days started.');
      } else if (item.id === 'streak_wager') {
        const { getLocalDateString } = await import('@/services/flush/constants');
        await updateProfile(user.id, {
          streak_wager_active: true,
          streak_wager_start_date: getLocalDateString(),
        });
        toast.success('Streak Slap placed! 🎰 Keep your streak for 7 days.');
      }

      await checkAndAwardBadges(user.id, [], { gems: (profile?.gems || 0) - finalCost });
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  const handleBuyTheme = async (themeName: string, price: number) => {
    if (!user || isGuest) { toast.error("Sign in to buy items."); return; }
    const finalPrice = applyDiscount(price);
    if ((profile?.gems || 0) < finalPrice) { toast.error("You do not have enough gems."); return; }
    if (ownedThemes.has(themeName)) { toast.error("You already own that theme."); return; }

    setPurchasing(`theme-${themeName}`);
    try {
      const spent = await spendGems(user.id, finalPrice);
      if (!spent) { toast.error('Not enough gems'); return; }

      const { supabase } = await import('@/db/supabase');
      await supabase.from('owned_items').insert({
        user_id: user.id,
        item_type: 'theme',
        item_name: themeName,
      });

      setOwnedItems(prev => [...prev, {
        id: Date.now().toString(),
        user_id: user.id,
        item_type: 'theme',
        item_name: themeName,
        purchased_at: new Date().toISOString(),
      }]);

      // Auto-equip on purchase
      await handleEquipTheme(themeName);
      toast.success(`Applied 🎨`);
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  const DARK_ONLY_THEMES = ['cyberpunk', 'midnight-galaxy'];
  const handleEquipTheme = async (themeName: string) => {
    if (!user && !isGuest) return;
    setTheme(themeName as any);
    // Auto-switch to dark if this is a dark-only theme and user is in light mode
    if (DARK_ONLY_THEMES.includes(themeName) && !darkMode) {
      setDarkMode(true);
    }
    toast.success(`Applied!`);
    // No notification on Apply — notification only fires in toggleDarkMode when trying to go light
  };


  // ── No active events ──────────────────────────────────────────────────────
  const gems = profile?.gems ?? 0;
  // Calculator tier: 12% discount on all gem purchases
  const hasCalculator = hasTier(profile?.total_exp ?? 0, 'Calculator');
  const applyDiscount = (price: number) => hasCalculator ? Math.floor(price * 0.88) : price;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
      {/* Guest banner */}
      {isGuest && <GuestBanner message="You are browsing as a guest. Sign up to spend and keep your gems." />}
      {/* Calculator discount banner */}
      {hasCalculator && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-sm font-medium text-primary">
          <span>🧮</span>
          <span>Calculator Tier active — all gem purchases are 12% off!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          Trade
        </h1>
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
          <span className="text-lg">💎</span>
          <span className="font-bold text-primary">{gems}</span>
          <span className="text-xs text-muted-foreground">Gems</span>
        </div>
      </div>

      {/* ── Events (no title, just the box) ─────────────────────────── */}
      <section>
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 py-8 text-center relative">
          <div className="flex items-center justify-center gap-2">
            <p className="text-muted-foreground text-sm">No events running right now.</p>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setEventsInfoOpen(v => !v)}
              aria-label="Events info"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          {eventsInfoOpen && (
            <div className="mt-3 mx-auto max-w-xs text-xs text-muted-foreground bg-secondary/40 rounded-lg px-4 py-2.5 border border-border/40">
              The perfect spot for goodies and giveaways. Missing them?
            </div>
          )}
        </div>
      </section>

      {/* ── Boosters ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 22V12a9 9 0 0 1 18 0v10" />
            <path d="M9 22V16a3 3 0 0 1 6 0v6" />
            <path d="M12 2v2" />
          </svg>
          <h2 className="font-semibold text-foreground">Boosters</h2>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
            onClick={() => setBoostersInfoOpen(v => !v)}
            aria-label="Boosters info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
        {boostersInfoOpen && (
          <div className="mb-3 text-xs text-muted-foreground bg-secondary/40 rounded-lg px-4 py-2.5 border border-border/40">
            All to save – or slow – you. How ready are you?
          </div>
        )}

        {/* Wager broken message */}
        {!isGuest && wagerBroken && (
          <div className="mb-3 flex items-start gap-3 p-3 rounded-lg border border-destructive/40 bg-destructive/5">
            <span className="text-base shrink-0">💔</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">The wager broke your streak</p>
              <p className="text-xs text-muted-foreground mt-0.5">You missed a day, so the streak reset.</p>
            </div>
            <button className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline mt-0.5" onClick={handleDismissBrokenWager}>Dismiss</button>
          </div>
        )}
        {!isGuest && wagerCompleted && (
          <div className="mb-3 flex items-start gap-3 p-3 rounded-lg border border-green-500/40 bg-green-500/5">
            <span className="text-base shrink-0">🎉</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-400">Wager complete!</p>
              <p className="text-xs text-muted-foreground mt-0.5">{`You earned ${60} gems back.`}</p>
            </div>
            <Button size="sm" className="shrink-0" disabled={claimingWager} onClick={handleClaimWager}>
              {claimingWager ? "Claiming…" : `Claim ${60}💎`}
            </Button>
          </div>
        )}
        {!stallActive && !stallExpiredSeen && stallActivatedAt && stallDaysLeft === 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-2">
            <span className="text-amber-400 mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-400">The stall closed for today</p>
              <p className="text-xs text-muted-foreground mt-0.5">Come back tomorrow for a new wager.</p>
            </div>
            <button className="shrink-0 text-xs text-muted-foreground hover:text-foreground" onClick={handleDismissStallExpired}>Dismiss</button>
          </div>
        )}
        {stallSavedStreak !== null && stallSavedStreak > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 mb-2">
            <span className="text-blue-400 mt-0.5">❄️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-400">{`Your ${stallSavedStreak}-day streak is safe.`}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your streak freeze used its one save.</p>
            </div>
            <button className="shrink-0 text-xs text-muted-foreground hover:text-foreground" onClick={handleDismissStallSaved}>Dismiss</button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          {UTILITY_ITEMS.map(item => {
            const finalItemCost = applyDiscount(item.cost);
            const canAfford = gems >= finalItemCost;
            const isActive = (item.id === 'streak_freeze' && profile?.streak_freeze_active)
              || (item.id === 'streak_wager' && profile?.streak_wager_active);
            const { name, description } = getItemLabel(item.id);

            const cardContent = (
              <Card key={item.id} className="h-full">
                <CardContent className="p-4 flex gap-4 h-full">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground text-sm">{name}</p>
                      {/* Top-right: Active badge if active, else price */}
                      {isActive ? (
                        <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full shrink-0">Active</span>
                      ) : (
                        <span className="text-xs font-bold text-primary shrink-0">
                          {hasCalculator && finalItemCost < item.cost ? (
                            <><s className="text-muted-foreground mr-1">{item.cost}💎</s>{finalItemCost}💎</>
                          ) : `${item.cost}💎`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-pretty">{description}</p>

                    {item.id === 'streak_freeze' && isActive && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Day {stallDaysElapsed} / {STALL_DAYS}</span>
                          <span>{stallDaysLeft} days left</span>
                        </div>
                        <Progress value={(stallDaysElapsed / STALL_DAYS) * 100} className="h-1.5" />
                      </div>
                    )}
                    {item.id === 'streak_wager' && isActive && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Day {wagerDaysElapsed} of the wager</span>
                          <span>{Math.round((wagerDaysElapsed / 7) * 100)}%</span>
                        </div>
                        <Progress value={(wagerDaysElapsed / 7) * 100} className="h-1.5" />
                      </div>
                    )}

                    {!isActive && (
                      <Button
                        size="sm"
                        className="mt-3"
                        disabled={!canAfford || isGuest || purchasing === item.id}
                        onClick={() => handleBuyUtility(item)}
                      >
                        {purchasing === item.id ? "Buying…" : `Get ${finalItemCost}💎`}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );

            return isGuest ? (
              <GuestGate key={item.id} feature={`equip ${name}`}>
                {cardContent}
              </GuestGate>
            ) : cardContent;
          })}
        </div>
      </section>

      <Separator />

      {/* ── Skills ─────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Swords className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Skills</h2>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
            onClick={() => setSkillsInfoOpen(v => !v)}
            aria-label="Skills info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
        {skillsInfoOpen && (
          <div className="mb-3 text-xs text-muted-foreground bg-secondary/40 rounded-lg px-4 py-2.5 border border-border/40">
            Used in Arena matches; activate after each correct answer. Each Skill can be used once per match. Equip up to 4 per match, stock unlimited!
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
          {SKILL_CATALOG.map(skill => {
            const owned = userSkills.find(s => s.skill_name === skill.id);
            const finalSkillCost = applyDiscount(skill.cost);
            const canAfford = gems >= finalSkillCost;

            const handleBuy = async () => {
              if (!user || isGuest) return;
              if (owned) return; // one-time purchase only
              setPurchasing(skill.id);
              const ok = await purchaseSkill(user.id, skill.id, finalSkillCost);
              if (ok) {
                toast.success(`Purchased ${skill.name}!`);
                const updated = await fetchUserSkills(user.id);
                setUserSkills(updated);
                triggerGemAnimation(-finalSkillCost);
                await refreshProfile();
              } else {
                toast.error('Not enough gems.');
              }
              setPurchasing(null);
            };

            const cardContent = (
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2 h-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/30 rounded px-1.5 py-0.5">{skill.code}</span>
                      <span className="font-semibold text-sm text-foreground">{skill.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-pretty">{skill.description}</p>
                  </div>
                  {/* Top-right: Stocked badge if owned, else price */}
                  {owned ? (
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">Stocked</span>
                  ) : (
                    <span className="text-sm font-semibold text-primary shrink-0">
                      {hasCalculator && finalSkillCost < skill.cost ? (
                        <><s className="text-muted-foreground text-xs mr-1">{skill.cost}💎</s>{finalSkillCost}💎</>
                      ) : `${skill.cost}💎`}
                    </span>
                  )}
                </div>
                <div className="mt-auto pt-2">
                  {!owned && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs"
                      disabled={!canAfford || purchasing === skill.id}
                      onClick={handleBuy}
                    >
                      {purchasing === skill.id ? 'Buying…' : `Get · ${finalSkillCost}💎`}
                    </Button>
                  )}
                </div>
              </div>
            );

            return isGuest ? (
              <GuestGate key={skill.id} feature="Skills" message="🔒 Sign Up or Log In to explore Skills">
                {cardContent}
              </GuestGate>
            ) : (
              <div key={skill.id} className="h-full">{cardContent}</div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* ── Charms ─────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Charms</h2>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
            onClick={() => setCharmsInfoOpen(v => !v)}
            aria-label="Charms info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
        {charmsInfoOpen && (
          <div className="mb-3 text-xs text-muted-foreground bg-secondary/40 rounded-lg px-4 py-2.5 border border-border/40">
            Passive bonuses in Study, Test, Arcade, and Arena. Equip up to 2 at a time, and as usual, stock unlimited!
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
          {CHARM_CATALOG.map(charm => {
            const owned = userCharms.find(c => c.charm_name === charm.id);
            const finalCharmCost = applyDiscount(charm.cost);
            const canAfford = gems >= finalCharmCost;

            const handleBuy = async () => {
              if (!user || isGuest) return;
              if (owned) return; // one-time purchase only
              setPurchasing(charm.id);
              const ok = await purchaseCharm(user.id, charm.id, finalCharmCost);
              if (ok) {
                toast.success(`Purchased ${charm.name}!`);
                const updated = await fetchUserCharms(user.id);
                setUserCharms(updated);
                triggerGemAnimation(-finalCharmCost);
                await refreshProfile();
              } else {
                toast.error('Not enough gems.');
              }
              setPurchasing(null);
            };

            const cardContent = (
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2 h-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/30 rounded px-1.5 py-0.5">{charm.code}</span>
                      <span className="font-semibold text-sm text-foreground">{charm.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-pretty">{charm.description}</p>
                  </div>
                  {owned ? (
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">Stocked</span>
                  ) : (
                    <span className="text-sm font-semibold text-primary shrink-0">
                      {hasCalculator && finalCharmCost < charm.cost ? (
                        <><s className="text-muted-foreground text-xs mr-1">{charm.cost}💎</s>{finalCharmCost}💎</>
                      ) : `${charm.cost}💎`}
                    </span>
                  )}
                </div>
                <div className="mt-auto pt-2">
                  {!owned && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs"
                      disabled={!canAfford || purchasing === charm.id}
                      onClick={handleBuy}
                    >
                      {purchasing === charm.id ? 'Buying…' : `Get · ${finalCharmCost}💎`}
                    </Button>
                  )}
                </div>
              </div>
            );

            return isGuest ? (
              <GuestGate key={charm.id} feature="Charms" message="🔒 Sign Up or Log In to explore Charms">
                {cardContent}
              </GuestGate>
            ) : (
              <div key={charm.id} className="h-full">{cardContent}</div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* ── Themes ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          Themes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {THEMES_ORDERED.map(theme => {
            const owned = ownedThemes.has(theme.name);
            const equipped = currentTheme === theme.name;
            const finalThemePrice = applyDiscount(theme.price);
            const canAfford = gems >= finalThemePrice;
            const buyKey = `theme-${theme.name}`;
            const isFree = theme.price === 0;
            const isDarkOnly = theme.name === 'cyberpunk' || theme.name === 'midnight-galaxy';

            const cardInner = (
              <Card key={theme.name} className={`h-full ${equipped ? 'border-primary/50' : ''}`}>
                <CardContent className="p-4 flex gap-4 h-full">
                  <div
                    className="w-12 h-12 rounded-xl shrink-0 border border-border/50"
                    style={{ background: theme.preview }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                          {theme.displayName}
                          {isDarkOnly && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary leading-none">Dark only</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{theme.description}</p>
                      </div>
                      {/* Top-right: "Default" for flush theme, "Got" if owned, else price */}
                      {isFree ? (
                        <span className="text-xs font-bold text-muted-foreground shrink-0">Default</span>
                      ) : owned ? (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">Got</span>
                      ) : (
                        <span className="text-xs font-bold text-primary shrink-0">
                          {hasCalculator && finalThemePrice < theme.price ? (
                            <><s className="text-muted-foreground mr-1">{theme.price}💎</s>{finalThemePrice}💎</>
                          ) : `${theme.price}💎`}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {equipped ? (
                        <span className="text-xs text-primary flex items-center gap-1 font-medium">
                          <Check className="w-3.5 h-3.5" /> Applied
                        </span>
                      ) : owned || isFree ? (
                        <Button size="sm" variant="outline" onClick={() => handleEquipTheme(theme.name)}>
                          Apply
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!canAfford || (isGuest && !isFree) || purchasing === buyKey}
                          onClick={() => handleBuyTheme(theme.name, finalThemePrice)}
                        >
                          {purchasing === buyKey ? "Buying…" : `Get ${finalThemePrice}💎`}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );

            return isGuest && !isFree ? (
              <GuestGate key={theme.name} feature={`apply ${theme.displayName}`}>
                {cardInner}
              </GuestGate>
            ) : <div key={theme.name}>{cardInner}</div>;
          })}
        </div>
      </section>
    </div>
  );
}
