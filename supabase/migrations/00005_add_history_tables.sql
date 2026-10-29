
-- 1. Add question_details to test_results for per-question correct/incorrect tracking
ALTER TABLE test_results ADD COLUMN question_details jsonb;

-- 2. study_sessions: one row per completed study session
CREATE TABLE study_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id       uuid        REFERENCES decks(id) ON DELETE SET NULL,
  cards_reviewed int        NOT NULL DEFAULT 0,
  cards_correct  int        NOT NULL DEFAULT 0,
  duration_seconds int      NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_sessions_select_own" ON study_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "study_sessions_insert_own" ON study_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "study_sessions_delete_own" ON study_sessions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 3. game_sessions: every game play (not just high scores)
CREATE TABLE game_sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_name    text        NOT NULL,
  deck_id      uuid        REFERENCES decks(id) ON DELETE SET NULL,
  score        int         NOT NULL DEFAULT 0,
  is_high_score boolean    NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_sessions_select_own" ON game_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "game_sessions_insert_own" ON game_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "game_sessions_delete_own" ON game_sessions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Indexes for fast history queries
CREATE INDEX study_sessions_user_created ON study_sessions (user_id, created_at DESC);
CREATE INDEX game_sessions_user_created  ON game_sessions  (user_id, created_at DESC);
