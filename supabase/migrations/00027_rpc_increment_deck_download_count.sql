-- Safe RPC to increment download_count, callable by any authenticated user
CREATE OR REPLACE FUNCTION increment_deck_download_count(p_public_deck_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public_decks
  SET download_count = download_count + 1
  WHERE id = p_public_deck_id;
$$;