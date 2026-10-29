
-- Enums
CREATE TYPE public.user_role AS ENUM ('user', 'admin');
CREATE TYPE public.subject_enum AS ENUM ('Math', 'Science', 'English', 'Languages', 'Other');
CREATE TYPE public.difficulty_enum AS ENUM ('Beginner', 'Intermediate', 'Advanced');
CREATE TYPE public.game_name_enum AS ENUM ('whackacard', 'skyscraper', 'matching');
CREATE TYPE public.language_enum AS ENUM ('en', 'zh');

-- Profiles table (synced from auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT NOT NULL DEFAULT 'Learner123',
  profile_gradient TEXT NOT NULL DEFAULT 'default',
  profile_character TEXT NOT NULL DEFAULT 'L' CHECK (profile_character ~ '^[A-Z0-9]$'),
  gems INTEGER NOT NULL DEFAULT 0 CHECK (gems >= 0),
  streak_days INTEGER NOT NULL DEFAULT 0,
  streak_freeze_active BOOLEAN NOT NULL DEFAULT FALSE,
  streak_wager_active BOOLEAN NOT NULL DEFAULT FALSE,
  streak_wager_start_date DATE,
  last_study_date DATE,
  join_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  selected_theme TEXT NOT NULL DEFAULT 'default',
  displayed_badges TEXT[] NOT NULL DEFAULT '{}' CHECK (array_length(displayed_badges, 1) IS NULL OR array_length(displayed_badges, 1) <= 3),
  dark_mode BOOLEAN NOT NULL DEFAULT TRUE,
  language language_enum NOT NULL DEFAULT 'en',
  role user_role NOT NULL DEFAULT 'user',
  -- Lifetime stats
  total_gems_earned INTEGER NOT NULL DEFAULT 0,
  total_cards_studied INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_tests_taken INTEGER NOT NULL DEFAULT 0,
  total_games_played INTEGER NOT NULL DEFAULT 0,
  total_gems_spent INTEGER NOT NULL DEFAULT 0,
  total_gems_from_card_bonus INTEGER NOT NULL DEFAULT 0,
  -- Daily tracking (for gems per day, cards per day)
  daily_cards_studied INTEGER NOT NULL DEFAULT 0,
  daily_cards_studied_date DATE,
  daily_gems_earned INTEGER NOT NULL DEFAULT 0,
  daily_gems_earned_date DATE,
  -- Last studied deck
  last_studied_deck_id UUID,
  -- Milestone tracking (which streak milestones have been awarded)
  streak_milestones_awarded TEXT[] NOT NULL DEFAULT '{}',
  -- Personal records
  most_gems_in_day INTEGER NOT NULL DEFAULT 0,
  most_gems_in_day_date DATE,
  most_cards_in_week INTEGER NOT NULL DEFAULT 0,
  most_cards_in_week_start DATE,
  best_test_score_percent INTEGER,
  best_test_score_deck_id UUID,
  best_test_score_date DATE,
  best_streak_date DATE,
  -- Perfect week tracking
  perfect_week_count INTEGER NOT NULL DEFAULT 0,
  perfect_week_tracking_date DATE,
  -- Weekly cards tracking
  weekly_cards_studied INTEGER NOT NULL DEFAULT 0,
  weekly_cards_start_date DATE
);

-- Decks
CREATE TABLE public.decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 50),
  subject subject_enum NOT NULL,
  difficulty difficulty_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Flashcards
CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  front_text TEXT NOT NULL CHECK (char_length(front_text) <= 500),
  back_text TEXT NOT NULL CHECK (char_length(back_text) <= 500),
  mastery_level INTEGER NOT NULL DEFAULT 1 CHECK (mastery_level BETWEEN 1 AND 6),
  times_reviewed INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Badges
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_name)
);

-- Owned items (themes)
CREATE TABLE public.owned_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'theme',
  item_name TEXT NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_type, item_name)
);

-- Game high scores
CREATE TABLE public.game_high_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_name game_name_enum NOT NULL,
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  high_score INTEGER NOT NULL DEFAULT 0,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, game_name, deck_id)
);

-- Daily goals
CREATE TABLE public.daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  goal1 TEXT NOT NULL,
  goal1_gem_reward INTEGER NOT NULL DEFAULT 5,
  goal2 TEXT NOT NULL,
  goal2_gem_reward INTEGER NOT NULL DEFAULT 5,
  goal3 TEXT NOT NULL,
  goal3_gem_reward INTEGER NOT NULL DEFAULT 5,
  goal1_complete BOOLEAN NOT NULL DEFAULT FALSE,
  goal2_complete BOOLEAN NOT NULL DEFAULT FALSE,
  goal3_complete BOOLEAN NOT NULL DEFAULT FALSE,
  all_complete_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, date)
);

-- Test results
CREATE TABLE public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES public.decks(id) ON DELETE SET NULL,
  score_percent INTEGER NOT NULL CHECK (score_percent BETWEEN 0 AND 100),
  questions_correct INTEGER NOT NULL,
  questions_total INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI usage tracking
CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  flashcard_generations INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);

-- Game tokens tracking (daily free tokens)
CREATE TABLE public.game_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);

-- Starter deck template (shared, not per user)
CREATE TABLE public.starter_deck_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject subject_enum NOT NULL,
  difficulty difficulty_enum NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.starter_card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_template_id UUID NOT NULL REFERENCES public.starter_deck_templates(id) ON DELETE CASCADE,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Auto-update updated_at on decks
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER decks_updated_at
  BEFORE UPDATE ON public.decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auth trigger: sync new users to profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user'::public.user_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper: get user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owned_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_high_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starter_deck_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starter_card_templates ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));
CREATE POLICY "Admins full access profiles" ON public.profiles FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Decks policies
CREATE POLICY "Users manage own decks" ON public.decks FOR ALL TO authenticated USING (auth.uid() = user_id);
-- Flashcards via deck ownership
CREATE POLICY "Users manage own flashcards" ON public.flashcards FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.decks WHERE decks.id = flashcards.deck_id AND decks.user_id = auth.uid())
);
-- Badges
CREATE POLICY "Users view own badges" ON public.badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own badges" ON public.badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Owned items
CREATE POLICY "Users manage own items" ON public.owned_items FOR ALL TO authenticated USING (auth.uid() = user_id);
-- Game high scores
CREATE POLICY "Users manage own scores" ON public.game_high_scores FOR ALL TO authenticated USING (auth.uid() = user_id);
-- Daily goals
CREATE POLICY "Users manage own goals" ON public.daily_goals FOR ALL TO authenticated USING (auth.uid() = user_id);
-- Test results
CREATE POLICY "Users manage own tests" ON public.test_results FOR ALL TO authenticated USING (auth.uid() = user_id);
-- AI usage
CREATE POLICY "Users manage own ai usage" ON public.ai_usage FOR ALL TO authenticated USING (auth.uid() = user_id);
-- Game tokens
CREATE POLICY "Users manage own tokens" ON public.game_tokens FOR ALL TO authenticated USING (auth.uid() = user_id);
-- Starter templates (public read)
CREATE POLICY "Anyone can read starter templates" ON public.starter_deck_templates FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Anyone can read starter cards" ON public.starter_card_templates FOR SELECT TO anon, authenticated USING (TRUE);
