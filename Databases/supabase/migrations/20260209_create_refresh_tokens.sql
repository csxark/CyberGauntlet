/*
  # JWT Token Expiration and Refresh Token System

  1. Purpose
    - Store refresh tokens with expiration and revocation support
    - Enable "logout all devices" functionality
    - Track active sessions per user
    - Prevent indefinite token validity
    - Support GDPR compliance with session management

  2. Changes
    - Create refresh_tokens table
    - Add session metadata (device, IP, location)
    - Implement automatic cleanup of expired tokens
    - Add revocation support
    - Create views for session management

  3. Security Features
    - Tokens rotated on each refresh
    - Old tokens immediately revoked
    - Cascade revocation for "logout all"
    - Audit trail of token usage
    - Rate limiting on refresh attempts
*/

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  revoked_reason text,
  
  -- Session metadata
  device_info text,
  ip_address text,
  user_agent text,
  location text,
  
  -- Token rotation tracking
  parent_token_id uuid REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  replaced_by_token_id uuid REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  
  -- Rate limiting
  refresh_count integer DEFAULT 0,
  last_refresh_attempt timestamptz,
  
  CONSTRAINT valid_expiration CHECK (expires_at > created_at),
  CONSTRAINT valid_revocation CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

-- Create indexes for performance
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_created_at ON refresh_tokens(created_at DESC);
CREATE INDEX idx_refresh_tokens_user_active ON refresh_tokens(user_id, created_at DESC) WHERE revoked_at IS NULL AND expires_at > now();

-- Add comments
COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens with rotation and revocation support';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hash of the refresh token (never store plaintext)';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'When token expires (7 days default)';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'When token was revoked (logout)';
COMMENT ON COLUMN refresh_tokens.parent_token_id IS 'Previous token in rotation chain';
COMMENT ON COLUMN refresh_tokens.replaced_by_token_id IS 'New token that replaced this one';

-- Create function to automatically clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
  -- Delete tokens that expired more than 30 days ago
  DELETE FROM refresh_tokens
  WHERE expires_at < now() - interval '30 days';
  
  -- Mark expired tokens as revoked (for audit trail)
  UPDATE refresh_tokens
  SET revoked_at = now(),
      revoked_reason = 'expired'
  WHERE expires_at < now()
    AND revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to revoke all tokens for a user (logout all devices)
CREATE OR REPLACE FUNCTION revoke_all_user_tokens(p_user_id uuid, p_reason text DEFAULT 'user_logout_all')
RETURNS integer AS $$
DECLARE
  revoked_count integer;
BEGIN
  UPDATE refresh_tokens
  SET revoked_at = now(),
      revoked_reason = p_reason
  WHERE user_id = p_user_id
    AND revoked_at IS NULL
    AND expires_at > now();
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  RETURN revoked_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to revoke single token and its children
CREATE OR REPLACE FUNCTION revoke_token_chain(p_token_hash text, p_reason text DEFAULT 'user_logout')
RETURNS integer AS $$
DECLARE
  revoked_count integer := 0;
  token_id uuid;
BEGIN
  -- Get token ID
  SELECT id INTO token_id
  FROM refresh_tokens
  WHERE token_hash = p_token_hash;
  
  IF token_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Revoke the token
  UPDATE refresh_tokens
  SET revoked_at = now(),
      revoked_reason = p_reason
  WHERE id = token_id
    AND revoked_at IS NULL;
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  -- Revoke any tokens created from this one
  WITH RECURSIVE token_tree AS (
    SELECT id FROM refresh_tokens WHERE id = token_id
    UNION
    SELECT rt.id FROM refresh_tokens rt
    INNER JOIN token_tree tt ON rt.parent_token_id = tt.id
  )
  UPDATE refresh_tokens
  SET revoked_at = now(),
      revoked_reason = p_reason || '_cascade'
  WHERE id IN (SELECT id FROM token_tree WHERE id != token_id)
    AND revoked_at IS NULL;
  
  RETURN revoked_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to check token validity
CREATE OR REPLACE FUNCTION is_token_valid(p_token_hash text)
RETURNS boolean AS $$
DECLARE
  is_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM refresh_tokens
    WHERE token_hash = p_token_hash
      AND revoked_at IS NULL
      AND expires_at > now()
  ) INTO is_valid;
  
  -- Update last_used_at if valid
  IF is_valid THEN
    UPDATE refresh_tokens
    SET last_used_at = now()
    WHERE token_hash = p_token_hash;
  END IF;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- Create view for active sessions per user
CREATE OR REPLACE VIEW user_active_sessions AS
SELECT 
  user_id,
  COUNT(*) as active_session_count,
  MAX(created_at) as most_recent_session,
  MAX(last_used_at) as last_activity,
  array_agg(DISTINCT device_info ORDER BY device_info) FILTER (WHERE device_info IS NOT NULL) as devices,
  array_agg(DISTINCT ip_address ORDER BY ip_address) FILTER (WHERE ip_address IS NOT NULL) as ip_addresses
FROM refresh_tokens
WHERE revoked_at IS NULL
  AND expires_at > now()
