import { useState, useEffect, useRef } from 'react';
import { Bell, Eye, Check, X, Flag, RefreshCw, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchRecentNotifications, markNotificationRead, archiveNotification,
  countUnreadNotifications, respondToModInvite,
  previewSharedDeckCards, acceptSharedDeck, declineSharedDeck, reportSharedDeck,
  fetchDecks, fetchSyncDiff, syncDeckToNewVersion,
} from '@/services/flush/flushService';
import type { FlushNotification, Flashcard } from '@/types/types';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Report reasons matching World + extra

export function FlailBell() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<FlushNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Preview modal state (deck share)
  const [previewNotif, setPreviewNotif] = useState<FlushNotification | null>(null);
  const [previewCards, setPreviewCards] = useState<Flashcard[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Sync diff modal state (version_update)
  type SyncDiffEntry =
    | { kind: 'added';   pubCardId: string; front: string; back: string; notes: string }
    | { kind: 'deleted'; front: string; back: string; notes: string }
    | { kind: 'edited';  pubCardId: string; oldFront: string; oldBack: string; oldNotes: string; newFront: string; newBack: string; newNotes: string; userFront?: string; userBack?: string; userNotes?: string };

  const [syncNotif, setSyncNotif] = useState<FlushNotification | null>(null);
  const [syncDiffEntries, setSyncDiffEntries] = useState<SyncDiffEntry[]>([]);
  const [syncDiffLoading, setSyncDiffLoading] = useState(false);
  const [syncBinnedIds, setSyncBinnedIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);

  // Conflict resolution state
  const [conflictNotif, setConflictNotif] = useState<FlushNotification | null>(null);
  const [conflictDeckTitle, setConflictDeckTitle] = useState('');

  // Report flow state
  const [reportConfirmNotif, setReportConfirmNotif] = useState<FlushNotification | null>(null);
  const [reportReasonNotif, setReportReasonNotif] = useState<FlushNotification | null>(null);
  const [reportReason, setReportReason] = useState('');

  // Mod decline message flow
  const [decliningNotif, setDecliningNotif] = useState<FlushNotification | null>(null);
  const [declineMessage, setDeclineMessage] = useState('');

  const refresh = async () => {
    if (!user) return;
    const [notifs, cnt] = await Promise.all([
      fetchRecentNotifications(user.id),
      countUnreadNotifications(user.id),
    ]);
    setNotifications(notifs);
    setUnreadCount(cnt);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    refresh();
    const channelName = `flail-${userId}`;
    supabase.getChannels().forEach(c => { if (c.topic === `realtime:${channelName}`) supabase.removeChannel(c); });
    const ch = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => refresh())
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const markRead = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleDoneReading = async (notif: FlushNotification) => {
    await markNotificationRead(notif.id);
    markRead(notif.id);
  };

  // Mod invite — Accept
  const handleModAccept = async (notif: FlushNotification) => {
    const publicDeckId = notif.meta?.public_deck_id as string | undefined;
    const deckTitle = notif.meta?.deck_title as string | undefined;
    if (!publicDeckId || !user || !profile) return;
    // Look up the inviter's user_id from their username stored in meta
    const inviterUsername = notif.meta?.inviter_username as string | undefined;
    let inviterUserId: string | undefined;
    if (inviterUsername) {
      const { data } = await supabase.from('profiles').select('id').eq('username', inviterUsername).maybeSingle();
      inviterUserId = data?.id;
    }
    await respondToModInvite(
      notif.id, publicDeckId, user.id, true,
      undefined, deckTitle, inviterUserId, profile.username,
    );
    setNotifications(prev => prev.map(n => n.id === notif.id
      ? { ...n, is_read: true, action_taken: 'accepted' } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    toast.success("You are now a moderator.");
  };

  // Mod invite — Decline (open message box)
  const handleModDeclineInit = (notif: FlushNotification) => {
    setDecliningNotif(notif);
    setDeclineMessage('');
  };

  // Mod invite — Decline (confirm with optional message)
  const handleModDeclineConfirm = async () => {
    if (!decliningNotif || !user || !profile) return;
    const publicDeckId = decliningNotif.meta?.public_deck_id as string | undefined;
    const deckTitle = decliningNotif.meta?.deck_title as string | undefined;
    const inviterUsername = decliningNotif.meta?.inviter_username as string | undefined;
    let inviterUserId: string | undefined;
    if (inviterUsername) {
      const { data } = await supabase.from('profiles').select('id').eq('username', inviterUsername).maybeSingle();
      inviterUserId = data?.id;
    }
    await respondToModInvite(
      decliningNotif.id, publicDeckId!, user.id, false,
      declineMessage.trim() || undefined, deckTitle, inviterUserId, profile.username,
    );
    setNotifications(prev => prev.map(n => n.id === decliningNotif.id
      ? { ...n, is_read: true, action_taken: 'declined' } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setDecliningNotif(null);
    setDeclineMessage('');
    toast.success("Invitation declined.");
  };

  // Preview (deck share)
  const handlePreview = async (notif: FlushNotification) => {
    const deckId = notif.meta?.deck_id as string | undefined;
    if (!deckId) return;
    setPreviewNotif(notif);
    setPreviewCards([]);
    setPreviewLoading(true);
    const cards = await previewSharedDeckCards(deckId);
    setPreviewCards(cards);
    setPreviewLoading(false);
  };

  // Preview Changes — version update sync diff
  const handlePreviewChanges = async (notif: FlushNotification) => {
    const publicDeckId = notif.meta?.public_deck_id as string | undefined;
    if (!publicDeckId || !user) return;
    setSyncNotif(notif);
    setSyncDiffEntries([]);
    setSyncBinnedIds(new Set());
    setSyncDiffLoading(true);
    setOpen(false);
    await markNotificationRead(notif.id);
    markRead(notif.id);
    const diff = await fetchSyncDiff(user.id, publicDeckId);
    const entries: SyncDiffEntry[] = [
      ...diff.added.map(a => ({ kind: 'added' as const, ...a })),
      ...diff.deleted.map(d => ({ kind: 'deleted' as const, ...d })),
      ...diff.edited.map(e => ({ kind: 'edited' as const, ...e })),
    ];
    setSyncDiffEntries(entries);
    setSyncDiffLoading(false);
  };

  const toggleSyncBin = (key: string) => {
    setSyncBinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSyncNow = async () => {
    if (!syncNotif || !user) return;
    const publicDeckId = syncNotif.meta?.public_deck_id as string | undefined;
    if (!publicDeckId) return;
    setSyncing(true);
    // Collect pub card ids that are binned (user chose NOT to sync those)
    const skipped = new Set<string>();
    syncDiffEntries.forEach(e => {
      const key = 'pubCardId' in e ? e.pubCardId : `del:${e.front}`;
      if (syncBinnedIds.has(key) && 'pubCardId' in e) skipped.add(e.pubCardId);
    });
    const { error } = await syncDeckToNewVersion(user.id, publicDeckId, skipped);
    setSyncing(false);
    if (error) { toast.error(error); return; }
    toast.success("Deck synced.");
    setSyncNotif(null);
    setSyncDiffEntries([]);
  };

  // Accept deck share
  const handleAccept = async (notif: FlushNotification) => {
    if (!user || !profile) return;
    const shareId = notif.meta?.deck_share_id as string | undefined;
    const deckTitle = notif.meta?.deck_title as string | undefined;
    if (!shareId || !deckTitle) return;
    const myDecks = await fetchDecks(user.id);
    const hasConflict = myDecks.some(d => d.title.toLowerCase() === deckTitle.toLowerCase());
    if (hasConflict) {
      setConflictNotif(notif); setConflictDeckTitle(deckTitle); return;
    }
    await doAccept(notif, 'keep_both');
  };

  const doAccept = async (notif: FlushNotification, resolution: 'replace' | 'keep_both') => {
    if (!user || !profile) return;
    const shareId = notif.meta?.deck_share_id as string | undefined;
    const deckTitle = notif.meta?.deck_title as string | undefined;
    if (!shareId || !deckTitle) return;
    const myDecks = await fetchDecks(user.id);
    const { error } = await acceptSharedDeck(
      shareId, user.id, profile.username ?? 'Someone',
      myDecks.map(d => ({ title: d.title })), deckTitle, resolution
    );
    if (error) { toast.error(error); return; }
    toast.success(`“${deckTitle}” was added to your decks.`);
    setNotifications(prev => prev.map(n => n.id === notif.id
      ? { ...n, is_read: true, action_taken: 'accepted' } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setConflictNotif(null);
    setPreviewNotif(null);
  };

  // Decline deck share
  const handleDecline = async (notif: FlushNotification) => {
    if (!user || !profile) return;
    const shareId = notif.meta?.deck_share_id as string | undefined;
    const deckTitle = notif.meta?.deck_title as string | undefined;
    if (!shareId || !deckTitle) return;
    await declineSharedDeck(shareId, user.id, profile.username ?? 'Someone', deckTitle);
    toast.success("Share declined.");
    setNotifications(prev => prev.map(n => n.id === notif.id
      ? { ...n, is_read: true, action_taken: 'declined' } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setPreviewNotif(null);
  };

  // Report — step 1: confirmation
  const handleReportInit = (notif: FlushNotification) => {
    setReportConfirmNotif(notif);
    setPreviewNotif(null);
  };
  // Report — step 2: reason selection
  const handleReportConfirmed = () => {
    setReportReasonNotif(reportConfirmNotif);
    setReportConfirmNotif(null);
    setReportReason('');
  };
  // Report — step 3: submit
  const handleReportSubmit = async () => {
    if (!user || !profile || !reportReasonNotif) return;
    const shareId = reportReasonNotif.meta?.deck_share_id as string | undefined;
    const deckTitle = reportReasonNotif.meta?.deck_title as string | undefined;
    const senderUsername = reportReasonNotif.meta?.sender_username as string | undefined;
    if (!shareId || !deckTitle || !senderUsername) return;
    await reportSharedDeck(shareId, user.id, profile.username ?? 'Someone', deckTitle, senderUsername, reportReason);
    toast.success("Report sent. Thanks for flagging it.");
    setNotifications(prev => prev.map(n => n.id === reportReasonNotif.id
      ? { ...n, is_read: true, action_taken: 'reported' } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setReportReasonNotif(null);
  };

  const handleDeleteNotif = async (notif: FlushNotification) => {
    await archiveNotification(notif.id);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    if (!notif.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
  };

  if (!user) return null;

  return (
    <>
      {/* Bell button */}
      <Button
        variant="ghost" size="sm"
        className="relative h-9 w-9 p-0"
        onClick={() => setOpen(true)}
        aria-label="Your Flail"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-[22px] w-2 h-2 rounded-full bg-destructive" />
        )}
      </Button>

      {/* ── Main Flail dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              {/* Unread badge on the LEFT so it doesn't overlap the close button */}
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs shrink-0">{unreadCount} unread</Badge>
              )}
              <DialogTitle className="text-sm font-semibold">Your Flail</DialogTitle>
              <button
                className="ml-auto mr-6 text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleManualRefresh}
                aria-label="Your Flail"
                title="Your Flail"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                You are all caught up.
              </div>
            ) : (
              notifications.map(notif => (
                <FlailItem
                  key={notif.id}
                  notif={notif}
                  onDoneReading={handleDoneReading}
                  onModAccept={handleModAccept}
                  onModDeclineInit={handleModDeclineInit}
                  onPreview={handlePreview}
                  onPreviewChanges={handlePreviewChanges}
                  onLater={async (n) => { await markNotificationRead(n.id); markRead(n.id); }}
                  onReport={handleReportInit}
                  onDelete={handleDeleteNotif}
                  onNavigate={(path) => { setOpen(false); navigate(path); }}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Mod Decline message dialog ── */}
      <Dialog open={!!decliningNotif} onOpenChange={v => { if (!v) { setDecliningNotif(null); setDeclineMessage(''); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Decline this invitation?</DialogTitle>
            <DialogDescription>Let the sender know why you are passing on it.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Add a short message (optional)…"
              value={declineMessage}
              onChange={e => setDeclineMessage(e.target.value)}
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{declineMessage.length}/300</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDecliningNotif(null); setDeclineMessage(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleModDeclineConfirm}>Decline anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Preview Cards modal ── */}
      <Dialog open={!!previewNotif} onOpenChange={v => { if (!v) { setPreviewNotif(null); setPreviewCards([]); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg flex flex-col max-h-[90dvh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Preview: "{previewNotif?.meta?.deck_title as string}"</DialogTitle>
            <DialogDescription>
              Shared by {previewNotif?.meta?.sender_username as string} · {previewCards.length} {previewCards.length !== 1 ? "cards" : "card"}
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <span className="text-muted-foreground text-sm animate-pulse">Loading cards…</span>
            </div>
          ) : previewCards.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <p className="text-muted-foreground text-sm">No cards to preview.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
              {previewCards.map((card, i) => (
                <div key={card.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5">#{i + 1}</span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground text-balance">{card.front_text}</p>
                      <p className="text-xs text-muted-foreground text-pretty">{card.back_text}</p>
                      {card.notes && (
                        <p className="text-xs text-muted-foreground/60 italic">{card.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="shrink-0 pt-2 border-t border-border flex-wrap gap-2">
            {previewNotif && !previewNotif.action_taken ? (
              <>
                <Button
                  size="sm" variant="ghost"
                  className="text-destructive hover:bg-destructive/10 h-9"
                  onClick={() => previewNotif && handleReportInit(previewNotif)}
                >
                  <Flag className="w-3.5 h-3.5 mr-1" />Report
                </Button>
                <div className="flex-1" />
                <Button size="sm" variant="outline" className="h-9"
                  onClick={() => previewNotif && handleDecline(previewNotif)}>
                  <X className="w-3.5 h-3.5 mr-1" />Decline
                </Button>
                <Button size="sm" className="h-9"
                  onClick={() => previewNotif && handleAccept(previewNotif)}>
                  <Check className="w-3.5 h-3.5 mr-1" />Accept
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground capitalize px-2">
                {previewNotif?.action_taken ?? ''}
              </span>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Title conflict dialog ── */}
      <AlertDialog open={!!conflictNotif} onOpenChange={v => { if (!v) setConflictNotif(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>You have a deck with this name</AlertDialogTitle>
            <AlertDialogDescription>
              {`You already have a deck called “${conflictDeckTitle}”. Keep both, or replace yours with the shared copy?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setConflictNotif(null)}>Cancel</AlertDialogCancel>
            <Button variant="outline" size="sm"
              onClick={() => conflictNotif && doAccept(conflictNotif, 'keep_both')}>
              Keep both
            </Button>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => conflictNotif && doAccept(conflictNotif, 'replace')}>
              Replace mine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Report confirmation dialog ── */}
      <AlertDialog open={!!reportConfirmNotif} onOpenChange={v => { if (!v) setReportConfirmNotif(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Send this report?</AlertDialogTitle>
            <AlertDialogDescription>
              A moderator will review this deck. False reports can affect your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReportConfirmNotif(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleReportConfirmed}>
              Send report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Report reason dialog ── */}
      <Dialog open={!!reportReasonNotif} onOpenChange={v => { if (!v) setReportReasonNotif(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Why are you reporting this?</DialogTitle>
            <DialogDescription>Tell us what is wrong with this deck.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {([...["Spam or advertising","Offensive content","Copyright violation","Incorrect information","Something else"]] as string[]).map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportReasonNotif(null)}>Cancel</Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleReportSubmit}>
              Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sync Diff Preview modal (version_update) ── */}
      <Dialog open={!!syncNotif} onOpenChange={v => { if (!v) { setSyncNotif(null); setSyncDiffEntries([]); setSyncBinnedIds(new Set()); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl flex flex-col max-h-[90dvh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>{`Changes in “${syncNotif?.meta?.deck_title as string ?? ''}”`}</DialogTitle>
            <DialogDescription>
              {`Changes in version ${(syncNotif?.meta?.new_version as string) ?? 'new'}`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1 py-2">
            {syncDiffLoading && (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading changes…
              </div>
            )}
            {!syncDiffLoading && syncDiffEntries.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No changes detected.
              </div>
            )}
            {!syncDiffLoading && syncDiffEntries.map((entry, i) => {
              const key = 'pubCardId' in entry ? entry.pubCardId : `del:${entry.front}:${i}`;
              const binned = syncBinnedIds.has(key);
              const kindLabel = entry.kind === 'added' ? ("New card") : entry.kind === 'deleted' ? ("Deleted card") : ("Edited card");
              const kindColor = entry.kind === 'added' ? 'text-emerald-500' : entry.kind === 'deleted' ? 'text-amber-500' : 'text-primary';
              return (
                <div key={key} className={`rounded-lg border p-3 space-y-2 transition-opacity ${binned ? 'opacity-40' : ''} ${entry.kind === 'added' ? 'border-emerald-500/20 bg-emerald-500/5' : entry.kind === 'deleted' ? 'border-amber-500/20 bg-amber-500/5' : 'border-primary/20 bg-primary/5'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${kindColor}`}>{kindLabel}</span>
                    <button
                      onClick={() => toggleSyncBin(key)}
                      title={binned ? ("Restore this change") : ("Skip this change")}
                      className={`transition-colors ${binned ? 'text-primary' : 'text-muted-foreground hover:text-destructive'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {entry.kind === 'added' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground font-medium">Front</p>
                        <p className="text-foreground text-pretty">{entry.front}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground font-medium">Back</p>
                        <p className="text-foreground text-pretty">{entry.back}</p>
                      </div>
                      {entry.notes && (
                        <div className="md:col-span-2 space-y-0.5">
                          <p className="text-muted-foreground font-medium">Notes</p>
                          <p className="text-foreground/70 italic text-pretty">{entry.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {entry.kind === 'deleted' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground font-medium">Front</p>
                        <p className="text-foreground text-pretty line-through opacity-60">{entry.front}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground font-medium">Back</p>
                        <p className="text-foreground text-pretty line-through opacity-60">{entry.back}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-muted-foreground/70 text-pretty">This card was removed in the new version.</p>
                      </div>
                    </div>
                  )}

                  {entry.kind === 'edited' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      {/* Before (old published) */}
                      <div className="space-y-1 p-2 rounded-md bg-background/60 border border-border">
                        <p className="text-muted-foreground font-semibold">Before the sync</p>
                        <p className="font-medium text-foreground text-pretty">{entry.oldFront}</p>
                        <p className="text-muted-foreground text-pretty">{entry.oldBack}</p>
                        {entry.oldNotes && <p className="italic text-muted-foreground/60 text-pretty">{entry.oldNotes}</p>}
                      </div>
                      {/* After (new published) */}
                      <div className="space-y-1 p-2 rounded-md bg-primary/5 border border-primary/20">
                        <p className="text-primary font-semibold">After your sync</p>
                        <p className="font-medium text-foreground text-pretty">{entry.newFront}</p>
                        <p className="text-muted-foreground text-pretty">{entry.newBack}</p>
                        {entry.newNotes && <p className="italic text-muted-foreground/60 text-pretty">{entry.newNotes}</p>}
                      </div>
                      {/* Your current card */}
                      <div className="space-y-1 p-2 rounded-md bg-background/60 border border-border">
                        <p className="text-muted-foreground font-semibold">Your card</p>
                        <p className="font-medium text-foreground text-pretty">{entry.userFront ?? entry.oldFront}</p>
                        <p className="text-muted-foreground text-pretty">{entry.userBack ?? entry.oldBack}</p>
                        {(entry.userNotes ?? entry.oldNotes) && <p className="italic text-muted-foreground/60 text-pretty">{entry.userNotes ?? entry.oldNotes}</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="shrink-0 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => { setSyncNotif(null); setSyncDiffEntries([]); setSyncBinnedIds(new Set()); }}>
              Later
            </Button>
            <Button onClick={handleSyncNow} disabled={syncing || syncDiffLoading}>
              {syncing ? (
                <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />Syncing…</>
              ) : (
                "Sync now"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── FlailItem ─────────────────────────────────────────────────────────────────
function FlailItem({
  notif, onDoneReading, onModAccept, onModDeclineInit, onPreview, onPreviewChanges, onLater, onReport, onDelete, onNavigate,
}: {
  notif: FlushNotification;
  onDoneReading: (n: FlushNotification) => void;
  onModAccept: (n: FlushNotification) => void;
  onModDeclineInit: (n: FlushNotification) => void;
  onPreview: (n: FlushNotification) => void;
  onPreviewChanges: (n: FlushNotification) => void;
  onLater: (n: FlushNotification) => void;
  onReport: (n: FlushNotification) => void;
  onDelete: (n: FlushNotification) => void;
  onNavigate: (path: string) => void;
}) {
  const isModInvite = notif.type === 'mod_invite';
  const isDeckShare = notif.type === 'deck_share';
  const isVersionUpdate = notif.type === 'version_update';
  const isSentFlail = notif.type === 'deck_share_accepted' || notif.type === 'deck_share_declined';
  const hasTakenAction = !!notif.action_taken;

  // Build rich mod invite body with clickable parts
  const renderModInviteBody = () => {
    if (!isModInvite) return <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{notif.body}</p>;
    const inviterUsername = notif.meta?.inviter_username as string | undefined;
    const deckTitle = notif.meta?.deck_title as string | undefined;
    const publicDeckId = notif.meta?.public_deck_id as string | undefined;
    const message = notif.meta?.message as string | undefined;
    return (
      <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
        <p>
          {inviterUsername ? (
            <button
              className="font-medium text-foreground hover:underline"
              onClick={() => onNavigate(`/self?user=${encodeURIComponent(inviterUsername)}`)}
            >
              {inviterUsername}
            </button>
          ) : "Someone"}{' '}
          invites you to moderate{' '}
          {deckTitle && publicDeckId ? (
            <button
              className="font-medium text-foreground hover:underline"
              onClick={() => onNavigate(`/world?deck=${publicDeckId}`)}
            >
              {deckTitle}
            </button>
          ) : (deckTitle ?? 'a deck')}.
        </p>
        {message && <p className="italic text-muted-foreground/80">Message: {message}</p>}
      </div>
    );
  };

  // Build rich deck share body with clickable sender username
  const renderDeckShareBody = () => {
    if (!isDeckShare) return <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{notif.body}</p>;
    const senderUsername = notif.meta?.sender_username as string | undefined;
    const deckTitle = notif.meta?.deck_title as string | undefined;
    const message = notif.meta?.message as string | undefined;
    return (
      <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
        <p>
          {senderUsername ? (
            <button
              className="font-medium text-foreground hover:underline"
              onClick={() => onNavigate(`/self?user=${encodeURIComponent(senderUsername)}`)}
            >
              {senderUsername}
            </button>
          ) : "Someone"}{' '}
          wants to share{' '}
          <span className="font-medium text-foreground">"{deckTitle ?? 'a deck'}"</span> 
          with you.
        </p>
        {message && <p className="italic text-muted-foreground/80">Message: {message}</p>}
      </div>
    );
  };

  // Generic body: build the message from meta + type, make usernames clickable
  const renderGenericBody = () => {
    const meta = notif.meta ?? {};
    let bodyText = notif.body;
    if (notif.type === 'mod_accepted') {
      const mod = meta.new_mod_username as string | undefined;
      const deck = meta.deck_title as string | undefined;
      if (mod && deck) bodyText = `${mod} made you a moderator of “${deck}”.`;
    } else if (notif.type === 'mod_declination') {
      const who = (meta.declined_by || meta.inviter_username) as string | undefined;
      const deck = meta.deck_title as string | undefined;
      if (who && deck) bodyText = `${who} declined to moderate “${deck}”.`;
    } else if (notif.type === 'mod_removed') {
      const deck = meta.deck_title as string | undefined;
      if (deck) bodyText = `You are no longer a moderator of “${deck}”.`;
    } else if (notif.type === 'deck_share_accepted') {
      const who = meta.receiver_username as string | undefined;
      const deck = meta.deck_title as string | undefined;
      if (who && deck) bodyText = `${who} accepted your deck “${deck}”.`;
    } else if (notif.type === 'deck_share_declined') {
      const who = meta.receiver_username as string | undefined;
      const deck = meta.deck_title as string | undefined;
      if (who && deck) bodyText = `${who} declined your deck “${deck}”.`;
    } else if (notif.type === 'welcome') {
      const name = meta.username as string | undefined;
      if (name) bodyText = `Welcome to Flush, ${name}! Build your first deck to get started.`;
    }
    // Make any username in meta clickable in the body text
    const possibleUsernameKeys = ['sender_username', 'inviter_username', 'new_mod_username', 'declined_by', 'receiver_username'];
    const foundUsername = possibleUsernameKeys
      .map(k => meta[k] as string | undefined)
      .find(v => v && typeof v === 'string');
    if (!foundUsername) return <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{bodyText}</p>;
    const parts = bodyText.split(foundUsername);
    if (parts.length < 2) return <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{bodyText}</p>;
    return (
      <p className="text-xs text-muted-foreground mt-0.5 text-pretty">
        {parts[0]}
        <button
          className="font-medium text-foreground hover:underline"
          onClick={() => onNavigate(`/self?user=${encodeURIComponent(foundUsername)}`)}
        >
          {foundUsername}
        </button>
        {parts.slice(1).join(foundUsername)}
      </p>
    );
  };

  return (
    <div className={`px-4 py-3 border-b border-border last:border-0 transition-colors ${!notif.is_read ? 'bg-primary/5' : ''}`}>
      <div className="flex items-start gap-2">
        {!notif.is_read && (
          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground text-balance flex-1 min-w-0">{notif.title}</p>
            <button
              className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => onDelete(notif)}
              title="Delete notification"
              aria-label="Delete notification"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rich body */}
          {isModInvite ? renderModInviteBody() : isDeckShare ? renderDeckShareBody() : renderGenericBody()}

          {/* Action buttons */}
          {!hasTakenAction && (isModInvite || isDeckShare || isVersionUpdate) && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {isModInvite && (
                <>
                  <button onClick={() => onModAccept(notif)}
                    className="h-7 px-3 text-xs rounded-full font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    Accept
                  </button>
                  <button onClick={() => onModDeclineInit(notif)}
                    className="h-7 px-3 text-xs rounded-full font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
                    Decline
                  </button>
                </>
              )}
              {isDeckShare && (
                <>
                  <button onClick={() => onPreview(notif)}
                    className="h-7 px-3 text-xs rounded-full font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1">
                    <Eye className="w-3 h-3" />Preview
                  </button>
                  <button onClick={() => onReport(notif)}
                    className="h-7 px-3 text-xs rounded-full font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1">
                    <Flag className="w-3 h-3" />Report
                  </button>
                </>
              )}
              {isVersionUpdate && (
                <>
                  <button onClick={() => onPreviewChanges(notif)}
                    className="h-7 px-3 text-xs rounded-full font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1">
                    <Eye className="w-3 h-3" />Preview changes
                  </button>
                  <button onClick={() => onLater(notif)}
                    className="h-7 px-3 text-xs rounded-full font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
                    Later
                  </button>
                </>
              )}
            </div>
          )}
          {hasTakenAction && (isModInvite || isDeckShare || isVersionUpdate) && (
            <span className="inline-block mt-2 text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
              {notif.action_taken ? notif.action_taken : ''}
            </span>
          )}

          <p className="text-xs text-muted-foreground/60 mt-2">
            {new Date(notif.created_at).toLocaleDateString()} · {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>

          {/* Generic unread mark for non-action types */}
          {!isModInvite && !isDeckShare && !isVersionUpdate && !isSentFlail && !notif.is_read && (
            <button
              className="mt-1.5 h-6 px-3 text-xs rounded-full font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
              onClick={() => onDoneReading(notif)}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
