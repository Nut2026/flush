import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchUserSkills, fetchUserCharms,
  equipSkill, toggleEquipCharm,
  fetchDecks, deleteDeck,
  createDeck, bulkInsertFlashcards,
  checkAndAwardBadges, fetchFlashcards,
  shareDeckToUser,
  type UserSkill, type UserCharm,
} from '@/services/flush/flushService';
import { STARTER_GUEST_DECKS } from '@/services/flush/guestData';
import type { Deck, Flashcard } from '@/types/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Sparkles, BookOpen, Edit3, BowArrow, TestTube2,
  Eye, Swords, Plus, LayoutGrid, List, Loader2, Upload, FileDown,
  UserRound, Search, X, AlertTriangle,
} from 'lucide-react';
import { GuestBanner } from '@/components/common/GuestBanner';
import { parseImportFile, type ParsedCard } from '@/pages/DecksPage';

// ── Catalogs ─────────────────────────────────────────────────────────────────
const SKILL_CATALOG: Record<string, { description: string; code: string }> = {
  flash:  { code: 'S1', description: 'Next correct answer deals +5 damage.' },
  mud:    { code: 'S2', description: 'If the NEXT answer is correct, deal double damage regardless of skill chosen that turn.' },
  draft:  { code: 'S3', description: 'Sacrifice 15 HP to block the next incoming hit completely.' },
  review: { code: 'S4', description: 'Heals 10HP.' },
  cloud:  { code: 'S5', description: "Opponent's screen is swarmed by clouds, making questions barely visible for 5 seconds." },
  borrow: { code: 'S6', description: 'Randomly picks a Skill from your unequipped collection (excluding another Borrow).' },
};

const CHARM_CATALOG: Record<string, { description: string; code: string }> = {
  want: { code: 'C1', description: 'Arena: +1 damage per correct answer. Study/Test/Arcade: +1 EXP per minute.' },
  tree: { code: 'C2', description: 'Arena: Heal 3 HP per correct answer. Study/Test/Arcade: +3 EXP per question.' },
  chat: { code: 'C3', description: 'Random motivational pop-ups every 10 cards. Arena: sends pop-ups to opponent too.' },
};

