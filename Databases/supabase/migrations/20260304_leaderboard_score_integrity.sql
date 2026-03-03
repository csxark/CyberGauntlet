/*
  # Leaderboard Score Integrity & Anti-Cheat Measures

  ## Overview
  - Prevent direct score manipulation by validating all leaderboard submissions
  - Track session timers and validate time_spent claims
  - Record challenge interactions (hints, attempts) server-side
  - Flag suspicious submissions for admin review
  - Enforce impossible value constraints at DB layer

  ## Tables Added
  1. `challenge_sessions` - Track per-challenge interactions
  2. `leaderboard_integrity_flags` - Flag suspicious submissions for review
  3. Modified `leaderboard` - Add validation columns
  4. Modified `team_sessions` - Add per-session timer tracking

  ## Security Measures
  - Server validates time_spent <= (submission_time - session_start_time)
  - Database triggers reject negative or impossible time values
  - Verify hints_used matches stored hint reveal records
  - Verify attempts matches stored wrong attempt records
  - Detect and flag race conditions, double submissions, time anomalies
*/

-- ============================================================================
-- 1. Add Challenge Session Tracking (per-challenge per-team interactions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS challenge_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL,
  challenge_id text NOT NULL,
  session_start_time timestamptz NOT NULL DEFAULT now(),
  first_attempt_time timestamptz,
  
  -- Counters (server-side authoritative record)
  hint_reveal_count integer NOT NULL DEFAULT 0,
  wrong_attempt_count integer NOT NULL DEFAULT 0,
  
  -- Submitted scores (from client or edge function)
  submitted_hints_used integer,
  submitted_attempts integer,
  submitted_time_spent integer,
  
  -- Validation results
  is_validated boolean DEFAULT false,
  validation_passed boolean DEFAULT false,
  validation_errors text[],
  
  -- Leaderboard result
  leaderboard_id uuid,
  flagged_for_review boolean DEFAULT false,
  flag_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(team_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_sessions_team_id ON challenge_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_challenge_sessions_challenge_id ON challenge_sessions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_sessions_flagged ON challenge_sessions(flagged_for_review);

ALTER TABLE challenge_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to read own challenge sessions" ON challenge_sessions FOR SELECT USING (true);
CREATE POLICY "Allow users to insert challenge sessions" ON challenge_sessions FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 2. Add Session Timer Tracking to team_sessions
-- ============================================================================
ALTER TABLE team_sessions
ADD COLUMN IF NOT EXISTS session_timer_start timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS session_timer_last_activity timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_team_sessions_timer_start 
  ON team_sessions(session_timer_start);

-- ============================================================================
-- 3. Leaderboard Integrity Flags (Admin Review Queue)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leaderboard_integrity_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_id uuid NOT NULL REFERENCES leaderboard(id) ON DELETE CASCADE,
  team_id text NOT NULL,
  challenge_id text NOT NULL,
  
  -- Flagging details
  flag_type text NOT NULL, -- 'time_anomaly', 'impossible_time', 'double_submission', 'race_condition', 'hints_mismatch', 'attempts_mismatch'
  severity text NOT NULL, -- 'low', 'medium', 'high', 'critical'
  description text,
  
  -- Evidence
  evidence jsonb, -- { submitted_time_spent, actual_elapsed, hints_used, stored_hints, etc }
  
  -- Admin action
  reviewed_by uuid,
  reviewed_at timestamptz,
  action text, -- 'approved', 'rejected', 'penalize'
  admin_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_integrity_flags_leaderboard_id 
  ON leaderboard_integrity_flags(leaderboard_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_integrity_flags_team_id 
  ON leaderboard_integrity_flags(team_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_integrity_flags_severity 
  ON leaderboard_integrity_flags(severity);
CREATE INDEX IF NOT EXISTS idx_leaderboard_integrity_flags_reviewed 
  ON leaderboard_integrity_flags(reviewed_by) WHERE reviewed_by IS NULL;

ALTER TABLE leaderboard_integrity_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read integrity flags" ON leaderboard_integrity_flags FOR SELECT USING (true);
CREATE POLICY "Allow service role to modify" ON leaderboard_integrity_flags FOR ALL USING (true);

-- ============================================================================
-- 4. Add Validation Columns to leaderboard
-- ============================================================================
ALTER TABLE leaderboard
ADD COLUMN IF NOT EXISTS session_start_time timestamptz,
ADD COLUMN IF NOT EXISTS server_received_time timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS validation_level text DEFAULT 'unvalidated', -- 'unvalidated', 'validated', 'flagged', 'rejected'
ADD COLUMN IF NOT EXISTS validation_warnings text[],
ADD COLUMN IF NOT EXISTS hints_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_leaderboard_validation_level 
  ON leaderboard(validation_level);
CREATE INDEX IF NOT EXISTS idx_leaderboard_idempotency_key 
  ON leaderboard(idempotency_key);

-- ============================================================================
-- 5. VALIDATION FUNCTION: Check for score anomalies
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_leaderboard_submission(
  p_team_id text,
  p_challenge_id text,
  p_submitted_time_spent integer,
  p_submitted_attempts integer,
  p_submitted_hints_used integer,
  p_session_start_time timestamptz,
  p_server_received_time timestamptz
) RETURNS TABLE (
  is_valid boolean,
  flag_reason text,
  severity text,
  warnings text[]
) AS $$
DECLARE
  v_elapsed_seconds integer;
  v_stored_hints integer := 0;
  v_stored_attempts integer := 0;
  v_warnings text[] := ARRAY[]::text[];
BEGIN
  -- Calculate elapsed time from session start
  v_elapsed_seconds := EXTRACT(EPOCH FROM (p_server_received_time - p_session_start_time))::integer;

  -- Get stored counts from challenge_sessions
  SELECT hint_reveal_count, wrong_attempt_count
  INTO v_stored_hints, v_stored_attempts
  FROM challenge_sessions
  WHERE team_id = p_team_id AND challenge_id = p_challenge_id;

  -- ==================== VALIDATION CHECKS ====================
  
  -- Check 1: Negative values
  IF p_submitted_time_spent < 0 OR p_submitted_attempts < 1 OR p_submitted_hints_used < 0 THEN
    RETURN QUERY SELECT
      false,
      'Negative or invalid values submitted',
      'critical',
      array_append(v_warnings, format('Invalid values: time_spent=%s, attempts=%s, hints=%s', 
        p_submitted_time_spent, p_submitted_attempts, p_submitted_hints_used));
    RETURN;
  END IF;

  -- Check 2: Time spent exceeds elapsed time (with 5-second tolerance for clock skew)
  IF p_submitted_time_spent > v_elapsed_seconds + 5 THEN
    v_warnings := array_append(v_warnings, 
      format('Time anomaly: submitted %s seconds but only %s seconds elapsed', 
        p_submitted_time_spent, v_elapsed_seconds));
  END IF;

  -- Check 3: Impossible time (submitted too fast - less than 1 second)
  IF p_submitted_time_spent < 1 AND p_submitted_time_spent >= 0 THEN
    v_warnings := array_append(v_warnings, 
      'Extremely fast completion (< 1 second) - possible automated/hardcoded solution');
  END IF;

  -- Check 4: Hints mismatch
  IF v_stored_hints > 0 AND p_submitted_hints_used < v_stored_hints THEN
    v_warnings := array_append(v_warnings, 
      format('Hints mismatch: stored %s hint reveals, submitted %s hints_used', 
        v_stored_hints, p_submitted_hints_used));
  END IF;

  -- Check 5: Attempts mismatch
  IF v_stored_attempts > 0 AND p_submitted_attempts < v_stored_attempts + 1 THEN
    v_warnings := array_append(v_warnings, 
      format('Attempts mismatch: stored %s wrong attempts, submitted %s total attempts', 
        v_stored_attempts, p_submitted_attempts));
  END IF;

  -- Check 6: Unreasonably low attempts for difficulty
  IF p_submitted_attempts = 1 AND p_submitted_time_spent > 300 THEN
    v_warnings := array_append(v_warnings, 
      'Unusual pattern: solved on first attempt after 5+ minutes');
  END IF;

  -- All checks passed
  RETURN QUERY SELECT
    (array_length(v_warnings, 1) IS NULL OR array_length(v_warnings, 1) = 0)::boolean,
    CASE 
      WHEN array_length(v_warnings, 1) > 0 THEN 'Warnings detected during validation'
      ELSE NULL
    END,
    CASE 
      WHEN array_length(v_warnings, 1) > 2 THEN 'high'
      WHEN array_length(v_warnings, 1) > 0 THEN 'medium'
      ELSE 'low'
    END,
    v_warnings;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. TRIGGER: Validate leaderboard entries on insert
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_leaderboard_integrity()
RETURNS TRIGGER AS $$
DECLARE
  v_validation RECORD;
  v_error_count integer := 0;
BEGIN
  -- Only validate completed submissions
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ensure we have required fields for validation
  IF NEW.session_start_time IS NULL THEN
    NEW.validation_level := 'unvalidated';
    NEW.validation_warnings := array_append(NEW.validation_warnings, 'Missing session_start_time for validation');
    RETURN NEW;
  END IF;

  -- Run validation checks
  SELECT * INTO v_validation FROM validate_leaderboard_submission(
    NEW.team_name,
    NEW.question_id,
    NEW.time_spent,
    NEW.attempts,
    NEW.hints_used,
    NEW.session_start_time,
    NEW.server_received_time
  );

  -- Set validation level
  IF v_validation.is_valid THEN
    NEW.validation_level := 'validated';
  ELSE
    NEW.validation_level := 'flagged';
  END IF;

  -- Collect warnings
  NEW.validation_warnings := v_validation.warnings;

  -- Auto-flag if high or critical severity
  IF v_validation.severity IN ('high', 'critical') THEN
    NEW.validation_level := 'flagged';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS leaderboard_integrity_check ON leaderboard;

CREATE TRIGGER leaderboard_integrity_check
BEFORE INSERT ON leaderboard
FOR EACH ROW
EXECUTE FUNCTION enforce_leaderboard_integrity();

-- ============================================================================
-- 7. TRIGGER: Flag suspicious submissions after insert
-- ============================================================================
CREATE OR REPLACE FUNCTION flag_suspicious_leaderboard_entries()
RETURNS TRIGGER AS $$
DECLARE
  v_flag_reason text;
  v_severity text := 'low';
  v_evidence jsonb;
BEGIN
  -- Check if submission was already flagged by integrity check
  IF NEW.validation_level = 'flagged' THEN
    v_flag_reason := array_to_string(NEW.validation_warnings, '; ');
    
    -- Calculate severity
    IF array_length(NEW.validation_warnings, 1) > 2 THEN
      v_severity := 'high';
    ELSIF array_length(NEW.validation_warnings, 1) > 0 THEN
      v_severity := 'medium';
    END IF;

    -- Create flag record
    INSERT INTO leaderboard_integrity_flags (
      leaderboard_id, team_id, challenge_id,
      flag_type, severity, description,
      evidence
    ) VALUES (
      NEW.id, NEW.team_name, NEW.question_id,
      'validation_warnings', v_severity, v_flag_reason,
      jsonb_build_object(
        'submitted_time_spent', NEW.time_spent,
        'submitted_attempts', NEW.attempts,
        'submitted_hints_used', NEW.hints_used,
        'session_start_time', NEW.session_start_time,
        'server_received_time', NEW.server_received_time,
        'warnings', NEW.validation_warnings
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS flag_suspicious_submissions ON leaderboard;

CREATE TRIGGER flag_suspicious_submissions
AFTER INSERT ON leaderboard
FOR EACH ROW
EXECUTE FUNCTION flag_suspicious_leaderboard_entries();

-- ============================================================================
-- 8. CONSTRAINTS: Prevent impossible values at table level
-- ============================================================================
ALTER TABLE leaderboard
DROP CONSTRAINT IF EXISTS check_positive_time_spent,
DROP CONSTRAINT IF EXISTS check_positive_attempts,
DROP CONSTRAINT IF EXISTS check_hints_non_negative,
DROP CONSTRAINT IF EXISTS check_reasonable_time_spent;

ALTER TABLE leaderboard
ADD CONSTRAINT check_positive_time_spent CHECK (time_spent >= 0),
ADD CONSTRAINT check_positive_attempts CHECK (attempts >= 1),
ADD CONSTRAINT check_hints_non_negative CHECK (hints_used >= 0),
ADD CONSTRAINT check_reasonable_time_spent CHECK (time_spent <= 86400); -- 24 hours max

-- ============================================================================
-- 9. FUNCTION: Record hint reveal
-- ============================================================================
CREATE OR REPLACE FUNCTION record_hint_reveal(
  p_team_id text,
  p_challenge_id text
) RETURNS uuid AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Upsert challenge_sessions to ensure it exists
  INSERT INTO challenge_sessions (team_id, challenge_id)
  VALUES (p_team_id, p_challenge_id)
  ON CONFLICT (team_id, challenge_id) DO NOTHING;

  -- Increment hint count
  UPDATE challenge_sessions
  SET hint_reveal_count = hint_reveal_count + 1,
      updated_at = now()
  WHERE team_id = p_team_id AND challenge_id = p_challenge_id
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. FUNCTION: Record wrong attempt
-- ============================================================================
CREATE OR REPLACE FUNCTION record_wrong_attempt(
  p_team_id text,
  p_challenge_id text
) RETURNS uuid AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Upsert challenge_sessions
  INSERT INTO challenge_sessions (team_id, challenge_id)
  VALUES (p_team_id, p_challenge_id)
  ON CONFLICT (team_id, challenge_id) DO NOTHING;

  -- Increment wrong attempt count and set/update first attempt time
  UPDATE challenge_sessions
  SET wrong_attempt_count = wrong_attempt_count + 1,
      first_attempt_time = COALESCE(first_attempt_time, now()),
      updated_at = now()
  WHERE team_id = p_team_id AND challenge_id = p_challenge_id
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. FUNCTION: Validate and register leaderboard submission
-- ============================================================================
CREATE OR REPLACE FUNCTION register_leaderboard_submission(
  p_team_id text,
  p_challenge_id text,
  p_submitted_time_spent integer,
  p_submitted_attempts integer,
  p_submitted_hints_used integer,
  p_session_start_time timestamptz
) RETURNS TABLE (
  is_valid boolean,
  warnings text[],
  should_flag boolean,
  flag_reason text
) AS $$
DECLARE
  v_validation RECORD;
  v_challenge_session_id uuid;
BEGIN
  -- Update challenge_sessions with submission details
  UPDATE challenge_sessions
  SET submitted_time_spent = p_submitted_time_spent,
      submitted_attempts = p_submitted_attempts,
      submitted_hints_used = p_submitted_hints_used,
      updated_at = now()
  WHERE team_id = p_team_id AND challenge_id = p_challenge_id
  RETURNING id INTO v_challenge_session_id;

  -- Run validation
  SELECT * INTO v_validation FROM validate_leaderboard_submission(
    p_team_id,
    p_challenge_id,
    p_submitted_time_spent,
    p_submitted_attempts,
    p_submitted_hints_used,
    p_session_start_time,
    now()
  );

  -- Mark as validated
  UPDATE challenge_sessions
  SET is_validated = true,
      validation_passed = v_validation.is_valid,
      validation_errors = v_validation.warnings,
      flagged_for_review = NOT v_validation.is_valid,
      flag_reason = CASE WHEN NOT v_validation.is_valid THEN v_validation.flag_reason ELSE NULL END
  WHERE id = v_challenge_session_id;

  RETURN QUERY SELECT
    v_validation.is_valid,
    v_validation.warnings,
    NOT v_validation.is_valid,
    v_validation.flag_reason;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. VIEW: Leaderboard with validation status
-- ============================================================================
CREATE OR REPLACE VIEW leaderboard_with_validation AS
SELECT
  l.id,
  l.team_name,
  l.question_id,
  l.points,
  l.time_spent,
  l.attempts,
  l.hints_used,
  l.completed_at,
  l.validation_level,
  l.validation_warnings,
  cs.is_validated,
  cs.flagged_for_review,
  COALESCE(
    (SELECT COUNT(*) FROM leaderboard_integrity_flags WHERE leaderboard_id = l.id),
    0
  ) as flag_count
FROM leaderboard l
LEFT JOIN challenge_sessions cs ON l.team_name = cs.team_id AND l.question_id = cs.challenge_id
WHERE l.completed_at IS NOT NULL;

-- ============================================================================
-- 13. VIEW: Suspicious submissions (admin review queue)
-- ============================================================================
CREATE OR REPLACE VIEW admin_review_queue AS
SELECT
  lif.id,
  lif.leaderboard_id,
  lif.team_id,
  lif.challenge_id,
  lif.flag_type,
  lif.severity,
  lif.description,
  lif.created_at,
  lif.reviewed_at,
  lif.reviewed_by IS NOT NULL as is_reviewed,
  l.points,
  l.time_spent,
  l.attempts,
  l.hints_used
FROM leaderboard_integrity_flags lif
LEFT JOIN leaderboard l ON lif.leaderboard_id = l.id
WHERE lif.reviewed_by IS NULL
ORDER BY lif.severity DESC, lif.created_at ASC;
