// ── Theme CSS variable maps ─────────────────────────────────────────────────
// Kept in its own file so it is NOT part of the flushService → AuthContext
// import chain.  Changing theme colours never invalidates AuthContext, which
// would otherwise break context identity on HMR and cause "useAuth must be
// used within an AuthProvider" errors in sibling providers.

export interface ThemeVars {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  success: string;
  warning: string;
  info: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  shadowCard: string;
  shadowHover: string;
  themeGlow: string;
  gradientPrimary: string;
}

const D = '0 72% 51%';      // destructive
const DF = '0 0% 100%';     // destructive-foreground
const W = '38 92% 50%';     // warning
const I = '213 94% 68%';    // info

export const THEME_VARS: Record<string, { dark: ThemeVars; light?: Partial<ThemeVars> }> = {
  default: {
    dark: {
      background: '237 17% 14%', foreground: '220 14% 96%',
      card: '237 17% 18%', cardForeground: '220 14% 96%',
      popover: '237 17% 16%', popoverForeground: '220 14% 96%',
      primary: '285 100% 56%', primaryForeground: '0 0% 100%',
      secondary: '237 17% 24%', secondaryForeground: '220 14% 90%',
      muted: '237 17% 22%', mutedForeground: '220 10% 62%',
      accent: '237 17% 26%', accentForeground: '220 14% 96%',
      destructive: D, destructiveForeground: DF,
      border: '237 17% 28%', input: '237 17% 24%', ring: '285 100% 56%',
      success: '158 70% 37%', warning: W, info: I,
      sidebarBackground: '237 20% 11%', sidebarForeground: '220 14% 85%',
      sidebarPrimary: '285 100% 56%', sidebarPrimaryForeground: '0 0% 100%',
      sidebarAccent: '237 17% 20%', sidebarAccentForeground: '220 14% 96%',
      sidebarBorder: '237 17% 20%', sidebarRing: '285 100% 56%',
      chart1: '285 100% 56%', chart2: '195 100% 42%', chart3: '158 70% 37%',
      chart4: '38 92% 50%', chart5: '0 72% 51%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.28)',
      shadowHover: '0 4px 16px rgba(176,38,255,0.25)',
      themeGlow: 'rgba(176,38,255,0.30)',
      gradientPrimary: 'linear-gradient(135deg, hsl(285 100% 56%), hsl(195 100% 42%))',
    },
    light: {
      background: '220 14% 97%', foreground: '237 17% 14%',
      card: '0 0% 100%', cardForeground: '237 17% 14%',
      popover: '0 0% 100%', popoverForeground: '237 17% 14%',
      primary: '285 100% 45%', primaryForeground: '0 0% 100%',
      secondary: '220 14% 92%', secondaryForeground: '237 17% 20%',
      muted: '220 14% 90%', mutedForeground: '237 17% 42%',
      accent: '220 14% 88%', accentForeground: '237 17% 14%',
      border: '220 14% 82%', input: '220 14% 88%', ring: '285 100% 45%',
      sidebarBackground: '220 14% 94%', sidebarForeground: '237 17% 20%',
      sidebarPrimary: '285 100% 45%', sidebarPrimaryForeground: '0 0% 100%',
      sidebarAccent: '220 14% 88%', sidebarAccentForeground: '237 17% 14%',
      sidebarBorder: '220 14% 82%', sidebarRing: '285 100% 45%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.10)',
      shadowHover: '0 4px 16px rgba(176,38,255,0.18)',
      themeGlow: 'rgba(176,38,255,0.15)',
    },
  },

  forest: {
    dark: {
      background: '128 27% 14%', foreground: '100 22% 88%',
      card: '139 22% 20%', cardForeground: '100 22% 88%',
      popover: '128 27% 16%', popoverForeground: '100 22% 88%',
      primary: '44 66% 53%', primaryForeground: '128 27% 14%',
      secondary: '128 27% 20%', secondaryForeground: '100 22% 80%',
      muted: '128 27% 17%', mutedForeground: '100 12% 56%',
      accent: '128 27% 22%', accentForeground: '100 22% 88%',
      destructive: D, destructiveForeground: DF,
      border: '123 19% 30%', input: '128 27% 20%', ring: '44 66% 53%',
      success: '128 50% 38%', warning: W, info: I,
      sidebarBackground: '128 30% 10%', sidebarForeground: '100 22% 80%',
      sidebarPrimary: '44 66% 53%', sidebarPrimaryForeground: '128 27% 14%',
      sidebarAccent: '128 27% 18%', sidebarAccentForeground: '100 22% 88%',
      sidebarBorder: '123 19% 24%', sidebarRing: '44 66% 53%',
      chart1: '44 66% 53%', chart2: '128 40% 35%', chart3: '158 70% 37%',
      chart4: '38 92% 50%', chart5: '0 72% 51%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.30)',
      shadowHover: '0 4px 16px rgba(212,175,55,0.28)',
      themeGlow: 'rgba(212,175,55,0.30)',
      gradientPrimary: 'linear-gradient(135deg, hsl(44 66% 53%), hsl(128 40% 35%))',
    },
    light: {
      background: '120 14% 93%', foreground: '128 27% 14%',
      card: '0 0% 100%', cardForeground: '128 27% 14%',
      popover: '0 0% 100%', popoverForeground: '128 27% 14%',
      primary: '44 66% 45%', primaryForeground: '128 27% 14%',
      secondary: '120 14% 86%', secondaryForeground: '128 27% 20%',
      muted: '120 14% 83%', mutedForeground: '128 20% 38%',
      accent: '120 14% 80%', accentForeground: '128 27% 14%',
      border: '123 15% 74%', input: '120 14% 83%', ring: '44 66% 45%',
      sidebarBackground: '120 12% 88%', sidebarForeground: '128 27% 20%',
      sidebarPrimary: '44 66% 45%', sidebarPrimaryForeground: '128 27% 14%',
      sidebarAccent: '120 14% 83%', sidebarAccentForeground: '128 27% 14%',
      sidebarBorder: '123 15% 78%', sidebarRing: '44 66% 45%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.08)',
      shadowHover: '0 4px 16px rgba(212,175,55,0.20)',
      themeGlow: 'rgba(212,175,55,0.15)',
    },
  },

  'midnight-galaxy': {
    dark: {
      background: '240 40% 7%', foreground: '240 100% 93%',
      card: '240 36% 16%', cardForeground: '240 100% 93%',
      popover: '240 38% 11%', popoverForeground: '240 100% 93%',
      primary: '192 100% 50%', primaryForeground: '240 40% 7%',
      secondary: '240 36% 22%', secondaryForeground: '240 60% 82%',
      muted: '240 36% 18%', mutedForeground: '240 30% 63%',
      accent: '240 36% 24%', accentForeground: '240 100% 93%',
      destructive: D, destructiveForeground: DF,
      border: '240 36% 25%', input: '240 36% 22%', ring: '192 100% 50%',
      success: '158 70% 40%', warning: W, info: '192 100% 50%',
      sidebarBackground: '240 44% 5%', sidebarForeground: '240 60% 82%',
      sidebarPrimary: '192 100% 50%', sidebarPrimaryForeground: '240 40% 7%',
      sidebarAccent: '240 36% 18%', sidebarAccentForeground: '240 100% 93%',
      sidebarBorder: '240 36% 20%', sidebarRing: '192 100% 50%',
      chart1: '192 100% 50%', chart2: '270 70% 60%', chart3: '158 70% 37%',
      chart4: '38 92% 50%', chart5: '0 72% 51%',
      shadowCard: '0 2px 12px rgba(0,0,0,0.55)',
      shadowHover: '0 4px 24px rgba(0,212,255,0.35)',
      themeGlow: 'rgba(0,212,255,0.40)',
      gradientPrimary: 'linear-gradient(135deg, hsl(192 100% 50%), hsl(270 80% 60%))',
    },
  },

  sunset: {
    dark: {
      background: '297 24% 14%', foreground: '30 100% 84%',
      card: '310 24% 19%', cardForeground: '30 100% 84%',
      popover: '297 24% 16%', popoverForeground: '30 100% 84%',
      primary: '0 100% 71%', primaryForeground: '297 24% 14%',
      secondary: '297 24% 24%', secondaryForeground: '30 100% 76%',
      muted: '297 24% 21%', mutedForeground: '297 15% 58%',
      accent: '297 24% 26%', accentForeground: '30 100% 84%',
      destructive: D, destructiveForeground: DF,
      border: '315 19% 30%', input: '297 24% 24%', ring: '0 100% 71%',
      success: '158 70% 40%', warning: W, info: I,
      sidebarBackground: '297 28% 10%', sidebarForeground: '30 100% 76%',
      sidebarPrimary: '0 100% 71%', sidebarPrimaryForeground: '297 24% 14%',
      sidebarAccent: '297 24% 21%', sidebarAccentForeground: '30 100% 84%',
      sidebarBorder: '315 19% 24%', sidebarRing: '0 100% 71%',
      chart1: '0 100% 71%', chart2: '30 100% 60%', chart3: '158 70% 37%',
      chart4: '38 92% 50%', chart5: '297 60% 60%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.30)',
      shadowHover: '0 4px 16px rgba(255,107,107,0.30)',
      themeGlow: 'rgba(255,107,107,0.30)',
      gradientPrimary: 'linear-gradient(135deg, hsl(297 40% 30%), hsl(0 100% 71%))',
    },
    light: {
      background: '25 100% 95%', foreground: '330 25% 23%',
      card: '0 0% 100%', cardForeground: '330 25% 23%',
      popover: '0 0% 100%', popoverForeground: '330 25% 23%',
      primary: '0 100% 65%', primaryForeground: '297 24% 14%',
      secondary: '25 60% 91%', secondaryForeground: '330 25% 28%',
      muted: '25 50% 88%', mutedForeground: '330 18% 42%',
      accent: '25 40% 85%', accentForeground: '330 25% 23%',
      border: '315 20% 78%', input: '25 50% 88%', ring: '0 100% 65%',
      sidebarBackground: '25 80% 92%', sidebarForeground: '330 25% 28%',
      sidebarPrimary: '0 100% 65%', sidebarPrimaryForeground: '297 24% 14%',
      sidebarAccent: '25 50% 88%', sidebarAccentForeground: '330 25% 23%',
      sidebarBorder: '315 20% 82%', sidebarRing: '0 100% 65%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.08)',
      shadowHover: '0 4px 16px rgba(255,107,107,0.18)',
      themeGlow: 'rgba(255,107,107,0.12)',
    },
  },

  mint: {
    dark: {
      background: '165 26% 14%', foreground: '160 40% 87%',
      card: '163 24% 22%', cardForeground: '160 40% 87%',
      popover: '165 26% 17%', popoverForeground: '160 40% 87%',
      primary: '168 100% 39%', primaryForeground: '165 26% 14%',
      secondary: '165 26% 22%', secondaryForeground: '160 40% 78%',
      muted: '165 26% 19%', mutedForeground: '165 15% 56%',
      accent: '165 26% 25%', accentForeground: '160 40% 87%',
      destructive: D, destructiveForeground: DF,
      border: '163 21% 30%', input: '165 26% 22%', ring: '168 100% 39%',
      success: '168 100% 39%', warning: W, info: '195 80% 55%',
      sidebarBackground: '165 30% 10%', sidebarForeground: '160 40% 78%',
      sidebarPrimary: '168 100% 39%', sidebarPrimaryForeground: '165 26% 14%',
      sidebarAccent: '165 26% 19%', sidebarAccentForeground: '160 40% 87%',
      sidebarBorder: '163 21% 22%', sidebarRing: '168 100% 39%',
      chart1: '168 100% 39%', chart2: '195 80% 45%', chart3: '38 92% 50%',
      chart4: '0 72% 51%', chart5: '270 60% 55%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.28)',
      shadowHover: '0 4px 16px rgba(0,201,167,0.28)',
      themeGlow: 'rgba(0,201,167,0.30)',
      gradientPrimary: 'linear-gradient(135deg, hsl(168 100% 39%), hsl(195 80% 45%))',
    },
    light: {
      background: '162 44% 94%', foreground: '165 26% 14%',
      card: '0 0% 100%', cardForeground: '165 26% 14%',
      popover: '0 0% 100%', popoverForeground: '165 26% 14%',
      primary: '168 100% 33%', primaryForeground: '165 26% 14%',
      secondary: '162 30% 88%', secondaryForeground: '165 26% 20%',
      muted: '162 25% 85%', mutedForeground: '165 20% 36%',
      accent: '162 20% 82%', accentForeground: '165 26% 14%',
      border: '163 18% 74%', input: '162 25% 85%', ring: '168 100% 33%',
      sidebarBackground: '162 35% 90%', sidebarForeground: '165 26% 20%',
      sidebarPrimary: '168 100% 33%', sidebarPrimaryForeground: '165 26% 14%',
      sidebarAccent: '162 25% 85%', sidebarAccentForeground: '165 26% 14%',
      sidebarBorder: '163 18% 78%', sidebarRing: '168 100% 33%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.07)',
      shadowHover: '0 4px 16px rgba(0,201,167,0.18)',
      themeGlow: 'rgba(0,201,167,0.12)',
    },
  },

  ninja: {
    dark: {
      background: '0 0% 7%', foreground: '0 0% 88%',
      card: '0 0% 12%', cardForeground: '0 0% 88%',
      popover: '0 0% 9%', popoverForeground: '0 0% 88%',
      primary: '0 100% 40%', primaryForeground: '0 0% 7%',
      secondary: '0 0% 16%', secondaryForeground: '0 0% 80%',
      muted: '0 0% 14%', mutedForeground: '0 0% 63%',
      accent: '0 0% 18%', accentForeground: '0 0% 88%',
      destructive: D, destructiveForeground: DF,
      border: '0 0% 22%', input: '0 0% 16%', ring: '0 100% 40%',
      success: '158 70% 37%', warning: W, info: I,
      sidebarBackground: '0 0% 5%', sidebarForeground: '0 0% 80%',
      sidebarPrimary: '0 100% 40%', sidebarPrimaryForeground: '0 0% 7%',
      sidebarAccent: '0 0% 14%', sidebarAccentForeground: '0 0% 88%',
      sidebarBorder: '0 0% 18%', sidebarRing: '0 100% 40%',
      chart1: '0 100% 40%', chart2: '0 0% 55%', chart3: '158 70% 37%',
      chart4: '38 92% 50%', chart5: '270 60% 55%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.55)',
      shadowHover: '0 4px 16px rgba(204,0,0,0.40)',
      themeGlow: 'rgba(204,0,0,0.35)',
      gradientPrimary: 'linear-gradient(135deg, hsl(0 100% 40%), hsl(0 0% 30%))',
    },
  },

  chocolate: {
    dark: {
      background: '22 53% 11%', foreground: '30 60% 87%',
      card: '22 48% 17%', cardForeground: '30 60% 87%',
      popover: '22 53% 14%', popoverForeground: '30 60% 87%',
      primary: '36 44% 59%', primaryForeground: '22 53% 11%',
      secondary: '22 48% 22%', secondaryForeground: '30 60% 78%',
      muted: '22 48% 18%', mutedForeground: '30 25% 56%',
      accent: '22 48% 25%', accentForeground: '30 60% 87%',
      destructive: D, destructiveForeground: DF,
      border: '22 35% 28%', input: '22 48% 22%', ring: '36 44% 59%',
      success: '158 70% 37%', warning: W, info: I,
      sidebarBackground: '22 58% 8%', sidebarForeground: '30 60% 78%',
      sidebarPrimary: '36 44% 59%', sidebarPrimaryForeground: '22 53% 11%',
      sidebarAccent: '22 48% 18%', sidebarAccentForeground: '30 60% 87%',
      sidebarBorder: '22 35% 22%', sidebarRing: '36 44% 59%',
      chart1: '36 44% 59%', chart2: '22 60% 35%', chart3: '158 70% 37%',
      chart4: '38 92% 50%', chart5: '0 72% 51%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.40)',
      shadowHover: '0 4px 16px rgba(196,162,101,0.30)',
      themeGlow: 'rgba(196,162,101,0.30)',
      gradientPrimary: 'linear-gradient(135deg, hsl(36 44% 59%), hsl(22 60% 35%))',
    },
    light: {
      background: '30 50% 95%', foreground: '22 53% 11%',
      card: '0 0% 100%', cardForeground: '22 53% 11%',
      popover: '0 0% 100%', popoverForeground: '22 53% 11%',
      primary: '36 44% 52%', primaryForeground: '22 53% 11%',
      secondary: '30 30% 88%', secondaryForeground: '22 53% 16%',
      muted: '30 25% 85%', mutedForeground: '22 35% 38%',
      accent: '30 20% 82%', accentForeground: '22 53% 11%',
      border: '22 22% 74%', input: '30 25% 85%', ring: '36 44% 52%',
      sidebarBackground: '30 40% 91%', sidebarForeground: '22 53% 16%',
      sidebarPrimary: '36 44% 52%', sidebarPrimaryForeground: '22 53% 11%',
      sidebarAccent: '30 25% 85%', sidebarAccentForeground: '22 53% 11%',
      sidebarBorder: '22 22% 78%', sidebarRing: '36 44% 52%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.08)',
      shadowHover: '0 4px 16px rgba(196,162,101,0.20)',
      themeGlow: 'rgba(196,162,101,0.15)',
    },
  },

  'cotton-candy': {
    dark: {
      background: '280 37% 17%', foreground: '340 100% 90%',
      card: '280 34% 24%', cardForeground: '340 100% 90%',
      popover: '280 37% 20%', popoverForeground: '340 100% 90%',
      primary: '207 82% 82%', primaryForeground: '280 37% 17%',
      secondary: '280 34% 30%', secondaryForeground: '340 100% 82%',
      muted: '280 34% 26%', mutedForeground: '280 20% 62%',
      accent: '339 100% 85%', accentForeground: '280 37% 17%',
      destructive: D, destructiveForeground: DF,
      border: '290 30% 44%', input: '280 34% 30%', ring: '207 82% 82%',
      success: '158 70% 40%', warning: W, info: I,
      sidebarBackground: '280 42% 12%', sidebarForeground: '340 100% 82%',
      sidebarPrimary: '207 82% 82%', sidebarPrimaryForeground: '280 37% 17%',
      sidebarAccent: '280 34% 26%', sidebarAccentForeground: '340 100% 90%',
      sidebarBorder: '290 30% 30%', sidebarRing: '207 82% 82%',
      chart1: '339 100% 72%', chart2: '207 82% 72%', chart3: '158 70% 37%',
      chart4: '38 92% 50%', chart5: '0 72% 51%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.30)',
      shadowHover: '0 4px 16px rgba(135,206,235,0.30)',
      themeGlow: 'rgba(255,182,193,0.35)',
      gradientPrimary: 'linear-gradient(135deg, #FFB6C1, #87CEEB)',
    },
    light: {
      background: '330 100% 97%', foreground: '285 34% 27%',
      card: '0 0% 100%', cardForeground: '285 34% 27%',
      popover: '0 0% 100%', popoverForeground: '285 34% 27%',
      primary: '207 60% 65%', primaryForeground: '280 37% 17%',
      secondary: '330 80% 92%', secondaryForeground: '285 34% 32%',
      muted: '330 60% 88%', mutedForeground: '285 25% 42%',
      accent: '207 60% 88%', accentForeground: '285 34% 27%',
      border: '290 35% 80%', input: '330 60% 88%', ring: '207 60% 65%',
      sidebarBackground: '330 80% 93%', sidebarForeground: '285 34% 32%',
      sidebarPrimary: '207 60% 65%', sidebarPrimaryForeground: '280 37% 17%',
      sidebarAccent: '330 60% 88%', sidebarAccentForeground: '285 34% 27%',
      sidebarBorder: '290 35% 84%', sidebarRing: '207 60% 65%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.07)',
      shadowHover: '0 4px 16px rgba(135,206,235,0.20)',
      themeGlow: 'rgba(255,182,193,0.18)',
    },
  },

  cyberpunk: {
    dark: {
      background: '240 30% 4%', foreground: '0 0% 88%',
      card: '240 32% 13%', cardForeground: '0 0% 88%',
      popover: '240 32% 8%', popoverForeground: '0 0% 88%',
      primary: '192 100% 50%', primaryForeground: '240 30% 4%',
      secondary: '240 32% 18%', secondaryForeground: '240 30% 72%',
      muted: '240 32% 15%', mutedForeground: '240 20% 60%',
      accent: '330 100% 46%', accentForeground: '0 0% 100%',
      destructive: D, destructiveForeground: DF,
      border: '192 100% 50%', input: '240 32% 18%', ring: '192 100% 50%',
      success: '158 70% 40%', warning: W, info: '192 100% 50%',
      sidebarBackground: '240 34% 3%', sidebarForeground: '240 30% 72%',
      sidebarPrimary: '192 100% 50%', sidebarPrimaryForeground: '240 30% 4%',
      sidebarAccent: '240 32% 15%', sidebarAccentForeground: '0 0% 88%',
      sidebarBorder: '240 32% 18%', sidebarRing: '192 100% 50%',
      chart1: '192 100% 50%', chart2: '330 100% 46%', chart3: '158 70% 37%',
      chart4: '38 92% 50%', chart5: '0 72% 51%',
      shadowCard: '0 2px 12px rgba(0,0,0,0.60)',
      shadowHover: '0 0 20px rgba(0,212,255,0.50), 0 0 20px rgba(255,0,110,0.30)',
      themeGlow: 'rgba(0,212,255,0.45)',
      gradientPrimary: 'linear-gradient(135deg, #00D4FF, #FF006E)',
    },
  },

  sakura: {
    dark: {
      background: '320 28% 14%', foreground: '340 100% 93%',
      card: '320 24% 20%', cardForeground: '340 100% 93%',
      popover: '320 28% 17%', popoverForeground: '340 100% 93%',
      primary: '345 100% 85%', primaryForeground: '320 28% 14%',
      secondary: '320 24% 25%', secondaryForeground: '340 100% 84%',
      muted: '320 24% 21%', mutedForeground: '320 16% 58%',
      accent: '320 24% 27%', accentForeground: '340 100% 93%',
      destructive: D, destructiveForeground: DF,
      border: '325 24% 35%', input: '320 24% 25%', ring: '345 100% 85%',
      success: '158 70% 40%', warning: W, info: I,
      sidebarBackground: '320 32% 10%', sidebarForeground: '340 100% 84%',
      sidebarPrimary: '345 100% 85%', sidebarPrimaryForeground: '320 28% 14%',
      sidebarAccent: '320 24% 21%', sidebarAccentForeground: '340 100% 93%',
      sidebarBorder: '325 24% 25%', sidebarRing: '345 100% 85%',
      chart1: '345 100% 72%', chart2: '320 60% 55%', chart3: '158 70% 37%',
      chart4: '38 92% 50%', chart5: '0 72% 51%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.30)',
      shadowHover: '0 4px 16px rgba(255,183,197,0.35)',
      themeGlow: 'rgba(255,183,197,0.35)',
      gradientPrimary: 'linear-gradient(135deg, hsl(345 100% 72%), hsl(320 60% 55%))',
    },
    light: {
      background: '345 100% 98%', foreground: '330 32% 26%',
      card: '0 0% 100%', cardForeground: '330 32% 26%',
      popover: '0 0% 100%', popoverForeground: '330 32% 26%',
      primary: '345 80% 68%', primaryForeground: '320 28% 14%',
      secondary: '345 60% 92%', secondaryForeground: '330 32% 30%',
      muted: '345 40% 88%', mutedForeground: '330 22% 42%',
      accent: '345 40% 84%', accentForeground: '330 32% 26%',
      border: '325 30% 80%', input: '345 40% 88%', ring: '345 80% 68%',
      sidebarBackground: '345 80% 94%', sidebarForeground: '330 32% 30%',
      sidebarPrimary: '345 80% 68%', sidebarPrimaryForeground: '320 28% 14%',
      sidebarAccent: '345 40% 88%', sidebarAccentForeground: '330 32% 26%',
      sidebarBorder: '325 30% 84%', sidebarRing: '345 80% 68%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.07)',
      shadowHover: '0 4px 16px rgba(255,183,197,0.22)',
      themeGlow: 'rgba(255,183,197,0.18)',
    },
  },

  ocean: {
    dark: {
      background: '205 57% 15%', foreground: '180 60% 88%',
      card: '200 50% 22%', cardForeground: '180 60% 88%',
      popover: '205 57% 18%', popoverForeground: '180 60% 88%',
      primary: '15 100% 65%', primaryForeground: '205 57% 15%',
      secondary: '200 50% 28%', secondaryForeground: '180 45% 78%',
      muted: '200 50% 24%', mutedForeground: '195 28% 60%',
      accent: '200 50% 30%', accentForeground: '180 60% 88%',
      destructive: D, destructiveForeground: DF,
      border: '200 40% 35%', input: '200 50% 28%', ring: '15 100% 65%',
      success: '158 70% 40%', warning: W, info: '192 100% 50%',
      sidebarBackground: '205 60% 10%', sidebarForeground: '180 45% 78%',
      sidebarPrimary: '15 100% 65%', sidebarPrimaryForeground: '205 57% 15%',
      sidebarAccent: '200 50% 24%', sidebarAccentForeground: '180 60% 88%',
      sidebarBorder: '200 40% 25%', sidebarRing: '15 100% 65%',
      chart1: '15 100% 65%', chart2: '192 100% 50%', chart3: '158 70% 37%',
      chart4: '38 92% 50%', chart5: '0 72% 51%',
      shadowCard: '0 2px 12px rgba(0,0,0,0.40)',
      shadowHover: '0 4px 20px rgba(255,107,74,0.35)',
      themeGlow: 'rgba(255,107,74,0.35)',
      gradientPrimary: 'linear-gradient(135deg, hsl(15 100% 65%), hsl(192 100% 50%))',
    },
    light: {
      background: '195 50% 94%', foreground: '205 57% 15%',
      card: '0 0% 100%', cardForeground: '205 57% 15%',
      popover: '0 0% 100%', popoverForeground: '205 57% 15%',
      primary: '15 100% 58%', primaryForeground: '205 57% 15%',
      secondary: '195 35% 88%', secondaryForeground: '205 40% 20%',
      muted: '195 28% 84%', mutedForeground: '200 35% 38%',
      accent: '195 28% 80%', accentForeground: '205 57% 15%',
      border: '200 30% 75%', input: '195 28% 84%', ring: '15 100% 58%',
      sidebarBackground: '195 40% 90%', sidebarForeground: '205 40% 20%',
      sidebarPrimary: '15 100% 58%', sidebarPrimaryForeground: '205 57% 15%',
      sidebarAccent: '195 28% 84%', sidebarAccentForeground: '205 57% 15%',
      sidebarBorder: '200 30% 79%', sidebarRing: '15 100% 58%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.08)',
      shadowHover: '0 4px 16px rgba(255,107,74,0.20)',
      themeGlow: 'rgba(255,107,74,0.15)',
    },
  },

  royal: {
    dark: {
      background: '265 47% 11%', foreground: '51 100% 50%',
      card: '265 42% 19%', cardForeground: '51 100% 50%',
      popover: '265 47% 14%', popoverForeground: '51 100% 50%',
      primary: '51 100% 50%', primaryForeground: '265 47% 11%',
      secondary: '265 42% 25%', secondaryForeground: '44 62% 53%',
      muted: '265 42% 21%', mutedForeground: '44 50% 55%',
      accent: '272 50% 38%', accentForeground: '51 100% 50%',
      destructive: D, destructiveForeground: DF,
      border: '44 62% 53%', input: '265 42% 25%', ring: '51 100% 50%',
      success: '158 70% 40%', warning: W, info: I,
      sidebarBackground: '265 50% 8%', sidebarForeground: '44 62% 53%',
      sidebarPrimary: '51 100% 50%', sidebarPrimaryForeground: '265 47% 11%',
      sidebarAccent: '265 42% 21%', sidebarAccentForeground: '51 100% 50%',
      sidebarBorder: '265 42% 25%', sidebarRing: '51 100% 50%',
      chart1: '51 100% 50%', chart2: '272 50% 55%', chart3: '158 70% 37%',
      chart4: '38 92% 50%', chart5: '0 72% 51%',
      shadowCard: '0 2px 12px rgba(0,0,0,0.50)',
      shadowHover: '0 4px 20px rgba(255,215,0,0.40)',
      themeGlow: 'rgba(255,215,0,0.40)',
      gradientPrimary: 'linear-gradient(135deg, hsl(51 100% 50%), hsl(272 50% 55%))',
    },
    light: {
      background: '270 60% 96%', foreground: '265 47% 11%',
      card: '0 0% 100%', cardForeground: '265 47% 11%',
      popover: '0 0% 100%', popoverForeground: '265 47% 11%',
      primary: '51 100% 42%', primaryForeground: '265 47% 11%',
      secondary: '270 40% 90%', secondaryForeground: '265 47% 16%',
      muted: '270 30% 86%', mutedForeground: '265 30% 38%',
      accent: '272 40% 84%', accentForeground: '265 47% 11%',
      border: '44 50% 75%', input: '270 30% 86%', ring: '51 100% 42%',
      sidebarBackground: '270 50% 92%', sidebarForeground: '265 47% 16%',
      sidebarPrimary: '51 100% 42%', sidebarPrimaryForeground: '265 47% 11%',
      sidebarAccent: '270 30% 86%', sidebarAccentForeground: '265 47% 11%',
      sidebarBorder: '44 50% 78%', sidebarRing: '51 100% 42%',
      shadowCard: '0 2px 8px rgba(0,0,0,0.08)',
      shadowHover: '0 4px 16px rgba(255,215,0,0.22)',
      themeGlow: 'rgba(255,215,0,0.18)',
    },
  },

  aurora: {
    dark: {
      background: '200 44% 11%', foreground: '0 0% 100%',
      card: '200 30% 14%', cardForeground: '0 0% 100%',
      popover: '200 40% 12%', popoverForeground: '0 0% 100%',
      primary: '153 100% 50%', primaryForeground: '200 44% 11%',
      secondary: '200 30% 18%', secondaryForeground: '180 30% 88%',
      muted: '200 30% 16%', mutedForeground: '200 20% 58%',
      accent: '285 100% 56%', accentForeground: '0 0% 100%',
      destructive: D, destructiveForeground: DF,
      border: '153 80% 32%', input: '200 30% 18%', ring: '153 100% 50%',
      success: '153 100% 44%', warning: W, info: '192 100% 50%',
      sidebarBackground: '200 50% 8%', sidebarForeground: '180 30% 88%',
      sidebarPrimary: '153 100% 50%', sidebarPrimaryForeground: '200 44% 11%',
      sidebarAccent: '200 30% 16%', sidebarAccentForeground: '0 0% 100%',
      sidebarBorder: '153 70% 28%', sidebarRing: '153 100% 50%',
      chart1: '153 100% 50%', chart2: '192 100% 50%', chart3: '285 100% 56%',
      chart4: '38 92% 50%', chart5: '0 72% 51%',
      shadowCard: '0 4px 24px rgba(0,0,0,0.40)',
      shadowHover: '0 4px 32px rgba(0,255,136,0.35)',
      themeGlow: 'rgba(0,255,136,0.35)',
      gradientPrimary: 'linear-gradient(135deg, #00FF88, #00D4FF, #B026FF)',
    },
  },
};

