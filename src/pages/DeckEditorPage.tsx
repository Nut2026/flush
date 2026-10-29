import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  fetchDeck, createDeck, updateDeck, deleteDeck,
  fetchFlashcards, addFlashcard, updateFlashcard, deleteFlashcard,
  checkAndAwardBadges,
} from '@/services/flush/flushService';
import type { Deck, Flashcard } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Check, X, Loader2, GripVertical, Upload, FileDown, FileUp, Search, BookOpen, TestTube2, BowArrow, Eye } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { reorderFlashcards } from '@/services/flush/flushService';
import { parseImportFile, type ParsedCard } from './DecksPage';
import { VirtualCardList } from '@/components/common/VirtualCardList';

const SUBJECTS = ['Math', 'Science', 'History', 'English', 'Languages', 'Tech', 'Other'];
const CUSTOM_SUBJECT_SENTINEL = '__custom__';
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

type CardSnapshot = { id: string; front_text: string; back_text: string; notes: string; deck_id: string; mastery_level: number; times_reviewed: number; last_reviewed_at: string | null; created_at: string; sort_order?: number; };

// ── Sortable card row for the editor ──────────────────────────────────────
function EditorSortableCard({
  card, idx, onEdit, onDelete,
}: {
  card: Flashcard;
  idx: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
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
          <div className="flex gap-3">
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground w-5 shrink-0 mt-0.5">{idx + 1}.</span>
            <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
              <div
                className="cursor-text hover:bg-secondary/40 rounded px-1 -mx-1 py-1 transition-colors"
                title="Click to edit"
                onClick={onEdit}
              >
                <p className="text-xs text-muted-foreground mb-0.5">Front</p>
                <p className="text-sm text-foreground text-pretty">{card.front_text}</p>
              </div>
              <div
                className="cursor-text hover:bg-secondary/40 rounded px-1 -mx-1 py-1 transition-colors"
                title="Click to edit"
                onClick={onEdit}
              >
                <p className="text-xs text-muted-foreground mb-0.5">Back</p>
                <p className="text-sm text-foreground text-pretty">{card.back_text}</p>
              </div>
              {card.notes && (
                <div
                  className="col-span-2 cursor-text hover:bg-secondary/40 rounded px-1 -mx-1 py-1 transition-colors"
                  title="Click to edit"
                  onClick={onEdit}
                >
                  <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                  <p className="text-sm text-foreground text-pretty">{card.notes}</p>
                </div>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeckEditorPage() {
  const { user, isGuest } = useAuth();
  const { enterContext } = useTheme();
  useEffect(() => enterContext('deck'), []);
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const isNew = !deckId;

  const dnkSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [deck, setDeck] = useState<Partial<Deck>>({
    title: '',
    subject: 'Other',
    difficulty: 'Beginner',
  });
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [, setEditingCard] = useState<string | null>(null);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editNotes, setEditNotes] = useState('');
  // Soft >1000 warning
  const [largedeckWarningDismissed, setLargedeckWarningDismissed] = useState(false);

  // "Add cards now?" prompt shown after creating a new deck
  const [addCardsPromptOpen, setAddCardsPromptOpen] = useState(false);
  const [newlyCreatedDeckId, setNewlyCreatedDeckId] = useState<string | null>(null);

  // Import Cards
  const [importCardsOpen, setImportCardsOpen] = useState(false);
  const [exportCardsOpen, setExportCardsOpen] = useState(false);
  const [exportSelected, setExportSelected] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  // Search within card list
  const [cardSearch, setCardSearch] = useState('');

  // Unsaved-changes guard
  const [isDirty, setIsDirty] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const pendingNavRef = useRef<string | null>(null);
  const cardSearchRef = useRef<HTMLInputElement>(null);

  // Custom subject input
  const [customSubject, setCustomSubject] = useState('');

  // Delete deck dialog
  const [deleteDeckOpen, setDeleteDeckOpen] = useState(false);
  const [deletingDeck, setDeletingDeck] = useState(false);

  // Card edit modal
  const [cardModalId, setCardModalId] = useState<string | null>(null);
  const [cardModalFront, setCardModalFront] = useState('');
  const [cardModalBack, setCardModalBack] = useState('');
  const [cardModalNotes, setCardModalNotes] = useState('');

  // AI preview inline editing

  // Undo/redo history
  const undoStack = useRef<CardSnapshot[][]>([]);
  const redoStack = useRef<CardSnapshot[][]>([]);
  const cardDeleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pushUndo = (snapshot: CardSnapshot[]) => {
    undoStack.current.push(snapshot);
    redoStack.current = [];
  };
  const snapCards = (cs: Flashcard[]): CardSnapshot[] =>
    cs.map(c => ({ id: c.id, front_text: c.front_text, back_text: c.back_text, notes: c.notes ?? '', deck_id: c.deck_id, mastery_level: c.mastery_level, times_reviewed: c.times_reviewed, last_reviewed_at: c.last_reviewed_at, created_at: c.created_at }));

  // Filtered cards for search
  const filteredCards = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(c =>
      c.front_text.toLowerCase().includes(q) ||
      c.back_text.toLowerCase().includes(q) ||
      (c.notes ?? '').toLowerCase().includes(q)
    );
  }, [cards, cardSearch]);

  useEffect(() => {
    if (isNew || !deckId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [d, c] = await Promise.all([fetchDeck(deckId), fetchFlashcards(deckId)]);
        if (d) {
          setDeck(d);
          const known = ['Math', 'Science', 'History', 'English', 'Languages', 'Tech', 'Other'];
          if (d.subject && !known.includes(d.subject)) {
            setCustomSubject(d.subject);
            setDeck(prev => ({ ...prev, subject: CUSTOM_SUBJECT_SENTINEL as any }));
          }
        }
        setCards(c);
      } catch {
        toast.error('Failed to load deck');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [deckId, isNew]);

  const handleSaveDeck = async () => {
    if (!deck.title?.trim()) { toast.error('Deck title is required'); return; }
    if (!user && !isGuest) return;
    setSaving(true);
    try {
      if (isNew) {
        if (isGuest) {
          const newDeck = {
            id: `guest-deck-${Date.now()}`,
            user_id: 'guest',
            title: deck.title,
            subject: deck.subject || 'Other',
            difficulty: deck.difficulty || 'Beginner',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            flashcard_count: 0,
            cards: [],
          };
          const raw = sessionStorage.getItem('guest_decks');
          const existing = raw ? JSON.parse(raw) : [];
          sessionStorage.setItem('guest_decks', JSON.stringify([...existing, newDeck]));
          toast.success("Deck created!");
          navigate('/decks');
        } else {
          const resolvedSubjectNew = (deck.subject as string) === CUSTOM_SUBJECT_SENTINEL
            ? (customSubject.trim() || 'Other')
            : (deck.subject || 'Other');
          const created = await createDeck(
            user!.id,
            deck.title!,
            resolvedSubjectNew,
            deck.difficulty || 'Beginner'
          );
          await checkAndAwardBadges(user!.id, [], { deckCount: 1 });
          toast.success("Deck created!");
          // Show "Add cards now?" prompt instead of navigating away
          setNewlyCreatedDeckId(created.id);
          setAddCardsPromptOpen(true);
        }
      } else {
        const resolvedSubject = (deck.subject as string) === CUSTOM_SUBJECT_SENTINEL
          ? (customSubject.trim() || 'Other')
          : deck.subject;
        await updateDeck(deckId!, {
          title: deck.title,
          subject: resolvedSubject as any,
          difficulty: deck.difficulty,
        });
        setIsDirty(false);
      toast.success("Deck saved.");
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save deck');
    } finally {
      setSaving(false);
    }
  };

  const [savingCard, setSavingCard] = useState(false);

  const handleAddCard = async () => {
    if (!newFront.trim() || !newBack.trim()) { toast.error('Both front and back text are required'); return; }
    if (isGuest) {
      const newCard: Flashcard = {
        id: `guest-card-${Date.now()}`,
        deck_id: deckId || '',
        front_text: newFront.trim(),
        back_text: newBack.trim(),
        notes: newNotes.trim(),
        mastery_level: 1,
        times_reviewed: 0,
        last_reviewed_at: null,
        created_at: new Date().toISOString(),
        sort_order: 0,
      };
      setCards(prev => { pushUndo(snapCards(prev)); return [...prev, newCard]; });
      setNewFront(''); setNewBack(''); setNewNotes(''); setAddingNew(false);
      return;
    }
    setSavingCard(true);
    try {
      const card = await addFlashcard(deckId!, newFront.trim(), newBack.trim(), newNotes.trim());
      setCards(prev => { pushUndo(snapCards(prev)); return [...prev, card]; });
      setNewFront(''); setNewBack(''); setNewNotes(''); setAddingNew(false);
      const totalCards = cards.length + 1;
      if (user) await checkAndAwardBadges(user.id, [], { totalCards });
    } catch {
      toast.error('Failed to add card');
    } finally {
      setSavingCard(false);
    }
  };

  const handleSaveEdit = async (cardId: string, frontOverride?: string, backOverride?: string, notesOverride?: string) => {
    const front = (frontOverride ?? editFront).trim();
    const back = (backOverride ?? editBack).trim();
    const notes = (notesOverride ?? editNotes).trim();
    if (!front || !back) return;
    if (isGuest) {
      setCards(prev => { pushUndo(snapCards(prev)); return prev.map(c => c.id === cardId ? { ...c, front_text: front, back_text: back, notes } : c); });
      setEditingCard(null);
      return;
    }
    try {
      await updateFlashcard(cardId, { front_text: front, back_text: back, notes });
      setCards(prev => { pushUndo(snapCards(prev)); return prev.map(c => c.id === cardId ? { ...c, front_text: front, back_text: back, notes } : c); });
      setEditingCard(null);
    } catch {
      toast.error('Failed to update card');
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteCardId) return;
    const cardToDelete = cards.find(c => c.id === deleteCardId);
    if (!cardToDelete) { setDeleteCardId(null); return; }

    // Optimistically remove from UI
    setCards(prev => { pushUndo(snapCards(prev)); return prev.filter(c => c.id !== deleteCardId); });
    setDeleteCardId(null);

    if (isGuest) {
      toast.success('Card deleted.', {
        action: {
          label: 'Undo',
          onClick: () => {
            setCards(prev => {
              if (prev.find(c => c.id === cardToDelete.id)) return prev;
              return [...prev, cardToDelete];
            });
          },
        },
      });
      return;
    }

    const id = cardToDelete.id;
    toast.success('Card deleted.', {
      action: {
        label: 'Undo',
        onClick: () => {
          if (cardDeleteTimers.current[id]) {
            clearTimeout(cardDeleteTimers.current[id]);
            delete cardDeleteTimers.current[id];
          }
          setCards(prev => {
            if (prev.find(c => c.id === id)) return prev;
            return [...prev, cardToDelete];
          });
        },
      },
      duration: 5000,
    });

    cardDeleteTimers.current[id] = setTimeout(async () => {
      delete cardDeleteTimers.current[id];
      try {
        await deleteFlashcard(id);
      } catch {
        toast.error('Failed to delete card');
        setCards(prev => {
          if (prev.find(c => c.id === id)) return prev;
          return [...prev, cardToDelete];
        });
      }
    }, 5000);
  };

  // AI Generate inside the editor - removed

  // Card edit modal save
  const handleSaveCardModal = async () => {
    if (!cardModalId) return;
    if (!cardModalFront.trim() || !cardModalBack.trim()) return;
    await handleSaveEdit(cardModalId, cardModalFront, cardModalBack, cardModalNotes);
    setCardModalId(null);
  };

  // Undo / Redo keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inInput = ['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement)?.tagName ?? '');
      if (!inInput && (e.ctrlKey || e.metaKey)) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (undoStack.current.length === 0) return;
          const prev = undoStack.current.pop()!;
          redoStack.current.push(snapCards(cards));
          setCards(prev as Flashcard[]);
          toast.info('Undo');
        }
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          if (redoStack.current.length === 0) return;
          const next = redoStack.current.pop()!;
          undoStack.current.push(snapCards(cards));
          setCards(next as Flashcard[]);
          toast.info('Redo');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="h-64 bg-muted" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => {
          if (isDirty) { pendingNavRef.current = 'back'; setUnsavedOpen(true); }
          else navigate(-1);
        }}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <h1 className="text-xl font-bold text-foreground flex-1 min-w-0 truncate text-balance">
          {isNew ? "Create deck" : "Edit deck"}
        </h1>
        {!isNew && (
          <>
            <Button size="sm" variant="outline" title="Study" onClick={() => navigate(`/decks/${deckId}/study`)}>
              <BookOpen className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" title="Test" onClick={() => navigate(`/decks/${deckId}/test`)}>
              <TestTube2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" title="Games" onClick={() => navigate(`/arcade/${deckId}`)}>
              <BowArrow className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" title="View" onClick={() => navigate(`/decks/${deckId}/view`)}>
              <Eye className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Deck details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Deck details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-normal text-muted-foreground">Title</label>
            <Input
              placeholder="e.g. Biology Chapter 3"
              value={deck.title || ''}
              onChange={e => { setDeck(prev => ({ ...prev, title: e.target.value })); setIsDirty(true); }}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">{deck.title?.length || 0}/50</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-muted-foreground">Subject</label>
              <Select
                value={(deck.subject as string) === CUSTOM_SUBJECT_SENTINEL ? CUSTOM_SUBJECT_SENTINEL : (deck.subject || 'Other')}
                onValueChange={v => {
                  setDeck(prev => ({ ...prev, subject: v as any }));
                  if (v !== CUSTOM_SUBJECT_SENTINEL) setCustomSubject('');
                  setIsDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(deck.subject as string) === CUSTOM_SUBJECT_SENTINEL
                      ? (customSubject || 'Custom…')
                      : (deck.subject || 'Other')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  <SelectItem value={CUSTOM_SUBJECT_SENTINEL}>Custom subject</SelectItem>
                </SelectContent>
              </Select>
              {(deck.subject as string) === CUSTOM_SUBJECT_SENTINEL && (
                <Input
                  autoFocus
                  placeholder="Choose a subject"
                  value={customSubject}
                  onChange={e => { setCustomSubject(e.target.value); setIsDirty(true); }}
                  maxLength={40}
                  className="mt-1.5"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-muted-foreground">Difficulty</label>
              <Select
                value={deck.difficulty || 'Beginner'}
                onValueChange={v => { setDeck(prev => ({ ...prev, difficulty: v as any })); setIsDirty(true); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(isDirty || isNew) && (
              <Button onClick={handleSaveDeck} disabled={saving} className="w-full sm:w-auto">
                <Check className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            )}
            {!isNew && (
              <Button
                variant="outline"
                onClick={() => setDeleteDeckOpen(true)}
                className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />Delete deck
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Flashcards section - only shown when editing an existing deck */}
      {!isNew && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold text-foreground">
              Flashcards <span className="text-muted-foreground font-normal">({cards.length})</span>
            </h2>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => setAddingNew(true)} disabled={addingNew}>
                <Plus className="w-4 h-4 mr-1" />Add card
              </Button>
              {!isGuest && (
                <Button size="sm" variant="outline" onClick={() => setImportCardsOpen(true)}>
                  <FileDown className="w-4 h-4 mr-1.5" />Import Cards
                </Button>
              )}
              {!isGuest && cards.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => { setExportSelected(new Set(cards.map(c => c.id))); setExportCardsOpen(true); }}>
                  <FileUp className="w-4 h-4 mr-1.5" />Export Cards
                </Button>
              )}
            </div>
          </div>

          {/* Soft >1000 card warning */}
          {cards.length > 1000 && !largedeckWarningDismissed && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/8 text-sm">
              <span className="text-amber-400 shrink-0 mt-0.5">⚠️</span>
              <p className="flex-1 text-amber-400 text-pretty">
                This deck has over 1000 cards. Consider breaking it into smaller topics for more efficient sessions.
              </p>
              <button
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setLargedeckWarningDismissed(true)}
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Add new card form */}
          {addingNew && (
            <Card className="border-primary/50">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium text-primary">New card</p>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Front</label>
                  <Textarea
                    placeholder="The question, term, or prompt"
                    value={newFront}
                    onChange={e => setNewFront(e.target.value)}
                    maxLength={500}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Back</label>
                  <Textarea
                    placeholder="The answer, definition, or translation"
                    value={newBack}
                    onChange={e => setNewBack(e.target.value)}
                    maxLength={500}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Notes <span className="text-muted-foreground/60">(optional)</span></label>
                  <Textarea
                    placeholder="An optional hint or extra detail"
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddCard} className="flex-1" disabled={savingCard}>
                    {savingCard ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving...</> : <><Check className="w-4 h-4 mr-1" />Save card</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAddingNew(false); setNewFront(''); setNewBack(''); setNewNotes(''); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card list - drag to reorder, click to edit */}
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

          {cards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No cards yet. Add your first card above.</p>
          ) : filteredCards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No cards match your search.</p>
          ) : (
            <DndContext
              sensors={dnkSensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                setCards(prev => {
                  const oldIdx = prev.findIndex(c => c.id === active.id);
                  const newIdx = prev.findIndex(c => c.id === over.id);
                  const reordered = arrayMove(prev, oldIdx, newIdx);
                  reorderFlashcards(reordered.map(c => c.id)).catch(console.error);
                  return reordered;
                });
              }}
            >
              <SortableContext items={filteredCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div
                  className="space-y-2 overflow-y-auto"
                  style={{ maxHeight: 'clamp(320px, 60vh, 600px)', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                >
                  {filteredCards.map((card, idx) => (
                    <EditorSortableCard
                      key={card.id}
                      card={card}
                      idx={idx}
                      onEdit={() => { setCardModalId(card.id); setCardModalFront(card.front_text); setCardModalBack(card.back_text); setCardModalNotes(card.notes ?? ''); setEditFront(card.front_text); setEditBack(card.back_text); setEditNotes(card.notes ?? ''); }}
                      onDelete={() => setDeleteCardId(card.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* "Add cards now?" prompt after new deck creation */}
      <AlertDialog open={addCardsPromptOpen} onOpenChange={() => {}}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Add your cards first</AlertDialogTitle>
            <AlertDialogDescription>This deck has unsaved cards. Add them before leaving?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => { setAddCardsPromptOpen(false); navigate('/decks'); }}>
              Later
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => { setAddCardsPromptOpen(false); navigate(`/decks/${newlyCreatedDeckId}/edit`); }}>
              Add cards
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete card dialog */}
      <AlertDialog open={!!deleteCardId} onOpenChange={v => !v && setDeleteCardId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>This card will be removed from your deck. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCard} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Cards Modal */}
      <ImportCardsModal
        open={importCardsOpen}
        onClose={() => setImportCardsOpen(false)}
        deckId={deckId ?? ''}
        onSaved={(imported) => setCards(prev => [...prev, ...imported])}
      />

      {/* Export Cards Modal */}
      <Dialog open={exportCardsOpen} onOpenChange={v => { if (!v) setExportCardsOpen(false); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md flex flex-col max-h-[90dvh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Export cards</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-sm text-muted-foreground">{exportSelected.size} of {cards.length} selected</span>
            <Button
              size="sm" variant="ghost"
              onClick={() => setExportSelected(
                exportSelected.size === cards.length ? new Set() : new Set(cards.map(c => c.id))
              )}
            >
              {exportSelected.size === cards.length ? "Deselect all" : "Select all"}
            </Button>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <VirtualCardList
              items={cards}
              estimateSize={68}
              maxHeight="clamp(280px, 50vh, 520px)"
              renderItem={(c, i) => (
                <div className="pb-1.5">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      exportSelected.has(c.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 shrink-0"
                      checked={exportSelected.has(c.id)}
                      onChange={() => setExportSelected(prev => {
                        const next = new Set(prev);
                        if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                        return next;
                      })}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">#{i + 1} {c.front_text}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.back_text}</p>
                    </div>
                  </label>
                </div>
              )}
            />
          </div>
          <div className="shrink-0 pt-3 border-t border-border space-y-3">
            <div className="flex gap-2">
              <button
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${exportFormat === 'csv' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/40'}`}
                onClick={() => setExportFormat('csv')}
              >
                CSV
              </button>
              <button
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${exportFormat === 'json' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/40'}`}
                onClick={() => setExportFormat('json')}
              >
                JSON
              </button>
            </div>
            <Button
              className="w-full"
              disabled={exportSelected.size === 0}
              onClick={() => {
                const selected = cards.filter(c => exportSelected.has(c.id));
                const deckName = (deck?.title ?? 'cards').replace(/[^a-z0-9]/gi, '_');
                let content: string;
                let filename: string;
                let mimeType: string;
                if (exportFormat === 'csv') {
                  const header = 'front,back,notes';
                  const rows = selected.map(c =>
                    `"${(c.front_text ?? '').replace(/"/g, '""')}","${(c.back_text ?? '').replace(/"/g, '""')}","${(c.notes ?? '').replace(/"/g, '""')}"`
                  );
                  content = [header, ...rows].join('\n');
                  filename = `${deckName}.csv`;
                  mimeType = 'text/csv';
                } else {
                  content = JSON.stringify(selected.map(c => ({ front: c.front_text, back: c.back_text, notes: c.notes ?? '' })), null, 2);
                  filename = `${deckName}.json`;
                  mimeType = 'application/json';
                }
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = filename; a.click();
                URL.revokeObjectURL(url);
                setExportCardsOpen(false);
                toast.success(`Exported ${selected.length} card${selected.length !== 1 ? 's' : ''} as ${exportFormat.toUpperCase()}.`);
              }}
            >
              Export {exportSelected.size > 0 ? `${exportSelected.size} card${exportSelected.size !== 1 ? 's' : ''}` : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
            {/* Card Edit Modal */}
      <Dialog open={!!cardModalId} onOpenChange={open => { if (!open) { setCardModalId(null); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-muted-foreground">Front</label>
              <Textarea
                autoFocus
                value={cardModalFront}
                onChange={e => setCardModalFront(e.target.value)}
                maxLength={500}
                rows={3}
                className="resize-none"
                placeholder="The question, term, or prompt"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-muted-foreground">Back</label>
              <Textarea
                value={cardModalBack}
                onChange={e => setCardModalBack(e.target.value)}
                maxLength={500}
                rows={3}
                className="resize-none"
                placeholder="The answer, definition, or translation"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-muted-foreground">Notes <span className="text-xs text-muted-foreground/60">(optional)</span></label>
              <Textarea
                value={cardModalNotes}
                onChange={e => setCardModalNotes(e.target.value)}
                maxLength={1000}
                rows={3}
                className="resize-none"
                placeholder="An optional hint or extra detail"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveCardModal} className="w-full">
              <Check className="w-4 h-4 mr-2" />Save card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Deck dialog */}
      <AlertDialog open={deleteDeckOpen} onOpenChange={setDeleteDeckOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{`Delete “${deck?.title ?? ''}”?`}</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the deck and all of its cards.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deckId) return;
                setDeletingDeck(true);
                try {
                  await deleteDeck(deckId);
                  toast.success('Deck deleted.');
                  navigate('/decks');
                } catch (err: any) {
                  toast.error(err.message || 'Failed to delete deck');
                } finally {
                  setDeletingDeck(false);
                  setDeleteDeckOpen(false);
                }
              }}
            >
              {deletingDeck ? ('Deleting…') : "Delete deck"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved changes warning */}
      <AlertDialog open={unsavedOpen} onOpenChange={setUnsavedOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>Leave without saving? Your edits to this deck will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setUnsavedOpen(false)}>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => { setIsDirty(false); setUnsavedOpen(false); if (pendingNavRef.current === 'back') navigate(-1); }}>Discard changes</Button>
            <AlertDialogAction onClick={async () => { await handleSaveDeck(); setUnsavedOpen(false); if (pendingNavRef.current === 'back') navigate(-1); }}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Import Cards Modal (in-editor) ──────────────────────────────────────────

function ImportCardsModal({ open, onClose, deckId, onSaved }: {
  open: boolean; onClose: () => void; deckId: string;
  onSaved: (cards: Flashcard[]) => void;
}) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [parsedCards, setParsedCards] = useState<ParsedCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);
  const importSearchRef = React.useRef<HTMLInputElement>(null);

  const filteredImportIndices = useMemo(() => {
    const q = importSearch.trim().toLowerCase();
    if (!q) return parsedCards.map((_, i) => i);
    return parsedCards.reduce<number[]>((acc, c, i) => {
      if (
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q) ||
        (c.notes ?? '').toLowerCase().includes(q)
      ) acc.push(i);
      return acc;
    }, []);
  }, [parsedCards, importSearch]);

  const reset = () => {
    setStep('upload'); setFile(null); setFileError(''); setParsedCards([]); setImportSearch('');
    if (fileRef.current) fileRef.current.value = '';
  };
  const handleClose = () => { reset(); onClose(); };

  const handleParse = async () => {
    if (!file) { toast.error('Please select a file.'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['csv', 'json'].includes(ext)) { setFileError('Only CSV and JSON files supported.'); return; }
    try {
      const text = await file.text();
      const cards = parseImportFile(text, ext);
      if (cards.length === 0) throw new Error('No valid cards found. Check your file headers (front/back or question/answer).');
      setParsedCards(cards);
      setStep('preview');
    } catch (e: any) { setFileError(e.message || 'Failed to parse file.'); }
  };

  const handleSave = async () => {
    if (!deckId) return;
    setSaving(true);
    try {
      const saved: Flashcard[] = [];
      for (const card of parsedCards) {
        const fc = await addFlashcard(deckId, card.front, card.back, card.notes ?? '');
        saved.push(fc);
      }
      toast.success(`Imported ${saved.length} cards!`);
      onSaved(saved);
      handleClose();
    } catch { toast.error('Failed to import cards.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg flex flex-col max-h-[90dvh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>{step === 'upload' ? "Import cards" : `Preview ${parsedCards.length}`}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 pr-1">
          {step === 'upload' ? (
            <div className="space-y-4 py-2">
              <input ref={fileRef} type="file" accept=".csv,.json" className="hidden"
                onChange={e => { setFile(e.target.files?.[0] ?? null); setFileError(''); }} />
              {file ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary/30 text-sm">
                  <FileDown className="w-4 h-4 text-primary shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{file.name}</span>
                  <button onClick={() => { setFile(null); setFileError(''); if (fileRef.current) fileRef.current.value = ''; }}
                    className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Remove">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Choose file
                </Button>
              )}
              {fileError && <p className="text-xs text-destructive">{fileError}</p>}
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Accepted headers</p>
                <p>Front: <span className="font-mono">front, question, q, ques</span></p>
                <p>Back: <span className="font-mono">back, answer, a, ans</span></p>
                <p>Notes: <span className="font-mono">notes, note, hint, explanation</span></p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">Review the cards below before adding them to your deck.</p>
              {/* Import preview search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={importSearchRef}
                  placeholder="Search the preview…"
                  value={importSearch}
                  onChange={e => setImportSearch(e.target.value)}
                  className="pl-9 pr-8"
                />
                {importSearch && (
                  <button
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setImportSearch(''); setTimeout(() => importSearchRef.current?.focus(), 0); }}
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {filteredImportIndices.map(i => {
                const card = parsedCards[i];
                return (
                  <div key={i} className="p-3 rounded-md border border-border bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground font-medium">Card {i + 1}</span>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => setParsedCards(prev => prev.filter((_, j) => j !== i))}
                        aria-label="Remove card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Front</p>
                      <Textarea value={card.front} onChange={e => setParsedCards(prev => prev.map((c, j) => j === i ? { ...c, front: e.target.value } : c))} rows={2} className="resize-none text-sm" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Back</p>
                      <Textarea value={card.back} onChange={e => setParsedCards(prev => prev.map((c, j) => j === i ? { ...c, back: e.target.value } : c))} rows={2} className="resize-none text-sm" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Notes</p>
                      <Textarea value={card.notes ?? ''} onChange={e => setParsedCards(prev => prev.map((c, j) => j === i ? { ...c, notes: e.target.value } : c))} rows={1} className="resize-none text-sm" placeholder="An optional hint or extra detail" />
                    </div>
                  </div>
                );
              })}
              {filteredImportIndices.length === 0 && parsedCards.length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No cards match your search.</p>
              )}
              {parsedCards.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">All cards removed. Save to apply the changes.</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="shrink-0 pt-2 border-t border-border gap-2">
          {step === 'upload' ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParse} disabled={!file}>Preview cards</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={handleSave} disabled={saving || parsedCards.length === 0}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : `Import ${parsedCards.length} Cards`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
