export type UserRole = 'user' | 'admin';
export type SubjectEnum = 'Math' | 'Science' | 'English' | 'Languages' | 'History' | 'Tech' | 'Other';
export type DifficultyEnum = 'Beginner' | 'Intermediate' | 'Advanced';
export type GameNameEnum = 'whackacard' | 'skyscraper' | 'matching';
export type MasteryLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface Profile {
  id: string;
  email: string | null;
  username: string;
  profile_gradient: string;
  profile_character: string;
  profile_char_color: string;
  gems: number;
  streak_days: number;
  streak_freeze_active: boolean;
  streak_wager_active: boolean;
  streak_wager_start_date: string | null;
  streak_wager_broken_seen: boolean;
  streak_wager_completed: boolean;
  last_study_date: string | null;
  join_date: string;
  selected_theme: string;
  displayed_badges: string[];
  dark_mode: boolean;
  language: string;
  role: UserRole;
  total_gems_earned: number;
  total_cards_studied: number;
  longest_streak: number;
  total_tests_taken: number;
  total_games_played: number;
  total_gems_spent: number;
  total_gems_from_card_bonus: number;
  daily_cards_studied: number;
  daily_cards_studied_date: string | null;
  daily_gems_earned: number;
  daily_gems_earned_date: string | null;
  last_studied_deck_id: string | null;
  streak_milestones_awarded: string[];
  most_gems_in_day: number;
  most_gems_in_day_date: string | null;
  most_cards_in_week: number;
  most_cards_in_week_start: string | null;
  best_test_score_percent: number | null;
  best_test_score_deck_id: string | null;
  best_test_score_date: string | null;
  best_streak_date: string | null;
  perfect_week_count: number;
  perfect_week_tracking_date: string | null;
  weekly_cards_studied: number;
  weekly_cards_start_date: string | null;
  daily_tests_completed: number;
  daily_tests_completed_date: string;
  daily_games_played: number;
  daily_games_played_date: string;
  daily_decks_studied_ids: string[];
  daily_decks_studied_date: string;
  equipped_pet_id: string | null;
  username_changed_at: string | null;
  public_profile_sections: {
    join_date: boolean;
    statistics: boolean;
    personal_bests: boolean;
    badges: boolean;
  } | null;
  streak_stall_saved_streak: number | null;
  streak_stall_expired_seen: boolean;
  total_exp: number;
  trophies: number;
  streak_break_date: string | null;
  study_theme: string;
  deck_theme: string;
  tier_rewards_claimed: string[];
  profile_frame_color: string | null;
  profile_frame_shiny: boolean;
  avatar_shiny: boolean;
}

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  subject: SubjectEnum;
  difficulty: DifficultyEnum;
  created_at: string;
  updated_at: string;
  flashcard_count?: number;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front_text: string;
  back_text: string;
  notes: string;
  mastery_level: MasteryLevel;
  times_reviewed: number;
  last_reviewed_at: string | null;
  created_at: string;
  sort_order: number;
}

export interface Badge {
  id: string;
  user_id: string;
  badge_name: string;
  earned_at: string;
}

export interface OwnedItem {
  id: string;
  user_id: string;
  item_type: string;
  item_name: string;
  purchased_at: string;
}

export interface GemAnimation {
  id: string;
  amount: number;
  x: number;
  y: number;
}

export interface GameHighScore {
  id: string;
  user_id: string;
  game_name: GameNameEnum;
  deck_id: string | null;
  high_score: number;
  deck_best_score: number | null;
  achieved_at: string;
}

export interface DailyGoal {
  id: string;
  user_id: string;
  date: string;
  goal1: string;
  goal1_gem_reward: number;
  goal2: string;
  goal2_gem_reward: number;
  goal3: string;
  goal3_gem_reward: number;
  goal1_complete: boolean;
  goal2_complete: boolean;
  goal3_complete: boolean;
  all_complete_bonus_claimed: boolean;
}

export interface TestResult {
  id: string;
  user_id: string;
  deck_id: string | null;
  score_percent: number;
  questions_correct: number;
  questions_total: number;
  created_at: string;
  question_details?: { front: string; back: string; correct: boolean }[] | null;
}

export interface StudySession {
  id: string;
  user_id: string;
  deck_id: string | null;
  cards_reviewed: number;
  cards_correct: number;
  duration_seconds: number;
  created_at: string;
}

export interface GameSession {
  id: string;
  user_id: string;
  game_name: string;
  deck_id: string | null;
  score: number;
  is_high_score: boolean;
  is_deck_best: boolean;
  created_at: string;
}

export interface AiUsage {
  id: string;
  user_id: string;
  date: string;
  flashcard_generations: number;
  hints_used: number;
}

export interface GameTokens {
  id: string;
  user_id: string;
  date: string;
  tokens_used: number;
}

export interface StarterDeckTemplate {
  id: string;
  title: string;
  subject: SubjectEnum;
  difficulty: DifficultyEnum;
  sort_order: number;
}

export interface StarterCardTemplate {
  id: string;
  deck_template_id: string;
  front_text: string;
  back_text: string;
  sort_order: number;
}

export type BadgeName =
  | 'First Deck'
  | 'Card Master'
  | 'Test Ace'
  | '3-Day Streak'
  | '7-Day Streak'
  | '14-Day Streak'
  | '30-Day Streak'
  | 'Gem Hoarder'
  | 'Game Winner'
  | 'Perfect Week'
  | 'Master of All';

