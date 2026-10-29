import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchDecks, fetchGameHighScores, fetchGameDeckScores, fetchGameHistory, clearGameHistory, deleteOrphanGameSessions, fetchFlashcards } from '@/services/flush/flushService';
import type { GameDeckScore } from '@/services/flush/flushService';
import { STARTER_GUEST_DECKS } from '@/services/flush/guestData';
import type { Deck, GameHighScore, GameSession } from '@/types/types';
import { fetchInstalledGames, uninstallArcadeGame } from '@/services/flush/arcadeService';
import type { ArcadeGame } from '@/services/flush/arcadeService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { BowArrow, History, Trophy, ArrowLeft, Play, X, Download, Hammer, Building2, Layers3, Zap } from 'lucide-react';
import { toast } from 'sonner';

const GAMES = [
  {
    id: 'whack',
    color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
  },
  {
    id: 'skyscraper',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  },
  {
    id: 'matching',
    color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  },
];

const GAME_NAME_MAP: Record<string, string> = {
  whack: 'whackacard', skyscraper: 'skyscraper', matching: 'matching',
};

export default function GamesPage() {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const { deckId: paramDeckId } = useParams<{ deckId?: string }>();
  const [searchParams] = useSearchParams();
  const defaultDeck = paramDeckId || searchParams.get('deck') || '';

  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDecks, setSelectedDecks] = useState<Record<string, string>>({});
  const [highScores, setHighScores] = useState<GameHighScore[]>([]);
  const [gameHistory, setGameHistory] = useState<GameSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deckScores, setDeckScores] = useState<GameDeckScore[]>([]);
  const [loading, setLoading] = useState(true);

  // Community Arcades
  const [installedGames, setInstalledGames] = useState<ArcadeGame[]>([]);
  const [arcadeLoading, setArcadeLoading] = useState(false);
  const [playingGame, setPlayingGame] = useState<ArcadeGame | null>(null);
  const [playDeckId, setPlayDeckId] = useState('');
  const [deckSelectOpen, setDeckSelectOpen] = useState(false);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const channelRef = useRef<MessageChannel | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isGuest) {
          const raw = sessionStorage.getItem('guest_decks');
          const guestDecks = raw ? JSON.parse(raw) : STARTER_GUEST_DECKS;
          setDecks(guestDecks);
          const init: Record<string, string> = {};
          GAMES.forEach(g => { init[g.id] = defaultDeck || guestDecks[0]?.id || ''; });
          setSelectedDecks(init);
          setLoading(false);
          return;
        }
        if (!user) return;
        const [deckData, scores, ds] = await Promise.all([
          fetchDecks(user.id),
          fetchGameHighScores(user.id),
          fetchGameDeckScores(user.id),
        ]);
        setDecks(deckData);
        setHighScores(scores);
        setDeckScores(ds);
        const init: Record<string, string> = {};
        GAMES.forEach(g => { init[g.id] = defaultDeck || deckData[0]?.id || ''; });
        setSelectedDecks(init);

        setHistoryLoading(true);
        fetchGameHistory(user.id).then(h => {
          const knownIds = deckData.map((d: { id: string }) => d.id);
          const orphanIds = h.filter(s => s.deck_id && !knownIds.includes(s.deck_id)).map(s => s.id);
          if (orphanIds.length > 0) {
            deleteOrphanGameSessions(user.id, knownIds).then(() =>
              fetchGameHistory(user.id).then(fresh => { setGameHistory(fresh); setHistoryLoading(false); })
            );
          } else {
            setGameHistory(h); setHistoryLoading(false);
          }
        });
      } catch (err) {
        console.error('Games load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, isGuest, defaultDeck]);

  // Load installed community arcade games
  useEffect(() => {
    if (!user || isGuest) return;
    setArcadeLoading(true);
    fetchInstalledGames(user.id).then(games => {
      setInstalledGames(games);
      setArcadeLoading(false);
    });
  }, [user, isGuest]);

  const getScores = (gameId: string, deckId: string) => {
    const gameName = GAME_NAME_MAP[gameId];
    const globalScore = highScores.find(s => s.game_name === gameName);
    const deckScore = deckScores.find(s => s.game_name === gameName && s.deck_id === deckId);
    return {
      highScore: globalScore?.high_score ?? null,
      deckBest: deckScore?.best_score ?? null,
    };
  };

  const formatScore = (gameId: string, val: number) =>
    gameId === 'matching' ? `${val}s` : String(val);

  const handlePlay = (gameId: string) => {
    const deckId = selectedDecks[gameId];
    if (!deckId) return;
    navigate(`/arcade/${gameId}/${deckId}`);
  };

  // ── Community arcade sandbox ────────────────────────────────────────────────
  const stripTypes = (ts: string): string =>
    ts
      .replace(/interface\s+\w+\s*\{[^}]*\}/gs, '')
      .replace(/:\s*(string|number|boolean|void|null|undefined|any|FlushAPI|FlushArcadeGame|CanvasRenderingContext2D|HTMLCanvasElement|MouseEvent|Promise<[^>]+>|\w+\[\])/g, '')
      .replace(/<[A-Z][^>]*>/g, '')
      .replace(/export\s+default\s+(\w+);?/, '\nconst exports={default:$1};')
      .replace(/^import\s.*$/gm, '');

  const buildSandboxHtml = (js: string): string => `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#1E1E2E;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}#game-canvas{display:block;}</style>
</head><body>
<canvas id="game-canvas" width="800" height="560" tabindex="0"></canvas>
<script>
(function(){
  'use strict';
  const BLOCKED=['fetch','XMLHttpRequest','WebSocket','indexedDB','localStorage','sessionStorage'];
  BLOCKED.forEach(k=>{try{Object.defineProperty(window,k,{get(){throw new Error('Flush Sandbox: '+k+' blocked')}})}catch(_){}});
  let port2=null,pendingResolve=null;
  const flushApi={
    getQuestion(){return new Promise(r=>{pendingResolve=r;port2.postMessage({type:'GET_QUESTION'});})},
    submitAnswer(c){port2.postMessage({type:'ANSWER',correct:c});return Promise.resolve();},
    submitScore(s){port2.postMessage({type:'SCORE',score:s});return Promise.resolve();},
    log(m){port2.postMessage({type:'LOG',message:String(m)});}
  };
  window.addEventListener('message',ev=>{
    if(ev.data?.type==='INIT_PORT'){
      port2=ev.ports[0];
      port2.onmessage=me=>{
        if(me.data?.type==='QUESTION'&&pendingResolve){const r=pendingResolve;pendingResolve=null;r(me.data.card);}
        if(me.data?.type==='TERMINATE'){port2.close();}
      };
      try{startGame();}catch(e){port2.postMessage({type:'ERROR',message:String(e)});}
    }
  });
  let lastYield=Date.now();
  const origRAF=requestAnimationFrame.bind(window);
  window.requestAnimationFrame=cb=>{lastYield=Date.now();return origRAF(cb);};
  setInterval(()=>{if(Date.now()-lastYield>5000){document.body.innerHTML='<div style="color:#ff6b6b;padding:20px;font-family:sans-serif;">⚠️ Game stopped: no activity for 5s.</div>';if(port2)port2.postMessage({type:'ERROR',message:'Loop detected.'});}},500);
  function startGame(){
    ${js}
    const GameClass=typeof exports!=='undefined'&&exports.default?exports.default:(typeof MyArcade!=='undefined'?MyArcade:null);
    if(!GameClass)throw new Error('No default export found.');
    const g=new GameClass();g.init(flushApi);g.start();
  }
})();
<\/script></body></html>`;

  const handleOpenArcadePlay = useCallback((game: ArcadeGame) => {
    if (decks.length === 0) { toast.error('You need at least one deck to play.'); return; }
    setPlayingGame(game);
    setPlayDeckId(decks[0]?.id ?? '');
    setDeckSelectOpen(true);
  }, [decks]);

  const handleStartArcadePlay = useCallback(async () => {
    if (!playingGame || !playDeckId) return;
    setDeckSelectOpen(false);
    setActiveGameId(playingGame.id);

    const cards = await fetchFlashcards(playDeckId);
    let cardIdx = 0;
    const js = stripTypes(playingGame.code_content);
    const html = buildSandboxHtml(js);

    // Give iframe time to appear in DOM
    await new Promise(r => setTimeout(r, 80));
    const iframe = iframeRef.current;
    if (!iframe) return;

    iframe.onload = null;
    if (channelRef.current) channelRef.current.port1.close();
    const channel = new MessageChannel();
    channelRef.current = channel;

    iframe.onload = () => {
      iframe.onload = null;
      iframe.contentWindow?.postMessage({ type: 'INIT_PORT' }, '*', [channel.port2]);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (iframe as any).srcdoc = html;

    channel.port1.onmessage = (ev) => {
      const msg = ev.data as { type: string; correct?: boolean; score?: number; message?: string };
      if (msg.type === 'GET_QUESTION') {
        const card = cards[cardIdx % Math.max(cards.length, 1)];
        cardIdx++;
        channel.port1.postMessage({ type: 'QUESTION', card: { front: card?.front_text ?? 'No cards', back: card?.back_text ?? '', notes: card?.notes ?? '' } });
      } else if (msg.type === 'SCORE') {
        toast.success(`🏆 Score: ${msg.score}`);
      } else if (msg.type === 'ERROR') {
        toast.error(`Game error: ${msg.message}`);
        setActiveGameId(null);
      }
    };
  }, [playingGame, playDeckId]);

  const handleStopArcade = useCallback(() => {
    channelRef.current?.port1.postMessage({ type: 'TERMINATE' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (iframeRef.current) (iframeRef.current as any).srcdoc = '';
    setActiveGameId(null);
    setPlayingGame(null);
  }, []);

  const handleUninstall = useCallback(async (gameId: string) => {
    if (!user) return;
    await uninstallArcadeGame(user.id, gameId);
    setInstalledGames(prev => prev.filter(g => g.id !== gameId));
    toast.success('Arcade removed from your collection.');
  }, [user]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32 bg-muted" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 bg-muted" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1" onClick={() => navigate('/decks')}>
            <ArrowLeft className="w-4 h-4" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BowArrow className="w-6 h-6 text-primary" />
              Games
            </h1>
          </div>
        </div>
      </div>

      {/* Game cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {GAMES.map(game => {
          const deckId = selectedDecks[game.id] || '';
          const { highScore, deckBest } = getScores(game.id, deckId);
          const deck = decks.find(d => d.id === deckId);
          const hasNoCards = deck && (deck.flashcard_count || 0) === 0;
          const hasTooFewCards = deck && (deck.flashcard_count || 0) < 8;
          const isAnyDisabled = hasTooFewCards;

          const getGameMeta = (id: string) => {
            if (id === 'whack') return { name: "Whack-a-Card", description: "Whack the right card before it escapes, and rack up the score." };
            if (id === 'skyscraper') return { name: "Build a Skyscraper", description: "Answer correctly to stack floors, and build your tower higher." };
            return { name: "Matching Magic", description: "Flip cards two at a time and remember where each pair hides." };
          };
          const { name: gameName, description: gameDesc } = getGameMeta(game.id);
          return (
            <Card key={game.id} className={`h-full bg-gradient-to-br ${game.color}`}>
              <CardContent className="p-5 flex flex-col h-full">
                <div className="mb-3 flex items-center gap-2">
                  {game.id === 'whack' && <Hammer className="w-7 h-7 text-primary" />}
                  {game.id === 'skyscraper' && <Building2 className="w-7 h-7 text-primary" />}
                  {game.id === 'matching' && <Layers3 className="w-7 h-7 text-primary" />}
                </div>
                <h2 className="font-bold text-foreground text-balance mb-1">{gameName}</h2>
                <p className="text-xs text-muted-foreground mb-4 text-pretty">{gameDesc}</p>

                <div className="mt-auto space-y-3">
                  {/* Deck selector */}
                  <Select
                    value={deckId}
                    onValueChange={v => setSelectedDecks(prev => ({ ...prev, [game.id]: v }))}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50">
                      {/* @ts-ignore */}<SelectValue placeholder="Select a deck" />
                    </SelectTrigger>
                    <SelectContent>
                      {decks.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.title} ({d.flashcard_count} cards)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Score display */}
                  <div className="space-y-1">
                    {highScore !== null ? (
                      <p className="text-xs text-center text-muted-foreground">
                        🏆 High score: <span className="font-bold text-yellow-500">{formatScore(game.id, highScore)}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-center text-muted-foreground italic">Think you can beat it?</p>
                    )}
                    {deckBest !== null ? (
                      <p className="text-xs text-center text-muted-foreground">
                        🥈 Deck best: <span className="font-bold text-slate-400">{formatScore(game.id, deckBest)}</span>
                      </p>
                    ) : deckId ? (
                      <p className="text-xs text-center text-muted-foreground italic">A new deck best is waiting for you.</p>
                    ) : null}
                  </div>

                  {/* Card count warnings */}
                  {hasNoCards && (
                    <p className="text-xs text-destructive text-center">No cards available to play with.</p>
                  )}
                  {!hasNoCards && hasTooFewCards && (
                    <p className="text-xs text-yellow-400 text-center">This game needs at least 8 cards.</p>
                  )}

                  {/* Play button */}
                  <Button
                    className="w-full"
                    onClick={() => handlePlay(game.id)}
                    disabled={!deckId || isAnyDisabled === true}
                  >
                    ▶ Play
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No decks warning */}
      {decks.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Create a deck first, then come back to play.</p>
          <Button asChild><Link to="/decks/new">Create a new deck</Link></Button>
        </div>
      )}

      {/* ── Community Arcades ── */}
      {!isGuest && user && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              🕹️ Community Arcades
            </h2>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => navigate('/world/arcades')}>
              <Download className="w-3.5 h-3.5" />Find Arcades in Athenaeum
            </Button>
          </div>

          {arcadeLoading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-28 bg-muted rounded-xl" />)}
            </div>
          ) : installedGames.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
              <p className="text-muted-foreground text-sm">No community arcades installed yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {installedGames.map(game => {
                const isActive = activeGameId === game.id;
                const avgRating = game.rating_count > 0
                  ? (game.rating_sum / game.rating_count).toFixed(1)
                  : '—';
                return (
                  <div key={game.id} className="rounded-xl border border-border bg-secondary/10 overflow-hidden h-full flex flex-col">
                    <div className="p-4 flex-1 space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-2xl shrink-0">🕹️</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-foreground truncate">{game.title}</h3>
                          <p className="text-xs text-muted-foreground">by {game.creator_emoji} {game.creator_username}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span className="text-xs text-muted-foreground">{avgRating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 text-pretty">{game.description}</p>
                    </div>

                    {/* Active sandbox */}
                    {isActive && (
                      <div className="w-full bg-[#1E1E2E] border-t border-border" style={{ aspectRatio: '800/560' }}>
                        <iframe
                          ref={iframeRef}
                          title={`Playing ${game.title}`}
                          sandbox="allow-scripts allow-modals"
                          className="w-full h-full border-none"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 p-3 border-t border-border">
                      {isActive ? (
                        <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={handleStopArcade}>
                          <X className="w-3.5 h-3.5 mr-1" />Stop
                        </Button>
                      ) : (
                        <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => handleOpenArcadePlay(game)}>
                          <Play className="w-3.5 h-3.5 mr-1" />Play
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => navigate(`/arcade-game/${game.id}`)}>
                        Details
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => void handleUninstall(game.id)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Arcade History (logged-in users only) ── */}
      {!isGuest && user && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Arcade History
            </h2>
            {gameHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive text-xs h-7"
                onClick={async () => { await clearGameHistory(user.id); setGameHistory([]); }}
              >
                Clear History
              </Button>
            )}
          </div>

          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 bg-muted w-full" />)}
            </div>
          ) : gameHistory.length === 0 ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-border">
              <BowArrow className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No arcade yet. Hit Play to shape history!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {gameHistory.map(session => {
                // Auto-skip (hide) entries where the deck no longer exists
                const deckRef = decks.find(d => d.id === session.deck_id);
                if (!deckRef) return null;
                const gameLabelMap: Record<string, string> = {
                  whackacard: "Whack-a-Card",
                  skyscraper: "Build a Skyscraper",
                  matching: "Matching Magic",
                };
                const isMatching = session.game_name === 'matching';
                const scoreLabel = isMatching
                  ? `Time: ${session.score}s`
                  : `Score: ${session.score}`;
                return (
                  <div key={session.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {gameLabelMap[session.game_name] ?? session.game_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {deckRef.title} · {new Date(session.created_at).toLocaleDateString(
                            'en-GB',
                            { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs font-bold">
                        {scoreLabel}
                      </Badge>
                      {session.is_high_score && (
                        <Badge className="text-xs gap-1 bg-yellow-500/20 text-yellow-500 border border-yellow-500/40">
                          <Trophy className="w-3 h-3" /> High score
                        </Badge>
                      )}
                      {session.is_deck_best && (
                        <Badge className="text-xs gap-1 bg-slate-400/20 text-slate-400 border border-slate-400/40">
                          <Trophy className="w-3 h-3" /> Deck best
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Deck select for community arcade */}
      <Dialog open={deckSelectOpen} onOpenChange={setDeckSelectOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Select a Deck</DialogTitle>
            <DialogDescription>
              Choose which deck's flashcards to use in {playingGame?.title}.
            </DialogDescription>
          </DialogHeader>
          <Select value={playDeckId} onValueChange={setPlayDeckId}>
            <SelectTrigger><SelectValue placeholder="Select a deck…" /></SelectTrigger>
            <SelectContent>
              {decks.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => { setDeckSelectOpen(false); setPlayingGame(null); }}>Cancel</Button>
            <Button onClick={() => void handleStartArcadePlay()} disabled={!playDeckId}>
              <Play className="w-4 h-4 mr-2" />Play
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

