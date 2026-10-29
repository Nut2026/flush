import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  fetchBadges, updateProfile, fetchDecks,
  fetchGameHighScores, fetchProfileByUsername,
} from '@/services/flush/flushService';
import { PROFILE_GRADIENTS, ALL_BADGE_NAMES, AVATAR_FRAME_COLORS, THEMES } from '@/services/flush/constants';
import { hasTier } from '@/services/flush/flushService';
import type { Badge, Deck, GameHighScore, Profile } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Edit3, Share2, Check, Eye, EyeOff, Download, Clipboard, AlertTriangle, Settings2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { GuestBanner } from '@/components/common/GuestBanner';
import { GuestGate } from '@/components/common/GuestGate';
import { ProfileCharacter, PROFILE_ICONS, isProfileIcon } from '@/components/common/ProfileCharacter';
import html2canvas from 'html2canvas';

const BADGE_EMOJI: Record<string, string> = {
  'First Deck': '📚',
  'Card Master': '🃏',
  'Test Ace': '🏆',
  '3-Day Streak': '🔥',
  '7-Day Streak': '🔥🔥',
  '14-Day Streak': '🔥🔥🔥',
  '30-Day Streak': '⚡',
  'Gem Hoarder': '💎',
  'Game Winner': '🥇',
  'Perfect Week': '🌟',
  'Master of All': '🎓',
};

const BADGE_DESCRIPTIONS: Record<string, string> = {
  'First Deck': 'Your first deck was created.',
  'Card Master': 'Write a deck of 100+ cards.',
  'Test Ace': 'Score 100% on a test.',
  '3-Day Streak': 'Study three days in a row.',
  '7-Day Streak': 'Study seven days in a row.',
  '14-Day Streak': 'Study fourteen days in a row.',
  '30-Day Streak': 'Study thirty days in a row.',
  'Gem Hoarder': 'Collect 500 gems.',
  'Game Winner': 'Win an arcade game.',
  'Perfect Week': 'Study every day for a week.',
  'Master of All': 'Reach mastery in every card of a deck.',
};

// BADGE_HINTS: ≤5 words, theme/emotion focused — no direct actions, numbers, or titles
const BADGE_HINTS: Record<string, string> = {
  'First Deck':     'A journey begins here.',
  'Card Master':    'Dedication, card by card.',
  'Test Ace':       'Pressure reveals true mastery.',
  '3-Day Streak':   'Habit sparks the fire.',
  '7-Day Streak':   'Consistency builds real strength.',
  '14-Day Streak':  'Persistence through the storm.',
  '30-Day Streak':  'Unbreakable, day after day.',
  'Gem Hoarder':    'Patience accumulates quiet wealth.',
  'Game Winner':    'Victory earned through play.',
  'Perfect Week':   'Harmony in every day.',
  'Master of All':  'Boundless curiosity, limitless growth.',
};


