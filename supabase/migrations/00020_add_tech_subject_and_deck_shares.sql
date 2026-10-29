
-- 1. Add 'Tech' to the subject enum (if it's an enum type)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'subject_enum'
  ) THEN
    ALTER TYPE subject_enum ADD VALUE IF NOT EXISTS 'Tech';
  END IF;
END$$;

-- 2. deck_shares table for private user-to-user deck sharing
CREATE TABLE deck_shares (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_id       uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  deck_title    text NOT NULL,
  sender_username text NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','reported')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deck_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender can insert deck share"
  ON deck_shares FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Sender can view own sent shares"
  ON deck_shares FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Receiver can update status"
  ON deck_shares FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- 3. Add deck_share notification types to notifications type check (if constraint exists)
-- notifications.type is a free text field so no enum change needed