export function resolveThemeVars(themeName: string, darkMode: boolean): ThemeVars {
  const entry = THEME_VARS[themeName] ?? THEME_VARS['default'];
  if (!darkMode && entry.light) {
    return { ...entry.dark, ...entry.light } as ThemeVars;
  }
  return entry.dark;
}

// Theme list — kept here so ThemeContext has no dependency on constants.ts
export const THEMES = [
  { name: 'default',         displayName: 'Default',         price: 0,   preview: 'linear-gradient(135deg, #1E1E2E, #B026FF)' },
  { name: 'forest',          displayName: 'Forest',          price: 50,  preview: 'linear-gradient(135deg, #1A2F1D, #D4AF37)' },
  { name: 'midnight-galaxy', displayName: 'Midnight Galaxy', price: 80,  preview: 'linear-gradient(135deg, #0B0B1A, #00D4FF)' },
  { name: 'sunset',          displayName: 'Sunset',          price: 60,  preview: 'linear-gradient(135deg, #2D1B2E, #FF6B6B)' },
  { name: 'mint',            displayName: 'Mint',            price: 40,  preview: 'linear-gradient(135deg, #1A2E2A, #00C9A7)' },
  { name: 'ninja',           displayName: 'Ninja',           price: 70,  preview: 'linear-gradient(135deg, #121212, #CC0000)' },
  { name: 'chocolate',       displayName: 'Chocolate',       price: 40,  preview: 'linear-gradient(135deg, #2C1A0E, #C4A265)' },
  { name: 'cotton-candy',    displayName: 'Cotton Candy',    price: 45,  preview: 'linear-gradient(135deg, #2D1B3D, #FFB6C1, #87CEEB)' },
  { name: 'cyberpunk',       displayName: 'Cyberpunk',       price: 90,  preview: 'linear-gradient(135deg, #0A0A0F, #00D4FF, #FF006E)' },
  { name: 'sakura',          displayName: 'Sakura',          price: 70,  preview: 'linear-gradient(135deg, #2D1B2A, #FFB7C5)' },
  { name: 'ocean',           displayName: 'Ocean',           price: 65,  preview: 'linear-gradient(135deg, #0D2B3E, #FF6B4A)' },
  { name: 'royal',           displayName: 'Royal',           price: 100, preview: 'linear-gradient(135deg, #1A0A2E, #FFD700)' },
  { name: 'aurora',          displayName: 'Aurora',          price: 100, preview: 'linear-gradient(135deg, #0F2027, #00FF88, #00D4FF, #B026FF)' },
];
