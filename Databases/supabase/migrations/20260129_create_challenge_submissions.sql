/*
  # Create Challenge Submissions Table

  1. New Tables
    - `challenge_submissions`
      - `id` (uuid, primary key)
      - `submitter_id` (uuid, foreign key to profiles.id)
      - `title` (text)
      - `description` (text)
      - `category` (text)
      - `difficulty` (text)
      - `correct_flag` (text)
      - `hints` (text array)
      - `assets` (jsonb array of file paths)
      - `status` (text: pending, approved, rejected)
      - `votes` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `challenge_submissions` table
    - Add policies for users to manage their own submissions
    - Add policies for admins to view and update all submissions
*/

CREATE TABLE IF NOT EXISTS challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  difficulty text NOT NULL,
  correct_flag text NOT NULL,
  hints text[] DEFAULT '{}',
  assets jsonb DEFAULT '[]',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  votes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON challenge_submissions
  FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = submitter_id
  ));

-- Users can insert their own submissions
CREATE POLICY "Users can insert own submissions"
  ON challenge_submissions
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = submitter_id
  ));

-- Users can update their own pending submissions
CREATE POLICY "Users can update own pending submissions"
  ON challenge_submissions
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = submitter_id
  ) AND status = 'pending')
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = submitter_id
  ) AND status = 'pending');

-- Admins can view all submissions (assuming admin role exists)
CREATE POLICY "Admins can view all submissions"
  ON challenge_submissions
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- Admins can update all submissions
CREATE POLICY "Admins can update all submissions"
  ON challenge_submissions
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE INDEX IF NOT EXISTS idx_challenge_submissions_submitter_id ON challenge_submissions(submitter_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_status ON challenge_submissions(status);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_created_at ON challenge_submissions(created_at);
