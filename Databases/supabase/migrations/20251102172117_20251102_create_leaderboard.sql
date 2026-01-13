/*
  # Create Leaderboard Table

  1. New Tables
    - `leaderboard`
      - `id` (uuid, primary key)
      - `team_name` (text) - Team name
      - `question_id` (text) - Question identifier
      - `time_spent` (integer) - Time spent in seconds
      - `attempts` (integer) - Number of attempts
      - `completed_at` (timestamp) - When completed
      - `created_at` (timestamp) - Record creation time

  2. Security
    - Enable RLS on `leaderboard` table
    - Add policy for public read access (leaderboard visibility)
    - Add policy for public insert (teams submitting results)
*/

CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text NOT NULL,
  question_id text NOT NULL,
  time_spent integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 1,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to leaderboard"
  ON leaderboard
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to leaderboard"
  ON leaderboard
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to leaderboard"
  ON leaderboard
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_leaderboard_team_name ON leaderboard(team_name);
CREATE INDEX IF NOT EXISTS idx_leaderboard_question_id ON leaderboard(question_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_completed_at ON leaderboard(completed_at);
