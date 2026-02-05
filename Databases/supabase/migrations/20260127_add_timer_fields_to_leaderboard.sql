/*
  # Add Timer Fields and Points to Leaderboard Table

  1. New Columns
    - `start_time` (timestamptz) - When the challenge was started
    - `completion_time` (timestamptz) - When the challenge was completed
    - `points` (integer) - Points earned for the challenge

  2. Security
    - No changes to RLS policies
*/

ALTER TABLE leaderboard ADD COLUMN start_time timestamptz;
ALTER TABLE leaderboard ADD COLUMN completion_time timestamptz;
ALTER TABLE leaderboard ADD COLUMN points integer DEFAULT 0;
