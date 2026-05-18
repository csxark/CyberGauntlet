-- CyberGauntlet Database Schema
-- Core tables and functions required for the application

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_name TEXT,
  leader_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- ============================================
-- TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL UNIQUE,
  members TEXT[] DEFAULT ARRAY[]::TEXT[],
  shared_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- CHALLENGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty TEXT,
  points INTEGER DEFAULT 100,
  correct_flag TEXT NOT NULL,
  hints TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_challenges_question_id ON challenges(question_id);

-- ============================================
-- CHALLENGE VALIDATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS challenge_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  correct_flag_hash TEXT NOT NULL,
  feedback_messages JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_challenge_validations_challenge_id ON challenge_validations(challenge_id);

-- ============================================
-- CHALLENGE SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS challenge_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  session_start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  wrong_attempt_count INTEGER DEFAULT 0,
  hint_reveal_count INTEGER DEFAULT 0,
  leaderboard_id UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, challenge_id)
);

CREATE INDEX idx_challenge_sessions_team_id ON challenge_sessions(team_id);
CREATE INDEX idx_challenge_sessions_challenge_id ON challenge_sessions(challenge_id);

-- ============================================
-- LEADERBOARD TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  question_id TEXT NOT NULL,
  time_spent INTEGER,
  attempts INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_leaderboard_completed_at ON leaderboard(completed_at);
CREATE INDEX idx_leaderboard_team_name ON leaderboard(team_name);
CREATE UNIQUE INDEX idx_leaderboard_idempotency ON leaderboard(idempotency_key);

-- ============================================
-- TEAM NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_team_notes_team_id ON team_notes(team_id);
CREATE INDEX idx_team_notes_challenge_id ON team_notes(challenge_id);

-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  refresh_count INTEGER DEFAULT 0,
  parent_token_id UUID REFERENCES refresh_tokens(id),
  device_info TEXT,
  user_agent TEXT,
  ip_address TEXT,
  last_refresh_attempt TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================
-- TEAM SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT,
  is_active BOOLEAN DEFAULT true,
  logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_team_sessions_team_id ON team_sessions(team_id);
CREATE INDEX idx_team_sessions_user_id ON team_sessions(user_id);

-- ============================================
-- RATE LIMIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_rate_limit_logs_user_id ON rate_limit_logs(user_id);
CREATE INDEX idx_rate_limit_logs_endpoint ON rate_limit_logs(endpoint);

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_team_id ON events(team_id);
CREATE INDEX idx_events_event_type ON events(event_type);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Check if a refresh token is valid and not expired
CREATE OR REPLACE FUNCTION is_token_valid(p_token_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM refresh_tokens
    WHERE token_hash = p_token_hash
    AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke all user tokens (logout all devices)
CREATE OR REPLACE FUNCTION revoke_all_user_tokens(p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM refresh_tokens
  WHERE user_id = p_user_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record a wrong attempt on a challenge
CREATE OR REPLACE FUNCTION record_wrong_attempt(p_team_id UUID, p_challenge_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE challenge_sessions
  SET wrong_attempt_count = wrong_attempt_count + 1
  WHERE team_id = p_team_id AND challenge_id = p_challenge_id;

  IF NOT FOUND THEN
    INSERT INTO challenge_sessions (team_id, challenge_id, wrong_attempt_count)
    VALUES (p_team_id, p_challenge_id, 1);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record a hint reveal on a challenge
CREATE OR REPLACE FUNCTION record_hint_reveal(p_team_id UUID, p_challenge_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE challenge_sessions
  SET hint_reveal_count = hint_reveal_count + 1
  WHERE team_id = p_team_id AND challenge_id = p_challenge_id;

  IF NOT FOUND THEN
    INSERT INTO challenge_sessions (team_id, challenge_id, hint_reveal_count)
    VALUES (p_team_id, p_challenge_id, 1);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Register a leaderboard submission
CREATE OR REPLACE FUNCTION register_leaderboard_submission(
  p_team_name TEXT,
  p_question_id TEXT,
  p_time_spent INTEGER,
  p_attempts INTEGER,
  p_hints_used INTEGER,
  p_points INTEGER,
  p_idempotency_key TEXT
)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  INSERT INTO leaderboard (
    team_name, question_id, time_spent, attempts, hints_used, points,
    completed_at, idempotency_key
  ) VALUES (
    p_team_name, p_question_id, p_time_spent, p_attempts, p_hints_used, p_points,
    now(), p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    updated_at = now()
  RETURNING id INTO v_entry_id;

  RETURN COALESCE(v_entry_id, (
    SELECT id FROM leaderboard WHERE idempotency_key = p_idempotency_key LIMIT 1
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Basic RLS Policies (permissive - adjust based on security requirements)

-- Profiles: Users can read all profiles, update their own
CREATE POLICY "Allow public read" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow users to update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Leaderboard: Public read
CREATE POLICY "Allow public read" ON leaderboard
  FOR SELECT USING (true);

-- Challenges: Public read
CREATE POLICY "Allow public read" ON challenges
  FOR SELECT USING (true);

-- Team notes: Team members can read/write
CREATE POLICY "Allow team members to read" ON team_notes
  FOR SELECT USING (true);

CREATE POLICY "Allow users to create notes" ON team_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Refresh tokens: Owned by user, requires auth
CREATE POLICY "Users can manage their own tokens" ON refresh_tokens
  FOR ALL USING (auth.uid() = user_id);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON profiles, challenges, leaderboard TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON team_notes TO authenticated;
GRANT SELECT, INSERT ON refresh_tokens TO authenticated;
