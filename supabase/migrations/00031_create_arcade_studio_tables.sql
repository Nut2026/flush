
-- ── Arcade Projects (user's in-progress work in the Studio) ──────────────────
CREATE TABLE arcade_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       VARCHAR(100) NOT NULL DEFAULT 'Untitled Arcade',
  code_content TEXT NOT NULL DEFAULT '',
  assets_metadata JSONB NOT NULL DEFAULT '[]',
  last_saved  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_arcade_projects_user ON arcade_projects(user_id);
CREATE INDEX idx_arcade_projects_last_saved ON arcade_projects(last_saved);

-- ── Published Arcade Games ───────────────────────────────────────────────────
CREATE TABLE arcade_games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES arcade_projects(id) ON DELETE SET NULL,
  title         VARCHAR(100) NOT NULL,
  description   TEXT NOT NULL,
  license       VARCHAR(50) NOT NULL DEFAULT 'MIT',
  code_content  TEXT NOT NULL,
  assets_metadata JSONB NOT NULL DEFAULT '[]',
  install_count INT NOT NULL DEFAULT 0,
  rating_sum    INT NOT NULL DEFAULT 0,
  rating_count  INT NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_arcade_games_creator ON arcade_games(creator_id);
CREATE INDEX idx_arcade_games_install ON arcade_games(install_count DESC);
CREATE INDEX idx_arcade_games_published ON arcade_games(is_published);

-- ── User Installed Games ─────────────────────────────────────────────────────
CREATE TABLE user_installed_games (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id      UUID NOT NULL REFERENCES arcade_games(id) ON DELETE CASCADE,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, game_id)
);
CREATE INDEX idx_user_installed_user ON user_installed_games(user_id);

-- ── Arcade Ratings ───────────────────────────────────────────────────────────
CREATE TABLE arcade_ratings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    UUID NOT NULL REFERENCES arcade_games(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);
CREATE INDEX idx_arcade_ratings_game ON arcade_ratings(game_id);

-- ── Arcade Suggestions ───────────────────────────────────────────────────────
CREATE TABLE arcade_suggestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES arcade_games(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_arcade_suggestions_game ON arcade_suggestions(game_id);

-- ── Arcade Reports ───────────────────────────────────────────────────────────
CREATE TABLE arcade_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES arcade_games(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_arcade_reports_game ON arcade_reports(game_id);
CREATE INDEX idx_arcade_reports_status ON arcade_reports(status);

-- ── Arcade Mods ──────────────────────────────────────────────────────────────
CREATE TABLE arcade_mods (
  game_id    UUID NOT NULL REFERENCES arcade_games(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL DEFAULT 'mod',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  PRIMARY KEY (game_id, user_id)
);
CREATE INDEX idx_arcade_mods_game ON arcade_mods(game_id);
CREATE INDEX idx_arcade_mods_user ON arcade_mods(user_id);

-- ── RLS Policies ─────────────────────────────────────────────────────────────

-- arcade_projects
ALTER TABLE arcade_projects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_manage_arcade_project(proj_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM arcade_projects WHERE id = proj_id AND user_id = auth.uid() AND is_deleted = FALSE);
$$;

CREATE POLICY "Users can view own projects"
  ON arcade_projects FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own projects"
  ON arcade_projects FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON arcade_projects FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- arcade_games
ALTER TABLE arcade_games ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_manage_arcade_game(game_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM arcade_games g
    LEFT JOIN arcade_mods m ON m.game_id = g.id AND m.user_id = auth.uid()
    WHERE g.id = game_id AND (g.creator_id = auth.uid() OR m.user_id IS NOT NULL)
  );
$$;

CREATE POLICY "Anyone can view published games"
  ON arcade_games FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Creators can view own unpublished games"
  ON arcade_games FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can insert games"
  ON arcade_games FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update own games"
  ON arcade_games FOR UPDATE TO authenticated
  USING (creator_id = auth.uid());

-- user_installed_games
ALTER TABLE user_installed_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own installs"
  ON user_installed_games FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can install games"
  ON user_installed_games FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can uninstall games"
  ON user_installed_games FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- arcade_ratings
ALTER TABLE arcade_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON arcade_ratings FOR SELECT USING (TRUE);

CREATE POLICY "Auth users can insert ratings"
  ON arcade_ratings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Auth users can update own ratings"
  ON arcade_ratings FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- arcade_suggestions
ALTER TABLE arcade_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators and mods can view suggestions"
  ON arcade_suggestions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM arcade_games g
      LEFT JOIN arcade_mods m ON m.game_id = g.id AND m.user_id = auth.uid()
      WHERE g.id = game_id AND (g.creator_id = auth.uid() OR m.user_id IS NOT NULL)
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Auth users can insert suggestions"
  ON arcade_suggestions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Creators and mods can update suggestions"
  ON arcade_suggestions FOR UPDATE TO authenticated
  USING (can_manage_arcade_game(game_id));

-- arcade_reports
ALTER TABLE arcade_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters can view own reports"
  ON arcade_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Auth users can insert reports"
  ON arcade_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- arcade_mods
ALTER TABLE arcade_mods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mods"
  ON arcade_mods FOR SELECT USING (TRUE);

CREATE POLICY "Game creators can insert mods"
  ON arcade_mods FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM arcade_games WHERE id = game_id AND creator_id = auth.uid())
  );

CREATE POLICY "Game creators can delete mods"
  ON arcade_mods FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM arcade_games WHERE id = game_id AND creator_id = auth.uid())
  );

CREATE POLICY "Invited users can accept (update own mod)"
  ON arcade_mods FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
