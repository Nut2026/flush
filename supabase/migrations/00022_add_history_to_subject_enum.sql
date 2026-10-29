
-- Add History to subject_enum (was missing from DB despite being in UI)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subject_enum') THEN
    ALTER TYPE subject_enum ADD VALUE IF NOT EXISTS 'History';
  END IF;
END$$;
