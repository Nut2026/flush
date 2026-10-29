import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Moon, Sun, Users, PanelLeftClose, PanelLeftOpen, Landmark, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSession } from '@/contexts/SessionContext';
import { PROFILE_GRADIENTS } from '@/services/flush/constants';
import { FlushLogo } from '@/components/common/FlushLogo';
import { ProfileCharacter, isProfileIcon } from '@/components/common/ProfileCharacter';
import { FlailBell } from '@/components/common/FlailBell';

// Nav structure: Base | My Decks | Athenaeum | Armoury | Arena | Trade
const NAV_LABELS: Record<string, string> = {
  dashboard: 'Base',
  armoury: 'Armoury',
  arena: 'Arena',
  world: 'Athenaeum',
  store: 'Trade',
};

const NAV_ITEMS = [
  { labelKey: 'dashboard', icon: LayoutDashboard, path: '/base' },
  { labelKey: 'armoury',   icon: Shield,          path: '/armoury' },
  { labelKey: 'arena',     icon: Landmark,        path: '/arena' },
  { labelKey: 'world',     icon: Users,           path: '/athenaeum' },
  { labelKey: 'store',     icon: ShoppingBag,     path: '/trade' },
];

// ── EXP Tier lookup (for sidebar box) ────────────────────────────────────────
const EXP_TIERS = [
  { name: 'Pin', emoji: '📌', threshold: 0 },
  { name: 'Clip', emoji: '🖇️', threshold: 500 },
  { name: 'Eraser', emoji: '🧹', threshold: 1_500 },
  { name: 'Sharpener', emoji: '✏️', threshold: 4_000 },
  { name: 'Scissors', emoji: '✂️', threshold: 10_000 },
  { name: 'Ruler', emoji: '📏', threshold: 25_000 },
  { name: 'Protractor', emoji: '📐', threshold: 60_000 },
  { name: 'Compass', emoji: '🧭', threshold: 150_000 },
  { name: 'Highlighter', emoji: '🖊️', threshold: 400_000 },
  { name: 'Notebook', emoji: '📓', threshold: 1_000_000 },
  { name: 'Stapler', emoji: '🗄️', threshold: 2_500_000 },
  { name: 'Calculator', emoji: '🧮', threshold: 5_000_000 },
  { name: 'Laminator', emoji: '🖨️', threshold: 13_000_000 },
];

const ARENA_LEAGUES_NAV = [
  { name: 'Sting', emoji: '🐝', min: 0 },
  { name: 'Grip', emoji: '🤝', min: 100 },
  { name: 'Void', emoji: '🌑', min: 250 },
  { name: 'Grind', emoji: '⚙️', min: 500 },
  { name: 'Blade', emoji: '🗡️', min: 900 },
  { name: 'Surge', emoji: '⚡', min: 1400 },
  { name: 'Gaze', emoji: '👁️', min: 2000 },
  { name: 'Vector', emoji: '📐', min: 2750 },
  { name: 'Blaze', emoji: '🔥', min: 3600 },
  { name: 'Canon', emoji: '💥', min: 4600 },
  { name: 'Keystone', emoji: '🗝️', min: 6000 },
  { name: 'Apex', emoji: '🦅', min: 7500 },
  { name: 'Zenith', emoji: '🌟', min: 9500 },
];

