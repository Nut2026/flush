
-- Club memberships: tracks each user's membership and progress in each club
CREATE TABLE club_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_name text NOT NULL CHECK (club_name IN ('fire', 'ace', 'robin')),
  is_unlocked boolean NOT NULL DEFAULT false,
  is_member boolean NOT NULL DEFAULT false,
  current_level integer NOT NULL DEFAULT 0,
  current_progress integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, club_name)
);

-- Pending rewards: geodes waiting to be broken
CREATE TABLE pending_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_name text NOT NULL CHECK (club_name IN ('fire', 'ace', 'robin')),
  level_reached integer NOT NULL,
  geodes_total integer NOT NULL,
  geodes_remaining integer NOT NULL,
  gem_min integer NOT NULL,
  gem_max integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Track unique decks with 100% test score per user (for Ace Club)
CREATE TABLE ace_club_perfect_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, deck_id)
);

-- Track early morning actions (before 6 AM local time) for Robin Club
CREATE TABLE robin_early_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('study', 'test', 'game')),
  local_hour integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_club_perfect_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE robin_early_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_memberships_own" ON club_memberships FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pending_rewards_own" ON pending_rewards FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ace_perfect_decks_own" ON ace_club_perfect_decks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "robin_early_actions_own" ON robin_early_actions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
