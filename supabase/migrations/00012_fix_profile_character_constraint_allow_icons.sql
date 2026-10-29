-- Drop the old single-char-only constraint
ALTER TABLE profiles DROP CONSTRAINT profiles_profile_character_check;

-- New constraint: single uppercase/lowercase alphanumeric char  OR  icon_<name> key
ALTER TABLE profiles
  ADD CONSTRAINT profiles_profile_character_check
  CHECK (
    profile_character ~ '^[A-Za-z0-9]$'
    OR profile_character ~ '^icon_[a-z_]+$'
  );