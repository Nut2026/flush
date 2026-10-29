
-- 1. Add 'No Cap' to difficulty_enum if it exists as an enum type
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_enum') THEN
    ALTER TYPE difficulty_enum ADD VALUE IF NOT EXISTS 'No Cap';
  END IF;
END$$;

-- 2. Add 'Tech' to subject_enum if it exists as an enum type
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subject_enum') THEN
    ALTER TYPE subject_enum ADD VALUE IF NOT EXISTS 'Tech';
  END IF;
END$$;

-- 3. Add username_changed_at column to profiles (tracks if user has already changed username once)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_changed_at timestamptz DEFAULT NULL;

-- 4. Add public_profile_sections column to profiles (controls which sections appear in public profile)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_profile_sections jsonb DEFAULT '{"join_date":true,"statistics":true,"personal_bests":true,"badges":true}'::jsonb;
