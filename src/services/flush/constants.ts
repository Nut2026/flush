// Utility: get today's date as YYYY-MM-DD string in user's local timezone
export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Utility: get start of current week (Monday) as local date string
export function getLocalWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return getLocalDateString(monday);
}

// Utility: check if two local date strings are consecutive days
export function isConsecutiveDay(prevDate: string, currDate: string): boolean {
  const prev = new Date(prevDate + 'T00:00:00');
  const curr = new Date(currDate + 'T00:00:00');
  const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
  return diff === 1;
}

// Goal pool definition
export const GOAL_POOL: Array<{ description: string; gemReward: number; type: string; target: number }> = [
  { description: 'Study 20 cards', gemReward: 5, type: 'cards_studied', target: 20 },
  { description: 'Study 40 cards', gemReward: 8, type: 'cards_studied', target: 40 },
  { description: 'Study 60 cards', gemReward: 10, type: 'cards_studied', target: 60 },
  { description: 'Complete 1 typed test', gemReward: 5, type: 'tests_completed', target: 1 },
  { description: 'Complete 3 typed tests', gemReward: 10, type: 'tests_completed', target: 3 },
  { description: 'Score 80% on a test', gemReward: 8, type: 'test_score_80', target: 80 },
  { description: 'Score 100% on a test', gemReward: 10, type: 'test_score_100', target: 100 },
  { description: 'Study 3 different decks', gemReward: 8, type: 'decks_studied', target: 3 },
  { description: 'Earn 15 gems', gemReward: 10, type: 'gems_earned', target: 15 },
  { description: 'Play 1 game', gemReward: 5, type: 'games_played', target: 1 },
  { description: 'Beat any high score', gemReward: 10, type: 'beat_high_score', target: 1 },
];

export function pickDailyGoals(): [typeof GOAL_POOL[0], typeof GOAL_POOL[0], typeof GOAL_POOL[0]] {
  const shuffled = [...GOAL_POOL].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1], shuffled[2]];
}

// Theme definitions
export const THEMES = [
  { name: 'default',         displayName: 'Flush Theme',     price: 0,  description: "Meet Flush's vibe",      preview: 'linear-gradient(135deg, #1E1E2E, #B026FF)' },
  { name: 'chocolate',       displayName: 'Chocolate',       price: 40, description: 'Warm, cozy',             preview: 'linear-gradient(135deg, #2C1A0E, #C4A265)' },
  { name: 'cotton-candy',    displayName: 'Cotton Candy',    price: 45, description: 'Dreamy, pastel',         preview: 'linear-gradient(135deg, #2D1B3D, #FFB6C1, #87CEEB)' },
  { name: 'forest',          displayName: 'Forest',          price: 50, description: 'Natural, grounded',      preview: 'linear-gradient(135deg, #1A2F1D, #D4AF37)' },
  { name: 'sunset',          displayName: 'Sunset',          price: 60, description: 'Warm, energetic',        preview: 'linear-gradient(135deg, #2D1B2E, #FF6B6B)' },
  { name: 'ocean',           displayName: 'Ocean',           price: 65, description: 'Deep, serene',           preview: 'linear-gradient(135deg, #0D2B3E, #FF6B4A)' },
  { name: 'midnight-galaxy', displayName: 'Midnight Galaxy', price: 80, description: 'Cosmic, mysterious',     preview: 'linear-gradient(135deg, #0B0B1A, #00D4FF)' },
  { name: 'cyberpunk',       displayName: 'Cyberpunk',       price: 90, description: 'Futuristic, intense',    preview: 'linear-gradient(135deg, #0A0A0F, #00D4FF, #FF006E)' },
];

// Profile gradient presets
export const PROFILE_GRADIENTS = [
  { id: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg, #FF8C00, #FF69B4)' },
  { id: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg, #1E90FF, #20B2AA)' },
  { id: 'forest', label: 'Forest', css: 'linear-gradient(135deg, #228B22, #7CFC00)' },
  { id: 'royal', label: 'Royal', css: 'linear-gradient(135deg, #8B008B, #FFD700)' },
  { id: 'mint', label: 'Mint', css: 'linear-gradient(135deg, #00CED1, #F0FFF0)' },
  { id: 'cyberpunk', label: 'Cyberpunk', css: 'linear-gradient(135deg, #00D4FF, #FF006E)' },
  { id: 'sakura', label: 'Sakura', css: 'linear-gradient(135deg, #FFB7C5, #FFFFFF)' },
  { id: 'midnight', label: 'Midnight', css: 'linear-gradient(135deg, #191970, #8B008B)' },
  { id: 'aurora', label: 'Aurora', css: 'linear-gradient(135deg, #00FF88, #00D4FF, #B026FF)' },
  { id: 'chocolate', label: 'Chocolate', css: 'linear-gradient(135deg, #8B4513, #DEB887)' },
  { id: 'cotton-candy', label: 'Cotton Candy', css: 'linear-gradient(135deg, #FFB6C1, #87CEEB)' },
  { id: 'default', label: 'Default', css: 'linear-gradient(135deg, #B026FF, #00D4FF)' },
];

// Avatar frame colours (unlocked at Clip tier)
export const AVATAR_FRAME_COLORS = [
  { id: 'gold',   label: 'Gold',   color: '#FFD700' },
  { id: 'silver', label: 'Silver', color: '#C0C0C0' },
  { id: 'rose',   label: 'Rose',   color: '#FF69B4' },
  { id: 'cyan',   label: 'Cyan',   color: '#00D4FF' },
];

export const ALL_BADGE_NAMES = [
  'First Deck', 'Card Master', 'Test Ace',
  '3-Day Streak', '7-Day Streak', '14-Day Streak', '30-Day Streak',
  'Gem Hoarder', 'Game Winner', 'Perfect Week', 'Master of All',
];

export const STREAK_MILESTONES: Record<string, { days: number; gems: number }> = {
  '3': { days: 3, gems: 10 },
  '7': { days: 7, gems: 50 },
  '14': { days: 14, gems: 100 },
  '30': { days: 30, gems: 200 },
};
