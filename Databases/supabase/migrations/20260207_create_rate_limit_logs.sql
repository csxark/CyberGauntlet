/*
  # Create Abuse Detection Logs Table

  1. New Tables
    - `rate_limit_logs`
      - `id` (uuid, primary key) - Unique identifier
      - `team_name` (text) - Team identifier
      - `challenge_id` (text) - Challenge being attempted
      - `attempt_count` (integer) - Number of failed attempts
      - `lockout_level` (integer) - Current exponential backoff level
      - `locked_until` (timestamptz) - When lockout expires
      - `ip_address` (text, optional) - Requester IP for pattern analysis
      - `user_agent` (text, optional) - User agent for anomaly detection
      - `severity` (text) - Abuse severity (low, medium, high, critical)
      - `action_taken` (text) - Description of action taken by system
      - `created_at` (timestamptz) - Log timestamp

  2. Purpose
    - Track all rate limit violations for audit and analysis
    - Identify patterns of abuse and suspicious activity
    - Support admin investigation of security incidents
    - Enable automated alerting on critical patterns
    - Maintain compliance logs for security review

  3. Indexes
    - Index on team_name for quick lookup by team
    - Index on created_at for time-based queries
    - Index on severity for filtering by alert level
    - Composite index on (team_name, severity) for pattern analysis

  4. Retention
    - Keep logs for 90 days by default
    - Archive older logs for historical analysis
    - Support compliance requirements
*/

CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text NOT NULL,
  challenge_id text,
  attempt_count integer NOT NULL,
  lockout_level integer NOT NULL,
  locked_until timestamptz,
  ip_address text,
  user_agent text,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  action_taken text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_team_name ON rate_limit_logs(team_name);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_created_at ON rate_limit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_severity ON rate_limit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_team_severity ON rate_limit_logs(team_name, severity);

-- Create index for finding recent suspicious activity
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_recent_abuse 
  ON rate_limit_logs(team_name, created_at DESC) 
  WHERE severity IN ('high', 'critical');

-- Add comment explaining the table
COMMENT ON TABLE rate_limit_logs 
  IS 'Audit log for rate limiting violations and abuse detection patterns';

COMMENT ON COLUMN rate_limit_logs.severity 
  IS 'Severity level of the abuse attempt: low (1-2 attempts), medium (3-5), high (6+), critical (lockout level > 2)';

COMMENT ON COLUMN rate_limit_logs.action_taken 
  IS 'Description of action taken by the system (e.g., "Team locked out for 30 seconds", "Alert threshold reached")';

-- Optional: Create view for suspicious activity within last 24 hours
CREATE OR REPLACE VIEW suspicious_activity_24h AS
SELECT 
  team_name,
  COUNT(*) as violation_count,
  MAX(severity) as max_severity,
  MAX(lockout_level) as max_lockout_level,
  MAX(created_at) as last_violation,
  ARRAY_AGG(DISTINCT challenge_id) as attempted_challenges
FROM rate_limit_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY team_name
HAVING COUNT(*) >= 3
ORDER BY violation_count DESC;

-- Optional: Create view for critical abuse patterns
CREATE OR REPLACE VIEW critical_abuse_patterns AS
SELECT 
  team_name,
  COUNT(*) as critical_incidents,
  COUNT(DISTINCT challenge_id) as unique_challenges,
  MAX(lockout_level) as max_backoff_level,
  MIN(created_at) as first_incident,
  MAX(created_at) as last_incident,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 3600 as incident_span_hours
FROM rate_limit_logs
WHERE severity = 'critical'
  AND created_at > now() - interval '7 days'
GROUP BY team_name
ORDER BY critical_incidents DESC;
