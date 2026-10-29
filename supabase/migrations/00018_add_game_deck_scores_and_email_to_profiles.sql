
-- Per-deck best scores table for Arcade
CREATE TABLE game_deck_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_name text NOT NULL,
  deck_id uuid NOT NULL,
  best_score numeric NOT NULL DEFAULT 0,
  achieved_at timestamptz DEFAULT now(),
  UNIQUE (user_id, game_name, deck_id)
);

ALTER TABLE game_deck_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own deck scores"
  ON game_deck_scores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add email column to profiles for real-email signup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON profiles (lower(email)) WHERE email IS NOT NULL;
