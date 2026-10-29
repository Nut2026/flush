
ALTER TABLE flashcards ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
-- Backfill sort_order based on created_at within each deck
UPDATE flashcards f
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY deck_id ORDER BY created_at) - 1 AS rn
  FROM flashcards
) sub
WHERE f.id = sub.id;
