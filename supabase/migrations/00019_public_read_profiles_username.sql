
-- Allow anyone (including anon) to read username from profiles for World deck display
CREATE POLICY "Public can read profile usernames"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);
