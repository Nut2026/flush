
ALTER TABLE profiles
  ADD COLUMN daily_tests_completed int NOT NULL DEFAULT 0,
  ADD COLUMN daily_tests_completed_date text NOT NULL DEFAULT '',
  ADD COLUMN daily_games_played int NOT NULL DEFAULT 0,
  ADD COLUMN daily_games_played_date text NOT NULL DEFAULT '',
  ADD COLUMN daily_decks_studied_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN daily_decks_studied_date text NOT NULL DEFAULT '';
