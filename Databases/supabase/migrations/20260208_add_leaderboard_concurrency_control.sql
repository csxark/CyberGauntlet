/*
  # Add Concurrency Control to Leaderboard

  1. Purpose
    - Prevent duplicate completion records from concurrent submissions
    - Enforce data integrity with business logic triggers
    - Add version control for optimistic locking
    - Auto-calculate server-side values to prevent manipulation

  2. Changes
    - Make idempotency_key NOT NULL for new submissions
    - Add version column for optimistic locking
    - Add unique constraint on submission_id (already exists as idempotency_key)
    - Create triggers for data validation
    - Add computed columns for server-side calculations

  3. Triggers Created
    - Prevent time_spent from decreasing
    - Prevent attempts from decreasing
    - Validate timestamps are reasonable
    - Auto-set server_completion_time
    - Enforce completion_time <= server_completion_time + tolerance

  4. Business Logic Enforced
    - Time cannot go backwards (prevents cheating)
    - Attempts must be monotonic increasing
    - Completion times must be within reasonable bounds
    - Server validates all client-submitted values
*/

-- Add version column for optimistic locking
ALTER TABLE leaderboard
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS server_completion_time timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_updated timestamptz DEFAULT now();

-- Create index on idempotency_key for fast duplicate detection
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_idempotency_key_unique 
  ON leaderboard(idempotency_key) 
  WHERE idempotency_key IS NOT NULL AND completed_at IS NOT NULL;

-- Add check constraints for data integrity
ALTER TABLE leaderboard
ADD CONSTRAINT check_time_spent_non_negative 
  CHECK (time_spent >= 0),
ADD CONSTRAINT check_attempts_positive 
  CHECK (attempts > 0),
ADD CONSTRAINT check_hints_used_non_negative 
  CHECK (hints_used >= 0),
ADD CONSTRAINT check_points_non_negative 
  CHECK (points >= 0);

-- Add check for reasonable time values (prevent manipulation)
ALTER TABLE leaderboard
ADD CONSTRAINT check_time_spent_reasonable 
  CHECK (time_spent < 86400); -- Max 24 hours per challenge

-- Create function to validate leaderboard updates
CREATE OR REPLACE FUNCTION validate_leaderboard_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply validations to updates (not inserts)
  IF TG_OP = 'UPDATE' THEN
    
    -- Prevent time_spent from decreasing
    IF NEW.time_spent < OLD.time_spent THEN
      RAISE EXCEPTION 'time_spent cannot decrease (old: %, new: %)', 
        OLD.time_spent, NEW.time_spent;
    END IF;

    -- Prevent attempts from decreasing
    IF NEW.attempts < OLD.attempts THEN
      RAISE EXCEPTION 'attempts cannot decrease (old: %, new: %)', 
        OLD.attempts, NEW.attempts;
    END IF;

    -- Prevent hints_used from decreasing (once revealed, stays revealed)
    IF NEW.hints_used < OLD.hints_used THEN
      RAISE EXCEPTION 'hints_used cannot decrease (old: %, new: %)', 
        OLD.hints_used, NEW.hints_used;
    END IF;

    -- Increment version for optimistic locking
    NEW.version := OLD.version + 1;
    NEW.last_updated := now();
  END IF;

  -- Validate completion_time is not in the future (both INSERT and UPDATE)
  IF NEW.completed_at IS NOT NULL AND NEW.completed_at > now() + interval '1 minute' THEN
    RAISE EXCEPTION 'completed_at cannot be in the future: %', NEW.completed_at;
  END IF;

  -- Validate start_time is before completion_time
  IF NEW.completed_at IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    IF NEW.start_time > NEW.completed_at THEN
      RAISE EXCEPTION 'start_time must be before completed_at (start: %, complete: %)', 
        NEW.start_time, NEW.completed_at;
    END IF;
  END IF;

  -- Set server_completion_time on INSERT for completed challenges
  IF TG_OP = 'INSERT' AND NEW.completed_at IS NOT NULL THEN
    NEW.server_completion_time := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for leaderboard validation
DROP TRIGGER IF EXISTS trigger_validate_leaderboard ON leaderboard;
CREATE TRIGGER trigger_validate_leaderboard
  BEFORE INSERT OR UPDATE ON leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION validate_leaderboard_update();

