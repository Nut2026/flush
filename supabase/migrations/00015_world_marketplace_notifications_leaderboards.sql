
-- ============================================================
-- World / Public Deck Marketplace
-- ============================================================
CREATE TYPE public.deck_status AS ENUM ('public', 'archived', 'banned');

CREATE TABLE public.public_decks (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_deck_id         uuid REFERENCES decks(id) ON DELETE SET NULL,
  title                  text NOT NULL,
  description            text NOT NULL CHECK (char_length(description) <= 200),
  subject                text NOT NULL,
  difficulty             text NOT NULL,
  price                  integer NOT NULL CHECK (price >= 4 AND price <= 500),
  version                text NOT NULL DEFAULT 'v1.0',
  edit_count_since_last  integer NOT NULL DEFAULT 0,
  status                 public.deck_status NOT NULL DEFAULT 'public',
  download_count         integer NOT NULL DEFAULT 0,
  avg_rating             numeric(3,1) NOT NULL DEFAULT 0,
  unresolved_card_reports integer NOT NULL DEFAULT 0,
  deck_report_count      integer NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (title)
);

CREATE TABLE public.public_deck_cards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_deck_id uuid NOT NULL REFERENCES public_decks(id) ON DELETE CASCADE,
  front_text   text NOT NULL,
  back_text    text NOT NULL,
  notes        text NOT NULL DEFAULT '',
  sort_order   integer NOT NULL DEFAULT 0
);

-- Track which users have purchased which public decks
CREATE TABLE public.deck_purchases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  public_deck_id  uuid NOT NULL REFERENCES public_decks(id) ON DELETE CASCADE,
  purchased_at    timestamptz NOT NULL DEFAULT now(),
  price_paid      integer NOT NULL,
  has_used_once   boolean NOT NULL DEFAULT false,
  version_at_purchase text NOT NULL DEFAULT 'v1.0',
  UNIQUE (user_id, public_deck_id)
);

-- Local copy of purchased deck (snapshot)
CREATE TABLE public.purchased_deck_copies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  public_deck_id  uuid NOT NULL REFERENCES public_decks(id) ON DELETE CASCADE,
  deck_id         uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  synced_version  text NOT NULL DEFAULT 'v1.0',
  has_update      boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, public_deck_id)
);

-- ============================================================
-- Deck Ratings
-- ============================================================
CREATE TABLE public.deck_ratings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  public_deck_id  uuid NOT NULL REFERENCES public_decks(id) ON DELETE CASCADE,
  rating          integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, public_deck_id)
);

-- ============================================================
-- Card-Level Reports
-- ============================================================
CREATE TYPE public.card_report_reason AS ENUM (
  'Mismatched Q&A',
  'Misleading Title, Description or Subject',
  'Vague or Ambiguous',
  'Incorrect Information',
  'Typo or Formatting',
  'Duplicate Card',
  'Back Too Long for Test',
  'Spoiler or Hint in Front',
  'Other'
);

CREATE TABLE public.card_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  public_deck_id  uuid NOT NULL REFERENCES public_decks(id) ON DELETE CASCADE,
  card_id         uuid NOT NULL REFERENCES public_deck_cards(id) ON DELETE CASCADE,
  reason          public.card_report_reason NOT NULL,
  explanation     text,
  is_resolved     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, card_id)
);

-- ============================================================
-- Deck-Level Reports
-- ============================================================
CREATE TYPE public.deck_report_reason AS ENUM (
  'Spam or Promotional',
  'Duplicate Deck',
  'Offensive Content',
  'Copyright Violation',
  'Low Effort or Low Quality Content',
  'Other'
);

CREATE TABLE public.deck_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  public_deck_id  uuid NOT NULL REFERENCES public_decks(id) ON DELETE CASCADE,
  reason          public.deck_report_reason NOT NULL,
  explanation     text,
  is_resolved     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, public_deck_id)
);

-- ============================================================
-- Mod System
-- ============================================================
CREATE TABLE public.deck_mods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_deck_id  uuid NOT NULL REFERENCES public_decks(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_at      timestamptz NOT NULL DEFAULT now(),
  accepted_at     timestamptz,
  UNIQUE (public_deck_id, user_id)
);

-- ============================================================
-- In-App Notifications (Flail)
-- ============================================================
CREATE TYPE public.notification_type AS ENUM (
  'mod_invite',
  'admin_message',
  'version_update',
  'leaderboard_reward',
  'welcome',
  'mod_removed',
  'deck_archived',
  'deck_banned',
  'appeal_result'
);

CREATE TABLE public.notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            public.notification_type NOT NULL,
  title           text NOT NULL,
  body            text NOT NULL,
  is_read         boolean NOT NULL DEFAULT false,
  action_taken    text,
  meta            jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  archived_at     timestamptz
);

CREATE INDEX notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- Weekly Leaderboards
-- ============================================================
CREATE TABLE public.leaderboard_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_name       text NOT NULL CHECK (club_name IN ('ace', 'robin')),
  week_start      date NOT NULL,
  score           integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, club_name, week_start)
);

CREATE INDEX leaderboard_week ON leaderboard_entries(club_name, week_start, score DESC);

-- Leaderboard rewards (top 3 weekly)
CREATE TABLE public.leaderboard_rewards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_name       text NOT NULL,
  week_start      date NOT NULL,
  rank            integer NOT NULL CHECK (rank IN (1, 2, 3)),
  geodes_total    integer NOT NULL,
  geodes_remaining integer NOT NULL,
  gem_min         integer NOT NULL,
  gem_max         integer NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, club_name, week_start)
);

