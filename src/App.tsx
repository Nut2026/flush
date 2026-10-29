import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppProvider } from '@/contexts/AppContext';
import { SessionProvider } from '@/contexts/SessionContext';
import { AppLayout } from '@/components/layouts/AppLayout';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const DecksPage = lazy(() => import('@/pages/DecksPage'));
const ArmouryPage = lazy(() => import('@/pages/ArmouryPage'));
const DeckEditorPage = lazy(() => import('@/pages/DeckEditorPage'));
const StudyPage = lazy(() => import('@/pages/StudyPage'));
const TestPage = lazy(() => import('@/pages/TestPage'));
const GamesPage = lazy(() => import('@/pages/GamesPage'));
const StudioPage = lazy(() => import('@/pages/studio/StudioPage'));
const ArcadeDetailPage = lazy(() => import('@/pages/arcadeGame/ArcadeDetailPage'));
const WhackACardGame = lazy(() => import('@/pages/games/WhackACardGame'));
const SkyscraperGame = lazy(() => import('@/pages/games/SkyscraperGame'));
const MatchingGame = lazy(() => import('@/pages/games/MatchingGame'));
const StorePage = lazy(() => import('@/pages/StorePage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const ViewDeckPage = lazy(() => import('@/pages/ViewDeckPage'));
const WorldPage = lazy(() => import('@/pages/WorldPage'));
const ArenaPage = lazy(() => import('@/pages/ArenaPage'));


const Loader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  </div>
);

function AppRoutes() {
  const { user, isGuest, loading } = useAuth();
  const isAuthenticated = !!user || isGuest;
  if (loading) return <Loader />;
  return (
    <Routes>
      {/* '/' — redirect authenticated real users to dashboard; guests can still reach /auth */}
      <Route path="/" element={isAuthenticated && !isGuest ? <Navigate to="/base" replace /> : <LandingPage />} />
      {/* '/auth' — always shows auth forms (used by guest Sign Up / Log In buttons) */}
      <Route path="/auth" element={<LandingPage />} />
      {/* Privacy Policy — always public */}

      {/* Athenaeum — accessible to guests for browsing; sub-routes handled inside WorldPage */}
      <Route path="/athenaeum" element={<Navigate to="/athenaeum/decks" replace />} />
      <Route path="/athenaeum/decks" element={<AppLayout><WorldPage /></AppLayout>} />
      <Route path="/athenaeum/decks/:slug" element={<AppLayout><WorldPage /></AppLayout>} />
      <Route path="/athenaeum/arcades" element={<AppLayout><WorldPage /></AppLayout>} />
      <Route path="/athenaeum/contributions" element={<AppLayout><WorldPage /></AppLayout>} />
      <Route path="/athenaeum/tiers" element={<AppLayout><WorldPage /></AppLayout>} />
      <Route path="/athenaeum/leagues" element={<Navigate to="/athenaeum/tiers" replace />} />
      <Route path="/athenaeum/clans" element={<AppLayout><WorldPage /></AppLayout>} />
      {/* Legacy /world redirects */}
      <Route path="/world" element={<Navigate to="/athenaeum/decks" replace />} />
      <Route path="/world/decks" element={<Navigate to="/athenaeum/decks" replace />} />
      <Route path="/world/decks/:slug" element={<Navigate to="/athenaeum/decks" replace />} />
      <Route path="/world/arcades" element={<Navigate to="/athenaeum/arcades" replace />} />
      <Route path="/world/contributions" element={<Navigate to="/athenaeum/contributions" replace />} />
      <Route path="/world/league" element={<Navigate to="/athenaeum/tiers" replace />} />
      <Route path="/world/leagues" element={<Navigate to="/athenaeum/tiers" replace />} />
      <Route path="/world/clans" element={<Navigate to="/athenaeum/clans" replace />} />
      {isAuthenticated ? (
        <>
          {/* Base (Dashboard) */}
          <Route path="/base" element={<AppLayout><DashboardPage /></AppLayout>} />
          <Route path="/dashboard" element={<Navigate to="/base" replace />} />

          {/* Decks (My Decks) */}
          <Route path="/decks" element={<AppLayout><DecksPage /></AppLayout>} />
          <Route path="/decks/new" element={<AppLayout><DeckEditorPage /></AppLayout>} />
          <Route path="/decks/:deckId/edit" element={<AppLayout><DeckEditorPage /></AppLayout>} />
          <Route path="/decks/:deckId/study" element={<AppLayout><StudyPage /></AppLayout>} />
          <Route path="/decks/:deckId/test" element={<AppLayout><TestPage /></AppLayout>} />
          <Route path="/decks/:deckId/view" element={<AppLayout><ViewDeckPage /></AppLayout>} />

          {/* Armoury */}
          <Route path="/armoury" element={<AppLayout><ArmouryPage /></AppLayout>} />

          {/* Arena */}
          <Route path="/arena" element={<AppLayout><ArenaPage /></AppLayout>} />
          <Route path="/arena/new" element={<AppLayout><DeckEditorPage /></AppLayout>} />

          {/* Arcade */}
          <Route path="/games" element={<AppLayout><GamesPage /></AppLayout>} />
          <Route path="/arcade" element={<AppLayout><GamesPage /></AppLayout>} />
          <Route path="/arcade/:deckId" element={<AppLayout><GamesPage /></AppLayout>} />
          <Route path="/games/whack/:deckId" element={<AppLayout><WhackACardGame /></AppLayout>} />
          <Route path="/games/skyscraper/:deckId" element={<AppLayout><SkyscraperGame /></AppLayout>} />
          <Route path="/games/matching/:deckId" element={<AppLayout><MatchingGame /></AppLayout>} />
          <Route path="/arcade/whack/:deckId" element={<AppLayout><WhackACardGame /></AppLayout>} />
          <Route path="/arcade/skyscraper/:deckId" element={<AppLayout><SkyscraperGame /></AppLayout>} />
          <Route path="/arcade/matching/:deckId" element={<AppLayout><MatchingGame /></AppLayout>} />

          {/* Arcade Game Studio & Community Game Detail */}
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/arcade-game/:gameId" element={<AppLayout><ArcadeDetailPage /></AppLayout>} />

          {/* Trade (Store) */}
          <Route path="/trade" element={<AppLayout><StorePage /></AppLayout>} />
          <Route path="/glow" element={<Navigate to="/trade" replace />} />

          {/* Scroll (Profile) — /self preserves ?user= query param for public profile views */}
          <Route path="/scroll" element={<AppLayout><ProfilePage /></AppLayout>} />
          <Route path="/self" element={<AppLayout><ProfilePage /></AppLayout>} />
          <Route path="/board" element={<AppLayout><ProfilePage /></AppLayout>} />
          <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />

          {/* Legacy clubs route → world/clans */}
          <Route path="/clubs" element={<Navigate to="/athenaeum/clans" replace />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/" replace />} />
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App: React.FC = () => (
  <Router>
    <AuthProvider>
      <ThemeProvider>
        <AppProvider>
          <SessionProvider>
            <Suspense fallback={<Loader />}>
              <AppRoutes />
            </Suspense>
            <Toaster richColors position="top-right" expand duration={6000} gap={8} closeButton />
          </SessionProvider>
        </AppProvider>
      </ThemeProvider>
    </AuthProvider>
  </Router>
);

export default App;