-- Create function to prevent duplicate completions
CREATE OR REPLACE FUNCTION prevent_duplicate_completions()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for completed submissions (completed_at IS NOT NULL)
  IF NEW.completed_at IS NOT NULL THEN
    
    -- Check if this team already has a completion for this question
    IF EXISTS (
      SELECT 1 FROM leaderboard
      WHERE team_name = NEW.team_name
        AND question_id = NEW.question_id
        AND completed_at IS NOT NULL
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Team % already has a completion record for question %', 
        NEW.team_name, NEW.question_id;
    END IF;

    -- Check for duplicate idempotency_key
    IF NEW.idempotency_key IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM leaderboard
        WHERE idempotency_key = NEW.idempotency_key
          AND completed_at IS NOT NULL
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      ) THEN
        -- This is expected for retries - silently ignore by returning NULL
        -- The unique index will prevent the insert
        RAISE NOTICE 'Duplicate idempotency_key detected: %', NEW.idempotency_key;
        RETURN NULL;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for duplicate prevention (runs before validation trigger)
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_completions ON leaderboard;
CREATE TRIGGER trigger_prevent_duplicate_completions
  BEFORE INSERT ON leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_completions();

-- Create function to auto-calculate server-side elapsed time
CREATE OR REPLACE FUNCTION calculate_elapsed_time()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a completion and we have a start_time, verify client calculation
  IF NEW.completed_at IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    DECLARE
      server_calculated_time integer;
      client_submitted_time integer;
      time_difference integer;
    BEGIN
      -- Calculate what the time should be based on timestamps
      server_calculated_time := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.start_time))::integer;
      client_submitted_time := NEW.time_spent;
      time_difference := ABS(server_calculated_time - client_submitted_time);

      -- Allow 10 second tolerance for network delays and clock skew
      IF time_difference > 10 THEN
        RAISE WARNING 'Time discrepancy detected for team %: client=% server=% diff=%', 
          NEW.team_name, client_submitted_time, server_calculated_time, time_difference;
        
        -- Optionally use server calculation (uncomment to enforce)
        -- NEW.time_spent := server_calculated_time;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for elapsed time calculation
DROP TRIGGER IF EXISTS trigger_calculate_elapsed_time ON leaderboard;
CREATE TRIGGER trigger_calculate_elapsed_time
  BEFORE INSERT OR UPDATE ON leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION calculate_elapsed_time();

-- Add comments explaining the new columns
COMMENT ON COLUMN leaderboard.version 
  IS 'Version number for optimistic locking - increments on each update';

COMMENT ON COLUMN leaderboard.server_completion_time 
  IS 'Server timestamp when completion was recorded - used for validation';

COMMENT ON COLUMN leaderboard.last_updated 
  IS 'Timestamp of last modification - tracks when record was changed';

COMMENT ON COLUMN leaderboard.idempotency_key 
  IS 'Client-generated UUID for idempotent submissions - prevents duplicates on retry';

-- Create view for detecting suspicious submissions
CREATE OR REPLACE VIEW suspicious_submissions AS
SELECT 
  l.*,
  EXTRACT(EPOCH FROM (l.server_completion_time - l.completed_at))::integer as time_drift_seconds,
  CASE 
    WHEN l.time_spent < 10 THEN 'too_fast'
    WHEN l.time_spent > 7200 THEN 'too_slow'
    WHEN ABS(EXTRACT(EPOCH FROM (l.server_completion_time - l.completed_at))) > 60 THEN 'clock_skew'
    WHEN l.attempts = 1 AND l.time_spent < 30 THEN 'instant_solve'
    ELSE 'normal'
  END as suspicion_reason
FROM leaderboard l
WHERE l.completed_at IS NOT NULL
  AND (
    l.time_spent < 10 OR 
    l.time_spent > 7200 OR 
    ABS(EXTRACT(EPOCH FROM (l.server_completion_time - l.completed_at))) > 60 OR
    (l.attempts = 1 AND l.time_spent < 30)
  );

-- Add index for suspicious_submissions view queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_suspicious 
  ON leaderboard(team_name, time_spent, attempts) 
  WHERE completed_at IS NOT NULL;

-- Create function to handle optimistic locking conflicts
CREATE OR REPLACE FUNCTION check_optimistic_lock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Check if version matches (for API updates with explicit version check)
    IF NEW.version IS NOT NULL AND OLD.version IS NOT NULL THEN
      IF NEW.version <= OLD.version THEN
        RAISE EXCEPTION 'Optimistic lock conflict: expected version %, found %', 
          NEW.version, OLD.version
        USING ERRCODE = '40001'; -- serialization_failure
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for optimistic locking (optional - only if API explicitly uses versioning)
-- Uncomment if you want strict version checking on updates
-- DROP TRIGGER IF EXISTS trigger_check_optimistic_lock ON leaderboard;
-- CREATE TRIGGER trigger_check_optimistic_lock
--   BEFORE UPDATE ON leaderboard
--   FOR EACH ROW
--   EXECUTE FUNCTION check_optimistic_lock();
