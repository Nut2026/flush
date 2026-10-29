import { supabase } from '@/db/supabase';
import type { Deck, Flashcard, Badge, OwnedItem, GameHighScore, DailyGoal, AiUsage, GameTokens, Profile, TestResult, StudySession, GameSession, ClubMembership, PendingReward, ClubName, PublicDeck, PublicDeckCard, DeckPurchase, PurchasedDeckCopy, DeckRating, CardReport, CardReportReason, DeckReportReason, DeckMod, FlushNotification, LeaderboardEntry, LeaderboardReward } from '@/types/types';
import { getLocalDateString, getLocalWeekStart, isConsecutiveDay, pickDailyGoals, STREAK_MILESTONES, GOAL_POOL } from './constants';

// ── Profile ──────────────────────────────────────────────────────────────────

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
}

export async function fetchProfileByUsername(username: string): Promise<import('@/types/types').Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
  return data ?? null;
}

// ── Decks ────────────────────────────────────────────────────────────────────

export async function fetchDecks(userId: string): Promise<Deck[]> {
  const { data, error } = await supabase
    .from('decks')
    .select('*, flashcard_count:flashcards(count)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((d: any) => ({
    ...d,
    flashcard_count: d.flashcard_count?.[0]?.count ?? 0,
  }));
}

