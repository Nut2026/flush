import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchDeck, fetchFlashcards, reorderFlashcards } from '@/services/flush/flushService';
import { STARTER_GUEST_DECKS } from '@/services/flush/guestData';
import type { Deck, Flashcard } from '@/types/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Lock, GripVertical, Eye, Search, X, BookOpen, TestTube2, BowArrow, Edit3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GuestGate } from '@/components/common/GuestGate';
import { VirtualCardList } from '@/components/common/VirtualCardList';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SUBJECT_COLORS: Record<string, string> = {
  Math: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Science: 'bg-green-500/20 text-green-400 border-green-500/30',
  English: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Languages: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Tech: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Other: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};
const DIFF_COLORS: Record<string, string> = {
  Beginner: 'bg-green-500/10 text-green-400 border-green-500/30',
  Intermediate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  Advanced: 'bg-red-500/10 text-red-400 border-red-500/30',
};

// ── Sortable flashcard row ──────────────────────────────────────────────────
function SortableCard({
  card,
  idx,
  locked,
  onClick,
}: {
  card: Flashcard;
  idx: number;
  locked: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: locked,
  });
  const { enterContext } = useTheme();
  useEffect(() => enterContext('deck'), []);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="flex gap-3 items-start">
            {/* drag handle */}
            <button
              {...attributes}
              {...listeners}
              className={`mt-0.5 shrink-0 ${locked ? 'opacity-30 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground'}`}
              aria-label="Drag to reorder"
              tabIndex={locked ? -1 : 0}
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground w-5 shrink-0 mt-0.5">{idx + 1}.</span>
            {/* clickable content area */}
            <button
              className="flex-1 min-w-0 grid grid-cols-2 gap-3 text-left"
              onClick={onClick}
              aria-label={`View card ${idx + 1}`}
            >
              <div className="hover:bg-secondary/40 rounded px-1 -mx-1 py-1 transition-colors">
                <p className="text-xs text-muted-foreground mb-0.5">Front</p>
                <p className="text-sm text-foreground text-pretty">{card.front_text}</p>
              </div>
              <div className="hover:bg-secondary/40 rounded px-1 -mx-1 py-1 transition-colors">
                <p className="text-xs text-muted-foreground mb-0.5">Back</p>
                <p className="text-sm text-foreground text-pretty">{card.back_text}</p>
              </div>
              {card.notes && (
                <div className="col-span-2 hover:bg-secondary/40 rounded px-1 -mx-1 py-1 transition-colors">
                  <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                  <p className="text-sm text-foreground text-pretty">{card.notes}</p>
                </div>
              )}
            </button>
            <Eye className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ViewDeckPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [modalCard, setModalCard] = useState<Flashcard | null>(null);
  const [cardSearch, setCardSearch] = useState('');
  const cardSearchRef = useRef<HTMLInputElement>(null);

  const filteredCards = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(c =>
      c.front_text.toLowerCase().includes(q) ||
      c.back_text.toLowerCase().includes(q) ||
      (c.notes ?? '').toLowerCase().includes(q)
    );
  }, [cards, cardSearch]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!deckId) return;
    const load = async () => {
      setLoading(true);
      try {
        // Guest: load from local STARTER_GUEST_DECKS instead of DB
        if (isGuest || deckId.startsWith('guest-')) {
          const guestDeck = STARTER_GUEST_DECKS.find(d => d.id === deckId);
          if (guestDeck) {
            setDeck(guestDeck);
            setCards(guestDeck.cards);
          }
        } else {
          const [d, c] = await Promise.all([fetchDeck(deckId), fetchFlashcards(deckId)]);
          setDeck(d);
          setCards(c);
        }
      } catch (err) {
        console.error('ViewDeckPage load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [deckId, isGuest]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (locked) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setCards(prev => {
        const oldIdx = prev.findIndex(c => c.id === active.id);
        const newIdx = prev.findIndex(c => c.id === over.id);
        const reordered = arrayMove(prev, oldIdx, newIdx);
        // persist in background
        if (user) reorderFlashcards(reordered.map(c => c.id)).catch(console.error);
        return reordered;
      });
    },
    [locked, user]
  );

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          {loading ? (
            <Skeleton className="h-7 w-48 bg-muted" />
          ) : (
            <h1 className="text-xl font-bold text-foreground truncate text-balance">{deck?.title}</h1>
          )}
        </div>
      </div>

      {/* Deck meta */}
      {!loading && deck && (
        <div className="flex gap-2 flex-wrap -mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${SUBJECT_COLORS[deck.subject] || ''}`}>
            {deck.subject}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${DIFF_COLORS[deck.difficulty] || ''}`}>
            {deck.difficulty}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
            {cards.length} cards
          </span>
        </div>
      )}

      {/* Action buttons */}
      {!loading && deck && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" title="Study" onClick={() => navigate(`/decks/${deckId}/study`)}>
            <BookOpen className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" title="Test" onClick={() => navigate(`/decks/${deckId}/test`)}>
            <TestTube2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" title="Games" onClick={() => navigate(`/arcade/${deckId}`)}>
            <BowArrow className="w-4 h-4" />
          </Button>
          {isGuest ? (
            <GuestGate feature="edit this deck">
              <Button size="sm" variant="outline" title="Edit" onClick={() => {}}><Edit3 className="w-4 h-4" /></Button>
            </GuestGate>
          ) : (
            <Button size="sm" variant="outline" title="Edit" onClick={() => navigate(`/decks/${deckId}/edit`)}>
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Flashcards section */}
      <div className="space-y-3">
        {/* Section header with Lock Cards toggle — hidden for guests */}
        <div className="flex items-center gap-3">
          {!isGuest && (
            <div className="flex items-center gap-2 shrink-0">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <Label htmlFor="lock-toggle" className="text-sm font-normal text-muted-foreground cursor-pointer select-none">
                Lock cards
              </Label>
              <Switch
                id="lock-toggle"
                checked={locked}
                onCheckedChange={setLocked}
                aria-label="Lock cards from reordering"
              />
            </div>
          )}
          <h2 className="font-semibold text-foreground ml-auto">
            {`${cards.length} flashcards`}
          </h2>
        </div>

        {/* Search bar */}
        {cards.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={cardSearchRef}
              placeholder="Search cards…"
              value={cardSearch}
              onChange={e => setCardSearch(e.target.value)}
              className="pl-9 pr-8"
            />
            {cardSearch && (
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setCardSearch(''); setTimeout(() => cardSearchRef.current?.focus(), 0); }}
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {locked && (
          <p className="text-xs text-muted-foreground">Cards are locked. Unlock to reorder them.</p>
        )}
        {!locked && cards.length > 1 && (
          <p className="text-xs text-muted-foreground">Drag cards to reorder them.</p>
        )}

        {/* Card list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 bg-muted" />)}
          </div>
        ) : cards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">This deck has no cards yet.</p>
        ) : filteredCards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No cards match your search.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <VirtualCardList
                items={filteredCards}
                estimateSize={88}
                renderItem={(card, idx) => (
                  <div className="pb-2">
                    <SortableCard
                      card={card}
                      idx={idx}
                      locked={locked}
                      onClick={() => setModalCard(card)}
                    />
                  </div>
                )}
              />
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Card detail modal (read-only) */}
      <Dialog open={!!modalCard} onOpenChange={v => !v && setModalCard(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary shrink-0" />
              Card detail
            </DialogTitle>
          </DialogHeader>
          {modalCard && (
            <div className="space-y-4 mt-2">
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Front</p>
                <p className="text-base text-foreground text-pretty whitespace-pre-wrap">{modalCard.front_text}</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs text-primary font-medium mb-2 uppercase tracking-wide">Back</p>
                <p className="text-base text-foreground text-pretty whitespace-pre-wrap">{modalCard.back_text}</p>
              </div>
              {modalCard.notes && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Notes</p>
                  <p className="text-sm text-foreground text-pretty whitespace-pre-wrap">{modalCard.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
