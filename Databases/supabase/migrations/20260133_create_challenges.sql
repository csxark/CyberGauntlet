/*
  # Create Challenges Table

  1. New Tables
    - `challenges`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `category` (text)
      - `difficulty` (text)
      - `correct_flag` (text)
      - `hints` (text array)
      - `file_name` (text, optional)
      - `file_path` (text, optional)
      - `active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `challenges` table
    - Add policies for admins to manage challenges
    - Add policies for users to view active challenges
*/

CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  difficulty text NOT NULL,
  correct_flag text NOT NULL,
  hints text[] DEFAULT '{}',
  file_name text,
  file_path text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Users can view active challenges
CREATE POLICY "Users can view active challenges"
  ON challenges
  FOR SELECT
  USING (active = true);

-- Admins can view all challenges
CREATE POLICY "Admins can view all challenges"
  ON challenges
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- Admins can insert challenges
CREATE POLICY "Admins can insert challenges"
  ON challenges
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Admins can update challenges
CREATE POLICY "Admins can update challenges"
  ON challenges
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Admins can delete challenges
CREATE POLICY "Admins can delete challenges"
  ON challenges
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE INDEX IF NOT EXISTS idx_challenges_category ON challenges(category);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(active);
