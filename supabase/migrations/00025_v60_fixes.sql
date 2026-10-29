
-- 1. Assign emails to Nuz and FlushLearner
UPDATE profiles SET email = 'nuzealouss@gmail.com' WHERE username = 'Nuz';
UPDATE profiles SET email = 'ravenlawclaw10@gmail.com' WHERE username = 'FlushLearner';

-- 2. Fix public_decks price_check to allow free decks (price = 0)
ALTER TABLE public_decks DROP CONSTRAINT public_decks_price_check;
ALTER TABLE public_decks ADD CONSTRAINT public_decks_price_check CHECK (price >= 0 AND price <= 500);

-- 3. Add streak_stall_saved_streak + stall_seen_expired columns to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS streak_stall_saved_streak integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS streak_stall_expired_seen boolean DEFAULT false;

-- 4. Add mod_declination and mod_accepted notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mod_declination';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mod_accepted';
