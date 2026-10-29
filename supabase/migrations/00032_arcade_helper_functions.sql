
-- Increment install count
CREATE OR REPLACE FUNCTION increment_arcade_install_count(game_id_arg UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE arcade_games SET install_count = install_count + 1 WHERE id = game_id_arg;
$$;

-- Decrement install count (min 0)
CREATE OR REPLACE FUNCTION decrement_arcade_install_count(game_id_arg UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE arcade_games SET install_count = GREATEST(0, install_count - 1) WHERE id = game_id_arg;
$$;

-- Update arcade rating sum/count atomically
CREATE OR REPLACE FUNCTION update_arcade_rating(
  game_id_arg UUID,
  old_rating INT,
  new_rating INT,
  is_new BOOLEAN
)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE arcade_games
  SET
    rating_sum   = CASE WHEN is_new THEN rating_sum + new_rating
                        ELSE rating_sum - old_rating + new_rating END,
    rating_count = CASE WHEN is_new THEN rating_count + 1
                        ELSE rating_count END
  WHERE id = game_id_arg;
$$;

-- Lookup profile by username (for mod invite)
CREATE OR REPLACE FUNCTION lookup_user_by_username(uname TEXT)
RETURNS TABLE(id UUID, username TEXT) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, username FROM profiles WHERE lower(username) = lower(uname) LIMIT 1;
$$;