// Avatar wrapper for guests: no dimming, just tooltip on hover/tap
function AvatarWithGuestTip({ isGuest, onEdit, children, tipText }: { isGuest: boolean; onEdit: () => void; children: React.ReactNode; tipText: string }) {
  const [tip, setTip] = useState(false);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTip = () => { if (hideRef.current) clearTimeout(hideRef.current); setTip(true); };
  const hideTip = () => { hideRef.current = setTimeout(() => setTip(false), 200); };
  const handleClick = (e: React.MouseEvent) => {
    if (!isGuest) { onEdit(); return; }
    e.preventDefault();
    setTip(v => !v);
    if (!tip) hideRef.current = setTimeout(() => setTip(false), 2500);
  };
  return (
    <div
      className="relative cursor-pointer"
      onMouseEnter={isGuest ? showTip : undefined}
      onMouseLeave={isGuest ? hideTip : undefined}
      onClick={handleClick}
    >
      {children}
      {isGuest && tip && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-20 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-xs font-medium pointer-events-none whitespace-nowrap">
          🔒 {tipText}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, profile, isGuest, signOut, refreshProfile } = useAuth();
  const { studyTheme, deckTheme, setStudyTheme, setDeckTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const visitingUsername = searchParams.get('user');
  const isPublicView = !!visitingUsername;

  // ── Public profile state (when ?user=xxx) ──────────────────────────────────
  const [pubProfile, setPubProfile] = useState<Profile | null>(null);
  const [pubBadges, setPubBadges] = useState<Badge[]>([]);
  const [pubHighScores, setPubHighScores] = useState<GameHighScore[]>([]);
  const [pubLoading, setPubLoading] = useState(isPublicView);

  useEffect(() => {
    if (!isPublicView) return;
    setPubLoading(true);
    fetchProfileByUsername(visitingUsername).then(async p => {
      setPubProfile(p);
      if (p?.id) {
        const [b, hs] = await Promise.all([
          fetchBadges(p.id),
          fetchGameHighScores(p.id),
        ]);
        setPubBadges(b);
        setPubHighScores(hs);
      }
    }).finally(() => setPubLoading(false));
  }, [visitingUsername, isPublicView]);

  const [badges, setBadges] = useState<Badge[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [highScores, setHighScores] = useState<GameHighScore[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [selectedGrad, setSelectedGrad] = useState(profile?.profile_gradient || 'default');
  const [selectedChar, setSelectedChar] = useState(profile?.profile_character || 'icon_leaf');
  const [charColor, setCharColor] = useState(profile?.profile_char_color || '#ffffff');
  const [selectedFrameColor, setSelectedFrameColor] = useState<string | null>(profile?.profile_frame_color ?? null);
  const [frameShiny, setFrameShiny] = useState(profile?.profile_frame_shiny ?? false);
  const [avatarShiny, setAvatarShiny] = useState(profile?.avatar_shiny ?? false);
  const [avatarInvisible, setAvatarInvisible] = useState(profile?.profile_gradient === '__invisible__');
  const [displayedBadges, setDisplayedBadges] = useState<string[]>(profile?.displayed_badges || []);
  const [savedBadges, setSavedBadges] = useState<string[]>(profile?.displayed_badges || []);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSections, setShareSections] = useState({ stats: true, bests: true, badges: true });
  const [shareCapturing, setShareCapturing] = useState(false);
  const snapshotRef = useRef<HTMLDivElement>(null);
  // Customise Public Self
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const defaultSections = { join_date: true, statistics: true, personal_bests: true, badges: true };
  const [pubSections, setPubSections] = useState<{ join_date: boolean; statistics: boolean; personal_bests: boolean; badges: boolean }>(defaultSections);
  const [pubSectionsSaving, setPubSectionsSaving] = useState(false);
  // Email warning / link
  const [addEmailOpen, setAddEmailOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailLinked, setEmailLinked] = useState(false);
  // Username once-only
  const [usernameAcknowledged, setUsernameAcknowledged] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [, setLoading] = useState(true);

  // ── Tier-unlocked features ───────────────────────────────────────────────
  const totalExp = profile?.total_exp ?? 0;
  const hasClip        = hasTier(totalExp, 'Clip');
  const hasEraser      = hasTier(totalExp, 'Eraser');
  const hasSharpener   = hasTier(totalExp, 'Sharpener');
  const hasScissors    = hasTier(totalExp, 'Scissors');
  const hasHighlighter = hasTier(totalExp, 'Highlighter');
  const hasNotebook    = hasTier(totalExp, 'Notebook');
  const hasStapler     = hasTier(totalExp, 'Stapler');
  const hasLaminator   = hasTier(totalExp, 'Laminator');
  const maxBadges = hasStapler ? 10 : hasSharpener ? 5 : 3;

  useEffect(() => {
    if (isGuest || !user) { setLoading(false); return; }
    Promise.all([
      fetchBadges(user.id),
      fetchDecks(user.id),
      fetchGameHighScores(user.id),
    ]).then(([b, d, hs]) => {
      setBadges(b);
      setDecks(d);
      setHighScores(hs);
      setDisplayedBadges(profile?.displayed_badges || []);
      setSavedBadges(profile?.displayed_badges || []);
      if (profile?.public_profile_sections) {
        setPubSections({ ...defaultSections, ...profile.public_profile_sections });
      }
    }).finally(() => setLoading(false));
  }, [user, isGuest]);

  const handleSaveName = async () => {
    const name = nameInput.trim();
    if (name.length < 3 || name.length > 20) { setNameError("Usernames must be 3-20 characters."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) { setNameError("Use letters, numbers and underscores only."); return; }
    if (!user) return;
    if (!usernameAcknowledged) { setNameError("Please confirm the username change."); return; }
    // Case-insensitive uniqueness check
    const { data: existing } = await supabase.from('profiles').select('id').ilike('username', name).neq('id', user.id).maybeSingle();
    if (existing) { setNameError("That username is already taken."); return; }
    try {
      // Update the Supabase auth email (used as login identifier: username@flush.app)
      const newInternalEmail = `${name.toLowerCase()}@flush.app`;
      const { error: authErr } = await supabase.auth.updateUser({ email: newInternalEmail });
      if (authErr) { setNameError("Could not update your account. Try again."); return; }
      await updateProfile(user.id, { username: name, username_changed_at: new Date().toISOString() });
      await refreshProfile();
      setEditingName(false);
      setUsernameAcknowledged(false);
      toast.success('Username updated! Use your new username to log in next time.');
    } catch {
      toast.error('Failed to update username');
    }
  };

  const handleSaveAvatar = async () => {
    if (!user) return;
    try {
      await updateProfile(user.id, {
        profile_gradient: avatarInvisible ? '__invisible__' : selectedGrad,
        profile_character: selectedChar,
        profile_char_color: charColor,
        profile_frame_color: hasClip ? selectedFrameColor : null,
        profile_frame_shiny: hasHighlighter ? frameShiny : false,
        avatar_shiny: hasLaminator ? avatarShiny : false,
      });
      await refreshProfile();
      setEditingAvatar(false);
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to update avatar');
    }
  };

  // Outside click closes without saving — only "Save Avatar" button saves
  // When opening, reset unsaved selections to current profile values
  const handleAvatarOpenChange = (open: boolean) => {
    if (open) {
      const grad = profile?.profile_gradient || 'default';
      const isInvis = grad === '__invisible__';
      setAvatarInvisible(isInvis);
      setSelectedChar(profile?.profile_character || 'icon_leaf');
      setCharColor(profile?.profile_char_color || '#ffffff');
      setSelectedGrad(isInvis ? 'default' : grad);
      setSelectedFrameColor(profile?.profile_frame_color ?? null);
      setFrameShiny(profile?.profile_frame_shiny ?? false);
      setAvatarShiny(profile?.avatar_shiny ?? false);
    }
    setEditingAvatar(open);
  };

  const handleSaveBadges = async () => {
    if (!user) return;
    await updateProfile(user.id, { displayed_badges: displayedBadges });
    await refreshProfile();
    setSavedBadges([...displayedBadges]);
    toast.success('Displayed badges updated!');
  };

  const toggleDisplayedBadge = (name: string) => {
    setDisplayedBadges(prev => {
      if (prev.includes(name)) return prev.filter(b => b !== name);
      if (prev.length >= maxBadges) { toast.error(`Max ${maxBadges} badges`); return prev; }
      return [...prev, name];
    });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      // Delete all user data from tables (cascade handles most via FK)
      await supabase.from('flashcards').delete().in(
        'deck_id',
        (await supabase.from('decks').select('id').eq('user_id', user.id)).data?.map((d: any) => d.id) || []
      );
      await supabase.from('decks').delete().eq('user_id', user.id);
      await supabase.from('badges').delete().eq('user_id', user.id);
      await supabase.from('owned_items').delete().eq('user_id', user.id);
      await supabase.from('game_high_scores').delete().eq('user_id', user.id);
      await supabase.from('daily_goals').delete().eq('user_id', user.id);
      await supabase.from('test_results').delete().eq('user_id', user.id);
      await supabase.from('study_sessions').delete().eq('user_id', user.id);
      await supabase.from('game_sessions').delete().eq('user_id', user.id);
      await supabase.from('ai_usage').delete().eq('user_id', user.id);
      await supabase.from('game_tokens').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);
    } catch (err) {
      console.error('Delete data error:', err);
    }
    await supabase.auth.signOut();
    navigate('/');
    toast.success('Account deleted.');
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (newPw.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    if (!currentPw) { setPwError("Enter your current password."); return; }
    setPwLoading(true);
    try {
      // Re-authenticate with current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPw,
      });
      if (signInError) { setPwError("That password is incorrect."); setPwLoading(false); return; }
      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Password updated.");
      setChangePwOpen(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      setPwError(err.message || "Could not change your password.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const gradient = PROFILE_GRADIENTS.find(g => g.id === (profile?.profile_gradient === '__invisible__' ? 'default' : (profile?.profile_gradient || 'default')));
  const isAvatarInvisible = profile?.profile_gradient === '__invisible__';
  const displayFrameColor = profile?.profile_frame_color ?? null;
  const displayFrameShiny = profile?.profile_frame_shiny ?? false;
  const displayAvatarShiny = profile?.avatar_shiny ?? false;
  const earnedBadgeNames = new Set(badges.map(b => b.badge_name));

  // Whether badge selection has changed from saved state
  const badgesChanged = JSON.stringify([...displayedBadges].sort()) !== JSON.stringify([...savedBadges].sort());

  // Capture snapshot as image
  const captureSnapshot = async (action: 'copy' | 'download') => {
    if (!snapshotRef.current) return;
    setShareCapturing(true);
    try {
      const canvas = await html2canvas(snapshotRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      if (action === 'download') {
        const link = document.createElement('a');
        link.download = `flush-self-${profile?.username || 'user'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Self snapshot downloaded!');
      } else {
        canvas.toBlob(async (blob) => {
          if (!blob) { toast.error('Failed to capture snapshot'); return; }
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast.success('Self snapshot copied to clipboard!');
          } catch {
            // Fallback: download if clipboard API not available
            const link = document.createElement('a');
            link.download = `flush-self-${profile?.username || 'user'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('Saved as image (clipboard unavailable)');
          }
        }, 'image/png');
      }
    } catch (err) {
      toast.error('Failed to capture snapshot');
    } finally {
      setShareCapturing(false);
    }
  };

  const handleSaveEmail = async () => {
    const em = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setEmailError("Enter a valid email address."); return; }
    if (!user) return;
    setEmailSaving(true); setEmailError('');
    // Check if email already used
    const { data: existing } = await supabase.from('profiles').select('id').ilike('email', em).neq('id', user.id).maybeSingle();
    if (existing) { setEmailSaving(false); setEmailError("That email is already linked to another account."); return; }
    await updateProfile(user.id, { email: em });
    await refreshProfile();
    setEmailSaving(false);
    setEmailLinked(true);
  };

  const handleSavePubSections = async () => {
    if (!user) return;
    setPubSectionsSaving(true);
    await updateProfile(user.id, { public_profile_sections: pubSections } as any);
    await refreshProfile();
    setPubSectionsSaving(false);
    setCustomiseOpen(false);
    toast.success('Public Self updated!');
  };

  const deckById = (id: string | null) => decks.find(d => d.id === id)?.title || null;

  // ── Public view (read-only) ────────────────────────────────────────────────
  if (isPublicView) {
    if (pubLoading) {
      return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-1" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />Back
          </Button>
          <div className="text-muted-foreground text-sm">Loading profile…</div>
        </div>
      );
    }
    if (!pubProfile) {
      return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-1" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />Back
          </Button>
          <div className="text-muted-foreground text-sm">That user could not be found.</div>
        </div>
      );
    }

    const pubSectionsRaw = pubProfile.public_profile_sections as Record<string, boolean> | null;
    const pubSec = { join_date: true, statistics: true, personal_bests: true, badges: true, ...pubSectionsRaw };
    const isPubInvisible = pubProfile.profile_gradient === '__invisible__';
    const pubGradient = PROFILE_GRADIENTS.find(g => g.id === (isPubInvisible ? 'default' : (pubProfile.profile_gradient || 'default')));
    const pubFrameColor = pubProfile.profile_frame_color ?? null;
    const pubFrameShiny = pubProfile.profile_frame_shiny ?? false;
    const pubAvatarShiny = pubProfile.avatar_shiny ?? false;
    const pubDisplayedBadges: string[] = Array.isArray(pubProfile.displayed_badges) ? pubProfile.displayed_badges : [];

    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-1" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />Back
        </Button>

        {/* Avatar + Name */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-5 flex-wrap">
              <div className="relative shrink-0">
                {/* Public profile frame ring */}
                {pubFrameColor && !isPubInvisible && (
                  <div
                    className={`absolute inset-[-4px] rounded-full z-10 pointer-events-none ${pubFrameShiny ? 'shiny-frame' : ''}`}
                    style={{ border: `3px solid ${pubFrameColor}` }}
                  />
                )}
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl border-2 border-border relative ${pubAvatarShiny && !isPubInvisible ? 'shiny-avatar' : ''}`}
                  style={isPubInvisible ? {} : { background: pubGradient?.css || 'linear-gradient(135deg,#B026FF,#00D4FF)' }}
                >
                  {!isPubInvisible && (
                    <ProfileCharacter
                      char={pubProfile.profile_character || 'A'}
                      color={pubProfile.profile_char_color || '#ffffff'}
                      size={isProfileIcon(pubProfile.profile_character) ? 36 : 32}
                    />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground truncate">{pubProfile.username}</h2>
                {pubSec.join_date && (
                  <p className="text-sm text-muted-foreground">
                    Flusher since {pubProfile.join_date ? new Date(pubProfile.join_date).toLocaleDateString() : 'N/A'}
                  </p>
                )}
                {pubDisplayedBadges.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {pubDisplayedBadges.map(bn => (
                      <span key={bn} className="text-lg" title={bn}>{BADGE_EMOJI[bn] || '🏅'}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        {pubSec.statistics && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { emoji: '💎', value: pubProfile.gems ?? 0, label: "Gems" },
                  { emoji: '📚', value: pubProfile.total_cards_studied ?? 0, label: "Studied" },
                  { emoji: '🔥', value: `${pubProfile.streak_days ?? 0}d`, label: "Streak" },
                  { emoji: '📝', value: pubProfile.total_tests_taken ?? 0, label: "Tests taken" },
                  { emoji: '🎮', value: pubProfile.total_games_played ?? 0, label: "Games played" },
                  { emoji: '💸', value: pubProfile.total_gems_spent ?? 0, label: "Spent" },
                ].map(s => (
                  <div key={s.label} className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-lg">{s.emoji}</p>
                    <p className="text-xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Bests */}
        {pubSec.personal_bests && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Personal bests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Best streak", value: `${pubProfile.longest_streak ?? 0} days` },
                { label: "Best test", value: pubProfile.best_test_score_percent != null ? `${pubProfile.best_test_score_percent}%` : 'N/A' },
                { label: "Cards in a week", value: String(pubProfile.most_cards_in_week ?? 0) },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-semibold text-foreground">{row.value}</span>
                </div>
              ))}
              {(['whackacard', 'skyscraper', 'matching'] as const).map(g => {
                const lbl: Record<string, string> = { whackacard: "Whack-a-Card", skyscraper: "Build a Skyscraper", matching: "Matching Magic" };
                const hs = pubHighScores.find(h => h.game_name === g);
                return hs ? (
                  <div key={g} className="flex justify-between py-1 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{lbl[g]}</span>
                    <span className="text-sm font-semibold text-foreground">{hs.high_score} pts</span>
                  </div>
                ) : null;
              })}
            </CardContent>
          </Card>
        )}

        {/* Badges */}
        {pubSec.badges && pubBadges.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {pubBadges.map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                    <span className="text-2xl">{BADGE_EMOJI[b.badge_name] || '🏅'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{b.badge_name}</p>
                      <p className="text-xs text-muted-foreground">{BADGE_DESCRIPTIONS[b.badge_name] ?? ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Profile</h1>

      {/* Email warning banner for users without email */}
      {!isGuest && user && !profile?.email && !emailLinked && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">No email linked</p>
            <p className="text-xs text-muted-foreground mt-0.5">Link one to recover your account on other devices.</p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={() => { setAddEmailOpen(true); setEmailInput(''); setEmailError(''); }}>
            Add Email
          </Button>
        </div>
      )}
      {!isGuest && user && (profile?.email || emailLinked) && emailLinked && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 flex items-center gap-3">
          <span className="text-green-500 text-lg">🎉</span>
          <p className="text-sm text-foreground">Email linked! You're all set, {profile?.username}. Keep on Flushing!</p>
        </div>
      )}

      {isGuest && (
        <GuestBanner message="You are browsing as a guest. Sign up to claim your profile." />
      )}

      {/* Avatar + Name */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Avatar */}
            <div className="relative">
              <AvatarWithGuestTip isGuest={isGuest} onEdit={() => setEditingAvatar(true)} tipText={`Sign Up or Log In to explore your avatar`}>
                <div className="relative">
                  {/* Frame ring */}
                  {displayFrameColor && !isAvatarInvisible && (
                    <div
                      className={`absolute inset-[-4px] rounded-full z-10 pointer-events-none ${displayFrameShiny ? 'shiny-frame' : ''}`}
                      style={{ border: `3px solid ${displayFrameColor}` }}
                    />
                  )}
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl border-2 border-border transition-colors relative ${displayAvatarShiny && !isAvatarInvisible ? 'shiny-avatar' : ''}`}
                    style={isAvatarInvisible ? {} : { background: gradient?.css || 'linear-gradient(135deg,#B026FF,#00D4FF)' }}
                  >
                    {!isAvatarInvisible && (
                      <ProfileCharacter
                        char={profile?.profile_character || (isGuest ? 'G' : '?')}
                        color={profile?.profile_char_color || '#ffffff'}
                        size={isProfileIcon(profile?.profile_character) ? 36 : 32}
                      />
                    )}
                  </div>
                </div>
              </AvatarWithGuestTip>
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="space-y-2">
                  <Input
                    value={nameInput}
                    onChange={e => { setNameInput(e.target.value); setNameError(''); }}
                    placeholder="Your username"
                    maxLength={20}
                    autoFocus
                  />
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={usernameAcknowledged}
                      onChange={e => { setUsernameAcknowledged(e.target.checked); setNameError(''); }}
                      className="mt-0.5 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground">I understand I can only change my username once.</span>
                  </label>
                  {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveName} disabled={!usernameAcknowledged}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingName(false); setUsernameAcknowledged(false); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground truncate">
                      {profile?.username || (isGuest ? "Guest" : "Learner")}
                    </h2>
                    {!isGuest && !profile?.username_changed_at && (
                      <Button variant="ghost" size="sm" onClick={() => { setNameInput(profile?.username || ''); setEditingName(true); setUsernameAcknowledged(false); }}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    )}
                    {!isGuest && profile?.username_changed_at && (
                      <span className="text-xs text-muted-foreground">(locked)</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isGuest ? "Guest" : `Member since ${profile?.join_date ? new Date(profile.join_date).toLocaleDateString() : "Not available"}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Displayed badges row — show only the selected badges up to tier-unlocked max */}
          {displayedBadges.length > 0 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {displayedBadges.slice(0, maxBadges).map(bn => (
                <span key={bn} className="text-lg" title={bn}>{BADGE_EMOJI[bn] || '🏅'}</span>
              ))}
            </div>
          )}

          {/* Settings row */}
          <div className="flex gap-2 mt-4 flex-wrap">
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {isGuest ? (
        <GuestGate feature="see your Statistics">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {['💎','📚','🔥','📝','🎮','💸'].map((emoji, i) => (
                  <div key={i} className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-lg">{emoji}</p>
                    <p className="text-xl font-bold text-foreground">—</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">···</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </GuestGate>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Gems earned", value: profile?.total_gems_earned || 0, emoji: '💎' },
                { label: "Cards studied", value: profile?.total_cards_studied || 0, emoji: '📚' },
                { label: "Longest streak", value: `${profile?.longest_streak || 0}d`, emoji: '🔥' },
                { label: "Tests taken", value: profile?.total_tests_taken || 0, emoji: '📝' },
                { label: "Games played", value: profile?.total_games_played || 0, emoji: '🎮' },
                { label: "Gems spent", value: profile?.total_gems_spent || 0, emoji: '💸' },
              ].map(s => (
                <div key={s.label} className="bg-secondary rounded-xl p-3 text-center">
                  <p className="text-lg">{s.emoji}</p>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Leaderboard */}
      {isGuest ? (
        <GuestGate feature="admire your Personal Bests">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Personal bests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {["Best streak", "Best test score", "Most cards in a week"].map(label => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold text-foreground">—</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </GuestGate>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal bests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Best streak</span>
              <span className="font-semibold text-foreground">
                {profile?.longest_streak || 0} days
                {profile?.best_streak_date && <span className="text-xs text-muted-foreground ml-1">({profile.best_streak_date})</span>}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Best test score</span>
              <span className="font-semibold text-foreground">
                {profile?.best_test_score_percent !== null ? `${profile?.best_test_score_percent}%` : 'N/A'}
                {profile?.best_test_score_deck_id && (
                  <span className="text-xs text-muted-foreground ml-1">({deckById(profile.best_test_score_deck_id) ?? '—'})</span>
                )}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Most cards in a week</span>
              <span className="font-semibold text-foreground">{profile?.most_cards_in_week || 0}</span>
            </div>
            {highScores.length > 0 && (
              <>
                <Separator />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Arcade high scores</p>
                {(['whackacard', 'skyscraper', 'matching'] as const).map(gameType => {
                  const label: Record<string, string> = {
                    whackacard: "Whack-a-Card",
                    skyscraper: "Build a Skyscraper",
                    matching: "Matching Magic",
                  };
                  const hs = highScores.find(h => h.game_name === gameType);
                  return (
                    <div key={gameType} className="flex justify-between">
                      <span className="text-muted-foreground">{label[gameType]}</span>
                      <span className="font-semibold text-foreground">
                        {hs ? `${hs.high_score} pts` : '—'}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      {isGuest ? (
        <GuestGate feature="prize your Badges">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {ALL_BADGE_NAMES.slice(0, 6).map(name => (
                  <div key={name} className="flex items-center gap-3 p-3 rounded-xl border-2 border-border/30 bg-secondary/30 opacity-60">
                    <span className="text-xl blur-sm select-none">{BADGE_EMOJI[name] || '🏅'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate blur-sm select-none text-muted-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground truncate blur-sm select-none">{BADGE_DESCRIPTIONS[name] ?? ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </GuestGate>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              {`Pick up to ${maxBadges} badges to show on your profile.`}
               
              <span className="text-primary font-medium">
                {maxBadges > 3 ? `Up to ${maxBadges} badges unlocked!` : ''}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_BADGE_NAMES.map(name => {
                const earned = earnedBadgeNames.has(name);
                const displayed = displayedBadges.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => earned && toggleDisplayedBadge(name)}
                    disabled={!earned}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      displayed ? 'border-primary bg-primary/10'
                        : earned ? 'border-border hover:border-primary/50 bg-card'
                        : 'border-border/30 bg-secondary/30 cursor-not-allowed'
                    }`}
                  >
                    <span className={`text-xl transition-all ${earned ? '' : 'blur-sm select-none'}`}>
                      {BADGE_EMOJI[name] || '🏅'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {earned ? name : '???'}
                      </p>
                      {earned ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {BADGE_DESCRIPTIONS[name] ?? ''}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/70 truncate italic">
                          {BADGE_HINTS[name] ?? 'Something awaits...'}
                        </p>
                      )}
                    </div>
                    {displayed && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
            {badgesChanged && (
              <Button size="sm" className="mt-4" onClick={handleSaveBadges}>Save badges</Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3">
          {!isGuest && (
            <>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" className="flex-1" onClick={() => setShareOpen(true)}>
                  <Share2 className="w-4 h-4 mr-1.5" />Share profile
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setCustomiseOpen(true)}>
                  <Settings2 className="w-4 h-4 mr-1.5" />Customise public profile
                </Button>
              </div>
              <Separator />
            </>
          )}
          {/* ── Theme Layers (Scissors / Notebook tier) ──────────────── */}
          {hasScissors && !isGuest && (
            <>
              <Separator />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    ✂️ Theme Layers
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Apply a different theme when studying, testing, or playing Arcade.
                  </p>
                </div>
                {/* Study / Test / Arcade theme */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Study · Test · Arcade theme</p>
                  <div className="flex flex-wrap gap-2">
                    {THEMES.map((t: { name: string; displayName: string; preview: string }) => (
                      <button
                        key={t.name}
                        onClick={() => setStudyTheme(t.name as any)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          studyTheme === t.name
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50 text-foreground'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: t.preview }}
                        />
                        {t.displayName}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active: <span className="text-foreground font-medium capitalize">{studyTheme === 'default' ? 'Same as main' : studyTheme}</span>
                  </p>
                </div>
                {/* Deck Edit / View theme (Notebook tier) */}
                {hasNotebook && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      Edit · View Deck theme <span className="text-primary ml-1">📓 Notebook</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {THEMES.map((t: { name: string; displayName: string; preview: string }) => (
                        <button
                          key={t.name}
                          onClick={() => setDeckTheme(t.name as any)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            deckTheme === t.name
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50 text-foreground'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ background: t.preview }}
                          />
                          {t.displayName}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Active: <span className="text-foreground font-medium capitalize">{deckTheme === 'default' ? 'Same as main' : deckTheme}</span>
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Sign Out / Change Password — inline row */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground px-0" onClick={handleSignOut}>
              Sign out
            </Button>
            {!isGuest && (
              <>
                <span className="text-muted-foreground/50 select-none">/</span>
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground px-0" onClick={() => { setChangePwOpen(true); setPwError(''); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}>
                  Change password
                </Button>
              </>
            )}
          </div>
            {!isGuest && (
              <div className="flex justify-start">
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 px-0"
                  onClick={() => { setDeletePhrase(''); setDeleteOpen(true); }}
                >
                  Delete account
                </Button>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Avatar editor */}
      <Dialog open={editingAvatar} onOpenChange={handleAvatarOpenChange}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit avatar</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Preview */}
            <div className="flex justify-center">
              <div className="relative">
                {/* Frame ring */}
                {selectedFrameColor && !avatarInvisible && (
                  <div
                    className={`absolute inset-[-4px] rounded-full z-10 pointer-events-none ${frameShiny ? 'shiny-frame' : ''}`}
                    style={{ border: `3px solid ${selectedFrameColor}` }}
                  />
                )}
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl relative ${avatarShiny && !avatarInvisible ? 'shiny-avatar' : ''}`}
                  style={avatarInvisible ? {} : { background: PROFILE_GRADIENTS.find(g => g.id === selectedGrad)?.css || '' }}
                >
                  {!avatarInvisible && (
                    <ProfileCharacter
                      char={selectedChar}
                      color={charColor}
                      size={isProfileIcon(selectedChar) ? 36 : 32}
                    />
                  )}
                </div>
              </div>
            </div>
            {/* Gradients */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Background</p>
              <div className="grid grid-cols-6 gap-2">
                {PROFILE_GRADIENTS.map(g => (
                  <button
                    key={g.id}
                    title=""
                    aria-label=""
                    onClick={() => setSelectedGrad(g.id)}
                    className={`w-10 h-10 rounded-full border-2 ${selectedGrad === g.id ? 'border-primary' : 'border-transparent'}`}
                    style={{ background: g.css }}
                  />
                ))}
              </div>
            </div>
            {/* Character color picker */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Character colour</p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={charColor}
                  onChange={e => setCharColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                  title="Pick a character colour"
                />
                <span className="text-xs text-muted-foreground font-mono">{charColor}</span>
                <button
                  onClick={() => setCharColor('#ffffff')}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Reset to white
                </button>
              </div>
            </div>
            {/* Characters — icons only, 5-per-row grid, Plants+Animals merged */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Character</p>
              <div className="grid grid-cols-5 gap-1.5">
                {PROFILE_ICONS.map(icon => (
                  <button
                    key={icon.key}
                    title=""
                    aria-label=""
                    onClick={() => setSelectedChar(icon.key)}
                    className={`w-full aspect-square rounded-lg flex items-center justify-center border-2 transition-colors ${
                      selectedChar === icon.key
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <ProfileCharacter char={icon.key} color={selectedChar === icon.key ? charColor : 'currentColor'} size={20} />
                  </button>
                ))}
              </div>
            </div>

            {/* ── Avatar Frame (Clip tier) ───────────────────────────────── */}
            {hasClip && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Avatar Frame <span className="text-xs text-primary ml-1">🖇️ Clip</span>
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* No frame */}
                  <button
                    onClick={() => setSelectedFrameColor(null)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs text-muted-foreground transition-colors ${
                      selectedFrameColor === null ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    }`}
                    title="No frame"
                  >✕</button>
                  {AVATAR_FRAME_COLORS.map(fc => (
                    <button
                      key={fc.id}
                      onClick={() => setSelectedFrameColor(fc.color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        selectedFrameColor === fc.color ? 'border-primary scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ background: fc.color }}
                      title={fc.label}
                    />
                  ))}
                </div>
                {/* Shiny frame toggle (Highlighter tier) */}
                {hasHighlighter && selectedFrameColor && (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={frameShiny}
                      onChange={e => setFrameShiny(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">Shiny frame</span>
                    <span className="text-xs text-primary">🖊️ Highlighter</span>
                  </label>
                )}
              </div>
            )}

            {/* ── Invisible Avatar (Eraser tier) ────────────────────────── */}
            {hasEraser && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Invisible Avatar <span className="text-xs text-primary ml-1">🧹 Eraser</span>
                </p>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={avatarInvisible}
                    onChange={e => setAvatarInvisible(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">Show as empty space</span>
                  <span className="text-xs text-muted-foreground">(no background, frame, or character)</span>
                </label>
              </div>
            )}

            {/* ── Shiny Avatar (Laminator tier) ─────────────────────────── */}
            {hasLaminator && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Shiny Avatar <span className="text-xs text-primary ml-1">🖨️ Laminator</span>
                </p>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={avatarShiny}
                    onChange={e => setAvatarShiny(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">Animated sheen on entire avatar</span>
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAvatar(false)}>Cancel</Button>
            <Button onClick={handleSaveAvatar}>Save avatar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share modal */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share profile</DialogTitle>
            <DialogDescription>Choose which sections to include in your Scroll snapshot. Fun fact: Scrolls follow your current applied theme!</DialogDescription>
          </DialogHeader>

          {/* Section toggles — reordered: Badges, All Time, Personal Bests */}
          <div className="flex gap-3 flex-wrap text-sm">
            {([
              { key: 'badges', label: "Badges" },
              { key: 'stats',  label: "Stats" },
              { key: 'bests',  label: "Personal bests" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setShareSections(prev => ({ ...prev, [key]: !prev[key] }))}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  shareSections[key]
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary/30 text-muted-foreground'
                }`}
              >
                {shareSections[key] ? '✓ ' : ''}{label}
              </button>
            ))}
          </div>

          {/* Snapshot preview */}
          <div className="overflow-auto max-h-[50vh] rounded-xl border border-border">
            <div
              ref={snapshotRef}
              className="p-5 space-y-4 bg-card text-foreground"
              style={{ minWidth: 320 }}
            >
              {/* Header — always shown */}
              <div className="flex items-center gap-3">
                {/* Avatar with gradient background circle */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ background: PROFILE_GRADIENTS.find(g => g.id === (profile?.profile_gradient || 'default'))?.css || 'linear-gradient(135deg,#B026FF,#00D4FF)' }}
                >
                  <ProfileCharacter char={profile?.profile_character || 'icon_leaf'} color={profile?.profile_char_color || '#fff'} size={28} />
                </div>
                <div>
                  <p className="font-bold text-base">{profile?.username || 'Flush User'}</p>
                  <p className="text-xs text-muted-foreground">Flusher since {profile?.join_date ? new Date(profile.join_date).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

              {/* Badges — 3 selected badges, emoji only */}
              {shareSections.badges && displayedBadges.length > 0 && (
                <div className="rounded-xl border border-border/60 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Badges</p>
                  <div className="flex gap-3">
                    {displayedBadges.slice(0, 3).map(name => (
                      <span key={name} className="text-2xl" title={name}>{BADGE_EMOJI[name] || '🏅'}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* All Time Stats */}
              {shareSections.stats && (
                <div className="rounded-xl border border-border/60 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">All time</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Gems earned",    value: `💎 ${profile?.total_gems_earned || 0}` },
                      { label: "Cards studied",  value: `📚 ${profile?.total_cards_studied || 0}` },
                      { label: "Longest streak", value: `🔥 ${profile?.longest_streak || 0}d` },
                      { label: "Tests taken",    value: `📝 ${profile?.total_tests_taken || 0}` },
                      { label: "Games played",   value: `🎮 ${profile?.total_games_played || 0}` },
                      { label: "Gems spent",     value: `💸 ${profile?.total_gems_spent || 0}` },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg bg-secondary/40 p-2">
                        <p className="text-sm font-semibold">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Bests */}
              {shareSections.bests && (
                <div className="rounded-xl border border-border/60 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal bests</p>
                  {[
                    { label: "Best streak", value: `${profile?.longest_streak || 0} days` },
                    { label: "Best test score", value: profile?.best_test_score_percent != null ? `${profile.best_test_score_percent}%` : 'N/A' },
                    { label: "Cards in a week", value: String(profile?.most_cards_in_week || 0) },
                  ].map((row, i, arr) => (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm py-0.5">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-semibold">{row.value}</span>
                      </div>
                      {i < arr.length - 1 && <div className="border-t border-border/40" />}
                    </div>
                  ))}
                  {(['whackacard', 'skyscraper', 'matching'] as const).map(gameType => {
                    const gameLabel: Record<string, string> = { whackacard: "Whack-a-Card", skyscraper: "Build a Skyscraper", matching: "Matching Magic" };
                    const hs = highScores.find(h => h.game_name === gameType);
                    return hs ? (
                      <div key={gameType}>
                        <div className="border-t border-border/40" />
                        <div className="flex justify-between text-sm py-0.5">
                          <span className="text-muted-foreground">{gameLabel[gameType]}</span>
                          <span className="font-semibold">{hs.high_score} pts</span>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-right">Study smart. Play hard. — Flush 💜</p>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" disabled={shareCapturing} onClick={() => captureSnapshot('copy')}>
              <Clipboard className="w-4 h-4 mr-1.5" />Copy Snapshot
            </Button>
            <Button disabled={shareCapturing} onClick={() => captureSnapshot('download')}>
              <Download className="w-4 h-4 mr-1.5" />{shareCapturing ? 'Saving…' : 'Download Snapshot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete account dialog — requires typed confirmation */}
      <Dialog open={deleteOpen} onOpenChange={v => { setDeleteOpen(v); if (!v) setDeletePhrase(''); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes all your data including decks, badges, gems, and progress. <strong>This cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              To confirm, type exactly:
            </p>
            <p className="font-mono text-sm bg-muted rounded px-3 py-2 select-all break-all">
              Delete {profile?.username || 'your_username'} forever. Confirm.
            </p>
            <Input
              value={deletePhrase}
              onChange={e => setDeletePhrase(e.target.value)}
              placeholder="Type DELETE to confirm"
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeletePhrase(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deletePhrase !== `Delete ${profile?.username || 'your_username'} forever. Confirm.`}
              onClick={() => { setDeleteOpen(false); handleDeleteAccount(); }}
            >
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Change Password Dialog */}
      <Dialog open={changePwOpen} onOpenChange={v => { setChangePwOpen(v); if (!v) { setPwError(''); setCurrentPw(''); setNewPw(''); setConfirmPw(''); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-muted-foreground">Current password</label>
              <div className="relative">
                <Input
                  type={showCurrentPw ? 'text' : 'password'}
                  placeholder="Your current password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  className="pr-10"
                />
                <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowCurrentPw(v => !v)}>
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-muted-foreground">New password</label>
              <div className="relative">
                <Input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="pr-10"
                />
                <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowNewPw(v => !v)}>
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-muted-foreground">Confirm new password</label>
              <div className="relative">
                <Input
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="Repeat the new password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }}
                  className="pr-10"
                />
                <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowConfirmPw(v => !v)}>
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setChangePwOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={pwLoading || !currentPw || !newPw || !confirmPw}>
              {pwLoading ? "Updating…" : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Email Dialog */}
      <Dialog open={addEmailOpen} onOpenChange={v => { if (!v) setAddEmailOpen(false); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Link an email</DialogTitle>
            <DialogDescription>Link an email address so you can recover your account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-sm font-normal">Email address</label>
              <Input
                type="email"
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setEmailError(''); }}
                placeholder="you@example.com"
                autoFocus
              />
            </div>
            {emailError && <p className="text-sm text-destructive flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{emailError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEmailOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEmail} disabled={emailSaving || !emailInput.trim()}>
              {emailSaving ? "Saving…" : "Link email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customise My Public Scroll Dialog */}
      <Dialog open={customiseOpen} onOpenChange={v => { if (!v) setCustomiseOpen(false); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Customise public profile</DialogTitle>
            <DialogDescription>Choose what other people can see on your public profile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {([
              { key: 'badges',       label: "Badges earned" },
              { key: 'statistics',   label: "All-time statistics" },
              { key: 'personal_bests', label: "Personal bests" },
            ] as { key: keyof typeof pubSections; label: string }[]).map(item => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer select-none min-h-10">
                <input
                  type="checkbox"
                  checked={pubSections[item.key]}
                  onChange={e => setPubSections(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-foreground">{item.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomiseOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePubSections} disabled={pubSectionsSaving}>
              {pubSectionsSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