-- ============================================================
-- Ace Club weekly tracking (unique decks with 100% score this week)
-- ============================================================
CREATE TABLE public.ace_weekly_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_id         uuid,
  week_start      date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, deck_id, week_start)
);

-- ============================================================
-- Robin Club weekly tracking (early-morning actions this week)
-- ============================================================
CREATE TABLE public.robin_weekly_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type     text NOT NULL,
  week_start      date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

-- public_decks: anyone can read public decks
ALTER TABLE public.public_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public decks" ON public.public_decks
  FOR SELECT USING (status = 'public');
CREATE POLICY "Owner can manage their deck" ON public.public_decks
  FOR ALL TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Admins full access to public_decks" ON public.public_decks
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- public_deck_cards
ALTER TABLE public.public_deck_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view cards of public decks" ON public.public_deck_cards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public_decks pd WHERE pd.id = public_deck_id AND pd.status = 'public')
  );
CREATE POLICY "Owner can manage cards" ON public.public_deck_cards
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public_decks pd WHERE pd.id = public_deck_id AND pd.owner_id = auth.uid())
  );
CREATE POLICY "Mods can manage cards" ON public.public_deck_cards
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM deck_mods dm WHERE dm.public_deck_id = public_deck_id AND dm.user_id = auth.uid() AND dm.accepted_at IS NOT NULL)
  );

-- deck_purchases
ALTER TABLE public.deck_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own purchases" ON public.deck_purchases
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own purchases" ON public.deck_purchases
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own purchases" ON public.deck_purchases
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- purchased_deck_copies
ALTER TABLE public.purchased_deck_copies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own copies" ON public.purchased_deck_copies
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own copies" ON public.purchased_deck_copies
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- deck_ratings
ALTER TABLE public.deck_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ratings" ON public.deck_ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert rating" ON public.deck_ratings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- card_reports
ALTER TABLE public.card_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporter can view own reports" ON public.card_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Owner/mods can view card reports for their deck" ON public.card_reports
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public_decks pd WHERE pd.id = public_deck_id AND pd.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM deck_mods dm WHERE dm.public_deck_id = public_deck_id AND dm.user_id = auth.uid() AND dm.accepted_at IS NOT NULL)
  );
CREATE POLICY "Authenticated users can insert card report" ON public.card_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Owner/mods can update card reports (resolve)" ON public.card_reports
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public_decks pd WHERE pd.id = public_deck_id AND pd.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM deck_mods dm WHERE dm.public_deck_id = public_deck_id AND dm.user_id = auth.uid() AND dm.accepted_at IS NOT NULL)
  );

-- deck_reports
ALTER TABLE public.deck_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporter can view own deck reports" ON public.deck_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Admins see all deck reports" ON public.deck_reports
  FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Authenticated users can insert deck report" ON public.deck_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

-- deck_mods
ALTER TABLE public.deck_mods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can manage mods" ON public.deck_mods
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public_decks pd WHERE pd.id = public_deck_id AND pd.owner_id = auth.uid())
  );
CREATE POLICY "Invited user can see and respond to their invite" ON public.deck_mods
  FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anyone can view accepted mods" ON public.deck_mods
  FOR SELECT USING (accepted_at IS NOT NULL);

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Service can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- leaderboard_entries
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard_entries FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upsert own entry" ON public.leaderboard_entries
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- leaderboard_rewards
ALTER TABLE public.leaderboard_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own leaderboard rewards" ON public.leaderboard_rewards
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Service can insert rewards" ON public.leaderboard_rewards
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own rewards" ON public.leaderboard_rewards
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ace_weekly_scores
ALTER TABLE public.ace_weekly_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ace weekly scores" ON public.ace_weekly_scores FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert own ace score" ON public.ace_weekly_scores
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- robin_weekly_actions
ALTER TABLE public.robin_weekly_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view robin weekly actions" ON public.robin_weekly_actions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert own robin action" ON public.robin_weekly_actions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Helper function to recalculate avg_rating
-- ============================================================
CREATE OR REPLACE FUNCTION update_deck_avg_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public_decks
  SET avg_rating = COALESCE((
    SELECT ROUND(AVG(rating)::numeric, 1) FROM deck_ratings WHERE public_deck_id = NEW.public_deck_id
  ), 0)
  WHERE id = NEW.public_deck_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_avg_rating
AFTER INSERT ON public.deck_ratings
FOR EACH ROW EXECUTE FUNCTION update_deck_avg_rating();

-- ============================================================
-- Helper function to recalculate unresolved_card_reports count
-- ============================================================
CREATE OR REPLACE FUNCTION update_unresolved_card_reports()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public_decks
  SET unresolved_card_reports = (
    SELECT COUNT(*) FROM card_reports
    WHERE public_deck_id = COALESCE(NEW.public_deck_id, OLD.public_deck_id)
    AND is_resolved = false
  )
  WHERE id = COALESCE(NEW.public_deck_id, OLD.public_deck_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_card_report_count
AFTER INSERT OR UPDATE ON public.card_reports
FOR EACH ROW EXECUTE FUNCTION update_unresolved_card_reports();

-- ============================================================
-- Helper function to recalculate deck_report_count
-- ============================================================
CREATE OR REPLACE FUNCTION update_deck_report_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public_decks
  SET deck_report_count = (
    SELECT COUNT(*) FROM deck_reports
    WHERE public_deck_id = NEW.public_deck_id
    AND is_resolved = false
  )
  WHERE id = NEW.public_deck_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_deck_report_count
AFTER INSERT ON public.deck_reports
FOR EACH ROW EXECUTE FUNCTION update_deck_report_count();

-- enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public_decks;
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_entries;
