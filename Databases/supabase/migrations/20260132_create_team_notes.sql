-- Create Team Notes Table for Team Collaboration Features

-- 1. New Tables
--    - `team_notes`
--      - `id` (uuid, primary key)
--      - `team_id` (uuid, foreign key to teams.id)
--      - `challenge_id` (text)
--      - `user_id` (uuid, foreign key to auth.users)
--      - `note_content` (text)
--      - `created_at` (timestamptz)
--      - `updated_at` (timestamptz)

CREATE TABLE IF NOT EXISTS team_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Security
-- Enable RLS on `team_notes` table
ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;

-- Allow team members to view notes for their team's challenges
CREATE POLICY "Team members can view their team's notes"
  ON team_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_notes.team_id
      AND auth.uid() = ANY(teams.members)
    )
  );

-- Allow team members to insert notes for their team's challenges
CREATE POLICY "Team members can insert notes for their team"
  ON team_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_notes.team_id
      AND auth.uid() = ANY(teams.members)
    )
    AND auth.uid() = user_id
  );

-- Allow team members to update their own notes
CREATE POLICY "Team members can update their own notes"
  ON team_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_notes.team_id
      AND auth.uid() = ANY(teams.members)
    )
    AND auth.uid() = user_id
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_notes.team_id
      AND auth.uid() = ANY(teams.members)
    )
    AND auth.uid() = user_id
  );

-- Allow team members to delete their own notes
CREATE POLICY "Team members can delete their own notes"
  ON team_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_notes.team_id
      AND auth.uid() = ANY(teams.members)
    )
    AND auth.uid() = user_id
  );

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_team_notes_team_id ON team_notes(team_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_challenge_id ON team_notes(challenge_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_user_id ON team_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_created_at ON team_notes(created_at DESC);
