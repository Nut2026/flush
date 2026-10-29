
-- Add streak_stall_activated_at to profiles so we can track the 30-day countdown
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_stall_activated_at timestamptz;
