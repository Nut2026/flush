
-- 1. Add total_exp and trophies to profiles
ALTER TABLE profiles
  ADD COLUMN total_exp bigint NOT NULL DEFAULT 0,
  ADD COLUMN trophies integer NOT NULL DEFAULT 0,
  ADD COLUMN streak_break_date date DEFAULT NULL;

-- 2. user_skills table
CREATE TABLE user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  equipped_slot integer DEFAULT NULL CHECK (equipped_slot IS NULL OR (equipped_slot >= 1 AND equipped_slot <= 4)),
  purchased_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);

ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_skills" ON user_skills
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. user_charms table
CREATE TABLE user_charms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  charm_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  is_equipped boolean NOT NULL DEFAULT false,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, charm_name)
);

CREATE INDEX idx_user_charms_user_id ON user_charms(user_id);

ALTER TABLE user_charms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_charms" ON user_charms
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Arena matches table
CREATE TABLE arena_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player1_deck_id uuid REFERENCES decks(id) ON DELETE SET NULL,
  player2_deck_id uuid REFERENCES decks(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','abandoned')),
  winner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  player1_hp integer NOT NULL DEFAULT 100,
  player2_hp integer NOT NULL DEFAULT 100,
  player1_correct integer NOT NULL DEFAULT 0,
  player2_correct integer NOT NULL DEFAULT 0,
  player1_wrong integer NOT NULL DEFAULT 0,
  player2_wrong integer NOT NULL DEFAULT 0,
  player1_trophies_change integer NOT NULL DEFAULT 0,
  player2_trophies_change integer NOT NULL DEFAULT 0,
  duration_seconds integer DEFAULT NULL,
  is_draw boolean NOT NULL DEFAULT false,
  started_at timestamptz DEFAULT NULL,
  ended_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_arena_matches_player1 ON arena_matches(player1_id);
CREATE INDEX idx_arena_matches_player2 ON arena_matches(player2_id);

ALTER TABLE arena_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players_see_own_matches" ON arena_matches
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "players_update_own_matches" ON arena_matches
  FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- 5. Arena matchmaking queue
CREATE TABLE arena_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  deck_id uuid REFERENCES decks(id) ON DELETE CASCADE,
  avg_char_length numeric NOT NULL DEFAULT 0,
  equipped_skills text[] NOT NULL DEFAULT '{}',
  equipped_charms text[] NOT NULL DEFAULT '{}',
  queued_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE arena_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_queue" ON arena_queue
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "queue_read_all_auth" ON arena_queue
  FOR SELECT TO authenticated USING (true);
