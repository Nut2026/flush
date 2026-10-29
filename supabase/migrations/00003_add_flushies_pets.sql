
-- owned_pets: tracks purchase + per-pet page preferences
CREATE TABLE owned_pets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id         text NOT NULL CHECK (pet_id IN ('cat', 'fox', 'dragon')),
  show_study     boolean NOT NULL DEFAULT true,
  show_test      boolean NOT NULL DEFAULT true,
  show_games     boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, pet_id)
);

-- Add equipped_pet_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_pet_id text CHECK (equipped_pet_id IN ('cat', 'fox', 'dragon'));

-- RLS
ALTER TABLE owned_pets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_access_owned_pet(p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT auth.uid() = p_user_id
$$;

CREATE POLICY "owned_pets_select" ON owned_pets
  FOR SELECT USING (can_access_owned_pet(user_id));

CREATE POLICY "owned_pets_insert" ON owned_pets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owned_pets_update" ON owned_pets
  FOR UPDATE USING (can_access_owned_pet(user_id));

CREATE POLICY "owned_pets_delete" ON owned_pets
  FOR DELETE USING (can_access_owned_pet(user_id));
