/*
  # Create Team Sessions Table

  1. New Tables
    - `team_sessions`
      - `id` (uuid, primary key)
      - `team_id` (text) - Team identifier
      - `device_id` (text) - Device identifier
      - `logged_in_at` (timestamp) - Login time
      - `last_activity` (timestamp) - Last activity time
      - `is_active` (boolean) - Current session status

  2. Security
    - Enable RLS on `team_sessions` table
    - Add policy for public read/write (for checking session status)
*/

CREATE TABLE IF NOT EXISTS team_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL UNIQUE,
  device_id text NOT NULL,
  logged_in_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

ALTER TABLE team_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read team sessions"
  ON team_sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert team sessions"
  ON team_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update team sessions"
  ON team_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete team sessions"
  ON team_sessions
  FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_team_sessions_team_id ON team_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_team_sessions_is_active ON team_sessions(is_active);
