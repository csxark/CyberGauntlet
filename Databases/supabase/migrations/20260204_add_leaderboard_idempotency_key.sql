/*
  # Add Idempotency Key to Leaderboard Table

  1. Changes
    - Add `idempotency_key` (text, nullable) column to leaderboard
    - Allows tracking submission uniqueness for retry scenarios
    - Prevents duplicate processing of same logical submission

  2. Security
    - Optional field - backwards compatible
    - Helps with race condition detection and debugging
*/

-- Add idempotency_key column for duplicate submission tracking
ALTER TABLE leaderboard
ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Create index for fast lookups by idempotency key
CREATE INDEX IF NOT EXISTS idx_leaderboard_idempotency_key ON leaderboard(idempotency_key)
WHERE idempotency_key IS NOT NULL;
