/*
  # Add Hints Used to Leaderboard Table

  1. New Columns
    - `hints_used` (integer) - Number of hints used for the challenge, default 0

  2. Security
    - No changes to RLS policies
*/

ALTER TABLE leaderboard ADD COLUMN hints_used integer DEFAULT 0;
