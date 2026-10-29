import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchDecks, deleteDeck,
  createDeck, bulkInsertFlashcards,
  checkAndAwardBadges, fetchFlashcards,
  shareDeckToUser
} from '@/services/flush/flushService';
import { STARTER_GUEST_DECKS } from '@/services/flush/guestData';
import type { Deck, Flashcard } from '@/types/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Plus, Edit3, BookOpen, BowArrow, TestTube2,
  LayoutGrid, List, Loader2, Eye, Upload, FileDown, X,
  Search, AlertTriangle, UserRound
} from 'lucide-react';
import { GuestBanner } from '@/components/common/GuestBanner';
import { GuestGate } from '@/components/common/GuestGate';

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


// ─── Sub-components ──────────────────────────────────────────────────────────

interface DeckSubProps {
  deck: Deck;
  onDelete: () => void;
  isGuest: boolean;
  onGuestView: () => void;
}

function DeckCard({ deck, isGuest, onGuestView }: DeckSubProps) {
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
            <button onClick={onGuestView} className="flex items-center justify-center text-xs px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" title="View deck">
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

function DeckListItem({ deck, isGuest, onGuestView }: DeckSubProps) {
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
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${subjectColor}`}>
            {deck.subject}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${diffColor}`}>
            {deck.difficulty}
          </span>
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
            <button onClick={onGuestView} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" title="View deck">
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

interface GuestDeckViewerProps { deck: Deck | null; onClose: () => void; }
function GuestDeckViewer({ deck, onClose }: GuestDeckViewerProps) {
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
        <DialogHeader className="shrink-0">
          <DialogTitle className="truncate">{deck.title}</DialogTitle>
        </DialogHeader>
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DecksPage() {
  const { user, profile, isGuest } = useAuth();

  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [guestViewDeck, setGuestViewDeck] = useState<Deck | null>(null);
  // Undo-delete: pending timer refs keyed by deck id
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const decksSearchRef = useRef<HTMLInputElement>(null);

  // Search, sort, filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'cards' | 'recent'>('recent');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  // Import Deck Modal
  const [importOpen, setImportOpen] = useState(false);
  // Share Deck Modal
  const [shareDeckOpen, setShareDeckOpen] = useState(false);

  const loadDecks = async () => {
    if (isGuest) {
      const raw = sessionStorage.getItem('guest_decks');
      setDecks(raw ? JSON.parse(raw) : STARTER_GUEST_DECKS);
      setLoading(false);
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchDecks(user.id);
      setDecks(data);
    } catch (err) {
      toast.error('Failed to load decks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDecks(); }, [user, isGuest]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const deckToDelete = decks.find(d => d.id === deleteId);
    if (!deckToDelete) { setDeleteId(null); return; }

    // Optimistically remove from UI
    setDecks(prev => prev.filter(d => d.id !== deleteId));
    setDeleteId(null);

    if (isGuest) {
      const updated = decks.filter(d => d.id !== deckToDelete.id);
      sessionStorage.setItem('guest_decks', JSON.stringify(updated));
      toast.success("Deck deleted.", {
        action: {
          label: 'Undo',
          onClick: () => {
            setDecks(prev => [deckToDelete, ...prev]);
            sessionStorage.setItem('guest_decks', JSON.stringify([deckToDelete, ...decks.filter(d => d.id !== deckToDelete.id)]));
          },
        },
      });
      return;
    }

    const id = deckToDelete.id;
    toast.success("Deck deleted.", {
      action: {
        label: 'Undo',
        onClick: () => {
          // Cancel pending DB delete
          if (deleteTimers.current[id]) {
            clearTimeout(deleteTimers.current[id]);
            delete deleteTimers.current[id];
          }
          setDecks(prev => {
            if (prev.find(d => d.id === id)) return prev;
            return [deckToDelete, ...prev];
          });
        },
      },
      duration: 5000,
    });

    // Delay actual DB delete by 5s so user can undo
    deleteTimers.current[id] = setTimeout(async () => {
      delete deleteTimers.current[id];
      try {
        await deleteDeck(id);
      } catch {
        // Restore on failure
        toast.error("Deck deleted.");
        setDecks(prev => {
          if (prev.find(d => d.id === id)) return prev;
          return [deckToDelete, ...prev];
        });
      }
    }, 5000);
  };

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


  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Guest banner */}
      {isGuest && <GuestBanner message="You are browsing as a guest. Sign up to keep your decks in the cloud." className="mb-6" />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">My Decks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{decks.length} decks - {totalCards} cards</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isGuest ? (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <FileDown className="w-4 h-4 mr-1.5" />
              Import deck
            </Button>
          ) : (
            <GuestGate feature="Import deck">
              <Button variant="outline" size="sm" onClick={() => {}}>
                <FileDown className="w-4 h-4 mr-1.5" />
                Import deck
              </Button>
            </GuestGate>
          )}
          {!isGuest && (
            <Button variant="outline" size="sm" onClick={() => setShareDeckOpen(true)}>
              <UserRound className="w-4 h-4 mr-1.5" />
              Share deck
            </Button>
          )}
          {!isGuest ? (
            <Button size="sm" asChild>
              <Link to="/decks/new">
                <Plus className="w-4 h-4 mr-1.5" />
                Create deck
              </Link>
            </Button>
          ) : (
            <GuestGate feature="Create deck">
              <Button size="sm" onClick={() => {}}>
                <Plus className="w-4 h-4 mr-1.5" />
                Create deck
              </Button>
            </GuestGate>
          )}
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

      {/* No card-count limit warning any more */}

      {/* Search & Filter Bar */}
      {!isGuest && decks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              ref={decksSearchRef}
              placeholder="Search decks…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 rounded-full text-sm bg-secondary/40 border-border/50 focus:bg-background"
            />
            {searchQuery && (
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearchQuery(''); setTimeout(() => decksSearchRef.current?.focus(), 0); }}
                aria-label="Clear search"
              >
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
              {SUBJECTS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-full text-sm bg-secondary/40 border-border/50">
              <SelectValue placeholder="All difficulties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All difficulties</SelectItem>
              {DIFFICULTIES.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
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

      {/* Deck grid/list */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 bg-muted" />)}
        </div>
      ) : decks.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <BookOpen className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-center">No decks yet. Create your first one to get started.</p>
            <Button asChild><Link to="/decks/new">Create deck</Link></Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDecks.map(deck => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onDelete={() => setDeleteId(deck.id)}
              isGuest={isGuest}
              onGuestView={() => setGuestViewDeck(deck)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDecks.map(deck => (
            <DeckListItem
              key={deck.id}
              deck={deck}
              onDelete={() => setDeleteId(deck.id)}
              isGuest={isGuest}
              onGuestView={() => setGuestViewDeck(deck)}
            />
          ))}
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{`Delete “${decks.find(d => d.id === deleteId)?.title ?? ''}”?`}</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the deck and all of its cards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep deck</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete deck
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Guest Read-Only Deck Viewer */}
      <GuestDeckViewer deck={guestViewDeck} onClose={() => setGuestViewDeck(null)} />

      {/* Import Deck Modal */}
      <ImportDeckModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        userId={user?.id ?? ''}
        existingDecks={decks}
        onSaved={loadDecks}
      />
      {/* Share Deck Modal */}
      <ShareDeckModal
        open={shareDeckOpen}
        onClose={() => setShareDeckOpen(false)}
        userId={user?.id ?? ''}
        username={profile?.username ?? ''}
        decks={decks}
      />
    </div>
  );
}

// ─── CSV/JSON Parser (shared utility) ────────────────────────────────────────

export interface ParsedCard { front: string; back: string; notes: string }

const FRONT_ALIASES = ['front', 'question', 'q', 'ques'];
const BACK_ALIASES  = ['back', 'answer', 'a', 'ans'];
const NOTES_ALIASES = ['notes', 'note', 'hint', 'explanation'];

function resolveCol(headers: string[], aliases: string[]): number {
  return headers.findIndex(h => aliases.includes(h.toLowerCase().trim()));
}

export function parseImportFile(content: string, ext: string): ParsedCard[] {
  if (ext === 'json') {
    const raw = JSON.parse(content);
    // Support flat array OR nested object with common keys
    let arr: unknown[];
    if (Array.isArray(raw)) {
      arr = raw;
    } else if (typeof raw === 'object' && raw !== null) {
      const nested = (raw as any).flashcards ?? (raw as any).cards ?? (raw as any).data ?? (raw as any).items;
      arr = Array.isArray(nested) ? nested : Object.values(raw as object);
    } else {
      arr = [];
    }
    return arr.map((r: any) => {
      const keys = Object.keys(r).map(k => k.toLowerCase().trim());
      const get = (aliases: string[]) => {
        const k = Object.keys(r).find(k => aliases.includes(k.toLowerCase().trim()));
        return k ? String(r[k] ?? '') : '';
      };
      void keys;
      return { front: get(FRONT_ALIASES), back: get(BACK_ALIASES), notes: get(NOTES_ALIASES) };
    }).filter(c => c.front.trim() && c.back.trim());
  }
  // CSV
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const parseRow = (line: string) => {
    const cells: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQ) { inQ = true; continue; }
      if (ch === '"' && inQ && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"' && inQ) { inQ = false; continue; }
      if (ch === ',' && !inQ) { cells.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur);
    return cells;
  };
  const headers = parseRow(lines[0]);
  const fi = resolveCol(headers, FRONT_ALIASES);
  const bi = resolveCol(headers, BACK_ALIASES);
  const ni = resolveCol(headers, NOTES_ALIASES);
  if (fi === -1 || bi === -1) throw new Error('Could not detect front/back columns. Ensure headers include front/question and back/answer.');
  return lines.slice(1).map(l => {
    const cells = parseRow(l);
    return {
      front: (cells[fi] ?? '').trim(),
      back:  (cells[bi] ?? '').trim(),
      notes: ni !== -1 ? (cells[ni] ?? '').trim() : '',
    };
  }).filter(c => c.front && c.back);
}

// ─── Import Deck Modal ────────────────────────────────────────────────────────

function ImportDeckModal({ open, onClose, userId, existingDecks, onSaved }: {
  open: boolean; onClose: () => void; userId: string;
  existingDecks: Deck[]; onSaved: () => void;
}) {
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Other');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [parsedCards, setParsedCards] = useState<ParsedCard[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('form'); setTitle(''); setSubject('Other'); setDifficulty('Beginner');
    setFile(null); setFileError(''); setParsedCards([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFileChange = (f: File | null) => {
    setFile(f); setFileError('');
  };

  const handleParse = async () => {
    if (!title.trim()) { toast.error("Give the deck a title first."); return; }
    const titleLower = title.trim().toLowerCase();
    const duplicate = existingDecks.some(d => d.title.toLowerCase() === titleLower);
    if (duplicate) { toast.error("Deck deleted."); return; }
    if (!file) { toast.error("Choose a file to import."); return; }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['csv', 'json'].includes(ext)) { setFileError("Only .csv and .json files are supported."); return; }
    try {
      const text = await file.text();
      const cards = parseImportFile(text, ext);
      if (cards.length === 0) throw new Error("No cards found in that file.");
      setParsedCards(cards);
      setStep('preview');
    } catch (e: any) { setFileError(e.message || 'Failed to parse file.'); }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const deck = await createDeck(userId, title.trim(), subject, difficulty);
      await bulkInsertFlashcards(deck.id, parsedCards.map((c, i) => ({
        front: c.front, back: c.back, notes: c.notes ?? '', sortOrder: i,
      })));
      await checkAndAwardBadges(userId, [], { totalCards: parsedCards.length });
      toast.success("Import a deck" + ': ' + title.trim());
      onSaved();
      handleClose();
    } catch (e: any) {
      console.error('Import save error:', e);
      toast.error("Could not save the imported deck.");
    } finally { setSaving(false); }
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
                <input ref={fileRef} type="file" accept=".csv,.json" className="hidden"
                  onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
                {file ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary/30 text-sm">
                    <Upload className="w-4 h-4 text-primary shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-foreground">{file.name}</span>
                    <button onClick={() => { setFile(null); setFileError(''); if (fileRef.current) fileRef.current.value = ''; }} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Remove">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Choose file
                  </Button>
                )}
                {fileError && <p className="text-xs text-destructive">{fileError}</p>}
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Accepted column headers (case-insensitive):</p>
                <p>Front: <span className="font-mono">front, question, q, ques</span></p>
                <p>Back: <span className="font-mono">back, answer, a, ans</span></p>
                <p>Notes: <span className="font-mono">notes, note, hint, explanation</span> (optional)</p>
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
                  {card.notes && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Notes</p>
                      <Textarea value={card.notes} onChange={e => setParsedCards(prev => prev.map((c, j) => j === i ? { ...c, notes: e.target.value } : c))} rows={1} className="resize-none text-sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="shrink-0 pt-2 border-t border-border gap-2">
          {step === 'form' ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParse}>Preview cards</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('form')}>Back</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</> : "Import deck"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Share Deck Modal ─────────────────────────────────────────────────────────
function ShareDeckModal({
  open, onClose, userId, username, decks,
}: {
  open: boolean; onClose: () => void;
  userId: string; username: string; decks: Deck[];
}) {
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setSelectedDeckId(''); setRecipientUsername(''); setMessage(''); setSending(false); setError('');
  };
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
    toast.success(`Deck "${deck.title}" shared with ${recipientUsername.trim()}!`, { position: 'top-right' });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="w-4 h-4 text-primary" /> Share this deck
          </DialogTitle>
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
                  : decks.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">Recipient username</Label>
            <Input
              value={recipientUsername}
              onChange={e => { setRecipientUsername(e.target.value); setError(''); }}
              placeholder="e.g. studybuddy"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">Message <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={message}
              onChange={e => { setMessage(e.target.value); }}
              placeholder="Add a note for the recipient…"
              rows={3}
              maxLength={300}
              className="resize-none"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : "Send deck"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
