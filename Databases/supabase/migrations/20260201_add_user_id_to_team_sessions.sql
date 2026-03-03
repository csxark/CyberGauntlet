/*
  # Add User ID to Team Sessions Table

  1. Changes
    - Add `user_id` (uuid) column to track session ownership
    - Add foreign key to profiles.user_id
    - Add index on user_id for query performance

  2. Security
    - Enables RLS policies to validate ownership via auth.uid()
    - Allows session management to be tied to user authentication
*/

ALTER TABLE team_sessions
ADD COLUMN user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_team_sessions_user_id ON team_sessions(user_id);