GROUP BY user_id;

COMMENT ON VIEW user_active_sessions IS 'Summary of active sessions per user';

-- Create view for session details (for user UI)
CREATE OR REPLACE VIEW user_sessions_detail AS
SELECT 
  id,
  user_id,
  created_at as logged_in_at,
  last_used_at,
  expires_at,
  device_info,
  ip_address,
  location,
  CASE 
    WHEN last_used_at > now() - interval '5 minutes' THEN 'active'
    WHEN last_used_at > now() - interval '1 hour' THEN 'recent'
    WHEN last_used_at > now() - interval '24 hours' THEN 'idle'
    ELSE 'inactive'
  END as session_status,
  EXTRACT(EPOCH FROM (expires_at - now())) as seconds_until_expiry
FROM refresh_tokens
WHERE revoked_at IS NULL
  AND expires_at > now()
ORDER BY last_used_at DESC;

COMMENT ON VIEW user_sessions_detail IS 'Detailed session information for user dashboard';

-- Create view for suspicious token activity
CREATE OR REPLACE VIEW suspicious_token_activity AS
SELECT 
  user_id,
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE created_at > now() - interval '1 hour') as tokens_last_hour,
  COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked_tokens,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT location) as unique_locations,
  MAX(refresh_count) as max_refresh_count,
  array_agg(DISTINCT ip_address ORDER BY ip_address) as all_ips
FROM refresh_tokens
WHERE created_at > now() - interval '24 hours'
GROUP BY user_id
HAVING 
  COUNT(*) FILTER (WHERE created_at > now() - interval '1 hour') > 10 OR
  COUNT(DISTINCT ip_address) > 5 OR
  MAX(refresh_count) > 20;

COMMENT ON VIEW suspicious_token_activity IS 'Detect suspicious authentication patterns';

-- Create trigger to automatically mark replaced tokens
CREATE OR REPLACE FUNCTION mark_token_replaced()
RETURNS TRIGGER AS $$
BEGIN
  -- If new token has a parent, mark parent as replaced
  IF NEW.parent_token_id IS NOT NULL THEN
    UPDATE refresh_tokens
    SET replaced_by_token_id = NEW.id,
        revoked_at = COALESCE(revoked_at, now()),
        revoked_reason = COALESCE(revoked_reason, 'token_rotated')
    WHERE id = NEW.parent_token_id
      AND revoked_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_token_replaced
  AFTER INSERT ON refresh_tokens
  FOR EACH ROW
  EXECUTE FUNCTION mark_token_replaced();

-- Create function to get token statistics
CREATE OR REPLACE FUNCTION get_token_statistics(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  total_tokens bigint,
  active_tokens bigint,
  expired_tokens bigint,
  revoked_tokens bigint,
  avg_token_lifetime interval,
  most_common_device text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_tokens,
    COUNT(*) FILTER (WHERE revoked_at IS NULL AND expires_at > now()) as active_tokens,
    COUNT(*) FILTER (WHERE expires_at <= now()) as expired_tokens,
    COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked_tokens,
    AVG(COALESCE(revoked_at, expires_at) - created_at) as avg_token_lifetime,
    MODE() WITHIN GROUP (ORDER BY device_info) as most_common_device
  FROM refresh_tokens
  WHERE p_user_id IS NULL OR user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Schedule periodic cleanup (requires pg_cron extension - optional)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_refresh_tokens()');

-- Add RLS policies
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tokens
CREATE POLICY refresh_tokens_select_own
  ON refresh_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can delete (revoke) their own tokens
CREATE POLICY refresh_tokens_delete_own
  ON refresh_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Service role can do anything (for Edge Functions)
CREATE POLICY refresh_tokens_service_role
  ON refresh_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create initial statistics
CREATE TABLE IF NOT EXISTS token_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at timestamptz DEFAULT now(),
  total_active_tokens integer,
  total_users_with_tokens integer,
  avg_tokens_per_user numeric,
  tokens_created_today integer,
  tokens_expired_today integer,
  tokens_revoked_today integer
);

-- Function to record token statistics
CREATE OR REPLACE FUNCTION record_token_stats()
RETURNS void AS $$
BEGIN
  INSERT INTO token_usage_stats (
    total_active_tokens,
    total_users_with_tokens,
    avg_tokens_per_user,
    tokens_created_today,
    tokens_expired_today,
    tokens_revoked_today
  )
  SELECT 
    COUNT(*) FILTER (WHERE revoked_at IS NULL AND expires_at > now()),
    COUNT(DISTINCT user_id),
    AVG(token_count),
    COUNT(*) FILTER (WHERE created_at > current_date),
    COUNT(*) FILTER (WHERE expires_at BETWEEN current_date AND now()),
    COUNT(*) FILTER (WHERE revoked_at BETWEEN current_date AND now())
  FROM (
    SELECT user_id, COUNT(*) as token_count
    FROM refresh_tokens
    WHERE revoked_at IS NULL AND expires_at > now()
    GROUP BY user_id
  ) user_counts;
END;
$$ LANGUAGE plpgsql;
