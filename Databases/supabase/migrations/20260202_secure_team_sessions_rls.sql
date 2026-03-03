/*
  # Secure RLS Policies for Team Sessions Table

  1. Changes
    - Drop insecure public RLS policies
    - Add authenticated-only RLS policies with auth.uid() checks
    - Prevent users from viewing/modifying other teams' sessions
    - Remove public delete policy entirely
    - Add service role bypass for admin operations

  2. Security
    - Users can only view/update their own team's sessions
    - Session management is tied to user authentication
    - No public access allowed
    - Delete operations require service role
*/

-- Drop insecure public policies
DROP POLICY IF EXISTS "Allow public read team sessions" ON team_sessions;
DROP POLICY IF EXISTS "Allow public insert team sessions" ON team_sessions;
DROP POLICY IF EXISTS "Allow public update team sessions" ON team_sessions;
DROP POLICY IF EXISTS "Allow public delete team sessions" ON team_sessions;

-- Allow authenticated users to read only their own team's sessions
CREATE POLICY "Users can read own team sessions"
  ON team_sessions
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow authenticated users to insert sessions for their own team
CREATE POLICY "Users can insert own team sessions"
  ON team_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to update only their own team's sessions
CREATE POLICY "Users can update own team sessions"
  ON team_sessions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Note: DELETE policy intentionally omitted - use service role for admin operations
-- This prevents users from accidentally or maliciously deleting sessions
