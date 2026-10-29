
-- Add wager state columns to profiles
ALTER TABLE profiles
  ADD COLUMN streak_wager_broken_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN streak_wager_completed boolean NOT NULL DEFAULT false;

-- Track individual study dates for streak calendar
CREATE TABLE streak_study_dates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_date date        NOT NULL,
  UNIQUE(user_id, study_date)
);

ALTER TABLE streak_study_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "streak_study_dates_own" ON streak_study_dates
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX streak_study_dates_user ON streak_study_dates (user_id, study_date DESC);
