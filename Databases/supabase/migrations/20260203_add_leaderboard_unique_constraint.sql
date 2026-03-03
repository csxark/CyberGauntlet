/*
  # Add Unique Constraint to Leaderboard Table

  1. Changes
    - Add unique constraint on (team_name, question_id)
    - Prevents duplicate leaderboard entries for same team+challenge
    - Handles race conditions where concurrent submissions create duplicates

  2. Security
    - Database-level enforcement prevents data corruption
    - Ensures leaderboard integrity even with concurrent requests
*/

-- Add unique constraint to prevent duplicate completions
-- A team can only complete a specific challenge once
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_unique_completion 
ON leaderboard(team_name, question_id) 
WHERE completed_at IS NOT NULL;

-- Note: The WHERE clause allows multiple incorrect attempt records (completed_at = NULL)
-- but only ONE successful completion record per team+challenge combination
