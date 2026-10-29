import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/db/supabase';
import {
  fetchUserSkills, fetchUserCharms, addGems,
  type UserSkill, type UserCharm,
} from '@/services/flush/flushService';
import type { Deck, Flashcard } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Trophy, ChevronRight, RefreshCcw, Search,
  Bot, Users, X, Landmark
} from 'lucide-react';
import { GuestBanner } from '@/components/common/GuestBanner';
import { useNavigate } from 'react-router-dom';


// ── LeagueLeaderboard component ───────────────────────────────────────────────
function LeagueLeaderboard({
  currentUserId,
  currentLeague,
  navigate,
}: {
  currentUserId: string;
  currentLeague: typeof ARENA_LEAGUES[number];
  navigate: (path: string) => void;
}) {
  type LBEntry = { id: string; username: string; trophies: number; avatar_url: string | null };
  const [entries, setEntries] = useState<LBEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Leagues the current user can see: current + all below

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      // Fetch all users who have trophies within visible leagues range
      const maxTrophies = currentLeague.max === Infinity ? 999999 : currentLeague.max;
      const { data } = await supabase
        .from('profiles')
        .select('id, username, trophies, avatar_url')
        .gte('trophies', 0)
        .lte('trophies', maxTrophies)
        .order('trophies', { ascending: false })
        .limit(100);
      if (!cancelled) {
        setEntries(Array.isArray(data) ? data as LBEntry[] : []);
        setLoading(false);
      }
    }
    load();

    // Realtime subscription
    const ch = supabase
      .channel('arena-leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe();
    return () => { cancelled = true; ch.unsubscribe(); };
  }, [currentLeague.min]);

  return (
    <div className="space-y-3">
      {/* League tier list */}
      <h2 className="font-semibold text-foreground text-sm">Leagues</h2>
      <div className="space-y-1.5">
        {[...ARENA_LEAGUES].reverse().map(l => {
          const isCurrent = l.name === currentLeague.name;
          const isVisible = l.min <= currentLeague.min;
          return (
            <div key={l.name} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
              isCurrent
                ? 'border-primary bg-primary/10'
                : isVisible
                ? 'border-border/50 bg-secondary/10'
                : 'border-border/20 bg-secondary/5 opacity-40'
            }`}>
              <span className="text-lg">{l.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>{l.name}</p>
                <p className="text-xs text-muted-foreground">
                  {l.min.toLocaleString()} – {l.max === Infinity ? '∞' : l.max.toLocaleString()} 🏆
                </p>
              </div>
              {isCurrent && <Badge variant="secondary" className="text-xs shrink-0">You</Badge>}
              {!isVisible && <Badge variant="outline" className="text-xs shrink-0 opacity-50">Locked</Badge>}
            </div>
          );
        })}
      </div>

      {/* Leaderboard */}
      <h2 className="font-semibold text-foreground text-sm pt-2">{currentLeague.emoji} {currentLeague.name} Leaderboard</h2>
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No Flushers here yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {entries.map((e, idx) => {
            const isMe = e.id === currentUserId;
            const eLeague = getArenaLeague(e.trophies);
            return (
              <button
                key={e.id}
                onClick={() => navigate(`/profile/${e.username}`)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all hover:border-primary/40 ${
                  isMe ? 'border-primary bg-primary/10' : 'border-border/30 bg-secondary/5 hover:bg-secondary/20'
                }`}
              >
                <span className="text-sm font-bold text-muted-foreground w-5 shrink-0">#{idx + 1}</span>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden border border-border">
                  {e.avatar_url
                    ? <img src={e.avatar_url} alt={e.username} className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-primary">{(e.username?.[0] ?? '?').toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                    {e.username ?? 'Unknown'}{isMe ? ' (You)' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{eLeague.emoji} {eLeague.name}</p>
                </div>
                <span className="text-sm font-bold text-amber-400 shrink-0">{e.trophies.toLocaleString()} 🏆</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Arena League definitions ──────────────────────────────────────────────────
const ARENA_LEAGUES = [
  { name: 'Sting',    min: 0,    max: 99,       emoji: '🐝', color: 'text-yellow-500' },
  { name: 'Grip',     min: 100,  max: 249,      emoji: '🤝', color: 'text-orange-400' },
  { name: 'Void',     min: 250,  max: 499,      emoji: '🌑', color: 'text-slate-400' },
  { name: 'Grind',    min: 500,  max: 899,      emoji: '⚙️',  color: 'text-stone-400' },
  { name: 'Blade',    min: 900,  max: 1399,     emoji: '🗡️',  color: 'text-red-400' },
  { name: 'Surge',    min: 1400, max: 1999,     emoji: '⚡', color: 'text-yellow-400' },
  { name: 'Gaze',     min: 2000, max: 2749,     emoji: '👁️',  color: 'text-purple-400' },
  { name: 'Vector',   min: 2750, max: 3599,     emoji: '📐', color: 'text-blue-400' },
  { name: 'Blaze',    min: 3600, max: 4599,     emoji: '🔥', color: 'text-orange-500' },
  { name: 'Canon',    min: 4600, max: 5999,     emoji: '💥', color: 'text-red-500' },
  { name: 'Keystone', min: 6000, max: 7499,     emoji: '🗝️',  color: 'text-amber-400' },
  { name: 'Apex',     min: 7500, max: 9499,     emoji: '🦅', color: 'text-cyan-400' },
  { name: 'Zenith',   min: 9500, max: Infinity, emoji: '🌟', color: 'text-yellow-300' },
] as const;

function getArenaLeague(t: number) {
  return ARENA_LEAGUES.find(l => t >= l.min && t <= l.max) ?? ARENA_LEAGUES[0];
}

// Skill/Charm code labels
const SKILL_CODES: Record<string, string> = {
  flash: 'S1', mud: 'S2', draft: 'S3', review: 'S4', cloud: 'S5', borrow: 'S6',
};
const CHARM_CODES: Record<string, string> = {
  want: 'C1', tree: 'C2', chat: 'C3',
};

// Trophy constants
const TROPHY_WIN_PVP  = 25;
const TROPHY_LOSS_PVP = -25;
const TROPHY_WIN_BOT  = 2;
const TROPHY_LOSS_BOT = -1;

type ArenaMode  = 'train' | 'pvp';
type ArenaPhase = 'lobby' | 'searching' | 'countdown' | 'battle' | 'result';

interface MatchCard { front: string; back: string; direction: 'f2b' | 'b2f'; }
interface SideMessage { text: string; id: number; }
interface BattleSide {
  hp: number;
  correct: number;
  wrong: number;
  username: string;
  emoji: string;
  leagueName: string;
  leagueColor: string;
  skillsUsed: Record<string, boolean>;
  activeSkillEffect: string | null;
}

const MOTIVATIONAL_MESSAGES = [
  "You're on fire! Keep it up! 🔥",
  "10 correct answers — unstoppable! ⚡",
  "Amazing focus! Keep going! 💪",
  "You're crushing it! 🌟",
  "Incredible streak! Don't stop now! 🚀",
  "Your brain is in overdrive — awesome! 🧠",
  "Legend status loading… keep answering! 🏆",
];

export default function ArenaPage() {
  const { user, profile, isGuest, refreshProfile } = useAuth();
  const { triggerGemAnimation } = useApp();
  const navigate = useNavigate();

  const trophies = profile?.trophies ?? 0;
  const league   = getArenaLeague(trophies);

  // ── Lobby / meta state ──────────────────────────────────────────────────────
  const [phase, setPhase] = useState<ArenaPhase>('lobby');
  const [mode,  setMode]  = useState<ArenaMode>('train');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId,  setSelectedDeckId]  = useState<string | null>(null);
  const [userSkills,  setUserSkills]  = useState<UserSkill[]>([]);
  const [userCharms,  setUserCharms]  = useState<UserCharm[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedCharmIds, setSelectedCharmIds] = useState<string[]>([]);

  // ── Searching state ──────────────────────────────────────────────────────────
  const [searchingDots,  setSearchingDots]  = useState('');
  const [searchElapsed,  setSearchElapsed]  = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueIdRef         = useRef<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const pvpBroadcastChannelRef = useRef<any>(null);
  const [cloudOverlayActive, setCloudOverlayActive] = useState(false);

  // ── Countdown state ──────────────────────────────────────────────────────────
  const [countdown,     setCountdown]     = useState(5);
  const [opponentInfo,  setOpponentInfo]  = useState<{
    id: string; username: string; emoji: string; leagueName: string; leagueColor: string;
    gems: number; streak: number; trophies: number; exp: number;
  } | null>(null);

  // ── Battle state ─────────────────────────────────────────────────────────────
  const [matchCards,         setMatchCards]         = useState<MatchCard[]>([]);
  const [cardIdx,            setCardIdx]            = useState(0);
  const [answer,             setAnswer]             = useState('');
  const [answerFeedback,     setAnswerFeedback]     = useState<'correct' | 'wrong' | null>(null);
  const [playerSide,         setPlayerSide]         = useState<BattleSide | null>(null);
  const [oppSide,            setOppSide]            = useState<BattleSide | null>(null);
  const [playerMsgs,         setPlayerMsgs]         = useState<SideMessage[]>([]);
  const [oppMsgs,            setOppMsgs]            = useState<SideMessage[]>([]);
  const [canSubmit,          setCanSubmit]          = useState(false);
  const [questionTimer,      setQuestionTimer]      = useState(5);
  const [awaitingSkillChoice, setAwaitingSkillChoice] = useState(false);
  const [matchStartTime,     setMatchStartTime]     = useState<Date | null>(null);
  const botTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef         = useRef<HTMLInputElement>(null);
  const msgIdRef         = useRef(0);
  const chatCorrectCountRef = useRef(0);
  const [chatPopupMsg, setChatPopupMsg] = useState<string | null>(null);


  // ── Result state ─────────────────────────────────────────────────────────────
  const [resultTrophyDelta, setResultTrophyDelta] = useState(0);
  const [playerWon,         setPlayerWon]         = useState(false);
  const [resultSaved,       setResultSaved]       = useState(false);
  const [leagueChange,      setLeagueChange]      = useState<{ promoted: boolean; name: string } | null>(null);

  // ── Load decks + skills/charms ────────────────────────────────────────────────
  useEffect(() => {
    if (!user || isGuest) return;
    supabase.from('decks').select('*, flashcards(count)').eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setDecks((data || []).map((d: any) => ({
          ...d,
          flashcard_count: d.flashcards?.[0]?.count ?? d.flashcard_count ?? 0,
        })) as Deck[]);
      });
    fetchUserSkills(user.id).then(s => {
      setUserSkills(s);
      setSelectedSkillIds(s.filter(sk => sk.equipped_slot !== null).map(sk => sk.skill_name));
    });
    fetchUserCharms(user.id).then(c => {
      setUserCharms(c);
      setSelectedCharmIds(c.filter(ch => ch.is_equipped).map(ch => ch.charm_name));
    });
  }, [user, isGuest]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const avgCharLength = useCallback((cards: Flashcard[]) => {
    if (!cards.length) return 30;
    const total = cards.reduce((s, c) => s + (c.front_text.length + c.back_text.length) / 2, 0);
    return total / cards.length;
  }, []);

  const buildMatchCards = (cards: Flashcard[]): MatchCard[] =>
    [...cards].sort(() => Math.random() - 0.5).map(c => ({
      front: c.front_text, back: c.back_text,
      direction: Math.random() > 0.5 ? 'f2b' : 'b2f',
    }));

  // Adds a message to a side; auto-removes after 2s
  const addMsg = useCallback((side: 'player' | 'opp', text: string) => {
    const id = ++msgIdRef.current;
    const setter = side === 'player' ? setPlayerMsgs : setOppMsgs;
    setter(prev => [...prev, { text, id }]);
    setTimeout(() => setter(prev => prev.filter(m => m.id !== id)), 2000);
  }, []);

  // ── Question timer (5 s min, then auto-focus) ─────────────────────────────────
  const startQuestionTimer = useCallback(() => {
    setCanSubmit(false);
    setQuestionTimer(5);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    questionTimerRef.current = setInterval(() => {
      setQuestionTimer(prev => {
        if (prev <= 1) {
          clearInterval(questionTimerRef.current!);
          setCanSubmit(true);
          // Auto-focus input so user can type immediately
          setTimeout(() => inputRef.current?.focus(), 50);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Countdown phase ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('battle');
      setMatchStartTime(new Date());
      startQuestionTimer();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, startQuestionTimer]);

  // ── Win/loss check ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'battle' || !playerSide || !oppSide) return;
    if (playerSide.hp > 0 && oppSide.hp > 0) return;

    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    if (botTimerRef.current)      clearTimeout(botTimerRef.current);

    const won   = oppSide.hp <= 0 && playerSide.hp > 0;
    const delta = mode === 'train'
      ? (won ? TROPHY_WIN_BOT  : TROPHY_LOSS_BOT)
      : (won ? TROPHY_WIN_PVP  : TROPHY_LOSS_PVP);

    setPlayerWon(won);
    setResultTrophyDelta(delta);
    setResultSaved(false);
    setLeagueChange(null);
    setPhase('result');
  }, [playerSide?.hp, oppSide?.hp, phase, mode]);

  // ── Auto-save trophies on entering result phase ───────────────────────────────
  useEffect(() => {
    if (phase !== 'result' || resultSaved || !user || !profile) return;
    setResultSaved(true);

    const prevTrophies = profile.trophies ?? 0;
    const newTrophies  = Math.max(0, prevTrophies + resultTrophyDelta);
    const prevLeague   = getArenaLeague(prevTrophies);
    const newLeague    = getArenaLeague(newTrophies);

    void supabase.from('profiles').update({ trophies: newTrophies }).eq('id', user.id)
      .then(() => refreshProfile())

    if (prevLeague.name !== newLeague.name) {
      setLeagueChange({
        promoted: newTrophies > prevTrophies,
        name: newLeague.name,
      });
    }
  }, [phase, resultSaved, user, profile, resultTrophyDelta, refreshProfile]);

  // ── Bot logic ──────────────────────────────────────────────────────────────────
  // selectedSkillIds / selectedCharmIds are captured via ref to avoid stale closures
  const selectedSkillIdsRef = useRef(selectedSkillIds);
  const selectedCharmIdsRef = useRef(selectedCharmIds);
  useEffect(() => { selectedSkillIdsRef.current = selectedSkillIds; }, [selectedSkillIds]);
  useEffect(() => { selectedCharmIdsRef.current = selectedCharmIds; }, [selectedCharmIds]);

  const scheduleBotAnswer = useCallback((cards: Flashcard[], avgChars: number) => {
    // Bot takes 2× avg char length in seconds per question
    const delay = Math.max(1000, avgChars * 2 * 1000);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    botTimerRef.current = setTimeout(() => {
      setOppSide(prev => {
        if (!prev) return prev;

        const botSkills   = selectedSkillIdsRef.current.filter(s => !prev.skillsUsed[s]);
        const botCharms   = selectedCharmIdsRef.current;
        let dmg           = 5;
        let botHp         = prev.hp;
        let newSkillsUsed = { ...prev.skillsUsed };

        // Bot randomly picks a skill (40% chance)
        if (botSkills.length > 0 && Math.random() < 0.4) {
          const picked = botSkills[Math.floor(Math.random() * botSkills.length)];
          newSkillsUsed[picked] = true;
          if (picked === 'flash')  { dmg += 5; addMsg('opp', `Bot used Flash! +5 dmg`); }
          if (picked === 'mud')    { dmg *= 2; addMsg('opp', `Bot used Mud! ×2 dmg`); }
          if (picked === 'review') { botHp = Math.min(100, botHp + 10); addMsg('opp', 'Bot used Review: +10 HP'); }
          if (picked === 'draft')  { addMsg('opp', 'Bot used Draft — next hit blocked!'); return { ...prev, hp: Math.max(0, botHp - 15), skillsUsed: newSkillsUsed, activeSkillEffect: 'draft', correct: prev.correct + 1 }; }
          if (picked === 'cloud')  { addMsg('player', '☁️ Cloud! Your screen is clouded for 5s!'); setCloudOverlayActive(true); setTimeout(() => setCloudOverlayActive(false), 5000); }
        }

        // Charms
        if (botCharms.includes('want')) dmg += 1;
        if (botCharms.includes('tree')) botHp = Math.min(100, botHp + 3);

        // Deal damage to PLAYER (opponent = player's opponent)
        setPlayerSide(ps => {
          if (!ps) return ps;
          const blocked = ps.activeSkillEffect === 'draft';
          if (blocked) {
            addMsg('player', 'Draft blocked the bot attack!');
            return { ...ps, activeSkillEffect: null };
          }
          addMsg('player', `Bot dealt ${dmg} damage!`);
          return { ...ps, hp: Math.max(0, ps.hp - dmg), activeSkillEffect: null };
        });

        // Schedule next bot answer (loop)
        scheduleBotAnswer(cards, avgChars);

        return { ...prev, hp: botHp, correct: prev.correct + 1, skillsUsed: newSkillsUsed, activeSkillEffect: null };
      });
    }, delay + (Math.random() * 2000 - 1000));
  }, [addMsg]);

  // ── Start match (accepts explicit mode to avoid stale closure) ────────────────
  const startMatch = useCallback(async (
    cards: Flashcard[],
    oppData: typeof opponentInfo,
    matchMode: ArenaMode,
  ) => {
    const built = buildMatchCards(cards);
    setMatchCards(built);
    setCardIdx(0);
    setAnswer('');
    setAnswerFeedback(null);
    setAwaitingSkillChoice(false);
    setPlayerMsgs([]);
    setOppMsgs([]);
    setResultSaved(false);
    setLeagueChange(null);

    const pLeague = getArenaLeague(trophies);
    setPlayerSide({
      hp: 100, correct: 0, wrong: 0,
      username: profile?.username || 'You',
      emoji: pLeague.emoji,
      leagueName: pLeague.name,
      leagueColor: pLeague.color,
      skillsUsed: {},
      activeSkillEffect: null,
    });
    setOppSide({
      hp: 100, correct: 0, wrong: 0,
      username: oppData?.username ?? 'BOT',
      emoji: oppData?.emoji ?? '🤖',
      leagueName: oppData?.leagueName ?? '',
      leagueColor: oppData?.leagueColor ?? 'text-muted-foreground',
      skillsUsed: {},
      activeSkillEffect: null,
    });

    setCountdown(5);
    setPhase('countdown');

    if (matchMode === 'train') {
      const avg = avgCharLength(cards);
      // Start bot ~100ms after battle phase begins (5s countdown)
      setTimeout(() => scheduleBotAnswer(cards, avg), 5100);
    } else if (matchMode === 'pvp' && user && oppData?.id) {
      // Set up a broadcast channel for in-match events (cloud, etc.)
      const roomId = [user.id, oppData.id].sort().join('_');
      const pvpCh = supabase.channel(`pvp_match_${roomId}`)
        .on('broadcast', { event: 'cloud_skill' }, () => {
          setCloudOverlayActive(true);
          setTimeout(() => setCloudOverlayActive(false), 5000);
        })
        .subscribe();
      pvpBroadcastChannelRef.current = pvpCh;
    }
  }, [trophies, profile, avgCharLength, scheduleBotAnswer, user]);

  // ── Train Now ─────────────────────────────────────────────────────────────────
  const handleTrainNow = async () => {
    if (!selectedDeckId) { toast.error('Select a deck first.'); return; }
    const { data } = await supabase.from('flashcards').select('*').eq('deck_id', selectedDeckId);
    const cards: Flashcard[] = Array.isArray(data) ? data : [];
    if (cards.length < 30) { toast.error('Deck needs 30+ cards for Arena.'); return; }
    const botInfo = { id: 'bot', username: 'BOT', emoji: '🤖', leagueName: '', leagueColor: 'text-muted-foreground', gems: 0, streak: 0, trophies: 0, exp: 0 };
    setMode('train');
    setOpponentInfo(botInfo);
    await startMatch(cards, botInfo, 'train');
  };

  // ── Find Opponent (real-time matchmaking) ─────────────────────────────────────
  const handleFindOpponent = async () => {
    if (!selectedDeckId || !user) { toast.error('Select a deck first.'); return; }
    const { data: cards } = await supabase.from('flashcards').select('*').eq('deck_id', selectedDeckId);
    const allCards: Flashcard[] = Array.isArray(cards) ? cards : [];
    if (allCards.length < 30) { toast.error('Deck needs 30+ cards for Arena.'); return; }

    setMode('pvp');
    setPhase('searching');
    setSearchElapsed(0);
    setSearchingDots('');

    // Animated dots
    let dots = 0;
    searchTimerRef.current = setInterval(() => {
      dots = (dots + 1) % 4;
      setSearchingDots('.'.repeat(dots));
      setSearchElapsed(e => e + 1);
    }, 1000);

    // Clear any stale queue entry for this user
    await supabase.from('arena_queue').delete().eq('user_id', user.id);

    // Enter the queue
    const avg = avgCharLength(allCards);
    const { data: queueEntry } = await supabase
      .from('arena_queue')
      .insert({
        user_id: user.id,
        deck_id: selectedDeckId,
        avg_char_length: avg,
        equipped_skills: selectedSkillIds,
        equipped_charms: selectedCharmIds,
        status: 'waiting',
      })
      .select()
      .maybeSingle();

    if (!queueEntry) { cancelSearch(); toast.error('Failed to join queue.'); return; }
    queueIdRef.current = queueEntry.id;

    // Try to instantly match with an existing waiter
    const matchId = crypto.randomUUID();
    const { data: waiter } = await supabase
      .from('arena_queue')
      .select('*, profiles!inner(username, trophies, total_exp, gems, streak_days)')
      .eq('status', 'waiting')
      .neq('user_id', user.id)
      .order('queued_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (waiter) {
      // Update waiter's row first so their Realtime listener fires with correct opponent_id
      await supabase.from('arena_queue').update({ status: 'matched', match_id: matchId, opponent_id: user.id }).eq('id', waiter.id);
      // Small delay to let waiter receive and process the Realtime event
      await new Promise(r => setTimeout(r, 300));
      await supabase.from('arena_queue').update({ status: 'matched', match_id: matchId, opponent_id: waiter.user_id }).eq('id', queueEntry.id);
      cancelSearchTimers();
      const oppProfile = (waiter as any).profiles;
      const oppLeague  = getArenaLeague(oppProfile?.trophies ?? 0);
      const oInfo = {
        id: waiter.user_id,
        username: oppProfile?.username ?? 'Opponent',
        emoji: oppLeague.emoji,
        leagueName: oppLeague.name,
        leagueColor: oppLeague.color,
        gems: oppProfile?.gems ?? 0,
        streak: oppProfile?.streak_days ?? 0,
        trophies: oppProfile?.trophies ?? 0,
        exp: oppProfile?.total_exp ?? 0,
      };
      setOpponentInfo(oInfo);
      await startMatch(allCards, oInfo, 'pvp');
      return;
    }

    // Guard against duplicate match starts (race condition protection)
    let matchStarted = false;

    // Helper to start match from a matched queue entry
    const processMatch = async (oppId: string) => {
      if (matchStarted) return;
      matchStarted = true;
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
        realtimeChannelRef.current = null;
      }
      cancelSearchTimers();
      const { data: oppP } = await supabase
        .from('profiles')
        .select('id, username, trophies, total_exp, gems, streak_days')
        .eq('id', oppId)
        .maybeSingle();
      const oppLeague = getArenaLeague(oppP?.trophies ?? 0);
      const oInfo = {
        id: oppId,
        username: oppP?.username ?? 'Opponent',
        emoji: oppLeague.emoji,
        leagueName: oppLeague.name,
        leagueColor: oppLeague.color,
        gems: oppP?.gems ?? 0,
        streak: oppP?.streak_days ?? 0,
        trophies: oppP?.trophies ?? 0,
        exp: oppP?.total_exp ?? 0,
      };
      setOpponentInfo(oInfo);
      await startMatch(allCards, oInfo, 'pvp');
    };

    // Subscribe to our queue row for updates
    const channel = supabase.channel(`arena_match_${queueEntry.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'arena_queue', filter: `id=eq.${queueEntry.id}` },
        async (payload: any) => {
          if (payload.new.status === 'matched' && payload.new.opponent_id) {
            await processMatch(payload.new.opponent_id);
          }
        }
      ).subscribe(async (status) => {
        // Once subscribed, check if we were already matched (race condition: 
        // opponent matched us before subscription was ready)
        if (status === 'SUBSCRIBED') {
          const { data: myEntry } = await supabase
            .from('arena_queue')
            .select('status, opponent_id')
            .eq('id', queueEntry.id)
            .maybeSingle();
          if (myEntry?.status === 'matched' && myEntry.opponent_id) {
            await processMatch(myEntry.opponent_id);
          }
        }
      });
    realtimeChannelRef.current = channel;
  };

  const cancelSearchTimers = () => {
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
  };

  const cancelSearch = async () => {
    cancelSearchTimers();
    pvpBroadcastChannelRef.current?.unsubscribe();
    if (queueIdRef.current) {
      await supabase.from('arena_queue').update({ status: 'cancelled' }).eq('id', queueIdRef.current);
      queueIdRef.current = null;
    }
    setPhase('lobby');
    setMode('train');
  };

  // Timeout: keep on searching screen, show Try Again / Maybe Later (handled in render)
  // No auto-cancel — user chooses to retry or leave

  // ── Answer submit ─────────────────────────────────────────────────────────────
  const currentCard   = matchCards[cardIdx];
  const question      = currentCard ? (currentCard.direction === 'f2b' ? currentCard.front : currentCard.back) : '';
  const correctAnswer = currentCard ? (currentCard.direction === 'f2b' ? currentCard.back  : currentCard.front) : '';

  const handleSubmit = () => {
    if (!canSubmit || !currentCard || answerFeedback || awaitingSkillChoice) return;
    const normalise = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const isCorrect = normalise(answer) === normalise(correctAnswer);

    if (isCorrect) {
      setAnswerFeedback('correct');
      const unusedSkills = selectedSkillIds.filter(s => !playerSide?.skillsUsed[s]);
      if (unusedSkills.length > 0) {
        // Pause — let player pick a skill
        setAwaitingSkillChoice(true);
      } else {
        applyCorrectAnswer(null);
      }
    } else {
      setAnswerFeedback('wrong');
      setPlayerSide(prev => {
        if (!prev) return prev;
        const selfDmg = prev.activeSkillEffect === 'mud' ? 10 : 0;
        if (selfDmg > 0) addMsg('player', `Mud backfired! −${selfDmg} HP`);
        return { ...prev, wrong: prev.wrong + 1, hp: Math.max(0, prev.hp - selfDmg), activeSkillEffect: null };
      });
      advanceCard();
    }
    setAnswer('');
  };

  const applyCorrectAnswer = (skillName: string | null) => {
    setPlayerSide(prev => {
      if (!prev) return prev;
      let dmg         = 5;
      let healSelf    = 0;
      let newEffect   = prev.activeSkillEffect;
      let newUsed     = { ...prev.skillsUsed };

      const hasWant = selectedCharmIdsRef.current.includes('want');
      const hasTree = selectedCharmIdsRef.current.includes('tree');
      if (hasWant) dmg += 1;
      if (hasTree) healSelf += 3;

      // Apply pending Mud double-damage
      if (newEffect === 'mud_pending') {
        dmg *= 2; newEffect = null;
        addMsg('player', 'Mud triggered! ×2 damage!');
      }

      if (skillName === 'flash') {
        dmg += 5; newUsed.flash = true; newEffect = null;
        addMsg('player', 'Flash! +5 extra damage dealt');
      } else if (skillName === 'mud') {
        newUsed.mud = true; newEffect = 'mud_pending';
        addMsg('player', 'Mud set — double damage on your NEXT correct answer!');
        return { ...prev, skillsUsed: newUsed, activeSkillEffect: 'mud_pending', correct: prev.correct + 1 };
      } else if (skillName === 'draft') {
        // Draft: sacrifice 15 HP to block next incoming hit
        newUsed.draft = true; newEffect = 'draft';
        addMsg('player', 'Draft active — next hit blocked!');
        return { ...prev, skillsUsed: newUsed, activeSkillEffect: 'draft', hp: Math.max(0, prev.hp - 15), correct: prev.correct + 1 };
      } else if (skillName === 'review' && !newUsed.review) {
        healSelf += 10; newUsed.review = true; newEffect = null;
        addMsg('player', 'Review: +10 HP restored!');
      } else if (skillName === 'cloud') {
        newUsed.cloud = true; newEffect = null;
        addMsg('opp', '☁️ Cloud! Opponent\'s screen clouded for 5s!');
        // Visual: broadcast cloud to opponent via realtime channel
        pvpBroadcastChannelRef.current?.send({ type: 'broadcast', event: 'cloud_skill', payload: { from: 'player' } });
        // If in training mode, show cloud on player side to simulate (bot is opponent)
        if (mode === 'train') {
          setCloudOverlayActive(true);
          setTimeout(() => setCloudOverlayActive(false), 5000);
        }
      } else if (skillName === 'borrow') {
        // Pick a random un-used skill from collection (excluding borrow itself)
        const available = selectedSkillIds.filter(s => s !== 'borrow' && !newUsed[s]);
        if (available.length > 0) {
          const borrowed = available[Math.floor(Math.random() * available.length)];
          newUsed.borrow = true;
          addMsg('player', `Borrow activated ${borrowed}!`);
          // Recursively apply borrowed skill effect
          applyCorrectAnswer(borrowed);
          return prev; // let recursive call handle state
        }
        newUsed.borrow = true;
      }

      // Deal damage to OPPONENT
      setOppSide(opp => {
        if (!opp) return opp;
        if (opp.activeSkillEffect === 'draft') {
          addMsg('opp', 'Draft blocked your attack!');
          return { ...opp, activeSkillEffect: null };
        }
        addMsg('opp', `You dealt ${dmg} damage!`);
        return { ...opp, hp: Math.max(0, opp.hp - dmg) };
      });

      return { ...prev, correct: prev.correct + 1, hp: Math.min(100, prev.hp + healSelf), skillsUsed: newUsed, activeSkillEffect: newEffect };
    });

    // Chat charm: motivational popup every 10 correct answers
    if (selectedCharmIdsRef.current.includes('chat')) {
      chatCorrectCountRef.current += 1;
      if (chatCorrectCountRef.current % 10 === 0) {
        const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
        setChatPopupMsg(msg);
        setTimeout(() => setChatPopupMsg(null), 4000);
      }
    }
    advanceCard();
  };

  const advanceCard = () => {
    setAwaitingSkillChoice(false);
    setAnswerFeedback(null);
    setTimeout(() => {
      setCardIdx(i => i + 1 < matchCards.length ? i + 1 : 0);
      startQuestionTimer();
    }, 600);
  };

  const handleSkillActivate = (skillName: string) => {
    if (!awaitingSkillChoice) return;
    setAwaitingSkillChoice(false);
    applyCorrectAnswer(skillName);
  };

  const skipSkill = () => {
    if (!awaitingSkillChoice) return;
    setAwaitingSkillChoice(false);
    applyCorrectAnswer(null);
  };

  // ── Result: continue back to lobby ────────────────────────────────────────────
  const handleResultContinue = () => {
    // Trophy already saved in the auto-save effect; just show league toast here
    if (leagueChange) {
      if (leagueChange.promoted) {
        toast.success(`🎉 Promoted to ${leagueChange.name} League!`);
      } else {
        toast.error(`📉 Demoted to ${leagueChange.name} League.`);
      }
    }
    setPhase('lobby');
    setMode('train');
  };

  const handleConvertTrophies = async (amount: number) => {
    if (!user || !profile || profile.trophies < amount) return;
    await supabase.from('profiles').update({ trophies: profile.trophies - amount }).eq('id', user.id);
    await addGems(user.id, amount);
    triggerGemAnimation(amount);
    toast.success(`Converted ${amount} trophies → ${amount}💎`);
    await refreshProfile();
  };

  // ── Guest view ────────────────────────────────────────────────────────────────
  if (isGuest) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <GuestBanner message="Sign up or log in to enter the Arena!" />
        <div className="mt-8 text-center">
          <Landmark className="w-16 h-16 mx-auto text-primary/40 mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2 text-balance">Arena</h1>
          <p className="text-muted-foreground">Challenge other players in real-time flashcard battles. Earn trophies and climb the Leagues!</p>
        </div>
      </div>
    );
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground text-balance">Arena</h1>
            <p className="text-sm text-muted-foreground mt-0.5">1v1 real-time flashcard battles</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{league.emoji}</span>
            <div>
              <p className={`text-sm font-bold ${league.color}`}>{league.name}</p>
              <p className="text-xs text-muted-foreground">{trophies.toLocaleString()} 🏆</p>
            </div>
          </div>
        </div>

        {/* Trophy convert */}
        <div className="rounded-xl border border-border bg-secondary/10 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />Convert Trophies to Gems
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">1 trophy = 1💎</p>
            </div>
            <div className="flex gap-2">
              {[10, 25, 50].map(amt => (
                <Button key={amt} size="sm" variant="outline" className="h-8 text-xs"
                  disabled={trophies < amt} onClick={() => handleConvertTrophies(amt)}>
                  {amt}🏆→{amt}💎
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Deck selector */}
        <div className="space-y-2">
          <h2 className="font-semibold text-foreground text-sm">Select your deck <span className="text-muted-foreground font-normal">(30+ cards required)</span></h2>
          {decks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decks found. Create one in Armoury first.</p>
          ) : (
            <Select value={selectedDeckId ?? undefined} onValueChange={setSelectedDeckId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a deck…" />
              </SelectTrigger>
              <SelectContent>
                {decks.map(deck => {
                  const eligible = (deck.flashcard_count ?? 0) >= 30;
                  return (
                    <SelectItem key={deck.id} value={deck.id} disabled={!eligible}>
                      {deck.title} ({deck.flashcard_count ?? 0} cards{!eligible ? ' — need 30+' : ''})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Select your Skills & Charms */}
        <div className="space-y-2">
          <h2 className="font-semibold text-foreground text-sm">Select your Skills &amp; Charms</h2>
          {userSkills.length === 0 && userCharms.length === 0 ? (
            <p className="text-xs text-muted-foreground">No skills or charms owned. Visit Trade to get some.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {userSkills.map(s => {
                const sel = selectedSkillIds.includes(s.skill_name);
                const code = SKILL_CODES[s.skill_name] ?? s.skill_name;
                return (
                  <button key={s.id}
                    onClick={() => setSelectedSkillIds(prev =>
                      sel ? prev.filter(x => x !== s.skill_name)
                          : prev.length < 4 ? [...prev, s.skill_name] : prev
                    )}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all ${
                      sel
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}>
                    <span className="font-bold mr-1">{code}</span>{s.skill_name}
                    {sel && <span className="ml-1 text-[10px]">✓</span>}
                  </button>
                );
              })}
              {userCharms.map(c => {
                const sel = selectedCharmIds.includes(c.charm_name);
                const code = CHARM_CODES[c.charm_name] ?? c.charm_name;
                return (
                  <button key={c.id}
                    onClick={() => setSelectedCharmIds(prev =>
                      sel ? prev.filter(x => x !== c.charm_name)
                          : prev.length < 2 ? [...prev, c.charm_name] : prev
                    )}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all ${
                      sel
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}>
                    <span className="font-bold mr-1">{code}</span>{c.charm_name} ✦
                    {sel && <span className="ml-1 text-[10px]">✓</span>}
                  </button>
                );
              })}
              <p className="w-full text-[11px] text-muted-foreground">
                Skills: {selectedSkillIds.length}/4 · Charms: {selectedCharmIds.length}/2
              </p>
            </div>
          )}
        </div>

        {/* ── CTA Buttons: Find Opponent ABOVE leagues ── */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="h-12 text-sm" disabled={!selectedDeckId}
            onClick={handleTrainNow}>
            <Bot className="w-4 h-4 mr-2" />Train Now
          </Button>
          <Button variant="outline" className="h-12 text-sm" disabled={!selectedDeckId}
            onClick={handleFindOpponent}>
            <Users className="w-4 h-4 mr-2" />Find Opponent
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-2">
          <strong>Train Now</strong> — face a bot (+2/−1 🏆) &nbsp;·&nbsp;
          <strong>Find Opponent</strong> — real-time PVP (+25/−25 🏆)
        </p>

        {/* League Leaderboard */}
        <LeagueLeaderboard currentUserId={user?.id ?? ''} currentLeague={league} navigate={navigate} />
      </div>
    );
  }

  // ── Searching (Find Opponent) ──────────────────────────────────────────────────
  if (phase === 'searching') {
    const pct     = Math.min(100, (searchElapsed / 60) * 100);
    const tooLong = searchElapsed >= 60;
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-6 p-6">
        {/* Animated rings */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
          <div className="absolute inset-3 rounded-full border-4 border-primary/30 animate-ping" style={{ animationDelay: '0.25s' }} />
          <div className="absolute inset-6 rounded-full border-4 border-primary/40 animate-ping" style={{ animationDelay: '0.5s' }} />
          <div className="relative w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Search className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* League + status */}
        <div className="text-center space-y-1.5">
          <p className={`text-2xl font-black ${league.color}`}>
            {league.emoji} {league.name}
          </p>
          {!tooLong ? (
            <>
              <p className="text-sm text-muted-foreground">Searching for an opponent{searchingDots}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{searchElapsed}s</p>
            </>
          ) : (
            <p className="text-sm text-destructive font-medium">No opponent found.</p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-64">
          <Progress value={pct} className="h-1.5" />
        </div>

        {tooLong ? (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Invite a friend or try again.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleFindOpponent}><RefreshCcw className="w-4 h-4 mr-2" />Try Again</Button>
              <Button variant="outline" onClick={cancelSearch}>Maybe Later</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={cancelSearch}>
            <X className="w-4 h-4 mr-2" />Cancel
          </Button>
        )}
      </div>
    );
  }

  // ── Countdown ──────────────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    const isBot = mode === 'train';
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-8 p-6 text-center">
        <div className="flex items-center justify-center gap-8 flex-wrap w-full max-w-lg">

          {/* Player */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-4xl">{league.emoji}</span>
            <p className="text-sm font-bold text-foreground">{profile?.username || 'You'}</p>
            <p className={`text-xs ${league.color}`}>{league.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {trophies} 🏆 · {profile?.gems ?? 0} 💎 · {profile?.streak_days ?? 0} 🔥
            </p>
            <div className="flex flex-wrap gap-1 mt-1 justify-center max-w-[160px]">
              {selectedSkillIds.map(s => <Badge key={s} variant="secondary" className="text-xs capitalize">{s}</Badge>)}
              {selectedCharmIds.map(c => <Badge key={c} className="text-xs bg-primary/10 text-primary capitalize">{c} ✦</Badge>)}
            </div>
          </div>

          <span className="text-4xl font-black text-primary">VS</span>

          {/* Opponent */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-4xl">{opponentInfo?.emoji ?? '🤖'}</span>
            <p className="text-sm font-bold text-foreground">{opponentInfo?.username ?? 'BOT'}</p>
            {!isBot && opponentInfo ? (
              <>
                <p className={`text-xs ${opponentInfo.leagueColor}`}>{opponentInfo.leagueName}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {opponentInfo.trophies} 🏆 · {opponentInfo.gems} 💎 · {opponentInfo.streak} 🔥
                </p>
                <p className="text-xs text-muted-foreground">{opponentInfo.exp.toLocaleString()} EXP</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Training Bot</p>
            )}
            {isBot && (selectedSkillIds.length > 0 || selectedCharmIds.length > 0) && (
              <div className="flex flex-wrap gap-1 mt-1 justify-center max-w-[160px]">
                {selectedSkillIds.map(s => <Badge key={s} variant="secondary" className="text-xs capitalize">{s}</Badge>)}
                {selectedCharmIds.map(c => <Badge key={c} className="text-xs bg-primary/10 text-primary capitalize">{c} ✦</Badge>)}
              </div>
            )}
          </div>
        </div>

        {/* Big countdown number */}
        <div
          className={`text-8xl font-black text-primary transition-all duration-300 ${countdown > 0 ? 'scale-100 opacity-100' : 'scale-125 opacity-90'}`}
          style={{ textShadow: '0 0 40px hsl(var(--primary))' }}>
          {countdown > 0 ? countdown : 'GO!'}
        </div>
        <p className="text-sm text-muted-foreground">Get ready…</p>
      </div>
    );
  }

  // ── Battle ─────────────────────────────────────────────────────────────────────
  if (phase === 'battle' && playerSide && oppSide) {
    const equippedSkills = userSkills.filter(s => selectedSkillIds.includes(s.skill_name));
    const equippedCharms = userCharms.filter(c => selectedCharmIds.includes(c.charm_name));
    const isBot = mode === 'train';

    return (
      // Fixed overlay — user cannot click outside during battle
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        {/* Chat charm motivational popup */}
        {chatPopupMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-primary text-primary-foreground px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold text-center animate-bounce max-w-xs">
            {chatPopupMsg}
          </div>
        )}
        <div className="flex flex-col gap-3 p-3 md:p-4 max-w-5xl mx-auto min-h-screen">

          {/* Split: Player | Opponent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">

            {/* ── Player side ───────────────────────────────────────────── */}
            <div className="rounded-2xl border border-primary/30 bg-card p-4 flex flex-col gap-3 relative">

              {/* Floating messages (damage received shows on THIS side) */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-10 w-full px-2">
                {playerMsgs.map(m => (
                  <div key={m.id}
                    className="bg-destructive/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow animate-bounce whitespace-nowrap max-w-full truncate">
                    {m.text}
                  </div>
                ))}
              </div>

              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{playerSide.emoji}</span>
                  <p className="text-sm font-bold text-foreground">{playerSide.username}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-green-500 font-medium">✓ {playerSide.correct}</span>
                  <span className="text-red-400 font-medium">✗ {playerSide.wrong}</span>
                </div>
              </div>

              {/* HP bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>HP</span>
                  <span className={playerSide.hp <= 20 ? 'text-red-400 font-bold' : ''}>
                    {Math.max(0, playerSide.hp)}/100
                  </span>
                </div>
                <Progress value={Math.max(0, playerSide.hp)} className="h-3" />
              </div>

              {/* Active skill badge */}
              {playerSide.activeSkillEffect && (
                <div className="flex gap-1">
                  <Badge className="text-xs bg-blue-500/20 text-blue-400 capitalize">
                    {playerSide.activeSkillEffect} active
                  </Badge>
                </div>
              )}

              {/* Question */}
              <div className="rounded-xl bg-secondary/30 p-4 text-center min-h-[80px] flex items-center justify-center flex-1 relative overflow-hidden">
                {cloudOverlayActive && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="absolute rounded-full bg-white/60 dark:bg-slate-300/50" style={{
                        width: `${40 + Math.random() * 60}px`,
                        height: `${25 + Math.random() * 35}px`,
                        top: `${Math.random() * 80}%`,
                        left: `${Math.random() * 90}%`,
                        opacity: 0.55 + Math.random() * 0.3,
                        filter: 'blur(6px)',
                      }} />
                    ))}
                    <div className="absolute inset-0 bg-white/30 dark:bg-slate-400/20 backdrop-blur-[2px] rounded-xl" />
                  </div>
                )}
                <p className="text-base font-semibold text-foreground text-balance relative z-0">{question}</p>
              </div>

              {/* Answer input */}
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canSubmit && !awaitingSkillChoice && handleSubmit()}
                  placeholder="Type your answer…"
                  className={`flex-1 ${
                    answerFeedback === 'correct' ? 'border-green-500'
                    : answerFeedback === 'wrong'   ? 'border-red-400'
                    : ''
                  }`}
                  disabled={!canSubmit || awaitingSkillChoice}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || !answer.trim() || awaitingSkillChoice}
                  size="sm" className="h-9 px-3">
                  {canSubmit ? <ChevronRight className="w-4 h-4" /> : <span className="text-xs tabular-nums">{questionTimer}</span>}
                </Button>
              </div>

              {/* Feedback */}
              {answerFeedback && (
                <p className={`text-xs font-bold text-center ${answerFeedback === 'correct' ? 'text-green-500' : 'text-red-400'}`}>
                  {answerFeedback === 'correct' ? '✓ Correct!' : `✗ Wrong — ${correctAnswer}`}
                </p>
              )}

              {/* Skills (vertical, selectable after correct answer) */}
              {equippedSkills.length > 0 && (
                <div className="space-y-1 mt-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    {awaitingSkillChoice ? '⚡ Choose a Skill to activate (or skip):' : 'Skills'}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {equippedSkills.map(s => {
                      const used   = !!playerSide.skillsUsed[s.skill_name];
                      const active = awaitingSkillChoice && !used;
                      return (
                        <button key={s.id}
                          disabled={!active}
                          onClick={() => active && handleSkillActivate(s.skill_name)}
                          className={`text-left px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all ${
                            used
                              ? 'border-border/30 text-muted-foreground opacity-40 cursor-not-allowed'
                              : active
                              ? 'border-primary bg-primary/15 text-primary hover:bg-primary/25 cursor-pointer'
                              : 'border-border text-muted-foreground opacity-60'
                          }`}>
                          <span className="font-bold mr-1.5">{SKILL_CODES[s.skill_name] ?? s.skill_name}</span>{s.skill_name}
                          {used && ' ✓'}
                        </button>
                      );
                    })}
                    {awaitingSkillChoice && (
                      <button onClick={skipSkill}
                        className="text-xs text-muted-foreground underline text-left px-1">
                        Skip — deal base damage
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Charms (passive) */}
              {equippedCharms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {equippedCharms.map(c => (
                    <Badge key={c.charm_name} className="text-xs bg-primary/10 text-primary capitalize">
                      <span className="font-bold mr-1">{CHARM_CODES[c.charm_name] ?? c.charm_name}</span>{c.charm_name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* ── Opponent side ──────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-secondary/10 p-4 flex flex-col gap-3 relative">

              {/* Floating messages (damage dealt to opponent shows on THIS side) */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-10 w-full px-2">
                {oppMsgs.map(m => (
                  <div key={m.id}
                    className="bg-primary/90 text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow animate-bounce whitespace-nowrap max-w-full truncate">
                    {m.text}
                  </div>
                ))}
              </div>

              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{oppSide.emoji}</span>
                  <p className="text-sm font-bold text-muted-foreground">{oppSide.username}</p>
                  {!isBot && opponentInfo && (
                    <span className={`text-xs ${oppSide.leagueColor}`}>{oppSide.leagueName}</span>
                  )}
                  {isBot && <Badge variant="secondary" className="text-xs">BOT</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-green-500 font-medium">✓ {oppSide.correct}</span>
                  <span className="text-red-400 font-medium">✗ {oppSide.wrong}</span>
                </div>
              </div>

              {/* HP bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>HP</span>
                  <span className={oppSide.hp <= 20 ? 'text-red-400 font-bold' : ''}>
                    {Math.max(0, oppSide.hp)}/100
                  </span>
                </div>
                <Progress value={Math.max(0, oppSide.hp)} className="h-3" />
              </div>

              {/* Active skill badge */}
              {oppSide.activeSkillEffect && (
                <div className="flex gap-1">
                  <Badge className="text-xs bg-border/30 text-muted-foreground capitalize">
                    {oppSide.activeSkillEffect} active
                  </Badge>
                </div>
              )}

              {/* Opponent blurred question */}
              <div className="rounded-xl bg-secondary/20 p-4 text-center min-h-[80px] flex items-center justify-center blur-[3px] select-none flex-1">
                <p className="text-base font-semibold text-muted-foreground">● ● ● ● ● ●</p>
              </div>

              {/* Opponent "typing" indicator */}
              <div className="h-9 rounded-md bg-secondary/30 border border-border flex items-center px-3">
                <p className="text-xs text-muted-foreground animate-pulse">
                  {isBot ? 'Bot processing…' : 'Opponent typing…'}
                </p>
              </div>

              {/* Opponent skills — colour-change shows which skill was activated */}
              {selectedSkillIds.length > 0 && (
                <div className="space-y-1 mt-1">
                  <p className="text-xs text-muted-foreground font-medium">Opp Skills</p>
                  <div className="flex flex-col gap-1.5">
                    {selectedSkillIds.map(skillName => {
                      const activated = !!oppSide.skillsUsed[skillName];
                      return (
                        <div key={skillName}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all ${
                            activated
                              ? 'border-primary/60 bg-primary/15 text-primary'
                              : 'border-border/30 text-muted-foreground opacity-50'
                          }`}>
                          <span className="font-bold mr-1.5">{SKILL_CODES[skillName] ?? skillName}</span>{skillName}
                          {activated && ' ✓'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Opponent charms display */}
              {selectedCharmIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCharmIds.map(c => (
                    <Badge key={c} className="text-xs bg-border/20 text-muted-foreground capitalize">
                      <span className="font-bold mr-1">{CHARM_CODES[c] ?? c}</span>{c}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────────
  if (phase === 'result' && playerSide && oppSide) {
    const matchDuration = matchStartTime
      ? Math.round((new Date().getTime() - matchStartTime.getTime()) / 1000)
      : 0;
    const mins    = Math.floor(matchDuration / 60);
    const secs    = matchDuration % 60;
    const isDraw  = playerSide.hp <= 0 && oppSide.hp <= 0;
    const resultLabel = isDraw ? '🤝 Draw' : playerWon ? '🏆 Victory!' : '💀 Defeat';

    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto text-center space-y-6">

        {/* Result hero */}
        <div className="py-8 space-y-3">
          <div className="text-7xl mb-2">{isDraw ? '🤝' : playerWon ? '🏆' : '💀'}</div>
          <h1 className="text-3xl font-bold text-foreground">{resultLabel}</h1>

          {/* Trophy delta — shown immediately in result screen */}
          <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xl font-black ${
            resultTrophyDelta >= 0
              ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
              : 'bg-red-400/15 text-red-400 border border-red-400/30'
          }`}>
            {resultTrophyDelta > 0 ? `+${resultTrophyDelta}` : resultTrophyDelta} 🏆
          </div>

          {/* League promotion / demotion banner */}
          {leagueChange && (
            <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
              leagueChange.promoted
                ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                : 'bg-red-500/15 text-red-400 border border-red-500/30'
            }`}>
              {leagueChange.promoted ? '🎉' : '📉'}{' '}
              {leagueChange.promoted ? `Promoted to ${leagueChange.name} League!` : `Demoted to ${leagueChange.name} League.`}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {mins > 0 ? `${mins}m ` : ''}{secs}s · {mode === 'train' ? 'Training (bot)' : `vs ${oppSide.username}`}
          </p>

          {/* Clickable opponent avatar for PVP */}
          {opponentInfo && mode === 'pvp' && opponentInfo.id !== 'bot' && (
            <button
              className="text-xs text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
              onClick={() => navigate(`/profile/${opponentInfo.id}`)}>
              View {oppSide.username}'s profile →
            </button>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-2xl font-bold text-green-500">{playerSide.correct}</p>
            <p className="text-xs text-muted-foreground">Your correct</p>
          </div>
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-2xl font-bold text-red-400">{playerSide.wrong}</p>
            <p className="text-xs text-muted-foreground">Your wrong</p>
          </div>
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-2xl font-bold text-green-500">{oppSide.correct}</p>
            <p className="text-xs text-muted-foreground">Opp correct</p>
          </div>
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-2xl font-bold text-red-400">{oppSide.wrong}</p>
            <p className="text-xs text-muted-foreground">Opp wrong</p>
          </div>
        </div>

        <Button className="w-full" onClick={handleResultContinue}>
          <RefreshCcw className="w-4 h-4 mr-2" />Back to Arena Lobby
        </Button>
      </div>
    );
  }

  return null;
}