export async function fetchDeck(deckId: string): Promise<Deck | null> {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createDeck(userId: string, title: string, subject: string, difficulty: string): Promise<Deck> {
  const { data, error } = await supabase
    .from('decks')
    .insert({ user_id: userId, title, subject, difficulty })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDeck(deckId: string, updates: Partial<Deck>): Promise<void> {
  const { error } = await supabase.from('decks').update(updates).eq('id', deckId);
  if (error) throw error;
}

export async function deleteDeck(deckId: string): Promise<void> {
  const { error } = await supabase.from('decks').delete().eq('id', deckId);
  if (error) throw error;
}

// ── Flashcards ────────────────────────────────────────────────────────────────

export async function fetchFlashcards(deckId: string): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addFlashcard(deckId: string, frontText: string, backText: string, notes = ''): Promise<Flashcard> {
  const { data: existing } = await supabase
    .from('flashcards')
    .select('sort_order')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order + 1) : 0;
  const { data, error } = await supabase
    .from('flashcards')
    .insert({ deck_id: deckId, front_text: frontText, back_text: backText, notes, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function bulkInsertFlashcards(
  deckId: string,
  cards: { front: string; back: string; notes: string; sortOrder: number }[]
): Promise<void> {
  if (cards.length === 0) return;
  const rows = cards.map(c => ({
    deck_id: deckId,
    front_text: c.front,
    back_text: c.back,
    notes: c.notes,
    sort_order: c.sortOrder,
  }));
  const { error } = await supabase.from('flashcards').insert(rows);
  if (error) throw error;
}

export async function updateFlashcard(cardId: string, updates: Partial<Flashcard>): Promise<void> {
  const { error } = await supabase.from('flashcards').update(updates).eq('id', cardId);
  if (error) throw error;
}

export async function deleteFlashcard(cardId: string): Promise<void> {
  const { error } = await supabase.from('flashcards').delete().eq('id', cardId);
  if (error) throw error;
}

export async function updateMastery(cardId: string, currentLevel: number, correct: boolean): Promise<number> {
  const newLevel = correct ? Math.min(6, currentLevel + 1) : Math.max(1, currentLevel - 1);
  const { data: card } = await supabase
    .from('flashcards')
    .select('times_reviewed')
    .eq('id', cardId)
    .maybeSingle();
  const { error } = await supabase
    .from('flashcards')
    .update({
      mastery_level: newLevel,
      times_reviewed: (card?.times_reviewed || 0) + 1,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq('id', cardId);
  if (error) throw error;
  return newLevel;
}

// ── Starter Decks ─────────────────────────────────────────────────────────────

export async function copyStarterDecksToUser(userId: string): Promise<void> {
  // Fetch templates
  const { data: templates, error: te } = await supabase
    .from('starter_deck_templates')
    .select('*')
    .order('sort_order');
  if (te || !templates) return;

  for (const template of templates) {
    // Create deck for user
    const { data: deck, error: de } = await supabase
      .from('decks')
      .insert({ user_id: userId, title: template.title, subject: template.subject, difficulty: template.difficulty })
      .select()
      .single();
    if (de || !deck) continue;

    // Fetch cards for template
    const { data: cards, error: ce } = await supabase
      .from('starter_card_templates')
      .select('*')
      .eq('deck_template_id', template.id)
      .order('sort_order');
    if (ce || !cards) continue;

    // Insert cards
    const cardInserts = cards.map((c: any) => ({
      deck_id: deck.id,
      front_text: c.front_text,
      back_text: c.back_text,
    }));
    await supabase.from('flashcards').insert(cardInserts);
  }
}

// ── Badges ────────────────────────────────────────────────────────────────────

export async function fetchBadges(userId: string): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function awardBadge(userId: string, badgeName: string): Promise<boolean> {
  const { error } = await supabase
    .from('badges')
    .insert({ user_id: userId, badge_name: badgeName });
  return !error;
}

// ── Owned Items ───────────────────────────────────────────────────────────────

export async function fetchOwnedItems(userId: string): Promise<OwnedItem[]> {
  const { data, error } = await supabase
    .from('owned_items')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

// ── Game High Scores ──────────────────────────────────────────────────────────

export async function fetchGameHighScores(userId: string): Promise<GameHighScore[]> {
  const { data, error } = await supabase
    .from('game_high_scores')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export interface GameDeckScore {
  game_name: string;
  deck_id: string;
  best_score: number;
}

export async function fetchGameDeckScores(userId: string): Promise<GameDeckScore[]> {
  const { data, error } = await supabase
    .from('game_deck_scores')
    .select('game_name, deck_id, best_score')
    .eq('user_id', userId);
  if (error) return [];
  return data || [];
}

export async function upsertGameHighScore(
  userId: string,
  gameName: string,
  deckId: string,
  newScore: number,
  lowerIsBetter = false,
): Promise<{ beatHighScore: boolean; beatDeckBest: boolean }> {
  // 1. Fetch global high score (one row per user+game)
  const { data: existing } = await supabase
    .from('game_high_scores')
    .select('high_score, deck_best_score')
    .eq('user_id', userId)
    .eq('game_name', gameName)
    .maybeSingle();

  const currentHigh = existing?.high_score ?? (lowerIsBetter ? Infinity : 0);
  const beatsHigh = lowerIsBetter ? newScore < currentHigh : newScore > currentHigh;

  if (beatsHigh) {
    const update: Record<string, unknown> = {
      user_id: userId, game_name: gameName, deck_id: deckId,
      high_score: newScore, achieved_at: new Date().toISOString(),
    };
    await supabase.from('game_high_scores').upsert(update, { onConflict: 'user_id,game_name' });
  }

  // 2. Fetch per-deck best score
  const { data: deckExisting } = await supabase
    .from('game_deck_scores')
    .select('best_score')
    .eq('user_id', userId)
    .eq('game_name', gameName)
    .eq('deck_id', deckId)
    .maybeSingle();

  const currentDeckBest = deckExisting?.best_score ?? (lowerIsBetter ? Infinity : 0);
  const beatsDeck = lowerIsBetter ? newScore < currentDeckBest : newScore > currentDeckBest;

  if (beatsDeck) {
    await supabase.from('game_deck_scores').upsert(
      { user_id: userId, game_name: gameName, deck_id: deckId, best_score: newScore, achieved_at: new Date().toISOString() },
      { onConflict: 'user_id,game_name,deck_id' }
    );
  }

  return { beatHighScore: beatsHigh, beatDeckBest: beatsDeck };
}

// ── Daily Goals ───────────────────────────────────────────────────────────────

export async function fetchOrCreateDailyGoals(userId: string): Promise<DailyGoal> {
  const today = getLocalDateString();
  const { data: existing, error: fe } = await supabase
    .from('daily_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (fe) throw fe;
  if (existing) return existing;

  // Generate new goals
  const [g1, g2, g3] = pickDailyGoals();
  const { data: newGoal, error: ie } = await supabase
    .from('daily_goals')
    .insert({
      user_id: userId,
      date: today,
      goal1: g1.description,
      goal1_gem_reward: g1.gemReward,
      goal2: g2.description,
      goal2_gem_reward: g2.gemReward,
      goal3: g3.description,
      goal3_gem_reward: g3.gemReward,
    })
    .select()
    .single();

  if (ie) throw ie;
  return newGoal;
}

// ── AI Usage ──────────────────────────────────────────────────────────────────

export async function fetchOrCreateAiUsage(userId: string): Promise<AiUsage> {
  const today = getLocalDateString();
  const { data: existing, error } = await supabase
    .from('ai_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  const { data: created, error: ie } = await supabase
    .from('ai_usage')
    .insert({ user_id: userId, date: today })
    .select()
    .single();
  if (ie) throw ie;
  return created;
}

export async function incrementAiUsage(userId: string, field: 'flashcard_generations' | 'hints_used'): Promise<void> {
  const usage = await fetchOrCreateAiUsage(userId);
  await supabase
    .from('ai_usage')
    .update({ [field]: (usage[field] || 0) + 1 })
    .eq('id', usage.id);
}

// ── Game Tokens ───────────────────────────────────────────────────────────────

export async function fetchOrCreateGameTokens(userId: string): Promise<GameTokens> {
  const today = getLocalDateString();
  const { data: existing, error } = await supabase
    .from('game_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  const { data: created, error: ie } = await supabase
    .from('game_tokens')
    .insert({ user_id: userId, date: today })
    .select()
    .single();
  if (ie) throw ie;
  return created;
}

export async function useGameToken(userId: string): Promise<{ usedGems: boolean }> {
  const tokens = await fetchOrCreateGameTokens(userId);
  const FREE_TOKENS = 3;
  if (tokens.tokens_used < FREE_TOKENS) {
    await supabase.from('game_tokens').update({ tokens_used: tokens.tokens_used + 1 }).eq('id', tokens.id);
    return { usedGems: false };
  }
  // Out of free plays — each extra play costs 5 gems.
  await spendGems(userId, 5);
  return { usedGems: true };
}

export async function getFreeTokensLeft(userId: string): Promise<number> {
  const tokens = await fetchOrCreateGameTokens(userId);
  return Math.max(0, 3 - tokens.tokens_used);
}

// ── Gem Operations ────────────────────────────────────────────────────────────

export async function addGems(userId: string, amount: number): Promise<void> {
  // Use a raw update with increment
  const { data: profile } = await supabase
    .from('profiles')
    .select('gems, total_gems_earned, daily_gems_earned, daily_gems_earned_date, most_gems_in_day, most_gems_in_day_date')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return;

  const today = getLocalDateString();
  const currentDailyGems = profile.daily_gems_earned_date === today ? profile.daily_gems_earned : 0;
  const newDailyGems = currentDailyGems + amount;
  const newMostGemsDay = newDailyGems > (profile.most_gems_in_day || 0) ? newDailyGems : profile.most_gems_in_day;

  await supabase.from('profiles').update({
    gems: profile.gems + amount,
    total_gems_earned: profile.total_gems_earned + amount,
    daily_gems_earned: newDailyGems,
    daily_gems_earned_date: today,
    most_gems_in_day: newMostGemsDay,
    most_gems_in_day_date: newMostGemsDay > (profile.most_gems_in_day || 0) ? today : profile.most_gems_in_day_date,
  }).eq('id', userId);
}

export async function spendGems(userId: string, amount: number): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('gems, total_gems_spent')
    .eq('id', userId)
    .maybeSingle();
  if (!profile || profile.gems < amount) return false;

  await supabase.from('profiles').update({
    gems: profile.gems - amount,
    total_gems_spent: profile.total_gems_spent + amount,
  }).eq('id', userId);
  return true;
}

// ── EXP Management ────────────────────────────────────────────────────────────

export async function addExp(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_exp')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return;
  await supabase.from('profiles').update({
    total_exp: (profile.total_exp || 0) + amount,
  }).eq('id', userId);
}

// ── Skills & Charms ───────────────────────────────────────────────────────────

export interface UserSkill {
  id: string;
  skill_name: string;
  quantity: number;
  equipped_slot: number | null;
}

export interface UserCharm {
  id: string;
  charm_name: string;
  quantity: number;
  is_equipped: boolean;
}

export async function fetchUserSkills(userId: string): Promise<UserSkill[]> {
  const { data } = await supabase
    .from('user_skills')
    .select('id, skill_name, quantity, equipped_slot')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: true });
  return Array.isArray(data) ? data : [];
}

export async function fetchUserCharms(userId: string): Promise<UserCharm[]> {
  const { data } = await supabase
    .from('user_charms')
    .select('id, charm_name, quantity, is_equipped')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: true });
  return Array.isArray(data) ? data : [];
}

export async function purchaseSkill(userId: string, skillName: string, price: number): Promise<boolean> {
  const spent = await spendGems(userId, price);
  if (!spent) return false;
  // Check if row exists
  const { data: existing } = await supabase
    .from('user_skills')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('skill_name', skillName)
    .maybeSingle();
  if (existing) {
    await supabase.from('user_skills').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
  } else {
    await supabase.from('user_skills').insert({ user_id: userId, skill_name: skillName, quantity: 1 });
  }
  return true;
}

export async function equipSkill(userId: string, skillId: string, slot: number | null): Promise<void> {
  // If assigning a slot, clear any existing skill in that slot first
  if (slot !== null) {
    await supabase.from('user_skills')
      .update({ equipped_slot: null })
      .eq('user_id', userId)
      .eq('equipped_slot', slot);
  }
  await supabase.from('user_skills').update({ equipped_slot: slot }).eq('id', skillId);
}

export async function purchaseCharm(userId: string, charmName: string, price: number): Promise<boolean> {
  const spent = await spendGems(userId, price);
  if (!spent) return false;
  const { data: existing } = await supabase
    .from('user_charms')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('charm_name', charmName)
    .maybeSingle();
  if (existing) {
    await supabase.from('user_charms').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
  } else {
    await supabase.from('user_charms').insert({ user_id: userId, charm_name: charmName, quantity: 1 });
  }
  return true;
}

export async function toggleEquipCharm(userId: string, charmId: string, equip: boolean): Promise<void> {
  if (equip) {
    // Max 2 charms equipped at once
    const { data: equipped } = await supabase
      .from('user_charms')
      .select('id')
      .eq('user_id', userId)
      .eq('is_equipped', true);
    if ((equipped || []).length >= 2) return; // caller should check this
  }
  await supabase.from('user_charms').update({ is_equipped: equip }).eq('id', charmId);
}

// ── Streak Management ─────────────────────────────────────────────────────────

export async function updateStreak(userId: string): Promise<{ newStreak: number; milestoneGems: number; milestones: string[]; streakUpdated: boolean; streakBroke?: boolean }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_days, last_study_date, streak_freeze_active, streak_milestones_awarded, longest_streak, best_streak_date, streak_wager_active, streak_wager_start_date, streak_stall_activated_at')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return { newStreak: 0, milestoneGems: 0, milestones: [], streakUpdated: false };

  const today = getLocalDateString();
  if (profile.last_study_date === today) {
    return { newStreak: profile.streak_days, milestoneGems: 0, milestones: [], streakUpdated: false };
  }

  // Determine whether the user missed a day
  const missedDay = !!profile.last_study_date && !isConsecutiveDay(profile.last_study_date, today);

  // Streak Stall: if active and user missed a day, consume the stall and keep streak
  if (missedDay && profile.streak_freeze_active) {
    const savedStreak = profile.streak_days || 0;
    await supabase.from('profiles').update({
      streak_days: savedStreak,
      last_study_date: today,
      streak_freeze_active: false,
      streak_stall_saved_streak: savedStreak,
    } as any).eq('id', userId);
    await supabase.from('streak_study_dates').upsert(
      { user_id: userId, study_date: today },
      { onConflict: 'user_id,study_date' }
    );
    return { newStreak: savedStreak, milestoneGems: 0, milestones: [], streakUpdated: true };
  }

  let newStreak = 1;
  const streakBroke = missedDay && !!profile.last_study_date;
  if (profile.last_study_date) {
    if (!missedDay) {
      newStreak = (profile.streak_days || 0) + 1;
    } else {
      newStreak = 1; // reset
    }
  }

  const longestStreak = Math.max(newStreak, profile.longest_streak || 0);
  const bestStreakDate = longestStreak > (profile.longest_streak || 0) ? today : profile.best_streak_date;

  // Check milestones
  const awardedMilestones = profile.streak_milestones_awarded || [];
  const newMilestones: string[] = [];
  let milestoneGems = 0;

  for (const [key, milestone] of Object.entries(STREAK_MILESTONES)) {
    if (newStreak >= milestone.days && !awardedMilestones.includes(key)) {
      newMilestones.push(key);
      milestoneGems += milestone.gems;
    }
  }

  // Check wager state: broken or completed?
  const wagerUpdates: Record<string, unknown> = {};
  if (profile.streak_wager_active && profile.streak_wager_start_date) {
    const start = new Date(profile.streak_wager_start_date);
    const now = new Date(today);
    const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (newStreak === 1 && (profile.streak_days || 0) > 1) {
      // Streak reset — wager broken
      wagerUpdates.streak_wager_active = false;
      wagerUpdates.streak_wager_broken_seen = false;
    } else if (daysElapsed >= 14) {
      // Successfully maintained 14 days
      wagerUpdates.streak_wager_active = false;
      wagerUpdates.streak_wager_completed = true;
    }
  }

  // When streak breaks: record the break date so emoji shows ❄ on return day
  const streakBreakUpdate: Record<string, unknown> = {};
  if (streakBroke) {
    streakBreakUpdate.streak_break_date = today;
  }

  await Promise.all([
    supabase.from('profiles').update({
      streak_days: newStreak,
      last_study_date: today,
      longest_streak: longestStreak,
      best_streak_date: bestStreakDate,
      streak_milestones_awarded: [...awardedMilestones, ...newMilestones],
      ...wagerUpdates,
      ...streakBreakUpdate,
    }).eq('id', userId),
    supabase.from('streak_study_dates').upsert({ user_id: userId, study_date: today }, { onConflict: 'user_id,study_date' }),
  ]);

  // If streak broke, reset Fire Club to level 1, progress 0
  if (streakBroke) {
    await supabase.from('club_memberships')
      .update({ is_member: false, is_unlocked: false, current_progress: 0, current_level: 1, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('club_name', 'fire');
  }

  return { newStreak, milestoneGems, milestones: newMilestones, streakUpdated: true, streakBroke };
}

// ── Cards Studied Tracking ────────────────────────────────────────────────────

export async function recordCardsStudied(userId: string, count: number, deckId?: string): Promise<{ bonusGems: number }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_cards_studied, daily_cards_studied, daily_cards_studied_date, total_gems_from_card_bonus, weekly_cards_studied, weekly_cards_start_date, most_cards_in_week, most_cards_in_week_start, daily_decks_studied_ids, daily_decks_studied_date')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return { bonusGems: 0 };

  const today = getLocalDateString();
  const weekStart = getLocalWeekStart();

  // Daily cards
  const currentDailyCards = profile.daily_cards_studied_date === today ? profile.daily_cards_studied : 0;
  const newDailyCards = currentDailyCards + count;

  // Weekly cards
  const currentWeekCards = profile.weekly_cards_start_date === weekStart ? profile.weekly_cards_studied : 0;
  const newWeekCards = currentWeekCards + count;
  const mostInWeek = Math.max(newWeekCards, profile.most_cards_in_week || 0);

  // Deck tracking
  const currentDecks: string[] = profile.daily_decks_studied_date === today ? (profile.daily_decks_studied_ids || []) : [];
  const newDecks = deckId && !currentDecks.includes(deckId) ? [...currentDecks, deckId] : currentDecks;

  const updates: any = {
    total_cards_studied: profile.total_cards_studied + count,
    daily_cards_studied: newDailyCards,
    daily_cards_studied_date: today,
    weekly_cards_studied: newWeekCards,
    weekly_cards_start_date: weekStart,
    most_cards_in_week: mostInWeek,
    most_cards_in_week_start: mostInWeek > (profile.most_cards_in_week || 0) ? weekStart : profile.most_cards_in_week_start,
    daily_decks_studied_ids: newDecks,
    daily_decks_studied_date: today,
  };

  await supabase.from('profiles').update(updates).eq('id', userId);
  // Gems are no longer earned for card-study completion
  return { bonusGems: 0 };
}

// ── Test Results ──────────────────────────────────────────────────────────────

export async function saveTestResult(
  userId: string,
  deckId: string | null,
  scorePercent: number,
  correct: number,
  total: number,
  questionDetails?: { front: string; back: string; correct: boolean }[],
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_tests_taken, best_test_score_percent, best_test_score_deck_id, best_test_score_date, daily_tests_completed, daily_tests_completed_date')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return;

  await supabase.from('test_results').insert({
    user_id: userId,
    deck_id: deckId || null,
    score_percent: scorePercent,
    questions_correct: correct,
    questions_total: total,
    question_details: questionDetails ?? null,
  });

  const today = getLocalDateString();
  const currentDailyTests = profile.daily_tests_completed_date === today ? (profile.daily_tests_completed || 0) : 0;

  const updates: any = {
    total_tests_taken: (profile.total_tests_taken || 0) + 1,
    daily_tests_completed: currentDailyTests + 1,
    daily_tests_completed_date: today,
  };
  if (scorePercent > (profile.best_test_score_percent || 0)) {
    updates.best_test_score_percent = scorePercent;
    updates.best_test_score_deck_id = deckId;
    updates.best_test_score_date = today;
  }
  await supabase.from('profiles').update(updates).eq('id', userId);
}

export async function fetchTestHistory(userId: string, deckId?: string | null, limit = 20): Promise<TestResult[]> {
  let q = supabase
    .from('test_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (deckId) q = q.eq('deck_id', deckId);
  const { data } = await q;
  return Array.isArray(data) ? data : [];
}

// ── Study Sessions ─────────────────────────────────────────────────────────────

export async function saveStudySession(
  userId: string,
  deckId: string | null,
  cardsReviewed: number,
  cardsCorrect: number,
  durationSeconds: number,
): Promise<void> {
  await supabase.from('study_sessions').insert({
    user_id: userId,
    deck_id: deckId || null,
    cards_reviewed: cardsReviewed,
    cards_correct: cardsCorrect,
    duration_seconds: durationSeconds,
  });
}

export async function fetchStudyHistory(userId: string, deckId?: string | null, limit = 20): Promise<StudySession[]> {
  let q = supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (deckId) q = q.eq('deck_id', deckId);
  const { data } = await q;
  return Array.isArray(data) ? data : [];
}

// ── Game Sessions ──────────────────────────────────────────────────────────────

export async function saveGameSession(
  userId: string,
  gameName: string,
  deckId: string | null,
  score: number,
  isHighScore: boolean,
  isDeckBest = false,
): Promise<void> {
  await supabase.from('game_sessions').insert({
    user_id: userId,
    game_name: gameName,
    deck_id: deckId || null,
    score,
    is_high_score: isHighScore,
    is_deck_best: isDeckBest,
  });
}

export async function fetchGameHistory(userId: string, limit = 30): Promise<GameSession[]> {
  const { data } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return Array.isArray(data) ? data : [];
}

// Clear study history for a specific deck only
export async function clearStudyHistory(userId: string, deckId: string): Promise<void> {
  await supabase.from('study_sessions').delete().eq('user_id', userId).eq('deck_id', deckId);
}

// Clear test history for a specific deck only
export async function clearTestHistory(userId: string, deckId: string): Promise<void> {
  await supabase.from('test_results').delete().eq('user_id', userId).eq('deck_id', deckId);
}

// Clear ALL arcade/game history globally (not deck-scoped) — preserves high scores
export async function clearGameHistory(userId: string): Promise<void> {
  await supabase.from('game_sessions').delete().eq('user_id', userId);
}

// ── Game Play Tracking ────────────────────────────────────────────────────────

export async function recordGamePlayed(userId: string): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_games_played, daily_games_played, daily_games_played_date')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return;

  const today = getLocalDateString();
  const currentDailyGames = profile.daily_games_played_date === today ? (profile.daily_games_played || 0) : 0;

  await supabase.from('profiles').update({
    total_games_played: (profile.total_games_played || 0) + 1,
    daily_games_played: currentDailyGames + 1,
    daily_games_played_date: today,
  }).eq('id', userId);
}

// ── Daily Goals Completion ────────────────────────────────────────────────────

export async function checkAndCompleteDailyGoals(
  userId: string,
  context: { testScore?: number; beatHighScore?: boolean } = {}
): Promise<{ gemsAwarded: number; completedGoals: string[]; totalCompletedToday: number }> {
  const today = getLocalDateString();

  const [goalsRes, profileRes] = await Promise.all([
    supabase.from('daily_goals').select('*').eq('user_id', userId).eq('date', today).maybeSingle(),
    supabase.from('profiles').select(
      'daily_cards_studied, daily_cards_studied_date, daily_tests_completed, daily_tests_completed_date, daily_games_played, daily_games_played_date, daily_decks_studied_ids, daily_decks_studied_date, daily_gems_earned, daily_gems_earned_date'
    ).eq('id', userId).maybeSingle(),
  ]);

  const goals = goalsRes.data as DailyGoal | null;
  const profile = profileRes.data;
  if (!goals || !profile) return { gemsAwarded: 0, completedGoals: [], totalCompletedToday: 0 };

  const cardsToday = profile.daily_cards_studied_date === today ? (profile.daily_cards_studied || 0) : 0;
  const testsToday = profile.daily_tests_completed_date === today ? (profile.daily_tests_completed || 0) : 0;
  const gamesToday = profile.daily_games_played_date === today ? (profile.daily_games_played || 0) : 0;
  const decksToday = profile.daily_decks_studied_date === today ? (profile.daily_decks_studied_ids?.length || 0) : 0;
  const gemsToday = profile.daily_gems_earned_date === today ? (profile.daily_gems_earned || 0) : 0;

  const goalEntries = [
    { key: 'goal1_complete' as const, description: goals.goal1, reward: goals.goal1_gem_reward, done: goals.goal1_complete },
    { key: 'goal2_complete' as const, description: goals.goal2, reward: goals.goal2_gem_reward, done: goals.goal2_complete },
    { key: 'goal3_complete' as const, description: goals.goal3, reward: goals.goal3_gem_reward, done: goals.goal3_complete },
  ];

  let totalGemsToAdd = 0;
  const completedGoals: string[] = [];
  const updates: Partial<DailyGoal> = {};

  for (const g of goalEntries) {
    if (g.done) continue;
    const pool = GOAL_POOL.find(p => p.description === g.description);
    if (!pool) continue;

    let isComplete = false;
    const { type, target } = pool;

    if (type === 'cards_studied') isComplete = cardsToday >= target;
    else if (type === 'tests_completed') isComplete = testsToday >= target;
    else if (type === 'test_score_80') isComplete = context.testScore !== undefined && context.testScore >= 80;
    else if (type === 'test_score_100') isComplete = context.testScore !== undefined && context.testScore >= 100;
    else if (type === 'decks_studied') isComplete = decksToday >= target;
    else if (type === 'gems_earned') isComplete = gemsToday >= target;
    else if (type === 'games_played') isComplete = gamesToday >= target;
    else if (type === 'beat_high_score') isComplete = context.beatHighScore === true;

    if (isComplete) {
      updates[g.key] = true as any;
      totalGemsToAdd += g.reward;
      completedGoals.push(g.description);
    }
  }

  // Count how many goals are now complete after this pass
  const goal1DoneEarly = goals.goal1_complete;
  const goal2DoneEarly = goals.goal2_complete;
  const goal3DoneEarly = goals.goal3_complete;
  const earlyTotal = [goal1DoneEarly, goal2DoneEarly, goal3DoneEarly].filter(Boolean).length;
  if (Object.keys(updates).length === 0) return { gemsAwarded: 0, completedGoals: [], totalCompletedToday: earlyTotal };

  // All-complete bonus
  const goal1Done = (updates.goal1_complete ?? false) || goals.goal1_complete;
  const goal2Done = (updates.goal2_complete ?? false) || goals.goal2_complete;
  const goal3Done = (updates.goal3_complete ?? false) || goals.goal3_complete;
  if (goal1Done && goal2Done && goal3Done && !goals.all_complete_bonus_claimed) {
    (updates as any).all_complete_bonus_claimed = true;
    totalGemsToAdd += 20;
  }

  await supabase.from('daily_goals').update(updates).eq('id', goals.id);
  if (totalGemsToAdd > 0) {
    await addGems(userId, totalGemsToAdd);
  }

  const totalCompletedToday = [
    (updates.goal1_complete ?? false) || goals.goal1_complete,
    (updates.goal2_complete ?? false) || goals.goal2_complete,
    (updates.goal3_complete ?? false) || goals.goal3_complete,
  ].filter(Boolean).length;

  return { gemsAwarded: totalGemsToAdd, completedGoals, totalCompletedToday };
}

// ── Badge Checking ────────────────────────────────────────────────────────────

export async function checkAndAwardBadges(
  userId: string,
  earnedBadgeNames: string[],
  context: {
    deckCount?: number;
    totalCards?: number;
    streakDays?: number;
    gems?: number;
    beatHighScore?: boolean;
    testScore?: number;
    perfectWeekDays?: number;
    masteredCards?: number;
  }
): Promise<string[]> {
  const existing = await fetchBadges(userId);
  const existingNames = new Set(existing.map(b => b.badge_name));
  const newBadges: string[] = [];

  const check = async (name: string, condition: boolean) => {
    if (condition && !existingNames.has(name) && !earnedBadgeNames.includes(name)) {
      const awarded = await awardBadge(userId, name);
      if (awarded) newBadges.push(name);
    }
  };

  await check('First Deck', (context.deckCount || 0) >= 1);
  await check('Card Master', (context.totalCards || 0) >= 50);
  await check('Test Ace', (context.testScore || 0) >= 100);
  await check('3-Day Streak', (context.streakDays || 0) >= 3);
  await check('7-Day Streak', (context.streakDays || 0) >= 7);
  await check('14-Day Streak', (context.streakDays || 0) >= 14);
  await check('30-Day Streak', (context.streakDays || 0) >= 30);
  await check('Gem Hoarder', (context.gems || 0) >= 200);
  await check('Game Winner', context.beatHighScore === true);
  await check('Perfect Week', (context.perfectWeekDays || 0) >= 7);
  await check('Master of All', (context.masteredCards || 0) >= 50);

  return newBadges;
}

export async function countMasteredCards(userId: string): Promise<number> {
  const { count } = await supabase
    .from('flashcards')
    .select('id', { count: 'exact', head: true })
    .eq('mastery_level', 6)
    .in('deck_id', (await supabase.from('decks').select('id').eq('user_id', userId)).data?.map((d: any) => d.id) || []);
  return count || 0;
}

// ── SSE Streaming helper for AI ───────────────────────────────────────────────

export async function streamLLMResponse(
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  supabaseUrl: string,
  supabaseAnonKey: string,
  onChunk: (text: string) => void,
  systemInstruction?: { parts: Array<{ text: string }> }
): Promise<string> {
  const body: Record<string, unknown> = { contents };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  const response = await fetch(`${supabaseUrl}/functions/v1/large-language-model`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok || !response.body) {
    throw new Error(`LLM error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const dataStr = line.slice(5).trim();
      if (!dataStr || dataStr === '[DONE]') continue;
      try {
        const frame = JSON.parse(dataStr);
        const text = frame?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (text) {
          fullText += text;
          onChunk(text);
        }
      } catch {
        // incomplete frame
      }
    }
  }
  return fullText;
}

// ── Clubs System ──────────────────────────────────────────────────────────────


/** Level caps: 3, 7, 14, 28, 42, 56, 70, 84, 98, 112... */
export function getClubLevelCaps(): number[] {
  const caps = [3, 7, 14, 28];
  let next = 42;
  while (caps.length < 20) { caps.push(next); next += 14; }
  return caps;
}

/** Returns geode count and gem range for a given level index (0-based index into caps array) */
export function getRewardForLevel(levelCapIndex: number): { geodes: number; gemMin: number; gemMax: number } {
  const geodes = levelCapIndex + 1;
  const gemMin = 2 + levelCapIndex * 2;
  const gemMax = 10 + levelCapIndex * 2;
  return { geodes, gemMin, gemMax };
}

export async function fetchClubMemberships(userId: string): Promise<ClubMembership[]> {
  const { data, error } = await supabase
    .from('club_memberships')
    .select('*')
    .eq('user_id', userId)
    .order('club_name');
  if (error) throw error;
  return data || [];
}

export async function fetchPendingRewards(userId: string): Promise<PendingReward[]> {
  const { data, error } = await supabase
    .from('pending_rewards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertClubMembership(
  userId: string,
  clubName: ClubName,
  updates: Partial<Omit<ClubMembership, 'id' | 'user_id' | 'created_at'>>
): Promise<ClubMembership> {
  const { data: existing } = await supabase
    .from('club_memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('club_name', clubName)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('club_memberships')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('club_memberships')
      .insert({ user_id: userId, club_name: clubName, ...updates })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

/** Check progress changes and grant level rewards as needed. Returns newly created pending rewards. */
export async function checkClubLevelUp(
  userId: string,
  clubName: ClubName,
  newProgress: number
): Promise<PendingReward[]> {
  const { data: membership } = await supabase
    .from('club_memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('club_name', clubName)
    .maybeSingle();

  if (!membership || !membership.is_member) return [];

  const caps = getClubLevelCaps();
  const oldLevel = membership.current_level;
  let newLevel = oldLevel;

  for (let i = oldLevel; i < caps.length; i++) {
    if (newProgress >= caps[i]) newLevel = i + 1;
    else break;
  }

  if (newLevel <= oldLevel) {
    await supabase.from('club_memberships')
      .update({ current_progress: newProgress, updated_at: new Date().toISOString() })
      .eq('id', membership.id);
    return [];
  }

  // Grant rewards for each new level crossed
  const newRewards: PendingReward[] = [];
  for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
    const capIdx = lvl - 1; // level 1 = index 0
    const { geodes, gemMin, gemMax } = getRewardForLevel(capIdx);
    const { data: reward, error } = await supabase
      .from('pending_rewards')
      .insert({
        user_id: userId,
        club_name: clubName,
        level_reached: lvl,
        geodes_total: geodes,
        geodes_remaining: geodes,
        gem_min: gemMin,
        gem_max: gemMax,
      })
      .select()
      .single();
    if (!error && reward) newRewards.push(reward);
  }

  await supabase.from('club_memberships')
    .update({ current_level: newLevel, current_progress: newProgress, updated_at: new Date().toISOString() })
    .eq('id', membership.id);

  return newRewards;
}

/** Break one geode: deduct from pending_rewards and award gems */
export async function breakGeode(
  userId: string,
  rewardId: string
): Promise<{ gemsEarned: number; geodesRemaining: number }> {
  const { data: reward, error } = await supabase
    .from('pending_rewards')
    .select('*')
    .eq('id', rewardId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !reward) throw new Error('Reward not found');
  if (reward.geodes_remaining <= 0) throw new Error('No geodes remaining');

  const gemsEarned = Math.floor(Math.random() * (reward.gem_max - reward.gem_min + 1)) + reward.gem_min;
  const newRemaining = reward.geodes_remaining - 1;

  if (newRemaining === 0) {
    await supabase.from('pending_rewards').delete().eq('id', rewardId);
  } else {
    await supabase.from('pending_rewards')
      .update({ geodes_remaining: newRemaining })
      .eq('id', rewardId);
  }

  await addGems(userId, gemsEarned);
  return { gemsEarned, geodesRemaining: newRemaining };
}

/** Update Fire Club state based on current streak */
export async function syncFireClub(userId: string, streakDays: number): Promise<void> {
  const isUnlocked = streakDays >= 3;
  const isMember = isUnlocked;
  const membership = await upsertClubMembership(userId, 'fire', {
    is_unlocked: isUnlocked,
    is_member: isMember,
    current_progress: streakDays,
  });

  if (isMember) {
    await checkClubLevelUp(userId, 'fire', streakDays);
  } else if (!isMember && membership.current_level > 0) {
    // Kicked out — keep level but mark not member; reset progress
    await supabase.from('club_memberships')
      .update({ is_member: false, is_unlocked: false, current_progress: streakDays, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('club_name', 'fire');
  }
}

/** Record a 100% test score on a deck for Ace Club progress */
export async function recordAcePerfectScore(userId: string, deckId: string): Promise<void> {
  // Upsert (ignore if already exists)
  const { data: existing } = await supabase
    .from('ace_club_perfect_decks')
    .select('id')
    .eq('user_id', userId)
    .eq('deck_id', deckId)
    .maybeSingle();
  if (existing) return;

  await supabase.from('ace_club_perfect_decks').insert({ user_id: userId, deck_id: deckId });

  // Count unique perfect decks
  const { count } = await supabase
    .from('ace_club_perfect_decks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const uniquePerfect = count || 0;
  const isUnlocked = uniquePerfect >= 3;

  await upsertClubMembership(userId, 'ace', {
    is_unlocked: isUnlocked,
    is_member: isUnlocked,
    current_progress: uniquePerfect,
  });

  if (isUnlocked) {
    await checkClubLevelUp(userId, 'ace', uniquePerfect);
  }
}

/** Record an early morning action for Robin Club */
export async function recordRobinEarlyAction(userId: string, actionType: 'study' | 'test' | 'game'): Promise<void> {
  const now = new Date();
  const localHour = now.getHours();
  if (localHour >= 6) return; // Only counts before 6 AM

  await supabase.from('robin_early_actions').insert({ user_id: userId, action_type: actionType, local_hour: localHour });

  const { count } = await supabase
    .from('robin_early_actions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const totalActions = count || 0;
  const isUnlocked = totalActions >= 3;

  await upsertClubMembership(userId, 'robin', {
    is_unlocked: isUnlocked,
    is_member: isUnlocked,
    current_progress: totalActions,
  });

  if (isUnlocked) {
    await checkClubLevelUp(userId, 'robin', totalActions);
  }
}

/** Reorder flashcards by updating sort_order */
export async function reorderFlashcards(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from('flashcards').update({ sort_order: idx }).eq('id', id)
    )
  );
}

// ── Streak Calendar ────────────────────────────────────────────────────────

/** Record a study date for the streak calendar (upsert — safe to call multiple times per day) */
export async function recordStudyDate(userId: string, dateStr: string): Promise<void> {
  await supabase.from('streak_study_dates').upsert({ user_id: userId, study_date: dateStr }, { onConflict: 'user_id,study_date' });
}

/** Fetch all study dates for a user within a year window (for calendar display) */
export async function fetchStudyDates(userId: string): Promise<string[]> {
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const { data, error } = await supabase
    .from('streak_study_dates')
    .select('study_date')
    .eq('user_id', userId)
    .gte('study_date', yearAgo.toISOString().slice(0, 10))
    .order('study_date', { ascending: true });
  if (error) return [];
  return (data || []).map(r => r.study_date as string);
}

/** Fetch Robin early-action dates (distinct dates) for calendar */
export async function fetchRobinEarlyDates(userId: string): Promise<string[]> {
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const { data, error } = await supabase
    .from('robin_early_actions')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', yearAgo.toISOString())
    .order('created_at', { ascending: true });
  if (error) return [];
  const dates = new Set<string>();
  (data || []).forEach(r => dates.add((r.created_at as string).slice(0, 10)));
  return Array.from(dates);
}

/** Fetch all perfect deck records for Ace Club list view */
export async function fetchAcePerfectDecks(userId: string): Promise<{ deck_id: string; achieved_at: string }[]> {
  const { data, error } = await supabase
    .from('ace_club_perfect_decks')
    .select('deck_id, achieved_at')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false })
    .limit(10);
  if (error) return [];
  return data || [];
}

/** Claim the completed streak wager reward (60 gems) */
export async function claimStreakWager(userId: string): Promise<void> {
  await addGems(userId, 60);
  await supabase.from('profiles').update({
    streak_wager_active: false,
    streak_wager_start_date: null,
    streak_wager_completed: false,
  }).eq('id', userId);
}

// ── World / Public Deck Marketplace ─────────────────────────────────────────

export async function fetchPublicDecks(filters?: {
  search?: string;
  subject?: string;
  difficulty?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'newest' | 'most_downloaded' | 'highest_rated' | 'lowest_price';
}): Promise<PublicDeck[]> {
  let q = supabase.from('public_decks').select('*').eq('status', 'public');
  if (filters?.search) {
    q = q.ilike('title', `%${filters.search}%`);
  }
  if (filters?.subject) q = q.eq('subject', filters.subject);
  if (filters?.difficulty) q = q.eq('difficulty', filters.difficulty);
  if (filters?.minPrice != null) q = q.gte('price', filters.minPrice);
  if (filters?.maxPrice != null) q = q.lte('price', filters.maxPrice);
  if (filters?.minRating != null) q = q.gte('avg_rating', filters.minRating);

  const sortMap: Record<string, { col: string; asc: boolean }> = {
    newest: { col: 'created_at', asc: false },
    most_downloaded: { col: 'download_count', asc: false },
    highest_rated: { col: 'avg_rating', asc: false },
  };
  const sort = sortMap[filters?.sortBy ?? 'newest'];
  q = q.order(sort.col, { ascending: sort.asc }).limit(100);

  const { data, error } = await q;
  if (error) return [];
  const decks = data || [];

  // Attach owner usernames and mod usernames
  const ownerIds = [...new Set(decks.map(d => d.owner_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', ownerIds);
  const profileMap: Record<string, string> = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p.username; });

  const { data: mods } = await supabase.from('deck_mods').select('public_deck_id, user_id').not('accepted_at', 'is', null);
  const modUserIds = [...new Set((mods || []).map(m => m.user_id))];
  let modProfileMap: Record<string, string> = {};
  if (modUserIds.length > 0) {
    const { data: modProfiles } = await supabase.from('profiles').select('id, username').in('id', modUserIds);
    (modProfiles || []).forEach(p => { modProfileMap[p.id] = p.username; });
  }
  const modsByDeck: Record<string, string[]> = {};
  (mods || []).forEach(m => {
    if (!modsByDeck[m.public_deck_id]) modsByDeck[m.public_deck_id] = [];
    const un = modProfileMap[m.user_id];
    if (un) modsByDeck[m.public_deck_id].push(un);
  });

  return decks.map(d => ({
    ...d,
    owner_username: profileMap[d.owner_id] || 'Unknown',
    mod_usernames: modsByDeck[d.id] || [],
  }));
}

export async function fetchPublicDeck(id: string): Promise<PublicDeck | null> {
  const { data, error } = await supabase.from('public_decks').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  // owner username
  const { data: ownerProfile } = await supabase.from('profiles').select('username').eq('id', data.owner_id).maybeSingle();
  // mod usernames
  const { data: mods } = await supabase.from('deck_mods').select('user_id').eq('public_deck_id', id).not('accepted_at', 'is', null);
  let modUsernames: string[] = [];
  if (mods && mods.length > 0) {
    const modIds = mods.map(m => m.user_id);
    const { data: modProfiles } = await supabase.from('profiles').select('username').in('id', modIds);
    modUsernames = (modProfiles || []).map(p => p.username);
  }
  return { ...data, owner_username: ownerProfile?.username || 'Unknown', mod_usernames: modUsernames };
}

export async function fetchPublicDeckCards(publicDeckId: string): Promise<PublicDeckCard[]> {
  const { data, error } = await supabase
    .from('public_deck_cards')
    .select('*')
    .eq('public_deck_id', publicDeckId)
    .order('sort_order', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function addPublicDeckCard(publicDeckId: string, front: string, back: string, notes: string): Promise<PublicDeckCard | null> {
  const { data: existing } = await supabase.from('public_deck_cards').select('sort_order').eq('public_deck_id', publicDeckId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const nextOrder = (existing?.sort_order ?? -1) + 1;
  const { data, error } = await supabase
    .from('public_deck_cards')
    .insert({ public_deck_id: publicDeckId, front_text: front, back_text: back, notes: notes ?? '', sort_order: nextOrder })
    .select('*').single();
  if (error) return null;
  return data;
}

export async function updatePublicDeckCard(cardId: string, updates: { front_text?: string; back_text?: string; notes?: string }): Promise<void> {
  await supabase.from('public_deck_cards').update(updates).eq('id', cardId);
}

export async function deletePublicDeckCard(cardId: string): Promise<void> {
  await supabase.from('public_deck_cards').delete().eq('id', cardId);
}

export async function importPublicDeckCards(publicDeckId: string, cards: { front: string; back: string; notes?: string }[]): Promise<number> {
  const { data: existing } = await supabase.from('public_deck_cards').select('sort_order').eq('public_deck_id', publicDeckId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const startOrder = (existing?.sort_order ?? -1) + 1;
  const rows = cards.map((c, i) => ({ public_deck_id: publicDeckId, front_text: c.front, back_text: c.back, notes: c.notes ?? '', sort_order: startOrder + i }));
  const { data, error } = await supabase.from('public_deck_cards').insert(rows).select('id');
  if (error) return 0;
  return data?.length ?? 0;
}

export async function fetchMyPublicDecks(userId: string): Promise<PublicDeck[]> {
  const { data, error } = await supabase
    .from('public_decks')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data?.length) return [];
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle();
  const username = profile?.username || '';
  return data.map(d => ({ ...d, owner_username: username, mod_usernames: [] }));
}

export async function unpublishPublicDeck(deckId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('public_decks').delete().eq('id', deckId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function fetchModdedDecks(userId: string): Promise<PublicDeck[]> {
  const { data: modEntries, error } = await supabase
    .from('deck_mods')
    .select('public_deck_id')
    .eq('user_id', userId)
    .not('accepted_at', 'is', null);
  if (error || !modEntries?.length) return [];
  const ids = modEntries.map(m => m.public_deck_id);
  const { data, error: e2 } = await supabase.from('public_decks').select('*').in('id', ids);
  if (e2) return [];
  // Fetch owner usernames for each unique owner
  const ownerIds = [...new Set((data || []).map((d: any) => d.owner_id))];
  const { data: profiles } = ownerIds.length
    ? await supabase.from('profiles').select('id, username').in('id', ownerIds)
    : { data: [] };
  const profileMap: Record<string, string> = {};
  (profiles || []).forEach((p: any) => { profileMap[p.id] = p.username || ''; });
  return (data || []).map((d: any) => ({ ...d, owner_username: profileMap[d.owner_id] || d.owner_id?.slice(0,8) || '—', mod_usernames: [] }));
}

export async function publishDeck(params: {
  userId: string;
  deckId: string;
  title: string;
  description: string;
  subject: string;
  difficulty: string;
  price: number;
}): Promise<{ data: PublicDeck | null; error: string | null }> {
  // check no existing deck with same title
  const { data: existing } = await supabase
    .from('public_decks')
    .select('id')
    .eq('title', params.title)
    .maybeSingle();
  if (existing) return { data: null, error: 'A similar deck already exists in the marketplace. Try a different title.' };

  // fetch flashcards for snapshot
  const { data: cards } = await supabase
    .from('flashcards')
    .select('*')
    .eq('deck_id', params.deckId)
    .order('sort_order', { ascending: true });

  const { data: publicDeck, error: insertError } = await supabase
    .from('public_decks')
    .insert({
      owner_id: params.userId,
      source_deck_id: params.deckId,
      title: params.title,
      description: params.description,
      subject: params.subject,
      difficulty: params.difficulty,
      price: params.price,
    })
    .select()
    .maybeSingle();
  if (insertError || !publicDeck) return { data: null, error: insertError?.message || 'Failed to publish' };

  // insert snapshot cards
  if (cards && cards.length > 0) {
    await supabase.from('public_deck_cards').insert(
      cards.map((c, i) => ({
        public_deck_id: publicDeck.id,
        front_text: c.front_text,
        back_text: c.back_text,
        notes: c.notes || '',
        sort_order: i,
      }))
    );
  }
  return { data: publicDeck, error: null };
}

export async function purchaseDeck(params: {
  buyerId: string;
  publicDeckId: string;
  price: number;
  sellerId: string;
}): Promise<{ error: string | null }> {
  const { buyerId, publicDeckId, price, sellerId } = params;
  if (buyerId === sellerId) return { error: 'You cannot buy your own deck.' };

  // check already purchased
  const { data: existing } = await supabase
    .from('deck_purchases')
    .select('id')
    .eq('user_id', buyerId)
    .eq('public_deck_id', publicDeckId)
    .maybeSingle();
  if (existing) return { error: 'You already own this deck.' };

  // deduct gems from buyer
  const spent = await spendGems(buyerId, price);
  if (!spent) return { error: 'Insufficient gems.' };

  // calculate donation
  const donation = price <= 4 ? 0 : Math.ceil(price * 0.2);
  const sellerReceives = price - donation;
  if (sellerReceives > 0) await addGems(sellerId, sellerReceives);

  // fetch public deck info for snapshot
  const { data: pubDeck } = await supabase.from('public_decks').select('*').eq('id', publicDeckId).maybeSingle();
  if (!pubDeck) return { error: 'Deck not found.' };

  // fetch public deck cards
  const { data: pubCards } = await supabase.from('public_deck_cards').select('*').eq('public_deck_id', publicDeckId).order('sort_order', { ascending: true });

  // create private deck copy
  const { data: newDeck } = await supabase.from('decks').insert({
    user_id: buyerId,
    title: pubDeck.title,
    subject: pubDeck.subject,
    difficulty: pubDeck.difficulty,
  }).select().maybeSingle();
  if (!newDeck) { await addGems(buyerId, price); return { error: 'Failed to copy deck.' }; }

  // copy cards
  if (pubCards && pubCards.length > 0) {
    await supabase.from('flashcards').insert(
      pubCards.map((c, i) => ({
        deck_id: newDeck.id,
        front_text: c.front_text,
        back_text: c.back_text,
        notes: c.notes || '',
        mastery_level: 1,
        times_reviewed: 0,
        sort_order: i,
      }))
    );
  }

  // record purchase
  await supabase.from('deck_purchases').insert({
    user_id: buyerId,
    public_deck_id: publicDeckId,
    price_paid: price,
    version_at_purchase: pubDeck.version,
  });

  // record purchased_deck_copies
  await supabase.from('purchased_deck_copies').insert({
    user_id: buyerId,
    public_deck_id: publicDeckId,
    deck_id: newDeck.id,
    synced_version: pubDeck.version,
    has_update: false,
  });

  // increment download count via SECURITY DEFINER RPC (buyer may lack UPDATE permission)
  await supabase.rpc('increment_deck_download_count', { p_public_deck_id: publicDeckId });

  return { error: null };
}

export async function fetchMyPurchases(userId: string): Promise<DeckPurchase[]> {
  const { data, error } = await supabase
    .from('deck_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function markPurchaseUsed(userId: string, publicDeckId: string): Promise<void> {
  await supabase.from('deck_purchases').update({ has_used_once: true }).eq('user_id', userId).eq('public_deck_id', publicDeckId);
}

export async function submitDeckRating(userId: string, publicDeckId: string, rating: number): Promise<void> {
  await supabase.from('deck_ratings').insert({ user_id: userId, public_deck_id: publicDeckId, rating });
}

export async function fetchUserRating(userId: string, publicDeckId: string): Promise<DeckRating | null> {
  const { data } = await supabase.from('deck_ratings').select('*').eq('user_id', userId).eq('public_deck_id', publicDeckId).maybeSingle();
  return data;
}

export async function submitCardReport(params: {
  reporterId: string;
  publicDeckId: string;
  cardId: string;
  reason: CardReportReason;
  explanation?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('card_reports').insert({
    reporter_id: params.reporterId,
    public_deck_id: params.publicDeckId,
    card_id: params.cardId,
    reason: params.reason,
    explanation: params.explanation || null,
  });
  if (error) return { error: error.code === '23505' ? 'You already reported this card.' : error.message };

  // Count unresolved suggestions; notify owner + mods on every 5th
  const { count } = await supabase
    .from('card_reports')
    .select('id', { count: 'exact', head: true })
    .eq('public_deck_id', params.publicDeckId)
    .eq('is_resolved', false);
  const unresolvedCount = count ?? 0;
  if (unresolvedCount > 0 && unresolvedCount % 5 === 0) {
    const { data: deckRow } = await supabase.from('public_decks').select('owner_id, title').eq('id', params.publicDeckId).maybeSingle();
    const { data: modRows } = await supabase.from('deck_mods').select('user_id').eq('public_deck_id', params.publicDeckId).not('accepted_at', 'is', null);
    const recipients = Array.from(new Set([
      ...(deckRow?.owner_id ? [deckRow.owner_id] : []),
      ...(modRows?.map((m: { user_id: string }) => m.user_id) ?? []),
    ])).filter(id => id !== params.reporterId);
    if (recipients.length > 0 && deckRow) {
      await supabase.from('notifications').insert(
        recipients.map(uid => ({
          user_id: uid,
          type: 'general' as const,
          title: `${unresolvedCount} unresolved suggestions`,
          body: `"${deckRow.title}" now has ${unresolvedCount} unresolved suggestions. Consider reviewing them.`,
          meta: { public_deck_id: params.publicDeckId, deck_title: deckRow.title },
        }))
      );
    }
  }

  return { error: null };
}

export async function submitDeckReport(params: {
  reporterId: string;
  publicDeckId: string;
  reason: DeckReportReason;
  explanation?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('deck_reports').insert({
    reporter_id: params.reporterId,
    public_deck_id: params.publicDeckId,
    reason: params.reason,
    explanation: params.explanation || null,
  });
  if (error) return { error: error.code === '23505' ? 'You already reported this deck.' : error.message };
  return { error: null };
}

export async function fetchCardReports(publicDeckId: string): Promise<CardReport[]> {
  const { data, error } = await supabase
    .from('card_reports')
    .select('*')
    .eq('public_deck_id', publicDeckId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function resolveCardReport(reportId: string): Promise<void> {
  await supabase.from('card_reports').update({ is_resolved: true }).eq('id', reportId);
}

export async function updatePublicDeckDetails(publicDeckId: string, updates: {
  description?: string;
  subject?: string;
  difficulty?: string;
}): Promise<void> {
  await supabase.from('public_decks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', publicDeckId);
}

export async function incrementEditCount(publicDeckId: string): Promise<void> {
  const { data } = await supabase.from('public_decks').select('edit_count_since_last').eq('id', publicDeckId).maybeSingle();
  if (data) {
    await supabase.from('public_decks').update({ edit_count_since_last: data.edit_count_since_last + 1, updated_at: new Date().toISOString() }).eq('id', publicDeckId);
  }
}

export async function publishNewVersion(publicDeckId: string, ownerId: string): Promise<{ error: string | null; newVersion?: string }> {
  const { data: deck } = await supabase.from('public_decks').select('*').eq('id', publicDeckId).maybeSingle();
  if (!deck) return { error: 'Deck not found.' };
  if (deck.edit_count_since_last < 10) return { error: 'Need at least 10 edits before publishing a new version.' };
  if (deck.unresolved_card_reports > 0) return { error: 'All card reports must be resolved before publishing a new version.' };

  // increment version
  const vMatch = deck.version.match(/^v(\d+)\.(\d+)$/);
  let newVersion = 'v1.0';
  if (vMatch) {
    let major = parseInt(vMatch[1], 10);
    let minor = parseInt(vMatch[2], 10);
    minor += 1;
    if (minor >= 10) { major += 1; minor = 0; }
    newVersion = `v${major}.${minor}`;
  }

  // sync cards from source deck
  if (deck.source_deck_id) {
    const { data: sourceCards } = await supabase.from('flashcards').select('*').eq('deck_id', deck.source_deck_id).order('sort_order', { ascending: true });
    if (sourceCards) {
      await supabase.from('public_deck_cards').delete().eq('public_deck_id', publicDeckId);
      await supabase.from('public_deck_cards').insert(
        sourceCards.map((c, i) => ({
          public_deck_id: publicDeckId,
          front_text: c.front_text,
          back_text: c.back_text,
          notes: c.notes || '',
          sort_order: i,
        }))
      );
    }
  }

  await supabase.from('public_decks').update({
    version: newVersion,
    edit_count_since_last: 0,
    status: 'public',
    updated_at: new Date().toISOString(),
  }).eq('id', publicDeckId);

  // mark all purchased copies as has_update = true
  await supabase.from('purchased_deck_copies').update({ has_update: true }).eq('public_deck_id', publicDeckId);

  // notify all users with a copy of the deck (buyers), mods, and owner
  const { data: purchases } = await supabase.from('deck_purchases').select('user_id').eq('public_deck_id', publicDeckId);
  const { data: mods } = await supabase.from('deck_mods').select('user_id').eq('public_deck_id', publicDeckId).not('accepted_at', 'is', null);
  const notifyUserIds = [...new Set([...((purchases || []).map(p => p.user_id)), ...((mods || []).map(m => m.user_id)), ownerId])];
  if (notifyUserIds.length > 0) {
    await supabase.from('notifications').insert(
      notifyUserIds.map(uid => ({
        user_id: uid,
        type: 'version_update',
        title: `${deck.title} updated to ${newVersion}`,
        body: `${deck.title} has been updated to ${newVersion}. Would you like to sync?`,
        meta: { public_deck_id: publicDeckId, new_version: newVersion, deck_title: deck.title },
      }))
    );
  }

  return { error: null, newVersion };
}

export async function fetchPurchasedCopy(userId: string, publicDeckId: string): Promise<PurchasedDeckCopy | null> {
  const { data } = await supabase.from('purchased_deck_copies').select('*').eq('user_id', userId).eq('public_deck_id', publicDeckId).maybeSingle();
  return data;
}

// Compute diff between the user's current local cards and the new published deck cards.
// Returns added / deleted / edited arrays for the sync preview modal.
export async function fetchSyncDiff(userId: string, publicDeckId: string): Promise<{
  added: { pubCardId: string; front: string; back: string; notes: string }[];
  deleted: { front: string; back: string; notes: string }[];
  edited: { pubCardId: string; oldFront: string; oldBack: string; oldNotes: string; newFront: string; newBack: string; newNotes: string; userFront?: string; userBack?: string; userNotes?: string }[];
  error?: string;
}> {
  const copy = await fetchPurchasedCopy(userId, publicDeckId);
  if (!copy) return { added: [], deleted: [], edited: [], error: 'No deck found. Was it moved, renamed, or deleted?' };

  const [{ data: pubCards }, { data: userCards }] = await Promise.all([
    supabase.from('public_deck_cards').select('*').eq('public_deck_id', publicDeckId).order('sort_order', { ascending: true }),
    supabase.from('flashcards').select('*').eq('deck_id', copy.deck_id).order('sort_order', { ascending: true }),
  ]);

  const pub = pubCards ?? [];
  const user = userCards ?? [];

  // Stable key: we'll use the pub card id stored in flashcard's notes metadata if available,
  // otherwise match by original front+back text against synced_version cards.
  // Simplest accurate approach: match by front_text as a stable identifier within a deck.
  const userByFront = new Map<string, typeof user[0]>();
  user.forEach(c => userByFront.set(c.front_text, c));

  const pubByFront = new Map<string, typeof pub[0]>();
  pub.forEach(c => pubByFront.set(c.front_text, c));

  const userFronts = new Set(user.map(c => c.front_text));
  const pubFronts = new Set(pub.map(c => c.front_text));

  // Added: in new pub, not in user deck
  const added = pub
    .filter(c => !userFronts.has(c.front_text))
    .map(c => ({ pubCardId: c.id, front: c.front_text, back: c.back_text, notes: c.notes ?? '' }));

  // Deleted: in user deck (matching a pub front), but no longer in pub
  // Only flag user cards that were present in the pub (i.e. have a matching pub front from synced version)
  // We use: was in user deck AND is NOT in current pub
  const deleted: { front: string; back: string; notes: string }[] = [];
  user.forEach(uc => {
    if (!pubFronts.has(uc.front_text)) {
      // Only include if this card looks like a synced pub card (not user-custom)
      // Heuristic: user-custom cards typically don't match pub fronts; we show all non-matching
      deleted.push({ front: uc.front_text, back: uc.back_text, notes: uc.notes ?? '' });
    }
  });

  // Edited: in both pub and user by front, but back or notes differ
  const edited: {
    pubCardId: string; oldFront: string; oldBack: string; oldNotes: string;
    newFront: string; newBack: string; newNotes: string;
    userFront?: string; userBack?: string; userNotes?: string;
  }[] = [];
  pub.forEach(pc => {
    const uc = userByFront.get(pc.front_text);
    if (uc && (uc.back_text !== pc.back_text || (uc.notes ?? '') !== (pc.notes ?? ''))) {
      edited.push({
        pubCardId: pc.id,
        oldFront: pc.front_text, oldBack: uc.back_text, oldNotes: uc.notes ?? '',
        newFront: pc.front_text, newBack: pc.back_text, newNotes: pc.notes ?? '',
        userFront: uc.front_text, userBack: uc.back_text, userNotes: uc.notes ?? '',
      });
    }
  });

  return { added, deleted, edited };
}

export async function syncDeckToNewVersion(userId: string, publicDeckId: string, skippedPubCardIds?: Set<string>): Promise<{ error: string | null }> {
  const { data: copy } = await supabase.from('purchased_deck_copies').select('*').eq('user_id', userId).eq('public_deck_id', publicDeckId).maybeSingle();
  if (!copy) return { error: 'No deck found. Was it moved, renamed, or deleted?' };
  const { data: pubDeck } = await supabase.from('public_decks').select('*').eq('id', publicDeckId).maybeSingle();
  if (!pubDeck) return { error: 'Public deck not found.' };

  const { data: newCards } = await supabase.from('public_deck_cards').select('*').eq('public_deck_id', publicDeckId).order('sort_order', { ascending: true });
  const { data: oldCards } = await supabase.from('flashcards').select('*').eq('deck_id', copy.deck_id).order('sort_order', { ascending: true });

  const pubCards = newCards ?? [];
  const userCards = oldCards ?? [];

  // Build map of user cards by front_text for mastery preservation + user-custom detection
  const userByFront = new Map<string, typeof userCards[0]>();
  userCards.forEach(c => userByFront.set(c.front_text, c));

  // Determine which cards to upsert/add from pub
  const cardsToSync = pubCards.filter(pc => !(skippedPubCardIds?.has(pc.id)));

  const syncedFronts = new Set(cardsToSync.map(c => c.front_text));

  // Cards from pub not skipped: use pub content, preserve mastery
  const syncedPubCards = cardsToSync.map((pc, _i) => {
    const existing = userByFront.get(pc.front_text);
    return {
      deck_id: copy.deck_id,
      front_text: pc.front_text,
      back_text: pc.back_text,
      notes: pc.notes ?? '',
      mastery_level: existing?.mastery_level ?? 1,
      times_reviewed: existing?.times_reviewed ?? 0,
      sort_order: pc.sort_order,
    };
  });

  // Delete existing synced cards (not custom, not skipped)
  const frontsToDelete = [...syncedFronts];
  if (frontsToDelete.length > 0) {
    // Delete by front_text match in user deck
    await supabase.from('flashcards')
      .delete()
      .eq('deck_id', copy.deck_id)
      .in('front_text', frontsToDelete);
  }

  // Insert synced pub cards
  if (syncedPubCards.length > 0) {
    await supabase.from('flashcards').insert(syncedPubCards);
  }

  // Recalculate sort_order for all remaining cards
  const { data: remaining } = await supabase.from('flashcards').select('id, sort_order').eq('deck_id', copy.deck_id).order('sort_order', { ascending: true });
  if (remaining && remaining.length > 0) {
    await Promise.all(
      remaining.map((c, i) => supabase.from('flashcards').update({ sort_order: i }).eq('id', c.id))
    );
  }

  // Update synced version + has_update = false
  await supabase.from('purchased_deck_copies').update({ synced_version: pubDeck.version, has_update: false }).eq('user_id', userId).eq('public_deck_id', publicDeckId);
  await supabase.from('deck_purchases').update({ version_at_purchase: pubDeck.version }).eq('user_id', userId).eq('public_deck_id', publicDeckId);

  return { error: null };
}

// ── Mod System ───────────────────────────────────────────────────────────────

export async function inviteMod(publicDeckId: string, invitedUserId: string, deckTitle: string, inviterUsername: string, message?: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('deck_mods').insert({ public_deck_id: publicDeckId, user_id: invitedUserId });
  if (error) return { error: error.code === '23505' ? 'User is already a mod for this deck.' : error.message };
  const bodyText = message?.trim()
    ? `${inviterUsername} invites you to moderate the deck "${deckTitle}".\nMessage: ${message.trim()}`
    : `${inviterUsername} invites you to moderate the deck "${deckTitle}".`;
  await supabase.from('notifications').insert({
    user_id: invitedUserId,
    type: 'mod_invite',
    title: 'Mod Invitation',
    body: bodyText,
    meta: { public_deck_id: publicDeckId, deck_title: deckTitle, inviter_username: inviterUsername, message: message?.trim() || '' },
  });
  return { error: null };
}

export async function respondToModInvite(notificationId: string, publicDeckId: string, userId: string, accept: boolean, declineMessage?: string, deckTitle?: string, inviterUserId?: string, recipientUsername?: string): Promise<void> {
  if (accept) {
    await supabase.from('deck_mods').update({ accepted_at: new Date().toISOString() }).eq('public_deck_id', publicDeckId).eq('user_id', userId);
    await supabase.from('notifications').update({ action_taken: 'accepted', is_read: true }).eq('id', notificationId);
    // Notify the inviter
    if (inviterUserId && deckTitle && recipientUsername) {
      await supabase.from('notifications').insert({
        user_id: inviterUserId,
        type: 'mod_accepted',
        title: 'New Mod',
        body: `${recipientUsername} accepted your invitation to moderate the deck "${deckTitle}".`,
        meta: { public_deck_id: publicDeckId, deck_title: deckTitle, new_mod_username: recipientUsername },
      });
    }
  } else {
    await supabase.from('deck_mods').delete().eq('public_deck_id', publicDeckId).eq('user_id', userId);
    await supabase.from('notifications').update({ action_taken: 'declined', is_read: true, archived_at: new Date().toISOString() }).eq('id', notificationId);
    // Notify the inviter
    if (inviterUserId && deckTitle && recipientUsername) {
      const bodyText = declineMessage?.trim()
        ? `${recipientUsername} declined your invitation to moderate the deck "${deckTitle}". Message: ${declineMessage.trim()}`
        : `${recipientUsername} declined your invitation to moderate the deck "${deckTitle}".`;
      await supabase.from('notifications').insert({
        user_id: inviterUserId,
        type: 'mod_declination',
        title: 'Mod Declination',
        body: bodyText,
        meta: { public_deck_id: publicDeckId, deck_title: deckTitle, declined_by: recipientUsername },
      });
    }
  }
}

export async function removeMod(publicDeckId: string, modUserId: string, deckTitle: string): Promise<void> {
  await supabase.from('deck_mods').delete().eq('public_deck_id', publicDeckId).eq('user_id', modUserId);
  await supabase.from('notifications').insert({
    user_id: modUserId,
    type: 'mod_removed',
    title: 'Mod Removal',
    body: `You are no longer a moderator for "${deckTitle}".`,
    meta: { public_deck_id: publicDeckId, deck_title: deckTitle },
  });
}

export async function fetchDeckMods(publicDeckId: string): Promise<DeckMod[]> {
  const { data, error } = await supabase.from('deck_mods').select('*').eq('public_deck_id', publicDeckId).not('accepted_at', 'is', null);
  if (error) return [];
  const mods = data || [];
  const userIds = mods.map(m => m.user_id);
  if (userIds.length === 0) return [];
  const { data: profiles } = await supabase.from('profiles').select('id, username, profile_gradient, profile_character, profile_char_color').in('id', userIds);
  const profileMap: Record<string, { username: string; profile_gradient: string; profile_character: string; profile_char_color: string }> = {};
  (profiles || []).forEach(p => { profileMap[p.id] = { username: p.username, profile_gradient: p.profile_gradient, profile_character: p.profile_character, profile_char_color: p.profile_char_color }; });
  return mods.map(m => ({ ...m, ...profileMap[m.user_id] }));
}

export async function isUserModOfDeck(userId: string, publicDeckId: string): Promise<boolean> {
  const { data } = await supabase.from('deck_mods').select('id').eq('public_deck_id', publicDeckId).eq('user_id', userId).not('accepted_at', 'is', null).maybeSingle();
  return !!data;
}

// ── Notifications (Flail) ────────────────────────────────────────────────────

export async function fetchNotifications(userId: string, limit = 20): Promise<FlushNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function fetchRecentNotifications(userId: string): Promise<FlushNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) return [];
  return data || [];
}

export async function archiveNotification(notificationId: string): Promise<void> {
  await supabase.from('notifications').update({ archived_at: new Date().toISOString() }).eq('id', notificationId);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .is('archived_at', null);
  return count || 0;
}

export async function sendWelcomeNotification(userId: string, username: string): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'welcome',
    title: `Aloha, ${username}!`,
    body: `Hey ${username}! Welcome to Flush — the flashcard app to learn like no other. Yes, that's Flush's genuine vision. Earn gems by studying, taking tests, and playing Arcade games. Join Clubs for exclusive rewards. Don't forget to check out the leaderboards and explore our World to discover and share decks! Complete goals and watch for updates (as of June 2026, the dev is quite sure they will go all out for as long as they will). P.S. There might be some Easter eggs hidden around... Happy Flushing!`,
    meta: { links: { dashboard: '/dashboard', world: '/athenaeum', clubs: '/clubs', study: '/decks' } },
  });
}

// ── Leaderboards ─────────────────────────────────────────────────────────────

function getWeekStartDate(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export async function fetchLeaderboard(clubName: 'ace' | 'robin'): Promise<LeaderboardEntry[]> {
  const weekStart = getWeekStartDate();
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('club_name', clubName)
    .eq('week_start', weekStart)
    .order('score', { ascending: false })
    .limit(200);
  if (error) return [];
  const entries = data || [];
  const userIds = entries.map(e => e.user_id);
  if (userIds.length === 0) return [];
  const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
  const profileMap: Record<string, string> = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p.username; });
  return entries.map(e => ({ ...e, username: profileMap[e.user_id] || 'Unknown' }));
}

export async function upsertLeaderboardScore(userId: string, clubName: 'ace' | 'robin', score: number): Promise<void> {
  const weekStart = getWeekStartDate();
  const { data: existing } = await supabase
    .from('leaderboard_entries')
    .select('id, score')
    .eq('user_id', userId)
    .eq('club_name', clubName)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (existing) {
    if (score > existing.score) {
      await supabase.from('leaderboard_entries').update({ score, updated_at: new Date().toISOString() }).eq('id', existing.id);
    }
  } else {
    await supabase.from('leaderboard_entries').insert({ user_id: userId, club_name: clubName, week_start: weekStart, score });
  }
}

export async function incrementLeaderboardScore(userId: string, clubName: 'ace' | 'robin', increment = 1): Promise<void> {
  const weekStart = getWeekStartDate();
  const { data: existing } = await supabase
    .from('leaderboard_entries')
    .select('id, score')
    .eq('user_id', userId)
    .eq('club_name', clubName)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (existing) {
    await supabase.from('leaderboard_entries').update({ score: existing.score + increment, updated_at: new Date().toISOString() }).eq('id', existing.id);
  } else {
    await supabase.from('leaderboard_entries').insert({ user_id: userId, club_name: clubName, week_start: weekStart, score: increment });
  }
}

export async function fetchLeaderboardRewards(userId: string): Promise<LeaderboardReward[]> {
  const { data, error } = await supabase
    .from('leaderboard_rewards')
    .select('*')
    .eq('user_id', userId)
    .gt('geodes_remaining', 0)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function breakLeaderboardGeode(rewardId: string, userId: string): Promise<number> {
  const { data: reward } = await supabase.from('leaderboard_rewards').select('*').eq('id', rewardId).maybeSingle();
  if (!reward || reward.geodes_remaining <= 0) return 0;
  const gems = Math.floor(Math.random() * (reward.gem_max - reward.gem_min + 1)) + reward.gem_min;
  await addGems(userId, gems);
  const remaining = reward.geodes_remaining - 1;
  await supabase.from('leaderboard_rewards').update({ geodes_remaining: remaining }).eq('id', rewardId);
  return gems;
}

export async function recordAceWeeklyScore(userId: string, deckId: string): Promise<boolean> {
  const weekStart = getWeekStartDate();
  const { error } = await supabase.from('ace_weekly_scores').insert({ user_id: userId, deck_id: deckId, week_start: weekStart });
  if (error) return false; // duplicate = already recorded
  // count unique decks this week
  const { count } = await supabase.from('ace_weekly_scores').select('deck_id', { count: 'exact', head: true }).eq('user_id', userId).eq('week_start', weekStart);
  await upsertLeaderboardScore(userId, 'ace', count || 1);
  return true;
}

export async function recordRobinWeeklyAction(userId: string, actionType: string): Promise<void> {
  const weekStart = getWeekStartDate();
  await supabase.from('robin_weekly_actions').insert({ user_id: userId, action_type: actionType, week_start: weekStart });
  const { count } = await supabase.from('robin_weekly_actions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('week_start', weekStart);
  await upsertLeaderboardScore(userId, 'robin', count || 1);
}

// ── Deck Sharing (Private User-to-User) ─────────────────────────────────────

export async function shareDeckToUser(
  senderId: string,
  senderUsername: string,
  deckId: string,
  deckTitle: string,
  recipientUsername: string,
  message?: string
): Promise<{ error: string | null }> {
  // Exact case-sensitive match
  const { data: receiver } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', recipientUsername.trim())
    .maybeSingle();

  if (!receiver) {
    // Try case-insensitive to detect casing error
    const { data: caseMatch } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', recipientUsername.trim())
      .maybeSingle();
    return { error: caseMatch ? 'Casing is off' : 'User not found' };
  }
  if (receiver.id === senderId) return { error: 'You cannot share a deck with yourself.' };

  // Insert share record
  const { data: share, error: shareErr } = await supabase
    .from('deck_shares')
    .insert({
      sender_id: senderId,
      receiver_id: receiver.id,
      deck_id: deckId,
      deck_title: deckTitle,
      sender_username: senderUsername,
      message: message?.trim() || null,
    })
    .select('id')
    .single();
  if (shareErr) return { error: shareErr.message };

  // Build notification body per spec
  const bodyBase = `${senderUsername} wants to share the deck "${deckTitle}" with you.`;
  const bodyMsg = message?.trim() ? ` Here's their message: ${message.trim()}` : '';

  // Notify receiver
  const { error: notifErr } = await supabase.from('notifications').insert({
    user_id: receiver.id,
    type: 'deck_share',
    title: `Share request from ${senderUsername}`,
    body: bodyBase + bodyMsg,
    meta: {
      deck_share_id: share.id,
      deck_id: deckId,
      deck_title: deckTitle,
      sender_username: senderUsername,
      sender_id: senderId,
      message: message?.trim() || null,
    },
  });
  if (notifErr) console.error('Share notification insert error:', notifErr);

  return { error: null };
}

export async function previewSharedDeckCards(deckId: string): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function acceptSharedDeck(
  shareId: string,
  receiverId: string,
  receiverUsername: string,
  existingDecks: { title: string }[],
  deckTitle: string,
  resolution: 'replace' | 'keep_both'
): Promise<{ error: string | null }> {
  const { data: share } = await supabase
    .from('deck_shares')
    .select('*')
    .eq('id', shareId)
    .maybeSingle();
  if (!share) return { error: 'Share not found.' };

  const titleConflict = existingDecks.some(d => d.title.toLowerCase() === deckTitle.toLowerCase());
  if (titleConflict && resolution === 'replace') {
    const { data: existing } = await supabase
      .from('decks').select('id').eq('user_id', receiverId).ilike('title', deckTitle).maybeSingle();
    if (existing) {
      await supabase.from('flashcards').delete().eq('deck_id', existing.id);
      await supabase.from('decks').delete().eq('id', existing.id);
    }
  }

  const finalTitle = resolution === 'keep_both' && titleConflict ? `${deckTitle} (copy)` : deckTitle;

  const { data: sourceCards } = await supabase
    .from('flashcards').select('*').eq('deck_id', share.deck_id).order('sort_order', { ascending: true });

  const { data: sourceDeck } = await supabase
    .from('decks').select('subject, difficulty').eq('id', share.deck_id).maybeSingle();

  const { data: newDeck, error: deckErr } = await supabase
    .from('decks')
    .insert({ user_id: receiverId, title: finalTitle, subject: sourceDeck?.subject ?? 'Other', difficulty: sourceDeck?.difficulty ?? 'Beginner' })
    .select('id').single();
  if (deckErr) return { error: deckErr.message };

  if (sourceCards && sourceCards.length > 0) {
    const rows = sourceCards.map((card: Flashcard, i: number) => ({
      deck_id: newDeck.id,
      front_text: card.front_text,
      back_text: card.back_text,
      notes: card.notes ?? '',
      sort_order: i,
    }));
    await supabase.from('flashcards').insert(rows);
  }

  await supabase.from('deck_shares').update({ status: 'accepted' }).eq('id', shareId);
  await supabase.from('notifications').update({ is_read: true, action_taken: 'accepted' })
    .eq('user_id', receiverId).eq('type', 'deck_share').contains('meta', { deck_share_id: shareId });

  // Notify sender per spec: "[recipient] got a copy of [deck title]!"
  await supabase.from('notifications').insert({
    user_id: share.sender_id,
    type: 'deck_share_accepted',
    title: `${receiverUsername} got a copy of "${deckTitle}"!`,
    body: `${receiverUsername} accepted your deck share.`,
    meta: { deck_share_id: shareId, deck_title: deckTitle, receiver_username: receiverUsername },
  });

  return { error: null };
}

export async function declineSharedDeck(
  shareId: string,
  receiverId: string,
  receiverUsername: string,
  deckTitle: string
): Promise<void> {
  const { data: share } = await supabase
    .from('deck_shares').select('sender_id').eq('id', shareId).maybeSingle();

  await supabase.from('deck_shares').update({ status: 'declined' }).eq('id', shareId);
  await supabase.from('notifications').update({ is_read: true, action_taken: 'declined' })
    .eq('user_id', receiverId).eq('type', 'deck_share').contains('meta', { deck_share_id: shareId });

  if (share) {
    // Notify sender per spec: "[recipient] declined [deck title]."
    await supabase.from('notifications').insert({
      user_id: share.sender_id,
      type: 'deck_share_declined',
      title: `${receiverUsername} declined "${deckTitle}"`,
      body: `${receiverUsername} declined your deck share.`,
      meta: { deck_share_id: shareId, deck_title: deckTitle, receiver_username: receiverUsername },
    });
  }
}

export async function reportSharedDeck(
  shareId: string,
  reporterId: string,
  reporterUsername: string,
  deckTitle: string,
  senderUsername: string,
  reason?: string
): Promise<void> {
  await supabase.from('deck_shares').update({ status: 'reported' }).eq('id', shareId);
  await supabase.from('notifications').update({ is_read: true, action_taken: 'reported' })
    .eq('user_id', reporterId).eq('type', 'deck_share').contains('meta', { deck_share_id: shareId });

  await supabase.from('notifications').insert({
    user_id: reporterId,
    type: 'deck_share_reported',
    title: `[REPORT] Deck share from ${senderUsername}`,
    body: `${reporterUsername} reported a shared deck "${deckTitle}" from ${senderUsername}. Reason: ${reason ?? 'Not specified'}.`,
    meta: { deck_share_id: shareId, deck_title: deckTitle, sender_username: senderUsername, reporter_username: reporterUsername, reason: reason ?? null, report: true },
  });
}

// ── Tier reward helpers ────────────────────────────────────────────────────────

export const EXP_TIER_THRESHOLDS: { name: string; threshold: number }[] = [
  { name: 'Pin',        threshold: 0 },
  { name: 'Clip',       threshold: 500 },
  { name: 'Eraser',     threshold: 1_500 },
  { name: 'Sharpener',  threshold: 4_000 },
  { name: 'Scissors',   threshold: 10_000 },
  { name: 'Ruler',      threshold: 25_000 },
  { name: 'Protractor', threshold: 60_000 },
  { name: 'Compass',    threshold: 150_000 },
  { name: 'Highlighter',threshold: 400_000 },
  { name: 'Notebook',   threshold: 1_000_000 },
  { name: 'Stapler',    threshold: 2_500_000 },
  { name: 'Calculator', threshold: 5_000_000 },
  { name: 'Laminator',  threshold: 13_000_000 },
];

/** Returns all tier names the user has unlocked (EXP >= threshold). */
export function getUnlockedTiers(totalExp: number): string[] {
  return EXP_TIER_THRESHOLDS.filter(t => totalExp >= t.threshold).map(t => t.name);
}

/** Returns true if the user has unlocked the given tier. */
export function hasTier(totalExp: number, tierName: string): boolean {
  const tier = EXP_TIER_THRESHOLDS.find(t => t.name === tierName);
  return tier ? totalExp >= tier.threshold : false;
}

/** Claim a geode reward — rolls random gems, credits them, marks tier claimed.
 *  Returns the gem amount rolled, or 0 if already claimed / insufficient exp. */
export async function claimGeodeReward(
  userId: string,
  tierName: string,
  profile: { total_exp: number; tier_rewards_claimed: string[]; gems: number },
  geodeCount: number,
  minGems: number,
  maxGems: number,
): Promise<number> {
  if (!hasTier(profile.total_exp, tierName)) return 0;
  if (profile.tier_rewards_claimed.includes(tierName)) return 0;

  let totalGems = 0;
  for (let i = 0; i < geodeCount; i++) {
    totalGems += Math.floor(Math.random() * (maxGems - minGems + 1)) + minGems;
  }
  await addGems(userId, totalGems);
  await updateProfile(userId, {
    tier_rewards_claimed: [...profile.tier_rewards_claimed, tierName],
  });
  return totalGems;
}

// ── Orphan-history cleanup ─────────────────────────────────────────────────────
// Deletes study/test/game history rows whose deck_id no longer exists in user's decks.

export async function deleteOrphanStudySessions(userId: string, knownDeckIds: string[]): Promise<void> {
  if (knownDeckIds.length === 0) return;
  await supabase
    .from('study_sessions')
    .delete()
    .eq('user_id', userId)
    .not('deck_id', 'in', `(${knownDeckIds.map(id => `"${id}"`).join(',')})`);
}

export async function deleteOrphanTestResults(userId: string, knownDeckIds: string[]): Promise<void> {
  if (knownDeckIds.length === 0) return;
  await supabase
    .from('test_results')
    .delete()
    .eq('user_id', userId)
    .not('deck_id', 'in', `(${knownDeckIds.map(id => `"${id}"`).join(',')})`);
}

export async function deleteOrphanGameSessions(userId: string, knownDeckIds: string[]): Promise<void> {
  if (knownDeckIds.length === 0) return;
  await supabase
    .from('game_sessions')
    .delete()
    .eq('user_id', userId)
    .not('deck_id', 'in', `(${knownDeckIds.map(id => `"${id}"`).join(',')})`);
}
