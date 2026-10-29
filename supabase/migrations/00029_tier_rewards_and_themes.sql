
ALTER TABLE profiles
  ADD COLUMN study_theme text NOT NULL DEFAULT 'default',
  ADD COLUMN deck_theme text NOT NULL DEFAULT 'default',
  ADD COLUMN tier_rewards_claimed text[] NOT NULL DEFAULT '{}',
  ADD COLUMN profile_frame_color text DEFAULT NULL,
  ADD COLUMN profile_frame_shiny boolean NOT NULL DEFAULT false,
  ADD COLUMN avatar_shiny boolean NOT NULL DEFAULT false;
