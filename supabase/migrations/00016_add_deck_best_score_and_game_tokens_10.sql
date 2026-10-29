
-- Add deck_best_score to game_high_scores (per-game, per-deck best)
ALTER TABLE game_high_scores ADD COLUMN IF NOT EXISTS deck_best_score numeric;

-- Add is_deck_best flag to game_sessions
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS is_deck_best boolean NOT NULL DEFAULT false;

-- Raise FREE_TOKENS baseline from 3 to 10 by updating the constant stored in game_tokens
-- (the app constant FREE_TOKENS in flushService controls this; no DB change needed for that)
-- But we do need to reset tokens_used so existing users get the benefit of the expanded cap
UPDATE game_tokens SET tokens_used = LEAST(tokens_used, 10) WHERE tokens_used > 10;
