import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchPublicDecks, fetchPublicDeck, fetchPublicDeckCards, fetchMyPurchases,
  publishDeck, purchaseDeck, submitDeckRating, fetchUserRating,
  submitCardReport, submitDeckReport, fetchCardReports, resolveCardReport,
  updatePublicDeckDetails, publishNewVersion, fetchDeckMods, isUserModOfDeck, unpublishPublicDeck,
  inviteMod, removeMod, syncDeckToNewVersion, fetchPurchasedCopy,
  incrementEditCount, fetchMyPublicDecks, fetchModdedDecks, fetchProfileByUsername,
  addPublicDeckCard, updatePublicDeckCard, deletePublicDeckCard, importPublicDeckCards, claimGeodeReward,
} from '@/services/flush/flushService';
import { parseImportFile } from './DecksPage';
import { PROFILE_GRADIENTS } from '@/services/flush/constants';
import type {
  PublicDeck, PublicDeckCard as PublicDeckCardType, DeckPurchase, CardReport,
  CardReportReason, DeckReportReason, DeckMod, Deck,
} from '@/types/types';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileCharacter } from '@/components/common/ProfileCharacter';
import { toast } from 'sonner';
import { VirtualCardList } from '@/components/common/VirtualCardList';
import {
  Search, Upload, Zap, Globe, Download, CheckCircle,
  ArrowLeft, Package, RefreshCw, AlertTriangle, Lock, User,
  X, Plus, Trash2, Heart, AlertCircle, FileDown, FileUp, Loader2,
  Crown, Play,
} from 'lucide-react';
import { GuestBanner } from '@/components/common/GuestBanner';
import { GuestGate } from '@/components/common/GuestGate';
import ClubsPage from '@/pages/ClubsPage';
import {
  fetchArcadeGames, installArcadeGame, uninstallArcadeGame,
  fetchArcadeProjects, publishArcadeGame,
} from '@/services/flush/arcadeService';
import type { ArcadeGame, ArcadeProject } from '@/services/flush/arcadeService';

// ── Tier definitions (EXP-based, permanent, no demotion) ─────────────────────
const LEAGUE_TIERS = [
  { name: 'Pin',        emoji: '📌', threshold: 0,          perk: 'Welcome to Flush!' },
  { name: 'Clip',       emoji: '🖇️',  threshold: 500,        perk: 'Unlocks avatar frame section + 4 avatar frame colors' },
  { name: 'Eraser',     emoji: '🧹', threshold: 1_500,      perk: 'Unlocks invisible avatar option in Edit Avatar' },
  { name: 'Sharpener',  emoji: '✏️',  threshold: 4_000,      perk: 'Unlocks 5 profile badge display (instead of 3)' },
  { name: 'Scissors',   emoji: '✂️',  threshold: 10_000,     perk: 'Unlocks separate Study/Test/Arcade theme layer' },
  { name: 'Ruler',      emoji: '📏', threshold: 25_000,     perk: 'Receive a 5–50 gems Geode' },
  { name: 'Protractor', emoji: '📐', threshold: 60_000,     perk: 'Receive a 10–100 gems Geode' },
  { name: 'Compass',    emoji: '🧭', threshold: 150_000,    perk: 'Receive 7× 7–70 gems Geodes' },
  { name: 'Highlighter',emoji: '🖊️', threshold: 400_000,    perk: 'Unlocks shiny animated avatar frame' },
  { name: 'Notebook',   emoji: '📓', threshold: 1_000_000,  perk: 'Unlocks separate Study/Test/Arcade + Edit/View theme layers (3 layers)' },
  { name: 'Stapler',    emoji: '🗄️', threshold: 2_500_000,  perk: 'Unlocks 10 profile badge display (instead of 5)' },
  { name: 'Calculator', emoji: '🧮', threshold: 5_000_000,  perk: '12% discount on all gem purchases in Trade' },
  { name: 'Laminator',  emoji: '🖨️', threshold: 13_000_000, perk: 'Unlocks shiny entire avatar' },
] as const;

