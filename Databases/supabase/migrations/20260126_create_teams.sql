/*
  # Create Teams Table for Team Collaboration Mode

  1. New Tables
    - `teams`
      - `id` (uuid, primary key)
      - `team_id` (text, unique) - Team identifier
      - `team_name` (text) - Display name
      - `members` (uuid[]) - Array of user IDs
      - `shared_points` (integer) - Shared team points
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `teams` table
    - Add policies for team members to view/update their teams
*/

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text UNIQUE NOT NULL,
  team_name text NOT NULL,
  members uuid[] DEFAULT '{}',
  shared_points integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Allow team members to view their teams
CREATE POLICY "Team members can view their teams"
  ON teams
  FOR SELECT
  USING (auth.uid() = ANY(members));

-- Allow team members to update their teams
CREATE POLICY "Team members can update their teams"
  ON teams
  FOR UPDATE
  USING (auth.uid() = ANY(members))
  WITH CHECK (auth.uid() = ANY(members));

-- Allow anyone to create teams (for team creation)
CREATE POLICY "Anyone can create teams"
  ON teams
  FOR INSERT
  WITH CHECK (true);

-- Allow team members to delete their teams (if needed)
CREATE POLICY "Team members can delete their teams"
  ON teams
  FOR DELETE
  USING (auth.uid() = ANY(members));

CREATE INDEX IF NOT EXISTS idx_teams_team_id ON teams(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_members ON teams USING GIN(members);