export type ThemeName =
  | 'default'
  | 'forest'
  | 'midnight-galaxy'
  | 'sunset'
  | 'mint'
  | 'ninja'
  | 'chocolate'
  | 'cotton-candy'
  | 'cyberpunk'
  | 'sakura'
  | 'ocean'
  | 'royal'
  | 'aurora';

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  price: number;
  description: string;
  preview: string; // CSS gradient for preview
}

// ── Clubs ────────────────────────────────────────────────────────────────────

export type ClubName = 'fire' | 'ace' | 'robin';

// ── World / Public Deck Marketplace ─────────────────────────────────────────

export type DeckStatus = 'public' | 'archived' | 'banned';

export type CardReportReason =
  | 'Mismatched Q&A'
  | 'Misleading Title, Description or Subject'
  | 'Vague or Ambiguous'
  | 'Incorrect Information'
  | 'Typo or Formatting'
  | 'Duplicate Card'
  | 'Back Too Long for Test'
  | 'Spoiler or Hint in Front'
  | 'Other';

export type DeckReportReason =
  | 'Spam or Promotional'
  | 'Duplicate Deck'
  | 'Offensive Content'
  | 'Copyright Violation'
  | 'Low Effort or Low Quality Content'
  | 'Other';

export type NotificationType =
  | 'mod_invite'
  | 'mod_accepted'
  | 'mod_declination'
  | 'admin_message'
  | 'version_update'
  | 'leaderboard_reward'
  | 'welcome'
  | 'mod_removed'
  | 'deck_archived'
  | 'deck_banned'
  | 'deck_share'
  | 'deck_share_accepted'
  | 'deck_share_declined'
  | 'appeal_result';

export interface PublicDeck {
  id: string;
  owner_id: string;
  source_deck_id: string | null;
  title: string;
  description: string;
  subject: string;
  difficulty: string;
  price: number;
  version: string;
  edit_count_since_last: number;
  status: DeckStatus;
  download_count: number;
  avg_rating: number;
  unresolved_card_reports: number;
  deck_report_count: number;
  created_at: string;
  updated_at: string;
  // joined
  owner_username?: string;
  mod_usernames?: string[];
}

export interface PublicDeckCard {
  id: string;
  public_deck_id: string;
  front_text: string;
  back_text: string;
  notes: string;
  sort_order: number;
}

export interface DeckPurchase {
  id: string;
  user_id: string;
  public_deck_id: string;
  purchased_at: string;
  price_paid: number;
  has_used_once: boolean;
  version_at_purchase: string;
}

export interface PurchasedDeckCopy {
  id: string;
  user_id: string;
  public_deck_id: string;
  deck_id: string;
  synced_version: string;
  has_update: boolean;
}

export interface DeckRating {
  id: string;
  user_id: string;
  public_deck_id: string;
  rating: number;
  created_at: string;
}

export interface CardReport {
  id: string;
  reporter_id: string;
  public_deck_id: string;
  card_id: string;
  reason: CardReportReason;
  explanation: string | null;
  is_resolved: boolean;
  created_at: string;
}

export interface DeckReport {
  id: string;
  reporter_id: string;
  public_deck_id: string;
  reason: DeckReportReason;
  explanation: string | null;
  is_resolved: boolean;
  created_at: string;
}

export interface DeckMod {
  id: string;
  public_deck_id: string;
  user_id: string;
  invited_at: string;
  accepted_at: string | null;
  // joined from profiles
  username?: string;
  profile_gradient?: string;
  profile_character?: string;
  profile_char_color?: string;
}

export interface FlushNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  action_taken: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  archived_at: string | null;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  club_name: 'ace' | 'robin';
  week_start: string;
  score: number;
  updated_at: string;
  // joined
  username?: string;
}

export interface LeaderboardReward {
  id: string;
  user_id: string;
  club_name: string;
  week_start: string;
  rank: 1 | 2 | 3;
  geodes_total: number;
  geodes_remaining: number;
  gem_min: number;
  gem_max: number;
  created_at: string;
}

// ── Clubs ────────────────────────────────────────────────────────────────────

export interface ClubMembership {
  id: string;
  user_id: string;
  club_name: ClubName;
  is_unlocked: boolean;
  is_member: boolean;
  current_level: number;
  current_progress: number;
  created_at: string;
  updated_at: string;
}

export interface PendingReward {
  id: string;
  user_id: string;
  club_name: ClubName;
  level_reached: number;
  geodes_total: number;
  geodes_remaining: number;
  gem_min: number;
  gem_max: number;
  created_at: string;
}

export interface AcePerfectDeck {
  id: string;
  user_id: string;
  deck_id: string;
  achieved_at: string;
}

export interface RobinEarlyAction {
  id: string;
  user_id: string;
  action_type: 'study' | 'test' | 'game';
  local_hour: number;
  created_at: string;
}

export interface DeckShare {
  id: string;
  sender_id: string;
  receiver_id: string;
  deck_id: string;
  deck_title: string;
  sender_username: string;
  status: 'pending' | 'accepted' | 'declined' | 'reported';
  created_at: string;
  updated_at: string;
}
