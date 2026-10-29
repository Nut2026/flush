
-- 1. Add notes column to flashcards
ALTER TABLE flashcards ADD COLUMN notes text NOT NULL DEFAULT '';

-- 2. Add notes to starter_card_templates
ALTER TABLE starter_card_templates ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

-- 3. Make game_high_scores universal (drop deck_id constraint, keep best score per game type)
-- Drop the old unique constraint
ALTER TABLE game_high_scores DROP CONSTRAINT IF EXISTS game_high_scores_user_id_game_name_deck_id_key;

-- Make deck_id nullable
ALTER TABLE game_high_scores ALTER COLUMN deck_id DROP NOT NULL;

-- Keep only the best score per user per game type (delete duplicates, keep highest)
DELETE FROM game_high_scores a
USING game_high_scores b
WHERE a.user_id = b.user_id
  AND a.game_name = b.game_name
  AND a.high_score < b.high_score;

-- If there are still ties (same score), keep the newer one
DELETE FROM game_high_scores a
USING game_high_scores b
WHERE a.user_id = b.user_id
  AND a.game_name = b.game_name
  AND a.high_score = b.high_score
  AND a.id < b.id;

-- Now add the new unique constraint: one high score per user per game type
ALTER TABLE game_high_scores ADD CONSTRAINT game_high_scores_user_id_game_name_key UNIQUE (user_id, game_name);