function getExpTier(exp: number) {
  let t = EXP_TIERS[0];
  for (const tier of EXP_TIERS) { if (exp >= tier.threshold) t = tier; }
  return t;
}
function getArenaLeagueNav(trophies: number) {
  let l = ARENA_LEAGUES_NAV[0];
  for (const league of ARENA_LEAGUES_NAV) { if (trophies >= league.min) l = league; }
  return l;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isGuest } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { isSessionActive, requestStop } = useSession();
  const navigate = useNavigate();

  // Sidebar collapsed state — persisted in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });

  // Whether there's enough sidebar space to show Tier/League box below the last nav item
  const navRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [showTierBox, setShowTierBox] = useState(false);

  useEffect(() => {
    if (sidebarCollapsed) { setShowTierBox(false); return; }
    const measure = () => {
      const nav = navRef.current;
      const footer = footerRef.current;
      if (!nav || !footer) return;
      const navBottom = nav.getBoundingClientRect().bottom;
      const footerTop = footer.getBoundingClientRect().top;
      // Box needs ~88px; leave 8px padding above footer
      setShowTierBox(footerTop - navBottom > 96);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (navRef.current) ro.observe(navRef.current);
    if (footerRef.current) ro.observe(footerRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [sidebarCollapsed, profile]);

  const toggleSidebar = () => {
    setSidebarCollapsed(v => {
      const next = !v;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };

  /** Navigate only when no session is active; otherwise prompt the page's End modal. */
  const safeNavigate = (path: string) => {
    if (isSessionActive) { requestStop(); return; }
    navigate(path);
  };

  const gradient = PROFILE_GRADIENTS.find(g => g.id === (profile?.profile_gradient || 'default'));

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* ── Desktop Sidebar — collapsible ── */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 transition-[width] duration-200 ease-in-out overflow-hidden ${
          sidebarCollapsed ? 'w-[60px]' : 'w-64'
        }`}
      >
        {/* Brand row: logo (+ "Flush" label when expanded) + collapse toggle */}
        <div className={`flex items-center border-b border-sidebar-border shrink-0 h-[69px] ${sidebarCollapsed ? 'flex-col justify-center gap-0' : ''}`}>
          <button
            className={`flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 ${
              sidebarCollapsed ? 'p-3 w-full justify-center' : 'px-4 py-5 flex-1 min-w-0'
            }`}
            onClick={() => safeNavigate('/base')}
            aria-label="Go to Base"
          >
            <FlushLogo size={32} className="shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-xl font-bold gradient-text truncate">Flush</span>
            )}
          </button>
          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="shrink-0 mr-2 p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expand toggle — shown only in collapsed state */}
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center py-2 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors border-b border-sidebar-border shrink-0"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {/* User avatar (collapsed: circle only; expanded: circle + name + stats) */}
        {(user || isGuest) && (
          <button
            className={`border-b border-sidebar-border w-full text-left hover:bg-sidebar-accent/50 transition-colors shrink-0 ${
              sidebarCollapsed ? 'flex justify-center py-3 px-0' : 'px-4 py-3'
            }`}
            onClick={() => safeNavigate('/scroll')}
            aria-label="Go to Scroll"
          >
            {sidebarCollapsed ? (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: gradient?.css || 'linear-gradient(135deg, #B026FF, #00D4FF)' }}
              >
                <ProfileCharacter
                  char={profile?.profile_character || (isGuest ? 'G' : '?')}
                  color={profile?.profile_char_color || '#ffffff'}
                  size={isProfileIcon(profile?.profile_character) ? 18 : 14}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: gradient?.css || 'linear-gradient(135deg, #B026FF, #00D4FF)' }}
                >
                  <ProfileCharacter
                    char={profile?.profile_character || (isGuest ? 'G' : '?')}
                    color={profile?.profile_char_color || '#ffffff'}
                    size={isProfileIcon(profile?.profile_character) ? 18 : 14}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">
                    {profile?.username || (isGuest ? "Guest" : "Learner")}
                  </p>
                  {/* Stats row: gems · streak · trophies · EXP */}
                  <p className="text-xs text-sidebar-foreground/60 flex items-center gap-1.5 flex-wrap">
                    <span>{profile?.gems ?? 0}💎</span>
                    <span>{profile?.streak_days ?? 0}{(() => {
                      const today = new Date().toLocaleDateString('en-CA');
                      const bd = profile?.streak_break_date;
                      const studiedToday = profile?.last_study_date === today;
                      const breakRecent = !!bd && Math.abs((new Date(today).getTime() - new Date(bd).getTime()) / 86400000) <= 7;
                      if (studiedToday && bd === today) return '❄️';
                      if (!studiedToday && breakRecent) return '❄️';
                      if (!profile?.streak_days || profile.streak_days < 1) return '🥚';
                      if (!studiedToday) return '❄️';
                      return '🔥';
                    })()}</span>
                    <span>{(profile?.trophies ?? 0).toLocaleString()}🏆</span>
                    <span>{(profile?.total_exp ?? 0).toLocaleString()} EXP</span>
                  </p>
                </div>
              </div>
            )}
          </button>
        )}

        {/* Nav links + optional Tier/League box — this area is measured for available space */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <nav ref={navRef} className="px-2 py-4 space-y-1 shrink-0">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={isSessionActive ? (e) => { e.preventDefault(); requestStop(); } : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-2.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    sidebarCollapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
                }
                title={sidebarCollapsed ? NAV_LABELS[item.labelKey] ?? item.labelKey : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && (
                  <span>{NAV_LABELS[item.labelKey] ?? item.labelKey}</span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Tier/League info box — sits right below Trade, only when expanded + space allows */}
          {!sidebarCollapsed && showTierBox && profile && !isGuest && (() => {
            const tier = getExpTier(profile.total_exp ?? 0);
            const arenaLeague = getArenaLeagueNav(profile.trophies ?? 0);
            return (
              <div className="mx-3 mt-1 mb-2 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 p-3 space-y-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">{tier.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-sidebar-foreground truncate">{tier.name} Tier</p>
                    <p className="text-[10px] text-sidebar-foreground/50">{(profile.total_exp ?? 0).toLocaleString()} EXP</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">{arenaLeague.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-sidebar-foreground truncate">{arenaLeague.name} League</p>
                    <p className="text-[10px] text-sidebar-foreground/50">{(profile.trophies ?? 0).toLocaleString()} 🏆</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Spacer — fills remaining space above footer */}
          <div className="flex-1" />
        </div>

        {/* Sticky footer — flail bell + dark mode toggle */}
        <div ref={footerRef} className={`pb-4 border-t border-sidebar-border pt-3 flex flex-col items-center gap-2 shrink-0 ${sidebarCollapsed ? 'px-1' : 'px-3'}`}>
          <div className={`flex items-center justify-center ${isSessionActive ? 'pointer-events-none opacity-40' : ''}`}>
            <FlailBell />
          </div>
          {/* Language picker temporarily hidden */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            className={`${sidebarCollapsed ? 'w-9 h-9 p-0' : 'w-full justify-center'} text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`}
            title={darkMode ? 'Switch to Light' : 'Switch to Dark'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </aside>

      {/* ── Right side: only this scrolls ── */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-10 shrink-0">
          {/* Flush logo + wordmark — top-left */}
          <button
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            onClick={() => safeNavigate('/base')}
            aria-label="Go to Base"
          >
            <FlushLogo size={28} className="shrink-0" />
            <span className="font-bold gradient-text text-sm">Flush</span>
          </button>
          <div className="flex items-center gap-1">
            {profile && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1 flex-wrap">
                <span>{profile.gems}💎</span>
                <span>{profile.streak_days ?? 0}{(() => {
                  const today = new Date().toLocaleDateString('en-CA');
                  const bd = profile.streak_break_date;
                  const studiedToday = profile.last_study_date === today;
                  const breakRecent = !!bd && Math.abs((new Date(today).getTime() - new Date(bd).getTime()) / 86400000) <= 7;
                  if (studiedToday && bd === today) return '❄️';
                  if (!studiedToday && breakRecent) return '❄️';
                  if (!profile.streak_days || profile.streak_days < 1) return '🥚';
                  if (!studiedToday) return '❄️';
                  return '🔥';
                })()}</span>
                <span>{profile.trophies ?? 0}🏆</span>
                <span className="hidden sm:inline">{(profile.total_exp ?? 0).toLocaleString()} EXP</span>
              </div>
            )}
            <FlailBell />
            {/* Language picker temporarily hidden */}
            <Button variant="ghost" size="sm" onClick={toggleDarkMode}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {/* Avatar circle — top-right, after dark toggle */}
            <button
              className="flex items-center hover:opacity-80 transition-opacity ml-1"
              onClick={() => safeNavigate('/scroll')}
              aria-label="Go to Scroll"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                style={{ background: gradient?.css || 'linear-gradient(135deg, #B026FF, #00D4FF)' }}
              >
                <ProfileCharacter
                  char={profile?.profile_character || (isGuest ? 'G' : '?')}
                  color={profile?.profile_char_color || '#ffffff'}
                  size={isProfileIcon(profile?.profile_character) ? 16 : 12}
                />
              </div>
            </button>
          </div>
        </header>

        {/* Page Content — scrollable */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6 min-h-0">
          <div className="page-fade-in">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border flex z-10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={isSessionActive ? (e) => { e.preventDefault(); requestStop(); } : undefined}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-1 min-w-0 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="w-full text-center px-0.5 text-[9px] leading-tight font-medium block whitespace-normal break-words line-clamp-2">{NAV_LABELS[item.labelKey] ?? item.labelKey}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
