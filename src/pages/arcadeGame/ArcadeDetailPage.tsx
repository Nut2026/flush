import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Download, Zap, FileCode2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  fetchArcadeGame,
  installArcadeGame,
  uninstallArcadeGame,
  upsertArcadeRating,
  fetchUserArcadeRating,
} from '@/services/flush/arcadeService';
import type { ArcadeGame } from '@/services/flush/arcadeService';
import { StarRating } from './starRating';

export default function ArcadeDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [game, setGame] = useState<ArcadeGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [installedBusy, setInstalledBusy] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    fetchArcadeGame(gameId, user?.id).then(g => {
      setGame(g);
      setLoading(false);
    });
    if (user) fetchUserArcadeRating(user.id, gameId).then(setUserRating);
  }, [gameId, user]);

  const isOwner = !!user && !!game && game.creator_id === user.id;

  const handleInstall = async () => {
    if (!user || !game || installedBusy) return;
    setInstalledBusy(true);
    try {
      if (game.is_installed) {
        await uninstallArcadeGame(user.id, game.id);
        setGame(prev => prev ? { ...prev, is_installed: false, install_count: Math.max(0, prev.install_count - 1) } : prev);
        toast.success('Removed from your collection.');
      } else {
        await installArcadeGame(user.id, game.id);
        setGame(prev => prev ? { ...prev, is_installed: true, install_count: prev.install_count + 1 } : prev);
        toast.success('Added to your collection!');
      }
    } finally {
      setInstalledBusy(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (!user || !game || isOwner) return;
    setSubmittingRating(true);
    try {
      await upsertArcadeRating(user.id, game.id, rating);
      setUserRating(rating);
      setGame(prev => prev ? ({
        ...prev,
        rating_count: prev.user_rating ? prev.rating_count : prev.rating_count + 1,
        rating_sum: prev.rating_sum + (rating - (prev.user_rating ?? 0)),
        user_rating: rating,
      }) : prev);
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="h-40 w-full bg-muted rounded-xl" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto text-center space-y-4">
        <p className="text-muted-foreground">This arcade could not be found.</p>
        <Button variant="outline" onClick={() => navigate('/athenaeum/arcades')}>Back to Arcades</Button>
      </div>
    );
  }

  const avgRating = game.rating_count > 0 ? (game.rating_sum / game.rating_count).toFixed(1) : '—';

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-1" onClick={() => navigate('/athenaeum/arcades')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        {!isOwner && user && (
          <Button size="sm" onClick={() => void handleInstall()} disabled={installedBusy} className="gap-1.5">
            {game.is_installed ? <><Download className="w-4 h-4" /> Installed — Remove</> : <><Download className="w-4 h-4" /> Add Arcade</>}
          </Button>
        )}
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-secondary/10 p-6 space-y-3">
        <div className="flex items-start gap-4 flex-wrap">
          <span className="text-5xl">🕹️</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-balance">{game.title}</h1>
            <p className="text-sm text-muted-foreground">by {game.creator_emoji} {game.creator_username}</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
            <span className="flex items-center gap-1"><Download className="w-4 h-4" />{game.install_count}</span>
            <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-amber-400" />{avgRating}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">{game.license}</Badge>
        <p className="text-sm text-foreground/90 text-pretty">{game.blurb}</p>
        <p className="text-sm text-muted-foreground text-pretty whitespace-pre-line">{game.description}</p>
      </div>

      {/* Rating */}
      {user && !isOwner && (
        <div className="rounded-xl border border-border p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium">Your rating</p>
            <p className="text-xs text-muted-foreground">Tap a bolt to rate this arcade.</p>
          </div>
          <div className="flex items-center gap-2">
            {submittingRating && <span className="text-xs text-muted-foreground">Saving…</span>}
            <StarRating rating={userRating} onRate={r => void handleRate(r)} />
          </div>
        </div>
      )}

      {/* Code (owner view; public view reports availability only) */}
      <Tabs defaultValue={isOwner ? 'code' : 'about'}>
        <TabsList>
          <TabsTrigger value="about" className="gap-1.5"><Zap className="w-3.5 h-3.5" /> About</TabsTrigger>
          {isOwner && <TabsTrigger value="code" className="gap-1.5"><FileCode2 className="w-3.5 h-3.5" /> Code</TabsTrigger>}
        </TabsList>
        <TabsContent value="about">
          <div className="rounded-xl border border-border bg-secondary/10 p-4 text-sm text-muted-foreground">
            Games run inside a sandboxed iframe with no network or storage access.
            Install this arcade, then play it from the Arcade page with any deck.
          </div>
        </TabsContent>
        {isOwner && (
          <TabsContent value="code">
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileCode2 className="w-3.5 h-3.5" /> game.ts</span>
                <span className="text-xs text-muted-foreground">{game.code_content.length.toLocaleString()} chars</span>
              </div>
              <pre className="max-h-96 overflow-auto bg-[#14141f] text-[#d6d6e0] text-xs font-mono p-4 whitespace-pre-wrap">{game.code_content}</pre>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export { Trash2 };
