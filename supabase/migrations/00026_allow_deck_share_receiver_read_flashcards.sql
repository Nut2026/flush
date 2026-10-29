-- Allow the receiver of a pending deck_share to read the sender's flashcards for preview
CREATE POLICY "deck_share_receiver_can_read_flashcards"
  ON flashcards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deck_shares ds
      WHERE ds.deck_id = flashcards.deck_id
        AND ds.receiver_id = auth.uid()
        AND ds.status = 'pending'
    )
  );

-- Also allow acceptSharedDeck server-side reads: the receiver needs to read flashcards
-- during acceptance too (status transitions from pending → accepted in the same call)
-- The above policy covers pending; add a helper for 'accepted' transition window
CREATE POLICY "deck_share_receiver_can_read_on_accept"
  ON flashcards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deck_shares ds
      WHERE ds.deck_id = flashcards.deck_id
        AND ds.receiver_id = auth.uid()
        AND ds.status IN ('pending', 'accepted')
    )
  );