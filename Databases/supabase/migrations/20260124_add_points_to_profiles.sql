/*
  # Add Points to Profiles Table

  1. New Columns
    - `points` (integer) - Points available for hint usage, default 100

  2. Security
    - No changes to RLS policies
*/

ALTER TABLE profiles ADD COLUMN points integer DEFAULT 100;