function getUserLeagueIndex(exp: number): number {
  let idx = 0;
  for (let i = LEAGUE_TIERS.length - 1; i >= 0; i--) {
    if (exp >= LEAGUE_TIERS[i].threshold) { idx = i; break; }
  }
  return idx;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECTS = ['Math', 'Science', 'History', 'English', 'Languages', 'Tech', 'Other'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

// Card report reasons come from ["Wrong answer or typo","Confusing front","Duplicate card","Missing information","Something else"] (translated)
const CARD_REPORT_REASONS_STATIC: CardReportReason[] = [
  'Mismatched Q&A', 'Misleading Title, Description or Subject', 'Vague or Ambiguous',
  'Incorrect Information', 'Typo or Formatting', 'Duplicate Card',
  'Back Too Long for Test', 'Spoiler or Hint in Front', 'Other',
];

// Deck report reasons come from ["Spam or advertising","Offensive content","Copyright violation","Incorrect information","Something else"] (translated)
const DECK_REPORT_REASONS_STATIC: DeckReportReason[] = [
  'Spam or Promotional', 'Duplicate Deck', 'Offensive Content',
  'Copyright Violation', 'Low Effort or Low Quality Content', 'Other',
];

function StarRating({ rating, max = 5, onRate }: { rating: number; max?: number; onRate?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          className={`transition-colors ${onRate ? 'cursor-pointer' : 'cursor-default'}`}
          onMouseEnter={() => onRate && setHover(n)}
          onMouseLeave={() => onRate && setHover(0)}
          onClick={() => onRate?.(n)}
          disabled={!onRate}
        >
          <Zap
            className={`w-4 h-4 ${(hover || rating) >= n ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
          />
        </button>
      ))}
    </div>
  );
}

function GuestGateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a free account</DialogTitle>
          <DialogDescription>
            Sign up to rate, report and share decks with the community.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button onClick={() => { onClose(); navigate('/auth', { state: { mode: 'signup' } }); }}>
            Sign Up
          </Button>
          <Button variant="outline" onClick={onClose}>Continue as Guest</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Deck Card ─────────────────────────────────────────────────────────────────

// ── GuestDeckCard — darkened + hover lock overlay for unauthenticated users ──
function GuestDeckCard({ deck, isPurchased }: { deck: PublicDeck; isPurchased: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [tapped, setTapped] = useState(false);

  const showMsg = hovered || tapped;

  return (
    <div
      className="relative h-full select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setTapped(v => !v)}
    >
      {/* Darken the card */}
      <div className="pointer-events-none opacity-50">
        <DeckCard
          deck={deck}
          onView={() => {}}
          isPurchased={isPurchased}
        />
      </div>
      {/* Lock overlay message */}
      {showMsg && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg">
          <div className="bg-background/95 border border-border shadow-lg rounded-xl px-4 py-3 text-sm font-medium text-foreground text-center mx-3">
            🔒 Sign Up or Log In to explore shared decks
          </div>
        </div>
      )}
    </div>
  );
}

function DeckCard({
  deck,
  onView,
  isPurchased,
  isOwner,
  isMod,
}: {
  deck: PublicDeck;
  onView: (deck: PublicDeck) => void;
  isPurchased: boolean;
  isOwner?: boolean;
  isMod?: boolean;
}) {
  const navigate = useNavigate();
  // Determine flair — show in Browse AND My Contributions
  const flair = isOwner ? "Owner" : isMod ? "Mod" : isPurchased ? "Purchased" : null;

  return (
    <Card
      className="h-full flex flex-col cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => onView(deck)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-balance leading-tight line-clamp-2">
            {deck.title}
          </CardTitle>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="secondary" className="text-xs">{deck.subject ?? deck.subject}</Badge>
          <Badge variant="outline" className="text-xs">{deck.difficulty ?? deck.difficulty}</Badge>
          <Badge variant="outline" className="text-xs">{deck.version}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2 pt-0">
        <p className="text-xs text-muted-foreground line-clamp-2 text-pretty flex-1">
          {deck.description}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            className="flex items-center gap-1 hover:text-primary transition-colors text-left"
            onClick={e => { e.stopPropagation(); if (deck.owner_username) navigate(`/self?user=${encodeURIComponent(deck.owner_username)}`); }}
          >
            <User className="w-3 h-3" />{deck.owner_username || '—'}
          </button>
          <span className="flex items-center gap-1">
            {deck.avg_rating > 0 ? (
              <>
                <StarRating rating={deck.avg_rating} />
                <span>{deck.avg_rating.toFixed(1)}</span>
              </>
            ) : (
              <span>Be the first to share a deck here.</span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Download className="w-3 h-3" />{`${deck.download_count} downloads`}</span>
          {flair && (
            <Badge className={`text-xs ${
              isPurchased && !isOwner && !isMod ? 'bg-primary/15 text-primary border-primary/30' :
              isMod && !isOwner ? 'bg-secondary text-muted-foreground border-border' :
                                  'bg-primary/10 text-primary border-primary/20'
            }`}>{flair}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Deck Detail View ──────────────────────────────────────────────────────────

function DeckDetailView({
  deck: initialDeck,
  onBack,
  userId,
  isGuest,
  purchases,
  onPurchased,
  onGuestAction,
}: {
  deck: PublicDeck;
  onBack: () => void;
  userId: string | null;
  isGuest: boolean;
  purchases: DeckPurchase[];
  onPurchased: () => void;
  onGuestAction: () => void;
}) {
  const navigate = useNavigate();
  const [deck, setDeck] = useState<PublicDeck>(initialDeck);
  const [cards, setCards] = useState<PublicDeckCardType[]>([]);
  const [reports, setReports] = useState<CardReport[]>([]);
  const [mods, setMods] = useState<DeckMod[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<{ profile_gradient: string; profile_character: string; profile_char_color: string } | null>(null);
  const [isMod, setIsMod] = useState(false);
  const [tab, setTab] = useState('overview');
  const [worldCardSearch, setWorldCardSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);

  const filteredWorldCards = useMemo(() => {
    const q = worldCardSearch.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(c =>
      c.front_text.toLowerCase().includes(q) ||
      c.back_text.toLowerCase().includes(q) ||
      (c.notes ?? '').toLowerCase().includes(q)
    );
  }, [cards, worldCardSearch]);

  // Rate deck
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [pendingRating, setPendingRating] = useState(0);

  // Card report (now "suggestion")
  const [reportCardOpen, setReportCardOpen] = useState(false);
  const [reportingCard, setReportingCard] = useState<PublicDeckCardType | null>(null);
  const [cardReportReason, setCardReportReason] = useState<CardReportReason>('Mismatched Q&A');
  const [cardReportExplanation, setCardReportExplanation] = useState('');

  // Deck report
  const [deckReportConfirmOpen, setDeckReportConfirmOpen] = useState(false);
  const [deckReportModalOpen, setDeckReportModalOpen] = useState(false);
  const [deckReportReason, setDeckReportReason] = useState<DeckReportReason>('Spam or Promotional');
  const [deckReportExplanation, setDeckReportExplanation] = useState('');

  // Edit deck (owner/mod)
  const [editOpen, setEditOpen] = useState(false);
  const [editDesc, setEditDesc] = useState(deck.description);
  const [editSubject, setEditSubject] = useState(deck.subject);
  const [editDifficulty, setEditDifficulty] = useState(deck.difficulty);

  // Invite mod (now in Mods tab)
  const [inviteModOpen, setInviteModOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Remove mod confirmation
  const [removeModTarget, setRemoveModTarget] = useState<DeckMod | null>(null);
  const [removeModInput, setRemoveModInput] = useState('');

  // Sync
  const [syncOpen, setSyncOpen] = useState(false);
  const [purchasedCopy, setPurchasedCopy] = useState<{ synced_version: string; has_update: boolean } | null>(null);

  // Unpublish
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [unpublishAcknowledged, setUnpublishAcknowledged] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  // Edit Cards (manage tab)
  const [editCardsOpen, setEditCardsOpen] = useState(false);
  const [editCardsLoading, setEditCardsLoading] = useState(false);
  const [editCardsSearch, setEditCardsSearch] = useState('');

  const filteredEditCards = useMemo(() => {
    const q = editCardsSearch.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(c =>
      c.front_text.toLowerCase().includes(q) ||
      c.back_text.toLowerCase().includes(q) ||
      (c.notes ?? '').toLowerCase().includes(q)
    );
  }, [cards, editCardsSearch]);
  const [editingPubCardId, setEditingPubCardId] = useState<string | null>(null);
  const [pubCardModalFront, setPubCardModalFront] = useState('');
  const [pubCardModalBack, setPubCardModalBack] = useState('');
  const [pubCardModalNotes, setPubCardModalNotes] = useState('');
  // "Add new card" mode — no DB record yet until user saves
  const [addingPubCard, setAddingPubCard] = useState(false);
  const [pubCardImportOpen, setPubCardImportOpen] = useState(false);
  const [pubCardExportOpen, setPubCardExportOpen] = useState(false);
  const [pubCardExportSelected, setPubCardExportSelected] = useState<Set<string>>(new Set());
  const [pubCardExportFormat, setPubCardExportFormat] = useState<'csv' | 'json'>('csv');
  const [pubCardImportFile, setPubCardImportFile] = useState<File | null>(null);
  const [pubCardImportError, setPubCardImportError] = useState('');
  const [pubCardImportParsed, setPubCardImportParsed] = useState<{ front: string; back: string; notes: string }[]>([]);
  const [pubCardImportStep, setPubCardImportStep] = useState<'upload' | 'preview'>('upload');
  const [pubCardImportSaving, setPubCardImportSaving] = useState(false);
  // Delete confirmation for pub cards
  const [deletePubCardId, setDeletePubCardId] = useState<string | null>(null);
  const pubCardDeleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pubCardImportFileRef = React.useRef<HTMLInputElement>(null);

  const purchased = purchases.some(p => p.public_deck_id === deck.id);
  const isOwner = userId === deck.owner_id;
  const canManage = isOwner || isMod;

  const handleUnpublish = async () => {
    if (!isOwner) return;
    setUnpublishing(true);
    const { error } = await unpublishPublicDeck(deck.id);
    setUnpublishing(false);
    if (error) { toast.error("Could not unpublish the deck."); return; }
    toast.success(`“${deck.title}” is no longer published.`);
    setUnpublishOpen(false);
    onBack();
  };

  const refreshDeck = useCallback(async () => {
    const d = await fetchPublicDeck(deck.id);
    if (d) setDeck(d);
  }, [deck.id]);

  useEffect(() => {
    fetchPublicDeckCards(deck.id).then(setCards);
    if (userId) {
      fetchUserRating(userId, deck.id).then(r => { if (r) setExistingRating(r.rating); });
      isUserModOfDeck(userId, deck.id).then(setIsMod);
      fetchPurchasedCopy(userId, deck.id).then(c => {
        if (c) setPurchasedCopy({ synced_version: c.synced_version, has_update: c.has_update });
      });
    }
    fetchDeckMods(deck.id).then(setMods);
    if (canManage) fetchCardReports(deck.id).then(setReports);
    // Fetch owner avatar
    if (deck.owner_username) {
      fetchProfileByUsername(deck.owner_username).then(p => {
        if (p) setOwnerProfile({ profile_gradient: p.profile_gradient, profile_character: p.profile_character, profile_char_color: p.profile_char_color });
      });
    }
  }, [deck.id, userId, canManage]);

  const handleBuy = async () => {
    if (isGuest) { onGuestAction(); return; }
    if (!userId) return;
    setBuying(true);
    const { error } = await purchaseDeck({ buyerId: userId, publicDeckId: deck.id, price: deck.price, sellerId: deck.owner_id });
    setBuying(false);
    if (error) { toast.error(error); return; }
    toast.success("Deck added to your collection.");
    onPurchased();
  };

  const handleRateSubmit = async () => {
    if (!userId || !pendingRating) return;
    await submitDeckRating(userId, deck.id, pendingRating);
    setExistingRating(pendingRating);
    setRatingModalOpen(false);
    await refreshDeck();
    toast.success("Thanks for rating this deck.");
  };

  const handleCardReport = async () => {
    if (!userId || !reportingCard) return;
    const { error } = await submitCardReport({
      reporterId: userId, publicDeckId: deck.id, cardId: reportingCard.id,
      reason: cardReportReason, explanation: cardReportExplanation || undefined,
    });
    if (error) { toast.error(error); return; }
    toast.success("Suggestion sent.");
    setReportCardOpen(false);
    setCardReportExplanation('');
  };

  const handleDeckReport = async () => {
    if (!userId) return;
    const { error } = await submitDeckReport({
      reporterId: userId, publicDeckId: deck.id,
      reason: deckReportReason, explanation: deckReportExplanation || undefined,
    });
    if (error) { toast.error(error); return; }
    toast.success("Deck reported. Thank you.");
    setDeckReportModalOpen(false);
    setDeckReportExplanation('');
  };

  const handleSaveEdit = async () => {
    await updatePublicDeckDetails(deck.id, { description: editDesc, subject: editSubject, difficulty: editDifficulty });
    if (deck.source_deck_id) await incrementEditCount(deck.id);
    setEditOpen(false);
    await refreshDeck();
    toast.success("Deck details updated.");
  };

  const handlePublishVersion = async () => {
    if (!userId) return;
    setLoading(true);
    const { error, newVersion } = await publishNewVersion(deck.id, userId);
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success(`Published version ${newVersion ?? ''}.`);
    await refreshDeck();
  };

  const handleInviteMod = async () => {
    setInviteError('');
    if (!userId || !inviteUsername.trim()) return;
    if (inviteUsername.trim() === (deck.owner_username ?? '')) { setInviteError("You cannot invite yourself."); return; }
    const { data: profile } = await supabase.from('profiles').select('id, username').eq('username', inviteUsername.trim()).maybeSingle();
    if (!profile) { setInviteError("Enter a username."); return; }
    // get current user's username
    const { data: myProf } = await supabase.from('profiles').select('username').eq('id', userId).maybeSingle();
    const myUsername = myProf?.username ?? 'Owner';
    const { error } = await inviteMod(deck.id, profile.id, deck.title, myUsername, inviteMessage.trim() || undefined);
    if (error) { setInviteError(error); return; }
    setInviteModOpen(false);
    setInviteUsername('');
    setInviteMessage('');
    toast.success(`Invitation sent to ${inviteUsername.trim()}.`);
  };

  const handleConfirmRemoveMod = async () => {
    if (!removeModTarget) return;
    await removeMod(deck.id, removeModTarget.user_id, deck.title);
    setMods(prev => prev.filter(m => m.user_id !== removeModTarget.user_id));
    setRemoveModTarget(null);
    setRemoveModInput('');
    toast.success("Moderator removed.");
  };

  const handleResolveReport = async (reportId: string) => {
    await resolveCardReport(reportId);
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, is_resolved: true } : r));
    await refreshDeck();
    toast.success("Suggestion resolved.");
  };

  const handleSync = async () => {
    if (!userId) return;
    setLoading(true);
    const { error } = await syncDeckToNewVersion(userId, deck.id);
    setLoading(false);
    if (error) { toast.error(error); return; }
    setSyncOpen(false);
    setPurchasedCopy(prev => prev ? { ...prev, synced_version: deck.version, has_update: false } : prev);
    toast.success("Your copy is up to date.");
  };

  const canPublishNew = deck.edit_count_since_last >= 10 && deck.unresolved_card_reports === 0;

  // ── Edit Cards (Manage tab) helpers ──────────────────────────────────────
  const openEditCards = async () => {
    setEditCardsOpen(true);
    setEditCardsLoading(true);
    const fresh = await fetchPublicDeckCards(deck.id);
    setCards(fresh);
    setPubCardExportSelected(new Set(fresh.map(c => c.id)));
    setEditCardsLoading(false);
  };

  const handlePubCardEdit = (card: PublicDeckCardType) => {
    setAddingPubCard(false);
    setEditingPubCardId(card.id);
    setPubCardModalFront(card.front_text);
    setPubCardModalBack(card.back_text);
    setPubCardModalNotes(card.notes ?? '');
  };

  const handlePubCardSave = async () => {
    const front = pubCardModalFront.trim();
    const back = pubCardModalBack.trim();
    if (!front || !back) { toast.error("Both front and back are required."); return; }

    if (addingPubCard) {
      // Create new card in DB only now
      const newCard = await addPublicDeckCard(deck.id, front, back, pubCardModalNotes.trim());
      if (!newCard) { toast.error("Could not add the card."); return; }
      await incrementEditCount(deck.id);
      setCards(prev => [...prev, newCard]);
      toast.success("Card added.");
    } else {
      if (!editingPubCardId) return;
      await updatePublicDeckCard(editingPubCardId, {
        front_text: front,
        back_text: back,
        notes: pubCardModalNotes.trim(),
      });
      await incrementEditCount(deck.id);
      setCards(prev => prev.map(c => c.id === editingPubCardId
        ? { ...c, front_text: front, back_text: back, notes: pubCardModalNotes.trim() }
        : c
      ));
      toast.success("Card updated.");
    }
    setEditingPubCardId(null);
    setAddingPubCard(false);
    await refreshDeck();
  };

  const handlePubCardDelete = async () => {
    if (!deletePubCardId) return;
    const cardToDelete = cards.find(c => c.id === deletePubCardId);
    if (!cardToDelete) { setDeletePubCardId(null); return; }

    // Optimistically remove from UI
    setCards(prev => prev.filter(c => c.id !== deletePubCardId));
    setDeletePubCardId(null);

    const id = cardToDelete.id;
    toast.success("Card deleted.", {
      action: {
        label: "Undo",
        onClick: () => {
          if (pubCardDeleteTimers.current[id]) {
            clearTimeout(pubCardDeleteTimers.current[id]);
            delete pubCardDeleteTimers.current[id];
          }
          setCards(prev => {
            if (prev.find(c => c.id === id)) return prev;
            return [...prev, cardToDelete];
          });
        },
      },
      duration: 5000,
    });

    pubCardDeleteTimers.current[id] = setTimeout(async () => {
      delete pubCardDeleteTimers.current[id];
      try {
        await deletePublicDeckCard(id);
        await incrementEditCount(deck.id);
        await refreshDeck();
      } catch {
        toast.error("Could not delete the card.");
        setCards(prev => {
          if (prev.find(c => c.id === id)) return prev;
          return [...prev, cardToDelete];
        });
      }
    }, 5000);
  };

  const handlePubCardAdd = () => {
    // Open the modal in "add" mode with empty placeholders — no DB write yet
    setEditingPubCardId('__new__');
    setAddingPubCard(true);
    setPubCardModalFront('');
    setPubCardModalBack('');
    setPubCardModalNotes('');
  };

  const handlePubCardImportParse = async () => {
    if (!pubCardImportFile) { toast.error("Choose a file first."); return; }
    const ext = pubCardImportFile.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['csv', 'json'].includes(ext)) { setPubCardImportError("Only .csv and .json files are supported."); return; }
    try {
      const text = await pubCardImportFile.text();
      const parsed = parseImportFile(text, ext);
      if (parsed.length === 0) throw new Error("No valid cards found in that file.");
      setPubCardImportParsed(parsed.map(p => ({ front: p.front, back: p.back, notes: p.notes ?? '' })));
      setPubCardImportStep('preview');
    } catch (e: any) { setPubCardImportError(e.message || 'Failed to parse file.'); }
  };

  const handlePubCardImportSave = async () => {
    setPubCardImportSaving(true);
    const count = await importPublicDeckCards(deck.id, pubCardImportParsed);
    if (count > 0) {
      for (let i = 0; i < count; i++) await incrementEditCount(deck.id);
    }
    const fresh = await fetchPublicDeckCards(deck.id);
    setCards(fresh);
    setPubCardImportOpen(false);
    setPubCardImportStep('upload');
    setPubCardImportFile(null);
    setPubCardImportParsed([]);
    setPubCardImportError('');
    if (pubCardImportFileRef.current) pubCardImportFileRef.current.value = '';
    setPubCardImportSaving(false);
    toast.success(`Imported ${count} cards.`);
    await refreshDeck();
  };

  const handlePubCardExport = () => {
    const selected = cards.filter(c => pubCardExportSelected.has(c.id));
    const deckName = deck.title.replace(/[^a-z0-9]/gi, '_');
    let content: string;
    let filename: string;
    if (pubCardExportFormat === 'csv') {
      const header = 'front,back';
      const rows = selected.map(c =>
        `"${(c.front_text ?? '').replace(/"/g, '""')}","${(c.back_text ?? '').replace(/"/g, '""')}"`
      );
      content = [header, ...rows].join('\n');
      filename = `${deckName}.csv`;
    } else {
      content = JSON.stringify(selected.map(c => ({ front: c.front_text, back: c.back_text })), null, 2);
      filename = `${deckName}.json`;
    }
    const blob = new Blob([content], { type: pubCardExportFormat === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    setPubCardExportOpen(false);
    toast.success(`Exported ${selected.length} cards.`);
  };

  return (
    <>
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-1">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      {/* Sync banner */}
      {purchased && purchasedCopy?.has_update && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between gap-3">
          <span className="text-sm text-primary">{`v${deck.version} available`}</span>
          <Button size="sm" onClick={() => setSyncOpen(true)}>
            <RefreshCw className="w-4 h-4 mr-1" /> View and sync
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-balance">{deck.title}</h1>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="secondary">{deck.subject ?? deck.subject}</Badge>
              <Badge variant="outline">{deck.difficulty ?? deck.difficulty}</Badge>
              <Badge variant="outline">{deck.version}</Badge>
              {deck.status !== 'public' && <Badge variant="destructive">{deck.status}</Badge>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {!purchased && !isOwner && (
              <Button onClick={handleBuy} disabled={buying}>
                {buying ? "Adding…" : `Get copy · ${deck.price}💎`}
              </Button>
            )}
            {purchased && existingRating === null && !isOwner && (
              <Button size="sm" variant="outline" onClick={() => { if (isGuest) { onGuestAction(); return; } setRatingModalOpen(true); }}>
                <Zap className="w-4 h-4 mr-1" /> Rate this deck
              </Button>
            )}
            {existingRating !== null && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>Your rating</span>
                <StarRating rating={existingRating} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
          <button
            className="flex items-center gap-1 hover:text-primary transition-colors text-left"
            onClick={() => navigate(`/self?user=${encodeURIComponent(deck.owner_username ?? '')}`)}
          >
            <User className="w-3 h-3" /> {deck.owner_username}
          </button>
          <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {`${deck.download_count} downloads`}</span>
          <span className="flex items-center gap-1">
            {deck.avg_rating > 0 ? (
              <><StarRating rating={deck.avg_rating} />{deck.avg_rating.toFixed(1)}</>
            ) : (
              <span>Be the first to share a deck here.</span>
            )}
          </span>
          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {new Date(deck.created_at).toLocaleDateString()}</span>
        </div>

      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cards">{`${cards.length} cards`}</TabsTrigger>
          <TabsTrigger value="mods">Mods</TabsTrigger>
          {canManage && <TabsTrigger value="manage">Manage</TabsTrigger>}
          {canManage && <TabsTrigger value="reports">{`Suggestions (${reports.filter(r => !r.is_resolved).length})`}</TabsTrigger>}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1">Description</h3>
            <p className="text-sm text-muted-foreground text-pretty">{deck.description}</p>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-2">Preview · 3 cards</h3>
            <div className="space-y-2">
              {cards.slice(0, 3).map(c => (
                <div key={c.id} className="p-3 rounded-md bg-secondary/40 text-sm">
                  <p className="font-medium">{c.front_text}</p>
                  <p className="text-muted-foreground mt-1">{c.back_text}</p>
                </div>
              ))}
              {cards.length === 0 && <p className="text-sm text-muted-foreground">No cards to preview yet.</p>}
            </div>
          </div>
          {!isOwner && !isMod && deck.status === 'public' && (
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => { if (isGuest) { onGuestAction(); return; } setDeckReportConfirmOpen(true); }}
              >
                <AlertCircle className="w-4 h-4 mr-1" /> Report deck
              </Button>
            </div>
          )}
        </TabsContent>

        {/* All Cards */}
        <TabsContent value="cards" className="mt-4 space-y-3">
          {/* All Cards — world deck detail view search */}
          {cards.length > 0 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search cards…"
                value={worldCardSearch}
                onChange={e => setWorldCardSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {worldCardSearch && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setWorldCardSearch('')}
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          {filteredWorldCards.length === 0 && cards.length > 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No cards match your search.</p>
          ) : (
          <VirtualCardList
            items={filteredWorldCards}
            estimateSize={96}
            renderItem={(c, i) => (
              <div className="pb-2">
                <div className="p-3 rounded-md bg-secondary/30 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{i + 1}. {c.front_text}</p>
                      <p className="text-muted-foreground mt-0.5">{c.back_text}</p>
                      {c.notes && (
                        <p className="text-xs text-muted-foreground/70 mt-1 italic">Notes: {c.notes}</p>
                      )}
                    </div>
                    {!isOwner && !isMod && userId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => { if (isGuest) { onGuestAction(); return; } setReportingCard(c); setReportCardOpen(true); }}
                      >
                        <AlertCircle className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          />
          )}
        </TabsContent>

        {/* Mods — visible to everyone */}
        <TabsContent value="mods" className="mt-4">
          <div className="space-y-3">
            {/* Invite Mod button for owner — above first row */}
            {isOwner && (
              <Button size="sm" variant="outline" onClick={() => { setInviteError(''); setInviteUsername(''); setInviteMessage(''); setInviteModOpen(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Invite moderator
              </Button>
            )}
            {/* Owner row */}
            <ModMemberRow
              username={deck.owner_username ?? 'Unknown'}
              role="Owner"
              profileGradient={ownerProfile?.profile_gradient}
              profileCharacter={ownerProfile?.profile_character}
              profileCharColor={ownerProfile?.profile_char_color}
              onViewProfile={(u) => navigate(`/self?user=${encodeURIComponent(u)}`)}
            />
            {/* Mod rows */}
            {mods.map(m => (
              <ModMemberRow
                key={m.id}
                username={m.username ?? 'Unknown'}
                role="Mod"
                profileGradient={m.profile_gradient}
                profileCharacter={m.profile_character}
                profileCharColor={m.profile_char_color}
                onViewProfile={(u) => navigate(`/self?user=${encodeURIComponent(u)}`)}
                onRemove={isOwner ? () => { setRemoveModTarget(m); setRemoveModInput(''); } : undefined}
              />
            ))}
          </div>
        </TabsContent>

        {/* Manage (owner/mod) */}
        {canManage && (
          <TabsContent value="manage" className="mt-4 space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">Deck</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>Edit details</Button>
                <Button size="sm" variant="outline" onClick={openEditCards}>Edit cards</Button>
                {isOwner && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive border border-destructive/30"
                    onClick={() => setUnpublishOpen(true)}
                  >
                    Unpublish
                  </Button>
                )}
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-2">Version</h3>
              <p className="text-xs text-muted-foreground mb-2">
                {`${deck.edit_count_since_last} edits since`} &nbsp;|&nbsp;
                {`${deck.unresolved_card_reports} open suggestions`}
              </p>
              <Button
                size="sm"
                onClick={handlePublishVersion}
                disabled={!canPublishNew || loading}
                title={!canPublishNew ? "Publish is locked until your current version is approved." : ''}
              >
                {loading ? 'Publishing...' : `Publish v${deck.version}`}
              </Button>
              {!canPublishNew && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Publish is locked until your current version is approved.
                </p>
              )}
            </div>
          </TabsContent>
        )}

        {/* Reports (owner/mod) */}
        {canManage && (
          <TabsContent value="reports" className="mt-4">
            {reports.length === 0 && <p className="text-sm text-muted-foreground">No suggestions yet.</p>}
            <div className="space-y-2">
              {reports.map(r => (
                <div key={r.id} className={`p-3 rounded-md border text-sm ${r.is_resolved ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{r.reason}</p>
                      {r.explanation && <p className="text-muted-foreground mt-0.5 text-xs">{r.explanation}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(r.created_at).toLocaleDateString()} · {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!r.is_resolved && (
                      <Button size="sm" variant="outline" onClick={() => handleResolveReport(r.id)}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Resolve
                      </Button>
                    )}
                    {r.is_resolved && <Badge variant="secondary">Resolved</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Rating modal */}
      <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rate this deck</DialogTitle>
            <DialogDescription>You can rate each deck once. Choose a score from 1 to 5.</DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            <StarRating rating={pendingRating} onRate={setPendingRating} />
          </div>
          <DialogFooter>
            <Button onClick={handleRateSubmit} disabled={!pendingRating}>Submit rating</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card suggestion modal */}
      <Dialog open={reportCardOpen} onOpenChange={setReportCardOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a suggestion</DialogTitle>
            <DialogDescription>Tell the deck's moderators what should change.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={cardReportReason} onValueChange={v => setCardReportReason(v as CardReportReason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {([...["Wrong answer or typo","Confusing front","Duplicate card","Missing information","Something else"]] as string[]).map((r, i) => <SelectItem key={i} value={CARD_REPORT_REASONS_STATIC[i] || r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            {cardReportReason === 'Other' && (
              <Textarea
                placeholder="What should change on this card?"
                value={cardReportExplanation}
                onChange={e => setCardReportExplanation(e.target.value)}
                rows={3}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportCardOpen(false)}>Cancel</Button>
            <Button onClick={handleCardReport}>Send suggestion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deck report confirm */}
      <AlertDialog open={deckReportConfirmOpen} onOpenChange={setDeckReportConfirmOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Send this report?</AlertDialogTitle>
            <AlertDialogDescription>
              A moderator will review this deck. False reports can affect your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setDeckReportConfirmOpen(false); setDeckReportModalOpen(true); }}>
              Send report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deck report form */}
      <Dialog open={deckReportModalOpen} onOpenChange={setDeckReportModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Report deck</DialogTitle>
            <DialogDescription>Tell us what is wrong with this deck.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={deckReportReason} onValueChange={v => setDeckReportReason(v as DeckReportReason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {([...["Spam or advertising","Offensive content","Copyright violation","Incorrect information","Something else"]] as string[]).map((r, i) => <SelectItem key={i} value={DECK_REPORT_REASONS_STATIC[i] || r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            {deckReportReason === 'Other' && (
              <Textarea
                placeholder="What should change on this card?"
                value={deckReportExplanation}
                onChange={e => setDeckReportExplanation(e.target.value)}
                rows={3}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeckReportModalOpen(false)}>Cancel</Button>
            <Button onClick={handleDeckReport}>Send report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit details modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit deck details</DialogTitle>
            <DialogDescription>Update the title, subject, difficulty and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-2 rounded bg-muted text-sm text-muted-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" /> Title: {deck.title}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Description</Label>
              <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={200} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Subject</Label>
                <Select value={editSubject} onValueChange={setEditSubject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s ?? s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Difficulty</Label>
                <Select value={editDifficulty} onValueChange={setEditDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d ?? d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite mod modal */}
      <Dialog open={inviteModOpen} onOpenChange={v => { if (!v) { setInviteModOpen(false); setInviteError(''); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite a moderator</DialogTitle>
            <DialogDescription>Moderators can edit cards and answer suggestions for this deck.</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Username</Label>
              <Input placeholder="Their username" value={inviteUsername} onChange={e => { setInviteUsername(e.target.value); setInviteError(''); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Message <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                placeholder="Add a note (optional)…"
                value={inviteMessage}
                onChange={e => setInviteMessage(e.target.value)}
                maxLength={300}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">{inviteMessage.length}/300</p>
            </div>
            {inviteError && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <X className="w-3.5 h-3.5 shrink-0" />{inviteError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setInviteModOpen(false); setInviteError(''); }}>Cancel</Button>
            <Button onClick={handleInviteMod} disabled={!inviteUsername.trim()}>Send invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove mod confirmation modal */}
      <Dialog open={!!removeModTarget} onOpenChange={v => { if (!v) { setRemoveModTarget(null); setRemoveModInput(''); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>{`Remove ${removeModTarget?.username ?? ''} as moderator`}</DialogTitle>
            <DialogDescription>
              This will revoke their moderator access. Type <span className="font-mono font-semibold text-foreground">remove{removeModTarget?.username}frommods</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder={`Type ${removeModTarget?.username ?? ""} to confirm`}
              value={removeModInput}
              onChange={e => setRemoveModInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRemoveModTarget(null); setRemoveModInput(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={removeModInput !== `remove${removeModTarget?.username}frommods`}
              onClick={handleConfirmRemoveMod}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync modal */}
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>{`Sync v${deck.version}`}</DialogTitle>
            <DialogDescription>
              {`Update your copy to match version ${deck.version}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncOpen(false)}>Later</Button>
            <Button onClick={handleSync} disabled={loading}>
              {loading ? "Syncing…" : `Sync v${deck.version}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpublish confirm dialog (from Manage > Deck Control) */}
      <AlertDialog open={unpublishOpen} onOpenChange={v => { if (!v) { setUnpublishOpen(false); setUnpublishAcknowledged(false); } }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{`Unpublish “${deck.title}”?`}</AlertDialogTitle>
            <AlertDialogDescription>
              Your deck will be removed from the Athenaeum. Copies people already downloaded stay with them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-0 pb-2">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={unpublishAcknowledged}
                onChange={e => setUnpublishAcknowledged(e.target.checked)}
                className="mt-0.5 accent-destructive"
              />
              <span className="text-sm text-muted-foreground">
                I understand this removes the deck for everyone who downloaded it.
              </span>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setUnpublishOpen(false); setUnpublishAcknowledged(false); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!unpublishAcknowledged || unpublishing}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50"
              onClick={handleUnpublish}
            >
              {unpublishing ? "Unpublishing…" : "Unpublish deck"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

      {/* ── Edit Cards modal ─────────────────────────────────────────────── */}
      <Dialog open={editCardsOpen} onOpenChange={v => { if (!v) setEditCardsOpen(false); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl flex flex-col max-h-[90dvh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>{`Edit cards in “${deck.title}”`}</DialogTitle>
          </DialogHeader>
          <div className="shrink-0 flex gap-2 flex-wrap border-b border-border pb-3">
            <Button size="sm" onClick={handlePubCardAdd}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Add card
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setPubCardImportStep('upload'); setPubCardImportFile(null); setPubCardImportError(''); setPubCardImportParsed([]); if (pubCardImportFileRef.current) pubCardImportFileRef.current.value = ''; setPubCardImportOpen(true); }}>
              <FileUp className="w-3.5 h-3.5 mr-1.5" />Import cards
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setPubCardExportSelected(new Set(cards.map(c => c.id))); setPubCardExportOpen(true); }}>
              <FileDown className="w-3.5 h-3.5 mr-1.5" />Export cards
            </Button>
          </div>
          <div className="flex-1 overflow-hidden min-h-0 py-2">
            {/* Edit Cards search */}
            {cards.length > 0 && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search cards…"
                  value={editCardsSearch}
                  onChange={e => setEditCardsSearch(e.target.value)}
                  className="pl-9 pr-8"
                />
                {editCardsSearch && (
                  <button
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditCardsSearch('')}
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            {editCardsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : cards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No cards match your search.</p>
            ) : filteredEditCards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No cards match your search.</p>
            ) : (
              <VirtualCardList
                items={filteredEditCards}
                estimateSize={100}
                maxHeight="clamp(300px, 55vh, 560px)"
                renderItem={(c, i) => (
                  <div className="pb-2">
                    <div className="p-3 rounded-lg border border-border bg-secondary/30">
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-muted-foreground shrink-0 mt-0.5 w-5">{i + 1}.</span>
                        <div className="flex-1 min-w-0 grid grid-cols-2 gap-2 cursor-pointer" onClick={() => handlePubCardEdit(c)}>
                          <div className="hover:bg-secondary/50 rounded px-1 py-0.5 transition-colors">
                            <p className="text-xs text-muted-foreground mb-0.5">Front</p>
                            <p className="text-sm text-foreground text-pretty">{c.front_text}</p>
                          </div>
                          <div className="hover:bg-secondary/50 rounded px-1 py-0.5 transition-colors">
                            <p className="text-xs text-muted-foreground mb-0.5">Back</p>
                            <p className="text-sm text-foreground text-pretty">{c.back_text}</p>
                          </div>
                          {c.notes && (
                            <div className="col-span-2 hover:bg-secondary/50 rounded px-1 py-0.5 transition-colors">
                              <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                              <p className="text-sm text-foreground text-pretty">{c.notes}</p>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="shrink-0 text-destructive hover:text-destructive" onClick={() => setDeletePubCardId(c.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
          </div>
          <DialogFooter className="shrink-0 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setEditCardsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit individual card modal ────────────────────────────────────── */}
      <Dialog open={!!editingPubCardId} onOpenChange={v => { if (!v) { setEditingPubCardId(null); setAddingPubCard(false); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{addingPubCard ? "Add card" : "Edit card"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Front</Label>
              <Textarea
                autoFocus
                placeholder="The question, term, or prompt"
                value={pubCardModalFront}
                onChange={e => setPubCardModalFront(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Back</Label>
              <Textarea
                placeholder="The answer, definition, or translation"
                value={pubCardModalBack}
                onChange={e => setPubCardModalBack(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
              <Textarea
                placeholder="An optional hint or extra detail"
                value={pubCardModalNotes}
                onChange={e => setPubCardModalNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingPubCardId(null); setAddingPubCard(false); }}>Cancel</Button>
            <Button onClick={handlePubCardSave} disabled={!pubCardModalFront.trim() || !pubCardModalBack.trim()}>
              {addingPubCard ? "Add card" : "Save card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete card confirmation ──────────────────────────────────────── */}
      <AlertDialog open={!!deletePubCardId} onOpenChange={v => { if (!v) setDeletePubCardId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>This card will be removed from your deck. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePubCardDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Import Cards modal ──────────────────────────────────────────── */}
      <Dialog open={pubCardImportOpen} onOpenChange={v => { if (!v) { setPubCardImportOpen(false); setPubCardImportStep('upload'); setPubCardImportFile(null); setPubCardImportError(''); setPubCardImportParsed([]); if (pubCardImportFileRef.current) pubCardImportFileRef.current.value = ''; } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg flex flex-col max-h-[90dvh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>{pubCardImportStep === 'upload' ? "Import cards" : `Preview ${pubCardImportParsed.length}`}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {pubCardImportStep === 'upload' ? (
              <div className="space-y-4 py-2">
                <input ref={pubCardImportFileRef} type="file" accept=".csv,.json" className="hidden"
                  onChange={e => { setPubCardImportFile(e.target.files?.[0] ?? null); setPubCardImportError(''); }} />
                {pubCardImportFile ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary/30 text-sm">
                    <FileDown className="w-4 h-4 text-primary shrink-0" />
                    <span className="flex-1 min-w-0 truncate">{pubCardImportFile.name}</span>
                    <button onClick={() => { setPubCardImportFile(null); setPubCardImportError(''); if (pubCardImportFileRef.current) pubCardImportFileRef.current.value = ''; }}
                      className="shrink-0 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => pubCardImportFileRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />Choose file
                  </Button>
                )}
                {pubCardImportError && <p className="text-xs text-destructive">{pubCardImportError}</p>}
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Accepted headers</p>
                  <p>Front: <span className="font-mono">front, question, q, ques</span></p>
                  <p>Back: <span className="font-mono">back, answer, a, ans</span></p>
                  <p>Notes: <span className="font-mono">notes, note, hint</span> (optional)</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                <p className="text-xs text-muted-foreground">Review the cards before importing them.</p>
                {pubCardImportParsed.map((card, i) => (
                  <div key={i} className="p-3 rounded-md border border-border bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground font-medium">{`Card ${i + 1}`}</span>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => setPubCardImportParsed(prev => prev.filter((_, j) => j !== i))}
                        aria-label="Remove card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Front</p>
                      <Textarea value={card.front} onChange={e => setPubCardImportParsed(prev => prev.map((c, j) => j === i ? { ...c, front: e.target.value } : c))} rows={2} className="resize-none text-sm" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Back</p>
                      <Textarea value={card.back} onChange={e => setPubCardImportParsed(prev => prev.map((c, j) => j === i ? { ...c, back: e.target.value } : c))} rows={2} className="resize-none text-sm" />
                    </div>
                    {card.notes && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Notes</p>
                        <Textarea value={card.notes} onChange={e => setPubCardImportParsed(prev => prev.map((c, j) => j === i ? { ...c, notes: e.target.value } : c))} rows={1} className="resize-none text-sm" />
                      </div>
                    )}
                  </div>
                ))}
                {pubCardImportParsed.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">All cards removed. Publish to apply the changes.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 pt-2 border-t border-border gap-2">
            {pubCardImportStep === 'upload' ? (
              <>
                <Button variant="outline" onClick={() => setPubCardImportOpen(false)}>Cancel</Button>
                <Button onClick={handlePubCardImportParse} disabled={!pubCardImportFile}>Preview cards</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setPubCardImportStep('upload')}>Back</Button>
                <Button onClick={handlePubCardImportSave} disabled={pubCardImportSaving || pubCardImportParsed.length === 0}>
                  {pubCardImportSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : `Import ${pubCardImportParsed.length} Cards`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Export Cards modal ──────────────────────────────────────────── */}
      <Dialog open={pubCardExportOpen} onOpenChange={v => { if (!v) setPubCardExportOpen(false); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md flex flex-col max-h-[90dvh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Export cards</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-sm text-muted-foreground">{pubCardExportSelected.size} of {cards.length} selected</span>
            <Button size="sm" variant="ghost" onClick={() => setPubCardExportSelected(
              pubCardExportSelected.size === cards.length ? new Set() : new Set(cards.map(c => c.id))
            )}>
              {pubCardExportSelected.size === cards.length ? "Deselect all" : "Select all"}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
            {cards.map((c, i) => (
              <label key={c.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${pubCardExportSelected.has(c.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}>
                <input type="checkbox" className="mt-0.5 shrink-0" checked={pubCardExportSelected.has(c.id)}
                  onChange={() => setPubCardExportSelected(prev => { const next = new Set(prev); if (next.has(c.id)) next.delete(c.id); else next.add(c.id); return next; })} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">#{i + 1} {c.front_text}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.back_text}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="shrink-0 pt-3 border-t border-border space-y-3">
            <div className="flex gap-2">
              {(['csv', 'json'] as const).map(fmt => (
                <button key={fmt} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${pubCardExportFormat === fmt ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/40'}`}
                  onClick={() => setPubCardExportFormat(fmt)}>{fmt.toUpperCase()}</button>
              ))}
            </div>
            <Button className="w-full" disabled={pubCardExportSelected.size === 0} onClick={handlePubCardExport}>
              {`Export ${pubCardExportSelected.size} card${pubCardExportSelected.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

function UploadDeckModal({
  open, onClose, userId, onUploaded,
}: { open: boolean; onClose: () => void; userId: string; onUploaded: () => void }) {
  const [myDecks, setMyDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [deckTitle, setDeckTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Other');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from('decks').select('*').eq('user_id', userId).order('title').then(({ data }) => {
        setMyDecks(data || []);
      });
    }
  }, [open, userId]);

  const selectedDeck = myDecks.find(d => d.id === selectedDeckId);

  useEffect(() => {
    if (selectedDeck) {
      setDeckTitle(selectedDeck.title);
      setSubject(selectedDeck.subject);
      setDifficulty(selectedDeck.difficulty);
    }
  }, [selectedDeck]);

  const handleSubmit = async () => {
    if (!selectedDeck) { toast.error("Choose a deck first."); return; }
    if (!deckTitle.trim()) { toast.error("Give the deck a title first."); return; }
    if (!description.trim()) { toast.error("Add a short description."); return; }

    setLoading(true);
    const { error } = await publishDeck({
      userId, deckId: selectedDeck.id, title: deckTitle.trim(),
      description: description.trim(), subject, difficulty, price: 0,
    });
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success("Deck contributed. Thanks for sharing!");
    onUploaded();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md flex flex-col max-h-[90dvh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Contribute to the Athenaeum</DialogTitle>
          <DialogDescription>Share a deck with the community so anyone can study it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 overflow-y-auto flex-1 min-h-0 pr-1">
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">Deck</Label>
            <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
              <SelectTrigger><SelectValue placeholder="Choose a deck" /></SelectTrigger>
              <SelectContent>
                {myDecks.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">Deck</Label>
            <Input
              value={deckTitle}
              onChange={e => setDeckTitle(e.target.value)}
              placeholder="Deck title"
              maxLength={80}
            />
            <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <span>The title cannot be changed.</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={200} rows={3} placeholder="What is this deck about?" />
            <p className="text-xs text-muted-foreground text-right">{description.length}/200</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s ?? s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d ?? d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="shrink-0 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Contributing…" : "Contribute deck"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ModMemberRow ─────────────────────────────────────────────────────────────
function ModMemberRow({
  username,
  role,
  onViewProfile,
  profileGradient,
  profileCharacter,
  profileCharColor,
  onRemove,
}: {
  username: string;
  role: 'Owner' | 'Mod';
  onViewProfile: (username: string) => void;
  profileGradient?: string;
  profileCharacter?: string;
  profileCharColor?: string;
  onRemove?: () => void;
}) {
  const gradientCss = PROFILE_GRADIENTS.find(g => g.id === (profileGradient || 'default'))?.css
    ?? 'linear-gradient(135deg, #B026FF, #00D4FF)';
  // Stable char: use profile_character if present, else first letter of username, never '?'
  const displayChar = profileCharacter || (username && username.length > 0 ? username[0].toUpperCase() : 'F');
  const displayColor = profileCharColor || '#ffffff';
  return (
    <div className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors">
      <button
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center overflow-hidden focus:outline-none"
        style={{ background: gradientCss }}
        onClick={() => onViewProfile(username)}
        title={username}
      >
        <ProfileCharacter
          char={displayChar}
          color={displayColor}
          size={18}
        />
      </button>
      <button
        className="flex-1 min-w-0 text-left focus:outline-none"
        onClick={() => onViewProfile(username)}
      >
        <p className="text-sm font-medium text-foreground truncate">{username}</p>
      </button>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
        role === 'Owner' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
      }`}>
        {role === 'Owner' ? "Owner" : "Mod"}
      </span>
      {onRemove && (
        <button
          className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          title="Moderator removed."
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Tier display ──────────────────────────────────────────────────────────────
// ── Arena leagues (for the league leaderboard section) ────────────────────────
const ARENA_LEAGUES = [
  { name: 'Sting',    emoji: '🐝', min: 0,    color: 'from-zinc-600 to-zinc-500' },
  { name: 'Grip',     emoji: '🤝', min: 100,  color: 'from-green-700 to-green-500' },
  { name: 'Void',     emoji: '🌑', min: 250,  color: 'from-slate-700 to-slate-500' },
  { name: 'Grind',    emoji: '⚙️', min: 500,  color: 'from-orange-700 to-orange-500' },
  { name: 'Blade',    emoji: '🗡️', min: 900,  color: 'from-red-700 to-red-500' },
  { name: 'Surge',    emoji: '⚡', min: 1400, color: 'from-yellow-600 to-yellow-400' },
  { name: 'Gaze',     emoji: '👁️', min: 2000, color: 'from-teal-600 to-teal-400' },
  { name: 'Vector',   emoji: '📐', min: 2750, color: 'from-blue-600 to-blue-400' },
  { name: 'Blaze',    emoji: '🔥', min: 3600, color: 'from-orange-500 to-red-400' },
  { name: 'Canon',    emoji: '💥', min: 4600, color: 'from-pink-600 to-rose-400' },
  { name: 'Keystone', emoji: '🗝️', min: 6000, color: 'from-amber-600 to-yellow-500' },
  { name: 'Apex',     emoji: '🦅', min: 7500, color: 'from-violet-600 to-purple-400' },
  { name: 'Zenith',   emoji: '🌟', min: 9500, color: 'from-yellow-400 to-amber-300' },
] as const;

function getLeagueForTrophies(trophies: number) {
  let l: typeof ARENA_LEAGUES[number] = ARENA_LEAGUES[0];
  for (const lg of ARENA_LEAGUES) { if (trophies >= lg.min) l = lg; }
  return l;
}

// ── LeaderboardEntry type ─────────────────────────────────────────────────────
interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  total_exp: number;
  trophies: number;
  rank: number;          // 1-based, ties share rank
  rankTime: string;      // ISO timestamp used as tiebreak
}

// ── LeagueTab — Live Global Leaderboard ────────────────────────────────────────
function LeagueTab({
  userExp,
  userId,
  profile,
  onGeodeClaimed,
}: {
  userExp: number | null;
  userId: string | null;
  profile: import('@/types/types').Profile | null;
  onGeodeClaimed: () => void;
}) {
  const currentTierIdx = userExp !== null ? getUserLeagueIndex(userExp) : -1;
  const userTrophies = profile?.trophies ?? 0;
  const userLeague = getLeagueForTrophies(userTrophies);
  const userLeagueIdx = ARENA_LEAGUES.findIndex(l => l.name === userLeague.name);

  const [activeTab] = useState<'tier' | 'league'>('tier');

  // ── Tier leaderboard state ────────────────────────────────────────────────
  const [tierBoards, setTierBoards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [tierCounts, setTierCounts] = useState<Record<string, number>>({});
  const [tierLoading, setTierLoading] = useState(false);

  // ── League leaderboard state ───────────────────────────────────────────────
  const [, setLeagueBoards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [, setLeagueCounts] = useState<Record<string, number>>({});
  const [, setLeagueLoading] = useState(false);

  // Geode claim
  const [claiming, setClaiming] = useState<string | null>(null);
  const tierClaimed = profile?.tier_rewards_claimed ?? [];
  const GEODE_TIERS = [
    { name: 'Ruler',      count: 1, min: 5,  max: 50  },
    { name: 'Protractor', count: 1, min: 10, max: 100 },
    { name: 'Compass',    count: 7, min: 7,  max: 70  },
  ];

  const handleClaimGeode = async (tierName: string) => {
    if (!userId || !profile || !userExp) return;
    const geode = GEODE_TIERS.find(g => g.name === tierName);
    if (!geode) return;
    setClaiming(tierName);
    try {
      const gems = await claimGeodeReward(
        userId, tierName,
        { total_exp: userExp, tier_rewards_claimed: tierClaimed, gems: profile.gems ?? 0 },
        geode.count, geode.min, geode.max,
      );
      if (gems > 0) {
        const { toast } = await import('sonner');
        toast.success(`💎 Geode cracked! You earned ${gems} gems!`);
        onGeodeClaimed();
      }
    } finally { setClaiming(null); }
  };

  // ── Load tier leaderboard ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'tier' || currentTierIdx < 0) return;
    setTierLoading(true);

    // Tiers visible to user: their tier + all below
    const visibleTiers = LEAGUE_TIERS.slice(0, currentTierIdx + 1);

    const fetchTierData = async () => {
      const counts: Record<string, number> = {};
      const boards: Record<string, LeaderboardEntry[]> = {};

      for (const tier of visibleTiers) {
        const minExp = tier.threshold;
        const tierIdx = LEAGUE_TIERS.findIndex(t => t.name === tier.name);
        const maxExp = tierIdx < LEAGUE_TIERS.length - 1 ? LEAGUE_TIERS[tierIdx + 1].threshold - 1 : undefined;

        // Count
        let countQuery = supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .or(`total_exp.gte.${minExp},total_exp.is.null`);
        if (maxExp !== undefined) countQuery = (countQuery as any).lte('total_exp', maxExp);
        const { count } = await countQuery;
        counts[tier.name] = count ?? 0;

        // Top entries (fetch more than 7 for contextual rows)
        let q = supabase
          .from('profiles')
          .select('id, username, avatar_url, total_exp, trophies, updated_at')
          .gte('total_exp', minExp)
          .order('total_exp', { ascending: false, nullsFirst: false })
          .order('trophies', { ascending: false })
          .order('updated_at', { ascending: true })
          .limit(100);
        if (maxExp !== undefined) q = q.lte('total_exp', maxExp);
        const { data } = await q;

        boards[tier.name] = assignRanks(data ?? []);
      }

      setTierCounts(counts);
      setTierBoards(boards);
      setTierLoading(false);
    };

    fetchTierData();
  }, [activeTab, currentTierIdx, userId]);

  // ── Load league leaderboard ───────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'league' || userLeagueIdx < 0) return;
    setLeagueLoading(true);

    const visibleLeagues = ARENA_LEAGUES.slice(0, userLeagueIdx + 1);

    const fetchLeagueData = async () => {
      const counts: Record<string, number> = {};
      const boards: Record<string, LeaderboardEntry[]> = {};

      for (const league of visibleLeagues) {
        const minTrophies = league.min;
        const lgIdx = ARENA_LEAGUES.findIndex(l => l.name === league.name);
        const maxTrophies = lgIdx < ARENA_LEAGUES.length - 1 ? ARENA_LEAGUES[lgIdx + 1].min - 1 : undefined;

        let countQuery = supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('trophies', minTrophies);
        if (maxTrophies !== undefined) countQuery = countQuery.lte('trophies', maxTrophies);
        const { count } = await countQuery;
        counts[league.name] = count ?? 0;

        let q = supabase
          .from('profiles')
          .select('id, username, avatar_url, total_exp, trophies, updated_at')
          .gte('trophies', minTrophies)
          .order('trophies', { ascending: false })
          .order('total_exp', { ascending: false })
          .order('updated_at', { ascending: true })
          .limit(50);
        if (maxTrophies !== undefined) q = q.lte('trophies', maxTrophies);
        const { data } = await q;

        boards[league.name] = assignRanks(data ?? []);
      }

      setLeagueCounts(counts);
      setLeagueBoards(boards);
      setLeagueLoading(false);
    };

    fetchLeagueData();
  }, [activeTab, userLeagueIdx, userId]);

  // ── Assign ranks (ties share rank, tiebreak by time) ─────────────────────
  function assignRanks(rows: any[]): LeaderboardEntry[] {
    let rank = 1;
    return rows.map((row, i) => {
      if (i > 0) {
        const prev = rows[i - 1];
        // Same EXP+Trophies = same rank
        if (row.total_exp !== prev.total_exp || row.trophies !== prev.trophies) rank = i + 1;
      }
      return {
        id: row.id,
        username: row.username ?? 'Flusher',
        avatar_url: row.avatar_url,
        total_exp: row.total_exp ?? 0,
        trophies: row.trophies ?? 0,
        rank,
        rankTime: row.updated_at ?? '',
      };
    });
  }

  const isLocked = userId === null;

  return (
    <div className="max-w-2xl mx-auto py-2 space-y-6">
{/* Tiers only – no toggle */}

      {/* ── Tier Leaderboard ─────────────────────────────────────────────── */}
      {(
        <div className="space-y-8">
          {isLocked ? (
            <LockedOverlay label="Sign in to see Tier standings" />
          ) : tierLoading ? (
            <LeaderboardSkeleton />
          ) : (
            [...LEAGUE_TIERS].slice(0, currentTierIdx + 1).reverse().map(tier => {
              const isCurrent = tier.name === LEAGUE_TIERS[currentTierIdx]?.name;
              const board = tierBoards[tier.name] ?? [];
              const count = tierCounts[tier.name] ?? 0;
              const geodeTier = ['Ruler', 'Protractor', 'Compass'].includes(tier.name) ? tier.name : null;
              const geodeClaimed = geodeTier ? tierClaimed.includes(geodeTier) : false;
              const canClaim = isCurrent && geodeTier && !geodeClaimed && !!userId;
              return (
                <LeaderboardCard
                  key={tier.name}
                  label={`${tier.emoji} ${tier.name} Tier`}
                  subLabel={`${tier.threshold.toLocaleString()} EXP`}
                  count={count}
                  board={board}
                  userId={userId}
                  isCurrent={isCurrent}
                  primaryStat="exp"
                  geodeTier={geodeTier}
                  geodeClaimed={geodeClaimed}
                  canClaim={!!canClaim}
                  claiming={claiming === geodeTier}
                  onClaimGeode={() => geodeTier && handleClaimGeode(geodeTier)}
                />
              );
            })
          )}
        </div>
      )}

{/* League leaderboard removed from Tiers page – lives in Arena */}
    </div>
  );
}

// ── Leaderboard Card ──────────────────────────────────────────────────────────
function LeaderboardCard({
  label, subLabel, count, board, userId, isCurrent, primaryStat,
  geodeTier, geodeClaimed, canClaim, claiming, onClaimGeode,
}: {
  label: string;
  subLabel: string;
  count: number;
  board: LeaderboardEntry[];
  userId: string | null;
  isCurrent: boolean;
  primaryStat: 'exp' | 'trophies';
  geodeTier?: string | null;
  geodeClaimed?: boolean;
  canClaim?: boolean;
  claiming?: boolean;
  onClaimGeode?: () => void;
}) {
  const top3 = board.slice(0, 3);
  const rows4to7 = board.slice(3, 7);
  const userEntry = userId ? board.find(e => e.id === userId) : undefined;
  const userInTop7 = userEntry ? userEntry.rank <= 7 : false;

  // Contextual: user's rank ±1
  const userIdx = userId ? board.findIndex(e => e.id === userId) : -1;
  const contextRows: LeaderboardEntry[] = [];
  if (userEntry && !userInTop7 && userIdx >= 0) {
    if (userIdx > 0) contextRows.push(board[userIdx - 1]);
    contextRows.push(userEntry);
    if (userIdx < board.length - 1) contextRows.push(board[userIdx + 1]);
  }

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isCurrent
        ? 'border-primary/50 shadow-lg shadow-primary/10'
        : 'border-border/50'
    }`}>
      {/* Header */}
      <div className={`px-5 py-4 flex items-center justify-between ${
        isCurrent
          ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-transparent'
          : 'bg-secondary/20'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground text-base">{label}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{subLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Flusher count — only for user's tier/league and below */}
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{count.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Flushers</p>
          </div>
          {/* Geode claim */}
          {geodeTier && (
            geodeClaimed ? (
              <span className="text-xs px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground">✓ Claimed</span>
            ) : (
              <button
                disabled={!canClaim || claiming}
                onClick={onClaimGeode}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {claiming ? '…' : '🪨 Claim'}
              </button>
            )
          )}
        </div>
      </div>

      {board.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">No Flushers here yet.</p>
        </div>
      ) : (
        <div className="px-5 pb-5 pt-3 space-y-4">
          {/* Podium: Top 3 */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-3 pt-2 pb-1">
              {/* 2nd */}
              {top3[1] ? (
                <PodiumCircle entry={top3[1]} pos={2} isMe={top3[1].id === userId} primaryStat={primaryStat} />
              ) : <div className="w-20" />}
              {/* 1st */}
              {top3[0] && (
                <PodiumCircle entry={top3[0]} pos={1} isMe={top3[0].id === userId} primaryStat={primaryStat} />
              )}
              {/* 3rd */}
              {top3[2] ? (
                <PodiumCircle entry={top3[2]} pos={3} isMe={top3[2].id === userId} primaryStat={primaryStat} />
              ) : <div className="w-20" />}
            </div>
          )}

          {/* Rows 4–7 */}
          {rows4to7.length > 0 && (
            <div className="space-y-1.5">
              {rows4to7.map(entry => (
                <LeaderboardRow key={entry.id} entry={entry} isMe={entry.id === userId} primaryStat={primaryStat} />
              ))}
            </div>
          )}

          {/* Contextual rows (user outside top 7) */}
          {contextRows.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                <div className="flex-1 h-px bg-border/60" />
                <span>Your ranking</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="space-y-1.5">
                {contextRows.map((entry, i) => (
                  <LeaderboardRow key={`ctx-${entry.id}-${i}`} entry={entry} isMe={entry.id === userId} primaryStat={primaryStat} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Podium Circle ─────────────────────────────────────────────────────────────
function PodiumCircle({
  entry, pos, isMe, primaryStat,
}: {
  entry: LeaderboardEntry; pos: 1 | 2 | 3; isMe: boolean; primaryStat: 'exp' | 'trophies';
}) {
  const posStyles = {
    1: { size: 'w-[72px] h-[72px]', ring: 'ring-2 ring-yellow-400', crown: true, podiumH: 'h-16', label: '🥇' },
    2: { size: 'w-[60px] h-[60px]', ring: 'ring-2 ring-zinc-400', crown: false, podiumH: 'h-10', label: '🥈' },
    3: { size: 'w-[60px] h-[60px]', ring: 'ring-2 ring-amber-600', crown: false, podiumH: 'h-6', label: '🥉' },
  }[pos];
  const stat = primaryStat === 'exp'
    ? `${(entry.total_exp / 1000).toFixed(1)}k EXP`
    : `${entry.trophies} 🏆`;

  return (
    <div className="flex flex-col items-center gap-1 min-w-0 w-20">
      {posStyles.crown && <Crown className="w-4 h-4 text-yellow-400 mb-0.5" />}
      <div className={`relative shrink-0 ${posStyles.size} rounded-full overflow-hidden bg-secondary flex items-center justify-center ${posStyles.ring} ${isMe ? 'ring-primary!' : ''}`}>
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-muted-foreground">{entry.username[0]?.toUpperCase()}</span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 text-sm leading-none">{posStyles.label}</span>
      </div>
      <p className={`text-xs font-semibold truncate w-full text-center ${isMe ? 'text-primary' : 'text-foreground'}`}>{entry.username}</p>
      <p className="text-[10px] text-muted-foreground truncate w-full text-center">{stat}</p>
      <div className={`w-full rounded-t-sm bg-gradient-to-t ${pos === 1 ? 'from-yellow-500/30 to-yellow-500/10' : pos === 2 ? 'from-zinc-500/30 to-zinc-500/10' : 'from-amber-700/30 to-amber-700/10'} ${posStyles.podiumH}`} />
    </div>
  );
}

// ── Leaderboard Row ───────────────────────────────────────────────────────────
function LeaderboardRow({
  entry, isMe, primaryStat,
}: {
  entry: LeaderboardEntry; isMe: boolean; primaryStat: 'exp' | 'trophies';
}) {
  const nav = useNavigate();
  const stat = primaryStat === 'exp'
    ? `${entry.total_exp.toLocaleString()} EXP`
    : `${entry.trophies.toLocaleString()} 🏆`;

  return (
    <button
      onClick={() => nav(`/profile/${entry.username}`)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
        isMe
          ? 'bg-primary/10 border border-primary/30'
          : 'bg-secondary/30 border border-transparent hover:bg-secondary/50'
      }`}
    >
      <span className={`w-7 text-sm font-bold text-center shrink-0 ${isMe ? 'text-primary' : 'text-muted-foreground'}`}>
        #{entry.rank}
      </span>
      <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary shrink-0 flex items-center justify-center">
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-muted-foreground">{entry.username[0]?.toUpperCase()}</span>
        )}
      </div>
      <span className={`flex-1 min-w-0 text-sm font-medium truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
        {entry.username}{isMe ? ' (You)' : ''}
      </span>
      <span className="text-xs text-muted-foreground shrink-0">{stat}</span>
    </button>
  );
}

// ── Locked Overlay ────────────────────────────────────────────────────────────
function LockedOverlay({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-secondary/10 px-6 py-12 flex flex-col items-center gap-3">
      <Lock className="w-8 h-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground text-center">{label}</p>
    </div>
  );
}

// ── Leaderboard Skeleton ──────────────────────────────────────────────────────
function LeaderboardSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2].map(i => (
        <div key={i} className="rounded-2xl border border-border/40 overflow-hidden">
          <div className="px-5 py-4 bg-secondary/20"><Skeleton className="h-5 w-40" /></div>
          <div className="px-5 py-4 flex justify-center gap-4">
            {[1, 2, 3].map(j => <Skeleton key={j} className="w-20 h-24 rounded-xl" />)}
          </div>
          <div className="px-5 pb-4 space-y-2">
            {[1, 2, 3, 4].map(j => <Skeleton key={j} className="h-12 rounded-xl" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Slug helpers ──────────────────────────────────────────────────────────────
function titleToSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function findDeckBySlug(decks: PublicDeck[], slug: string): PublicDeck | undefined {
  return decks.find(d => titleToSlug(d.title) === slug);
}

// ── Main WorldPage ────────────────────────────────────────────────────────────
export default function WorldPage() {
  const { user, isGuest, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug?: string }>();

  type Section = 'decks' | 'arcades' | 'contributions' | 'league' | 'clans';

  const getSectionFromPath = (): Section => {
    const p = location.pathname;
    if (p.includes('/arcades')) return 'arcades';
    if (p.includes('/contributions')) return 'contributions';
    if (p.includes('/tiers')) return 'league';
    if (p.includes('/leagues') || p.includes('/league')) return 'league';
    if (p.includes('/clans')) return 'clans';
    return 'decks';
  };

  const [activeSection, setActiveSection] = useState<Section>(getSectionFromPath);
  const [decks, setDecks] = useState<PublicDeck[]>([]);
  const [purchases, setPurchases] = useState<DeckPurchase[]>([]);
  const [moddedDeckIds, setModdedDeckIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState<PublicDeck | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [guestGateOpen, setGuestGateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'most_downloaded' | 'highest_rated'>('newest');

  // ── Arcades state ────────────────────────────────────────────────────────
  const [arcadeGames, setArcadeGames] = useState<ArcadeGame[]>([]);
  const [arcadeLoading, setArcadeLoading] = useState(false);
  const [arcadeSearch, setArcadeSearch] = useState('');
  const arcadeSearchRef = React.useRef<HTMLInputElement>(null);
  const worldDeckSearchRef = React.useRef<HTMLInputElement>(null);
  const [arcadeSort, setArcadeSort] = useState<'install_count' | 'newest'>('install_count');
  const [contributeArcadeOpen, setContributeArcadeOpen] = useState(false);
  const [arcadeProjects, setArcadeProjects] = useState<ArcadeProject[]>([]);
  const [contributeProjectId, setContributeProjectId] = useState('');
  const [contributeTitle, setContributeTitle] = useState('');
  const [contributeBlurb, setContributeBlurb] = useState('');
  const [contributeDesc, setContributeDesc] = useState('');
  const [contributeLicense, setContributeLicense] = useState('MIT');
  const [contributingArcade, setContributingArcade] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await fetchPublicDecks({
      search: search || undefined,
      subject: filterSubject !== 'all' ? filterSubject : undefined,
      difficulty: filterDifficulty !== 'all' ? filterDifficulty : undefined,
      sortBy,
    });
    setDecks(results);
    if (user) {
      const [p, moddedDs] = await Promise.all([
        fetchMyPurchases(user.id),
        fetchModdedDecks(user.id),
      ]);
      setPurchases(p);
      setModdedDeckIds(new Set(moddedDs.map((d: PublicDeck) => d.id)));
    }
    setLoading(false);
  }, [search, filterSubject, filterDifficulty, sortBy, user]);

  useEffect(() => { load(); }, [load]);

  // ── Load arcade games when entering Arcades section ──────────────────────
  const loadArcades = useCallback(async () => {
    setArcadeLoading(true);
    const games = await fetchArcadeGames({ sortBy: arcadeSort, search: arcadeSearch || undefined, userId: user?.id });
    setArcadeGames(games);
    setArcadeLoading(false);
  }, [arcadeSort, arcadeSearch, user?.id]);

  useEffect(() => {
    if (activeSection === 'arcades') void loadArcades();
  }, [activeSection, loadArcades]);

  // Load user projects when contribute arcade modal opens
  useEffect(() => {
    if (contributeArcadeOpen && user) {
      fetchArcadeProjects(user.id).then(p => {
        setArcadeProjects(p);
        if (p.length > 0) setContributeProjectId(p[0].id);
      });
    }
  }, [contributeArcadeOpen, user]);

  const handleContributeArcade = async () => {
    if (!user || !contributeProjectId || !contributeTitle.trim() || !contributeDesc.trim() || !contributeBlurb.trim()) return;
    setContributingArcade(true);
    const proj = arcadeProjects.find(p => p.id === contributeProjectId);
    if (!proj) { setContributingArcade(false); return; }
    const result = await publishArcadeGame({
      creatorId: user.id,
      projectId: proj.id,
      title: contributeTitle.trim(),
      blurb: contributeBlurb.trim(),
      description: contributeDesc.trim(),
      license: contributeLicense,
      codeContent: proj.code_content,
      assetsMetadata: proj.assets_metadata,
    });
    setContributingArcade(false);
    if (result) {
      setContributeArcadeOpen(false);
      setContributeTitle('');
      setContributeBlurb('');
      setContributeDesc('');
      toast.success('Arcade published to Athenaeum!');
      void loadArcades();
    } else {
      toast.error('Failed to publish arcade.');
    }
  };

  useEffect(() => {
    setActiveSection(getSectionFromPath());
  }, [location.pathname]);

  useEffect(() => {
    if (slug && decks.length > 0 && !loading) {
      const found = findDeckBySlug(decks, slug);
      if (found) setSelectedDeck(found);
    }
  }, [slug, decks, loading]);

  const handleSectionChange = (section: Section) => {
    setActiveSection(section);
    setSelectedDeck(null);
    const paths: Record<Section, string> = {
      decks: '/athenaeum/decks',
      arcades: '/athenaeum/arcades',
      contributions: '/athenaeum/contributions',
      league: '/athenaeum/tiers',
      clans: '/athenaeum/clans',
    };
    navigate(paths[section], { replace: true });
  };

  const handleDeckOpen = (deck: PublicDeck) => {
    setSelectedDeck(deck);
    navigate(`/athenaeum/decks/${titleToSlug(deck.title)}`, { replace: true });
  };

  const handleDeckClose = () => {
    setSelectedDeck(null);
    navigate('/athenaeum/decks', { replace: true });
    load();
  };

  const userExp = profile?.total_exp ?? null;

  if (selectedDeck && !isGuest) {
    return (
      <DeckDetailView
        deck={selectedDeck}
        onBack={handleDeckClose}
        userId={user?.id ?? null}
        isGuest={isGuest}
        purchases={purchases}
        onPurchased={load}
        onGuestAction={() => setGuestGateOpen(true)}
      />
    );
  }

  const TabBtn = ({ value, label }: { value: Section; label: string }) => (
    <button
      onClick={() => handleSectionChange(value)}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
        activeSection === value
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <GuestGateModal open={guestGateOpen} onClose={() => setGuestGateOpen(false)} />
      {isGuest && <GuestBanner message="You are browsing as a guest. Sign up to share decks with the community." className="mb-6" />}
      {user && (
        <UploadDeckModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          userId={user.id}
          onUploaded={load}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Athenaeum</h1>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-md whitespace-pre-line">
            {'Meet the community. Share a deck, get feedback, and study what other people are learning!'.replace(/!\s+/, '!\n')}
          </p>
        </div>
        {activeSection === 'decks' && (
          <div className="flex items-center gap-2">
            {user ? (
              <Button onClick={() => setUploadOpen(true)}>
                <Heart className="w-4 h-4 mr-2" /> Contribute Deck
              </Button>
            ) : (
              <GuestGate feature="contribute a deck">
                <Button onClick={() => {}}>
                  <Heart className="w-4 h-4 mr-2" /> Contribute Deck
                </Button>
              </GuestGate>
            )}
          </div>
        )}
        {activeSection === 'arcades' && user && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/studio')}>
              <Play className="w-4 h-4 mr-2" />Open Studio
            </Button>
            <Button onClick={() => setContributeArcadeOpen(true)}>
              <Heart className="w-4 h-4 mr-2" />Contribute Arcade
            </Button>
          </div>
        )}
      </div>

      {/* Tab bar — two separate groups */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-1 flex-wrap">
          <TabBtn value="decks" label="Browse" />
          <TabBtn value="arcades" label="Arcades" />
          {user && <TabBtn value="contributions" label="My contributions" />}
        </div>
        <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-1">
          <TabBtn value="league" label="Tiers" />
          <TabBtn value="clans" label="Clans" />
        </div>
      </div>

      {/* ── Decks ── */}
      {activeSection === 'decks' && (
        <>
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Input ref={worldDeckSearchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search the Athenaeum…" className="flex-1 pr-8" />
              {search && (
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(''); setTimeout(() => worldDeckSearchRef.current?.focus(), 0); }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s ?? s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d ?? d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="most_downloaded">Most downloaded</SelectItem>
                <SelectItem value="highest_rated">Highest rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 bg-muted rounded-xl" />)}
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No decks found. Try another search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map(deck => {
                const isPurchased = purchases.some(p => p.public_deck_id === deck.id);
                const isOwner = deck.owner_id === user?.id;
                if (isGuest) {
                  return (
                    <GuestDeckCard
                      key={deck.id}
                      deck={deck}
                      isPurchased={false}
                    />
                  );
                }
                return (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    onView={handleDeckOpen}
                    isPurchased={isPurchased || isOwner}
                    isOwner={isOwner}
                    isMod={moddedDeckIds.has(deck.id)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Arcades ── */}
      {activeSection === 'arcades' && (
        <>
          {/* Search + sort */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={arcadeSearchRef}
                value={arcadeSearch}
                onChange={e => setArcadeSearch(e.target.value)}
                placeholder="Search arcades…"
                className="pl-9 pr-8"
              />
              {arcadeSearch && (
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => { setArcadeSearch(''); setTimeout(() => arcadeSearchRef.current?.focus(), 0); }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Select value={arcadeSort} onValueChange={v => setArcadeSort(v as typeof arcadeSort)}>
              <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="install_count">Most Installed</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {arcadeLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-44 bg-muted rounded-xl" />)}
            </div>
          ) : arcadeGames.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <span className="text-5xl mb-4 block">🕹️</span>
              <p className="text-base font-medium text-foreground">No arcade games yet</p>
              <p className="text-sm mt-1">Be the first to contribute an arcade via the Studio!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {arcadeGames.map(game => (
                <ArcadeCard
                  key={game.id}
                  game={game}
                  userId={user?.id}
                  onInstall={async () => {
                    if (!user) return;
                    if (game.is_installed) {
                      await uninstallArcadeGame(user.id, game.id);
                      setArcadeGames(prev => prev.map(g => g.id === game.id ? { ...g, is_installed: false, install_count: Math.max(0, g.install_count - 1) } : g));
                      toast.success('Removed from your collection.');
                    } else {
                      await installArcadeGame(user.id, game.id);
                      setArcadeGames(prev => prev.map(g => g.id === game.id ? { ...g, is_installed: true, install_count: g.install_count + 1 } : g));
                      toast.success('Added to your collection!');
                    }
                  }}
                />
              ))}
            </div>
          )}

          {/* Contribute Arcade Modal */}
          <Dialog open={contributeArcadeOpen} onOpenChange={setContributeArcadeOpen}>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
              <DialogHeader>
                <DialogTitle>Contribute Arcade to Athenaeum</DialogTitle>
                <DialogDescription>
                  Have an arcade in mind? The great time to see it live is... now!
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                {/* Step 1: Select Project */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Select Project</label>
                  {arcadeProjects.length === 0 ? (
                    <div className="rounded-lg border border-border bg-secondary/10 p-4 text-center space-y-2">
                      <p className="text-sm text-muted-foreground">No saved projects found.</p>
                      <Button size="sm" variant="outline" onClick={() => { setContributeArcadeOpen(false); navigate('/studio'); }}>
                        <Plus className="w-3.5 h-3.5 mr-1" />Create in Studio
                      </Button>
                    </div>
                  ) : (
                    <Select value={contributeProjectId} onValueChange={setContributeProjectId}>
                      <SelectTrigger><SelectValue placeholder="Select a project…" /></SelectTrigger>
                      <SelectContent>
                        {arcadeProjects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Step 2: Arcade Title */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Arcade Title</label>
                  <Input
                    value={contributeTitle}
                    onChange={e => setContributeTitle(e.target.value)}
                    maxLength={100}
                    placeholder="My awesome arcade game"
                  />
                </div>

                {/* Step 3: Blurb */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Blurb</label>
                  <Input
                    value={contributeBlurb}
                    onChange={e => setContributeBlurb(e.target.value)}
                    maxLength={120}
                    placeholder="e.g. 60 seconds, 3×3 grid. Whack the correct answers!"
                  />
                  <p className="text-xs text-muted-foreground">Short teaser shown on the Arcades page.</p>
                </div>

                {/* Step 4: Description */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    value={contributeDesc}
                    onChange={e => setContributeDesc(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Explain how to play your arcade…"
                  />
                  <p className="text-xs text-muted-foreground text-right">{contributeDesc.length}/500</p>
                </div>

                {/* Step 4: License */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">License</label>
                    <div className="text-xs text-muted-foreground bg-secondary/30 rounded px-2 py-0.5">
                      Choose how others can use your code
                    </div>
                  </div>
                  <Select value={contributeLicense} onValueChange={setContributeLicense}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MIT">
                        <div className="space-y-0.5">
                          <p className="font-medium">MIT</p>
                          <p className="text-xs text-muted-foreground">Anyone can use, modify, and distribute</p>
                        </div>
                      </SelectItem>
                      <SelectItem value="All Rights Reserved">
                        <div className="space-y-0.5">
                          <p className="font-medium">All Rights Reserved</p>
                          <p className="text-xs text-muted-foreground">No one can copy or reuse your code</p>
                        </div>
                      </SelectItem>
                      <SelectItem value="GPL-3.0">
                        <div className="space-y-0.5">
                          <p className="font-medium">GPL-3.0</p>
                          <p className="text-xs text-muted-foreground">Open source — derivatives must also be open</p>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setContributeArcadeOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => void handleContributeArcade()}
                  disabled={contributingArcade || !contributeProjectId || !contributeTitle.trim() || !contributeBlurb.trim() || !contributeDesc.trim()}
                >
                  {contributingArcade ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing…</>
                  ) : (
                    <><Globe className="w-4 h-4 mr-2" />Publish to Athenaeum</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ── My Contributions ── */}
      {activeSection === 'contributions' && user && (
        <MyPublishedDecks userId={user.id} onView={handleDeckOpen} />
      )}

      {/* ── League ── */}
      {activeSection === 'league' && (
        <LeagueTab
          userExp={userExp}
          userId={user?.id ?? null}
          profile={profile ?? null}
          onGeodeClaimed={() => { /* refreshProfile called via AuthContext on gem add */ }}
        />
      )}

      {/* ── Clans (ClubsPage content) ── */}
      {activeSection === 'clans' && <ClubsPage />}
    </div>
  );
}


// ── ArcadeCard ───────────────────────────────────────────────────────────────
function ArcadeCard({
  game,
  userId,
  onInstall,
}: {
  game: ArcadeGame;
  userId?: string;
  onInstall: () => void;
}) {
  const navigate = useNavigate();
  const avgRating = game.rating_count > 0
    ? (game.rating_sum / game.rating_count).toFixed(1)
    : '—';
  const isOwner = !!userId && game.creator_id === userId;

  return (
    <div
      className="rounded-xl border border-border bg-secondary/10 p-4 flex flex-col h-full cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => navigate(`/arcade-game/${game.id}`)}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl shrink-0">🕹️</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate text-balance">{game.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            by {game.creator_emoji} {game.creator_username}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground flex-1 line-clamp-2 text-pretty">{game.description}</p>
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Download className="w-3 h-3" />{game.install_count}
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />{avgRating}
        </span>
        <span className="ml-auto text-[10px] opacity-60">{game.license}</span>
      </div>
      {userId && !isOwner && (
        <Button
          size="sm"
          variant={game.is_installed ? 'outline' : 'default'}
          className="mt-3 w-full h-8 text-xs"
          onClick={e => { e.stopPropagation(); onInstall(); }}
        >
          {game.is_installed ? (
            <><CheckCircle className="w-3.5 h-3.5 mr-1" />Installed</>
          ) : (
            <><Download className="w-3.5 h-3.5 mr-1" />Add Arcade</>
          )}
        </Button>
      )}
    </div>
  );
}

// ── My Contributions sub-section ────────────────────────────────────────────
function MyPublishedDecks({ userId, onView }: { userId: string; onView: (d: PublicDeck) => void }) {
  const [decks, setDecks] = useState<PublicDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [unpublishTarget, setUnpublishTarget] = useState<PublicDeck | null>(null);
  const [unpublishAck, setUnpublishAck] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [owned, modded] = await Promise.all([
      fetchMyPublicDecks(userId),
      fetchModdedDecks(userId),
    ]);
    const all = [...owned];
    modded.forEach((m: PublicDeck) => { if (!all.find(d => d.id === m.id)) all.push(m); });
    setDecks(all);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [userId]);

  const handleUnpublish = async () => {
    if (!unpublishTarget) return;
    setUnpublishing(true);
    const { error } = await unpublishPublicDeck(unpublishTarget.id);
    setUnpublishing(false);
    if (error) { toast.error("Could not unpublish the deck."); return; }
    toast.success(`“${unpublishTarget.title}” is no longer published.`);
    setUnpublishTarget(null);
    setUnpublishAck(false);
    await reload();
  };

  if (loading) return <div className="h-24 bg-muted rounded-lg animate-pulse" />;
  if (decks.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p>You have not contributed a deck yet.</p>
    </div>
  );
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map(d => (
          <DeckCard key={d.id} deck={d} onView={onView} isPurchased={false} isOwner={d.owner_id === userId} />
        ))}
      </div>

      {/* Unpublish confirm dialog (triggered from Manage tab inside DeckDetailView) */}
      <AlertDialog open={!!unpublishTarget} onOpenChange={v => { if (!v) { setUnpublishTarget(null); setUnpublishAck(false); } }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{`Unpublish “${unpublishTarget?.title ?? ''}”?`}</AlertDialogTitle>
            <AlertDialogDescription>
              Your deck will be removed from the Athenaeum. Copies people already downloaded stay with them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-0 pb-2">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={unpublishAck}
                onChange={e => setUnpublishAck(e.target.checked)}
                className="mt-0.5 accent-destructive"
              />
              <span className="text-sm text-muted-foreground">
                I understand this removes the deck for everyone who downloaded it.
              </span>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setUnpublishTarget(null); setUnpublishAck(false); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!unpublishAck || unpublishing}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50"
              onClick={handleUnpublish}
            >
              {unpublishing ? "Unpublishing…" : "Unpublish deck"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
