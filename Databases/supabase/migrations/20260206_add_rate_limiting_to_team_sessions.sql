/*
  # Add Rate Limiting Fields to Team Sessions

  1. Changes
    - Add `failed_attempts` (integer, default 0) - Counter for failed flag submissions
    - Add `last_failed_attempt` (timestamptz) - Timestamp of last failed attempt
    - Add `rate_limit_locked_until` (timestamptz) - Lockout expiration time
    - Add `rate_limit_level` (integer, default 0) - Backoff level for exponential increase

  2. Purpose
    - Track failed flag submission attempts per team
    - Implement progressive rate limiting with exponential backoff
    - Prevent brute force attacks on challenge flags
    - Lock teams out temporarily after threshold exceeded
    - Reset lockout automatically when time expires

  3. Rate Limiting Strategy
    - Threshold: 5 failed attempts triggers lockout
    - Initial lockout: 30 seconds
    - Exponential backoff: lockout_duration = 30 * (2 ^ rate_limit_level)
    - Max lockout: ~8 hours (level 10)
    - Reset after successful submission or 24 hours of inactivity

  4. Indexes
    - Index on rate_limit_locked_until for efficient lockout checks
    - Index on team_id for rate limit lookups
*/

ALTER TABLE team_sessions
ADD COLUMN IF NOT EXISTS failed_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_failed_attempt timestamptz,
ADD COLUMN IF NOT EXISTS rate_limit_locked_until timestamptz,
ADD COLUMN IF NOT EXISTS rate_limit_level integer DEFAULT 0;

-- Create indexes for rate limit queries
CREATE INDEX IF NOT EXISTS idx_team_sessions_rate_limit_locked_until 
  ON team_sessions(rate_limit_locked_until) 
  WHERE rate_limit_locked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_sessions_last_failed_attempt 
  ON team_sessions(last_failed_attempt);

-- Add comment documenting rate limiting fields
COMMENT ON COLUMN team_sessions.failed_attempts 
  IS 'Counter for consecutive failed flag submission attempts';

COMMENT ON COLUMN team_sessions.last_failed_attempt 
  IS 'Timestamp of the most recent failed flag submission attempt';

COMMENT ON COLUMN team_sessions.rate_limit_locked_until 
  IS 'Timestamp until which the team is locked out from submitting flags';

COMMENT ON COLUMN team_sessions.rate_limit_level 
  IS 'Exponential backoff level - lockout_duration = 30 * (2 ^ level) seconds';