const SUBJECTS = ['Math', 'Science', 'History', 'English', 'Languages', 'Tech', 'Other'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

const SUBJECT_COLORS: Record<string, string> = {
  Math: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Science: 'bg-green-500/20 text-green-400 border-green-500/30',
  History: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  English: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Languages: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Tech: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Other: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const DIFF_COLORS: Record<string, string> = {
  Beginner: 'bg-green-500/10 text-green-400 border-green-500/20',
  Intermediate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Advanced: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function ArmouryPage() {
  const { user, profile, isGuest } = useAuth();

  // ── Skills / Charms state ─────────────────────────────────────────────────
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [userCharms, setUserCharms] = useState<UserCharm[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Deck state ───────────────────────────────────────────────────────────
  const [decks, setDecks] = useState<Deck[]>([]);
  const [decksLoading, setDecksLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [guestViewDeck, setGuestViewDeck] = useState<Deck | null>(null);
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const armourySearchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'cards' | 'recent'>('recent');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [importOpen, setImportOpen] = useState(false);
  const [shareDeckOpen, setShareDeckOpen] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || isGuest) { setLoading(false); return; }
    Promise.all([
      fetchUserSkills(user.id),
      fetchUserCharms(user.id),
    ]).then(([skills, charms]) => {
      setUserSkills(skills);
      setUserCharms(charms);
    }).finally(() => setLoading(false));
  }, [user, isGuest]);

  const loadDecks = async () => {
    if (isGuest) {
      const raw = sessionStorage.getItem('guest_decks');
      setDecks(raw ? JSON.parse(raw) : STARTER_GUEST_DECKS);
      setDecksLoading(false);
      return;
    }
    if (!user) return;
    setDecksLoading(true);
    try {
      const data = await fetchDecks(user.id);
      setDecks(data);
    } catch { toast.error('Failed to load decks'); }
    finally { setDecksLoading(false); }
  };

  useEffect(() => { loadDecks(); }, [user, isGuest]);

  // ── Skills equip ──────────────────────────────────────────────────────────
  const handleSkillEquipToggle = async (skill: UserSkill) => {
    if (!user) return;
    const isEquipped = skill.equipped_slot !== null;
    if (isEquipped) {
      await equipSkill(user.id, skill.id, null);
    } else {
      const equippedCount = userSkills.filter(s => s.equipped_slot !== null).length;
      if (equippedCount >= 4) { toast.error('You can only equip 4 Skills at once.'); return; }
      const nextSlot = [1, 2, 3, 4].find(s => !userSkills.some(sk => sk.equipped_slot === s)) ?? 1;
      await equipSkill(user.id, skill.id, nextSlot);
    }
    const updated = await fetchUserSkills(user.id);
    setUserSkills(updated);
    const skillLabel = skill.skill_name.charAt(0).toUpperCase() + skill.skill_name.slice(1);
    toast.success(isEquipped ? `${skillLabel} Skill unequipped.` : `${skillLabel} Skill equipped!`);
  };

  const handleCharmEquipToggle = async (charm: UserCharm) => {
    if (!user) return;
    const isEquipped = charm.is_equipped;
    if (!isEquipped) {
      const equippedCount = userCharms.filter(c => c.is_equipped).length;
      if (equippedCount >= 2) { toast.error('You can only equip 2 Charms at once.'); return; }
    }
    await toggleEquipCharm(user.id, charm.id, !isEquipped);
    const updated = await fetchUserCharms(user.id);
    setUserCharms(updated);
    const charmLabel = charm.charm_name.charAt(0).toUpperCase() + charm.charm_name.slice(1);
    toast.success(isEquipped ? `${charmLabel} Charm unequipped.` : `${charmLabel} Charm equipped!`);
  };

  // ── Deck delete ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    const deckToDelete = decks.find(d => d.id === deleteId);
    if (!deckToDelete) { setDeleteId(null); return; }
    setDecks(prev => prev.filter(d => d.id !== deleteId));
    setDeleteId(null);
    if (isGuest) {
      const updated = decks.filter(d => d.id !== deckToDelete.id);
      sessionStorage.setItem('guest_decks', JSON.stringify(updated));
      toast.success("Deck deleted.");
      return;
    }
    const id = deckToDelete.id;
    toast.success("Deck deleted.", {
      action: {
        label: 'Undo',
        onClick: () => {
          if (deleteTimers.current[id]) { clearTimeout(deleteTimers.current[id]); delete deleteTimers.current[id]; }
          setDecks(prev => prev.find(d => d.id === id) ? prev : [deckToDelete, ...prev]);
        },
      },
      duration: 5000,
    });
    deleteTimers.current[id] = setTimeout(async () => {
      delete deleteTimers.current[id];
      try { await deleteDeck(id); }
      catch { toast.error("Deck deleted."); setDecks(prev => prev.find(d => d.id === id) ? prev : [deckToDelete, ...prev]); }
    }, 5000);
  };

  const equippedSkills = userSkills.filter(s => s.equipped_slot !== null);
  const unequippedSkills = userSkills.filter(s => s.equipped_slot === null);
  const equippedCharms = userCharms.filter(c => c.is_equipped);
  const unequippedCharms = userCharms.filter(c => !c.is_equipped);

  const totalCards = decks.reduce((s, d) => s + (d.flashcard_count || 0), 0);
  const filteredDecks = decks
    .filter(d => {
      const matchSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSubject = filterSubject === 'all' || d.subject === filterSubject;
      const matchDiff = filterDifficulty === 'all' || d.difficulty === filterDifficulty;
      return matchSearch && matchSubject && matchDiff;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'cards') return (b.flashcard_count || 0) - (a.flashcard_count || 0);
      return 0;
    });

  // ── Guest view ─────────────────────────────────────────────────────────────
  if (isGuest) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Armoury</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your Skills, Charms, and Decks.</p>
        </div>
        <GuestBanner message="Sign up or log in to access your Armoury!" />
      </div>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Armoury</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your Skills, Charms, and Decks.</p>
      </div>

      {/* ── Skills ─────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />Skills
            <span className="text-xs font-normal text-muted-foreground ml-1">{equippedSkills.length}/4 equipped</span>
          </h2>
        </div>

        {userSkills.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">You don't own any Skills yet. Head to Trade to get some.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {equippedSkills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Equipped</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {equippedSkills.sort((a, b) => (a.equipped_slot ?? 0) - (b.equipped_slot ?? 0)).map(skill => (
                    <SkillCard key={skill.id} skill={skill} isEquipped onToggle={() => handleSkillEquipToggle(skill)} />
                  ))}
                </div>
              </div>
            )}
            {unequippedSkills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Unequipped</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {unequippedSkills.map(skill => (
                    <SkillCard key={skill.id} skill={skill} isEquipped={false} canEquip={equippedSkills.length < 4} onToggle={() => handleSkillEquipToggle(skill)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Separator />

      {/* ── Charms ─────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />Charms
            <span className="text-xs font-normal text-muted-foreground ml-1">{equippedCharms.length}/2 equipped</span>
          </h2>
        </div>

        {userCharms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">You don't own any Charms yet. Head to Trade to get some.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {equippedCharms.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Equipped</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {equippedCharms.map(charm => (
                    <CharmCard key={charm.id} charm={charm} isEquipped onToggle={() => handleCharmEquipToggle(charm)} />
                  ))}
                </div>
              </div>
            )}
            {unequippedCharms.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Unequipped</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {unequippedCharms.map(charm => (
                    <CharmCard key={charm.id} charm={charm} isEquipped={false} canEquip={equippedCharms.length < 2} onToggle={() => handleCharmEquipToggle(charm)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Separator />

      {/* ── My Decks (full management) ────────────────────────────────────── */}
      <section className="space-y-4">
        {/* Deck header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />My Decks
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{decks.length} decks · {totalCards} cards</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <FileDown className="w-4 h-4 mr-1.5" />Import deck
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShareDeckOpen(true)}>
              <UserRound className="w-4 h-4 mr-1.5" />Share deck
            </Button>
            <Button size="sm" asChild>
              <Link to="/decks/new"><Plus className="w-4 h-4 mr-1.5" />Create deck</Link>
            </Button>
            <div className="flex border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-secondary'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-secondary'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        {decks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                ref={armourySearchRef}
                placeholder="Search decks…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 rounded-full text-sm bg-secondary/40 border-border/50 focus:bg-background"
              />
              {searchQuery && (
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => { setSearchQuery(''); setTimeout(() => armourySearchRef.current?.focus(), 0); }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="h-9 w-auto min-w-[130px] rounded-full text-sm bg-secondary/40 border-border/50">
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-full text-sm bg-secondary/40 border-border/50">
                <SelectValue placeholder="All difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={v => setSortBy(v as 'title' | 'cards' | 'recent')}>
              <SelectTrigger className="h-9 w-auto min-w-[130px] rounded-full text-sm bg-secondary/40 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="title">A → Z</SelectItem>
                <SelectItem value="cards">Most cards</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Deck list/grid */}
        {decksLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 bg-muted" />)}
          </div>
        ) : decks.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <BookOpen className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm text-center">No decks yet. Create your first one to get started.</p>
              <Button asChild><Link to="/decks/new">Create deck</Link></Button>
            </CardContent>
          </Card>
        ) : filteredDecks.length === 0 ? (
          <div className="py-16 flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center">Deck return void. Why not create a new deck with these unique filters?</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDecks.map(deck => (
              <ArmouryDeckCard key={deck.id} deck={deck} onDelete={() => setDeleteId(deck.id)} isGuest={isGuest} onGuestView={() => setGuestViewDeck(deck)} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDecks.map(deck => (
              <ArmouryDeckListItem key={deck.id} deck={deck} onDelete={() => setDeleteId(deck.id)} isGuest={isGuest} onGuestView={() => setGuestViewDeck(deck)} />
            ))}
          </div>
        )}
      </section>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{`Delete “${decks.find(d => d.id === deleteId)?.title ?? ''}”?`}</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the deck and all of its cards.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep deck</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete deck
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Guest Deck Viewer */}
      <ArmouryGuestDeckViewer deck={guestViewDeck} onClose={() => setGuestViewDeck(null)} />

      {/* Import Deck */}
      <ArmouryImportModal open={importOpen} onClose={() => setImportOpen(false)} userId={user?.id ?? ''} existingDecks={decks} onSaved={loadDecks} />

      {/* Share Deck */}
      <ArmouryShareModal open={shareDeckOpen} onClose={() => setShareDeckOpen(false)} userId={user?.id ?? ''} username={profile?.username ?? ''} decks={decks} />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkillCard({
  skill, isEquipped, canEquip = true, onToggle,
}: {
  skill: UserSkill;
  isEquipped: boolean;
  canEquip?: boolean;
  onToggle: () => void;
}) {
  const info = SKILL_CATALOG[skill.skill_name] ?? { description: '', code: '' };
  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-2 transition-all ${
      isEquipped ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {info.code && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/30 rounded px-1.5 py-0.5">{info.code}</span>
            )}
            <span className="text-sm font-semibold text-foreground capitalize">{skill.skill_name}</span>
            {isEquipped && (
              <Badge className="text-xs bg-primary/20 text-primary border-primary/30 h-4">Slot {skill.equipped_slot}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{info.description}</p>
        </div>
      </div>
      <Button
        size="sm"
        variant={isEquipped ? 'secondary' : 'outline'}
        className="h-7 text-xs w-full"
        disabled={!isEquipped && !canEquip}
        onClick={onToggle}
        title={!isEquipped && !canEquip ? 'Unequip a Skill first (max 4)' : undefined}
      >
        {isEquipped ? 'Unequip' : canEquip ? 'Equip' : 'Slots full (4/4)'}
      </Button>
    </div>
  );
}

function CharmCard({
  charm, isEquipped, canEquip = true, onToggle,
}: {
  charm: UserCharm;
  isEquipped: boolean;
  canEquip?: boolean;
  onToggle: () => void;
}) {
  const info = CHARM_CATALOG[charm.charm_name] ?? { description: '', code: '' };
  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-2 transition-all ${
      isEquipped ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {info.code && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/30 rounded px-1.5 py-0.5">{info.code}</span>
            )}
            <span className="text-sm font-semibold text-foreground capitalize">{charm.charm_name}</span>
            {isEquipped && (
              <Badge className="text-xs bg-primary/20 text-primary border-primary/30 h-4">Active ✦</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{info.description}</p>
        </div>
      </div>
      <Button
        size="sm"
        variant={isEquipped ? 'secondary' : 'outline'}
        className="h-7 text-xs w-full"
        disabled={!isEquipped && !canEquip}
        onClick={onToggle}
        title={!isEquipped && !canEquip ? 'Unequip a Charm first (max 2)' : undefined}
      >
        {isEquipped ? 'Unequip' : canEquip ? 'Equip' : 'Slots full (2/2)'}
      </Button>
    </div>
  );
}

// ── Deck sub-components ───────────────────────────────────────────────────────

interface DeckSubProps { deck: Deck; onDelete: () => void; isGuest: boolean; onGuestView: () => void; }

function ArmouryDeckCard({ deck, isGuest, onGuestView }: DeckSubProps) {
  const navigate = useNavigate();
  const subjectColor = SUBJECT_COLORS[deck.subject] ?? SUBJECT_COLORS['Other'];
  return (
    <div
      className="group relative rounded-xl border border-border bg-card p-5 flex flex-col gap-3 h-full hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/decks/${deck.id}/view`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-base truncate text-balance">{deck.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{deck.flashcard_count ?? 0} cards · {deck.difficulty}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${subjectColor}`}>
          {deck.subject}
        </span>
      </div>
      <div className="mt-auto flex gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
        {isGuest ? (
          <>
            <Link to={`/decks/${deck.id}/study`} className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors">
              <BookOpen className="w-3.5 h-3.5" /> Study
            </Link>
            <Link to={`/decks/${deck.id}/test`} className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium transition-colors">
              <TestTube2 className="w-3.5 h-3.5" /><span className="hidden sm:inline ml-1">Test</span>
            </Link>
            <Link to={`/arcade/${deck.id}`} className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium transition-colors">
              <BowArrow className="w-3.5 h-3.5" /><span className="hidden sm:inline ml-1">Games</span>
            </Link>
            <button onClick={onGuestView} className="flex items-center justify-center text-xs px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Eye className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <Link to={`/decks/${deck.id}/study`} className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors">
              <BookOpen className="w-3.5 h-3.5" /> Study
            </Link>
            <Link to={`/decks/${deck.id}/test`} className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium transition-colors">
              <TestTube2 className="w-3.5 h-3.5" /><span className="hidden sm:inline ml-1">Test</span>
            </Link>
            <Link to={`/arcade/${deck.id}`} className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium transition-colors">
              <BowArrow className="w-3.5 h-3.5" /><span className="hidden sm:inline ml-1">Games</span>
            </Link>
            <Link to={`/decks/${deck.id}/edit`} className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium transition-colors">
              <Edit3 className="w-3.5 h-3.5" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function ArmouryDeckListItem({ deck, isGuest, onGuestView }: DeckSubProps) {
  const navigate = useNavigate();
  const subjectColor = SUBJECT_COLORS[deck.subject] ?? SUBJECT_COLORS['Other'];
  const diffColor = DIFF_COLORS[deck.difficulty] ?? DIFF_COLORS['Intermediate'];
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => navigate(`/decks/${deck.id}/view`)}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{deck.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${subjectColor}`}>{deck.subject}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${diffColor}`}>{deck.difficulty}</span>
          <span className="text-xs text-muted-foreground">{deck.flashcard_count ?? 0} cards</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        {isGuest ? (
          <>
            <Link to={`/decks/${deck.id}/study`} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors">
              <BookOpen className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1">Study</span>
            </Link>
            <Link to={`/decks/${deck.id}/test`} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <TestTube2 className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1">Test</span>
            </Link>
            <Link to={`/arcade/${deck.id}`} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <BowArrow className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1">Games</span>
            </Link>
            <button onClick={onGuestView} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Eye className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <Link to={`/decks/${deck.id}/study`} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors">
              <BookOpen className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1">Study</span>
            </Link>
            <Link to={`/decks/${deck.id}/test`} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <TestTube2 className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1">Test</span>
            </Link>
            <Link to={`/arcade/${deck.id}`} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <BowArrow className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1">Games</span>
            </Link>
            <Link to={`/decks/${deck.id}/edit`} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Edit3 className="w-3.5 h-3.5" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function ArmouryGuestDeckViewer({ deck, onClose }: { deck: Deck | null; onClose: () => void }) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!deck) return;
    setLoading(true);
    fetchFlashcards(deck.id).then(c => { setCards(c); setLoading(false); });
  }, [deck?.id]);
  if (!deck) return null;
  return (
    <Dialog open={!!deck} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg flex flex-col max-h-[90dvh]">
        <DialogHeader className="shrink-0"><DialogTitle className="truncate">{deck.title}</DialogTitle></DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 space-y-2 py-2 pr-1">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : cards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">This deck has no cards yet.</p>
          ) : cards.map((c, i) => (
            <div key={c.id} className="p-3 rounded-lg border border-border bg-secondary/30 space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Card {i + 1}</p>
              <p className="text-sm font-medium text-foreground">{c.front_text}</p>
              <p className="text-sm text-muted-foreground">{c.back_text}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArmouryImportModal({ open, onClose, userId, existingDecks, onSaved }: {
  open: boolean; onClose: () => void; userId: string; existingDecks: Deck[]; onSaved: () => void;
}) {
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Other');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [parsedCards, setParsedCards] = useState<ParsedCard[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setStep('form'); setTitle(''); setSubject('Other'); setDifficulty('Beginner'); setFile(null); setFileError(''); setParsedCards([]); if (fileRef.current) fileRef.current.value = ''; };
  const handleClose = () => { reset(); onClose(); };

  const handleParse = async () => {
    if (!title.trim()) { toast.error("Give the deck a title first."); return; }
    if (existingDecks.some(d => d.title.toLowerCase() === title.trim().toLowerCase())) { toast.error('A deck with this title already exists.'); return; }
    if (!file) { toast.error("Choose a file to import."); return; }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['csv', 'json'].includes(ext)) { setFileError("Only .csv and .json files are supported."); return; }
    try {
      const text = await file.text();
      const cards = parseImportFile(text, ext);
      if (cards.length === 0) throw new Error("No cards found in that file.");
      setParsedCards(cards); setStep('preview');
    } catch (e: any) { setFileError(e.message || 'Failed to parse file.'); }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const deck = await createDeck(userId, title.trim(), subject, difficulty);
      await bulkInsertFlashcards(deck.id, parsedCards.map((c, i) => ({ front: c.front, back: c.back, notes: c.notes ?? '', sortOrder: i })));
      await checkAndAwardBadges(userId, [], { totalCards: parsedCards.length });
      toast.success("Import a deck" + ': ' + title.trim());
      onSaved(); handleClose();
    } catch { toast.error("Could not save the imported deck."); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg flex flex-col max-h-[90dvh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>{step === 'form' ? "Import a deck" : `Preview · ${parsedCards.length} cards found`}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 pr-1">
          {step === 'form' ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Deck title <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Biology Chapter 3" value={title} onChange={e => setTitle(e.target.value)} maxLength={60} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal">Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal">Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">File (CSV or JSON) <span className="text-destructive">*</span></Label>
                <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={e => { setFile(e.target.files?.[0] ?? null); setFileError(''); }} />
                {file ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary/30 text-sm">
                    <Upload className="w-4 h-4 text-primary shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-foreground">{file.name}</span>
                    <button onClick={() => { setFile(null); setFileError(''); if (fileRef.current) fileRef.current.value = ''; }} className="shrink-0 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Choose file
                  </Button>
                )}
                {fileError && <p className="text-xs text-destructive">{fileError}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">Review the cards below before adding them to your deck.</p>
              {parsedCards.map((card, i) => (
                <div key={i} className="p-3 rounded-md border border-border bg-secondary/30 space-y-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Front</p>
                    <Textarea value={card.front} onChange={e => setParsedCards(prev => prev.map((c, j) => j === i ? { ...c, front: e.target.value } : c))} rows={2} className="resize-none text-sm" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Back</p>
                    <Textarea value={card.back} onChange={e => setParsedCards(prev => prev.map((c, j) => j === i ? { ...c, back: e.target.value } : c))} rows={2} className="resize-none text-sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="shrink-0 pt-2 border-t border-border gap-2">
          {step === 'form' ? (
            <><Button variant="outline" onClick={handleClose}>Cancel</Button><Button onClick={handleParse}>Preview cards</Button></>
          ) : (
            <><Button variant="outline" onClick={() => setStep('form')}>Back</Button><Button onClick={handleSave} disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</> : "Import deck"}</Button></>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArmouryShareModal({ open, onClose, userId, username, decks }: {
  open: boolean; onClose: () => void; userId: string; username: string; decks: Deck[];
}) {
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setSelectedDeckId(''); setRecipientUsername(''); setMessage(''); setSending(false); setError(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSend = async () => {
    if (!selectedDeckId) { setError("Deck"); return; }
    if (!recipientUsername.trim()) { setError("Enter a username."); return; }
    const deck = decks.find(d => d.id === selectedDeckId);
    if (!deck) return;
    setSending(true); setError('');
    const { error: err } = await shareDeckToUser(userId, username, deck.id, deck.title, recipientUsername.trim(), message.trim() || undefined);
    setSending(false);
    if (err) { setError(err); return; }
    toast.success(`Deck "${deck.title}" shared with ${recipientUsername.trim()}!`);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserRound className="w-4 h-4 text-primary" />Share this deck</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <p className="text-xs text-muted-foreground">Send a copy of this deck to another Flush user.</p>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">Deck</Label>
            <Select value={selectedDeckId} onValueChange={v => { setSelectedDeckId(v); setError(''); }}>
              <SelectTrigger><SelectValue placeholder="Choose a deck" /></SelectTrigger>
              <SelectContent>
                {decks.length === 0
                  ? <div className="py-4 text-center text-xs text-muted-foreground">No decks available.</div>
                  : decks.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">Recipient username</Label>
            <Input value={recipientUsername} onChange={e => { setRecipientUsername(e.target.value); setError(''); }} placeholder="e.g. studybuddy" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">Message <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a note for the recipient…" rows={3} maxLength={300} className="resize-none" />
          </div>
          {error && <p className="text-sm text-destructive flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending}>{sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : "Send deck"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
