/*
  # Create Challenge Validations Table

  1. New Tables
    - `challenge_validations`
      - `id` (uuid, primary key)
      - `challenge_id` (text) - References question ID
      - `correct_flag_hash` (text) - SHA-256 hash of correct flag
      - `feedback_messages` (jsonb) - JSON object with different feedback types
      - `validation_rules` (jsonb) - Optional rules for partial validation
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `challenge_validations` table
    - Add policy for authenticated users to read validations (for validation endpoint)
    - Add policy for service role to manage validations
*/

CREATE TABLE IF NOT EXISTS challenge_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id text NOT NULL,
  correct_flag_hash text NOT NULL,
  feedback_messages jsonb NOT NULL DEFAULT '{
    "correct": "Flag verified successfully!",
    "incorrect": "Incorrect flag. Keep analyzing...",
    "format_error": "Invalid flag format. Flags should start with CG{...}",
    "partial_hint": "Getting closer! Check your approach."
  }',
  validation_rules jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE challenge_validations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read validations for flag checking
CREATE POLICY "Allow authenticated users to read challenge validations"
  ON challenge_validations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow service role to manage validations
CREATE POLICY "Allow service role to manage challenge validations"
  ON challenge_validations
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_validations_challenge_id ON challenge_validations(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_validations_created_at ON challenge_validations(created_at);
