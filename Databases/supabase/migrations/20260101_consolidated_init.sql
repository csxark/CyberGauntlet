-- =============================================================================
-- CyberGauntlet - Consolidated Database Migration
-- Generated: 2026-05-11
-- Merges all 27 incremental migrations into a single init script
-- =============================================================================

-- =========================== 1. PROFILES ====================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_name text,
  leader_name text,
  profile_picture_url text,
  points integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (auth.uid() = user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- =========================== 2. POSTS =======================================
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text,
  content text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own posts" ON public.posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================== 3. EVENTS ======================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  active_challenges jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to events" ON events FOR SELECT USING (true);
CREATE POLICY "Allow admin insert to events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin update to events" ON events FOR UPDATE USING (true) WITH CHECK (true);

-- =========================== 4. LEADERBOARD =================================
CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text NOT NULL,
  question_id text NOT NULL,
  time_spent integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 1,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  hints_used integer DEFAULT 0,
  start_time timestamptz,
  completion_time timestamptz,
  points integer DEFAULT 0,
  category text,
  difficulty text,
  event_id uuid REFERENCES events(id),
  idempotency_key text,
  version integer DEFAULT 1,
  server_completion_time timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  session_start_time timestamptz,
  server_received_time timestamptz DEFAULT now(),
  validation_level text DEFAULT 'unvalidated',
  validation_warnings text[],
  CONSTRAINT check_time_spent_non_negative CHECK (time_spent >= 0),
  CONSTRAINT check_attempts_positive CHECK (attempts > 0),
  CONSTRAINT check_hints_used_non_negative CHECK (hints_used >= 0),
  CONSTRAINT check_points_non_negative CHECK (points >= 0),
  CONSTRAINT check_time_spent_reasonable CHECK (time_spent < 86400)
);
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to leaderboard" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Allow public insert to leaderboard" ON leaderboard FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to leaderboard" ON leaderboard FOR UPDATE USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_leaderboard_team_name ON leaderboard(team_name);
CREATE INDEX IF NOT EXISTS idx_leaderboard_question_id ON leaderboard(question_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_completed_at ON leaderboard(completed_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_unique_completion ON leaderboard(team_name, question_id) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leaderboard_idempotency_key ON leaderboard(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_idempotency_key_unique ON leaderboard(idempotency_key) WHERE idempotency_key IS NOT NULL AND completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leaderboard_validation_level ON leaderboard(validation_level);
CREATE INDEX IF NOT EXISTS idx_leaderboard_suspicious ON leaderboard(team_name, time_spent, attempts) WHERE completed_at IS NOT NULL;

-- =========================== 5. TEAM SESSIONS ===============================
CREATE TABLE IF NOT EXISTS team_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL UNIQUE,
  device_id text NOT NULL,
  logged_in_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE,
  failed_attempts integer DEFAULT 0,
  last_failed_attempt timestamptz,
  rate_limit_locked_until timestamptz,
  rate_limit_level integer DEFAULT 0,
  session_timer_start timestamptz DEFAULT now(),
  session_timer_last_activity timestamptz DEFAULT now()
);
ALTER TABLE team_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own team sessions" ON team_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own team sessions" ON team_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own team sessions" ON team_sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_team_sessions_team_id ON team_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_team_sessions_is_active ON team_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_team_sessions_user_id ON team_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_team_sessions_rate_limit_locked_until ON team_sessions(rate_limit_locked_until) WHERE rate_limit_locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_sessions_timer_start ON team_sessions(session_timer_start);

-- =========================== 6. TEAMS =======================================
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text UNIQUE NOT NULL,
  team_name text NOT NULL,
  members uuid[] DEFAULT '{}',
  shared_points integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view their teams" ON teams FOR SELECT USING (auth.uid() = ANY(members));
CREATE POLICY "Team members can update their teams" ON teams FOR UPDATE USING (auth.uid() = ANY(members)) WITH CHECK (auth.uid() = ANY(members));
CREATE POLICY "Anyone can create teams" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Team members can delete their teams" ON teams FOR DELETE USING (auth.uid() = ANY(members));
CREATE INDEX IF NOT EXISTS idx_teams_team_id ON teams(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_members ON teams USING GIN(members);

-- =========================== 7. TEAM NOTES ==================================
CREATE TABLE IF NOT EXISTS team_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view their team notes" ON team_notes FOR SELECT USING (EXISTS (SELECT 1 FROM teams WHERE teams.id = team_notes.team_id AND auth.uid() = ANY(teams.members)));
CREATE POLICY "Team members can insert notes" ON team_notes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM teams WHERE teams.id = team_notes.team_id AND auth.uid() = ANY(teams.members)) AND auth.uid() = user_id);
CREATE POLICY "Team members can update own notes" ON team_notes FOR UPDATE USING (EXISTS (SELECT 1 FROM teams WHERE teams.id = team_notes.team_id AND auth.uid() = ANY(teams.members)) AND auth.uid() = user_id) WITH CHECK (EXISTS (SELECT 1 FROM teams WHERE teams.id = team_notes.team_id AND auth.uid() = ANY(teams.members)) AND auth.uid() = user_id);
CREATE POLICY "Team members can delete own notes" ON team_notes FOR DELETE USING (EXISTS (SELECT 1 FROM teams WHERE teams.id = team_notes.team_id AND auth.uid() = ANY(teams.members)) AND auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_team_id ON team_notes(team_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_challenge_id ON team_notes(challenge_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_user_id ON team_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_created_at ON team_notes(created_at DESC);

-- =========================== 8. CHALLENGE VALIDATIONS =======================
CREATE TABLE IF NOT EXISTS challenge_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id text NOT NULL,
  correct_flag_hash text NOT NULL,
  feedback_messages jsonb NOT NULL DEFAULT '{"correct":"Flag verified successfully!","incorrect":"Incorrect flag. Keep analyzing...","format_error":"Invalid flag format.","partial_hint":"Getting closer!"}',
  validation_rules jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE challenge_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read challenge validations" ON challenge_validations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow service role to manage challenge validations" ON challenge_validations FOR ALL USING (auth.role() = 'service_role');
CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_validations_challenge_id ON challenge_validations(challenge_id);

-- =========================== 9. CHALLENGE SUBMISSIONS =======================
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
CREATE POLICY "Users can view own submissions" ON challenge_submissions FOR SELECT USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = submitter_id));
CREATE POLICY "Users can insert own submissions" ON challenge_submissions FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = submitter_id));
CREATE POLICY "Users can update own pending submissions" ON challenge_submissions FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = submitter_id) AND status = 'pending') WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = submitter_id) AND status = 'pending');
CREATE POLICY "Admins can view all submissions" ON challenge_submissions FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins can update all submissions" ON challenge_submissions FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin') WITH CHECK (auth.jwt() ->> 'role' = 'admin');
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_submitter_id ON challenge_submissions(submitter_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_status ON challenge_submissions(status);

-- =========================== 10. CHALLENGES =================================
CREATE TABLE IF NOT EXISTS challenges (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  file_name text DEFAULT '',
  file_path text DEFAULT '',
  correct_flag text NOT NULL,
  hints text[] DEFAULT '{}',
  category text NOT NULL,
  difficulty text NOT NULL,
  submission_id uuid REFERENCES challenge_submissions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active challenges" ON challenges FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can insert challenges" ON challenges FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins can update challenges" ON challenges FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin') WITH CHECK (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins can delete challenges" ON challenges FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
CREATE INDEX IF NOT EXISTS idx_challenges_category ON challenges(category);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_is_active ON challenges(is_active);

-- =========================== 11. REFRESH TOKENS =============================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  revoked_reason text,
  device_info text,
  ip_address text,
  user_agent text,
  location text,
  parent_token_id uuid REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  replaced_by_token_id uuid REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  refresh_count integer DEFAULT 0,
  last_refresh_attempt timestamptz,
  CONSTRAINT valid_expiration CHECK (expires_at > created_at),
  CONSTRAINT valid_revocation CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refresh_tokens_select_own" ON refresh_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "refresh_tokens_delete_own" ON refresh_tokens FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "refresh_tokens_service_role" ON refresh_tokens FOR ALL USING (auth.role() = 'service_role');
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_user_active ON refresh_tokens(user_id, created_at DESC) WHERE revoked_at IS NULL AND expires_at > now();

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

-- =========================== 12. RATE LIMIT LOGS ============================
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
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_team_name ON rate_limit_logs(team_name);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_created_at ON rate_limit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_severity ON rate_limit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_team_severity ON rate_limit_logs(team_name, severity);

-- =========================== 13. CHALLENGE SESSIONS =========================
CREATE TABLE IF NOT EXISTS challenge_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL,
  challenge_id text NOT NULL,
  session_start_time timestamptz NOT NULL DEFAULT now(),
  first_attempt_time timestamptz,
  hint_reveal_count integer NOT NULL DEFAULT 0,
  wrong_attempt_count integer NOT NULL DEFAULT 0,
  submitted_hints_used integer,
  submitted_attempts integer,
  submitted_time_spent integer,
  is_validated boolean DEFAULT false,
  validation_passed boolean DEFAULT false,
  validation_errors text[],
  leaderboard_id uuid,
  flagged_for_review boolean DEFAULT false,
  flag_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, challenge_id)
);
ALTER TABLE challenge_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to read own challenge sessions" ON challenge_sessions FOR SELECT USING (true);
CREATE POLICY "Allow users to insert challenge sessions" ON challenge_sessions FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_challenge_sessions_team_id ON challenge_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_challenge_sessions_challenge_id ON challenge_sessions(challenge_id);

-- =========================== 14. INTEGRITY FLAGS ============================
CREATE TABLE IF NOT EXISTS leaderboard_integrity_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_id uuid NOT NULL REFERENCES leaderboard(id) ON DELETE CASCADE,
  team_id text NOT NULL,
  challenge_id text NOT NULL,
  flag_type text NOT NULL,
  severity text NOT NULL,
  description text,
  evidence jsonb,
  reviewed_by uuid,
  reviewed_at timestamptz,
  action text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE leaderboard_integrity_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read integrity flags" ON leaderboard_integrity_flags FOR SELECT USING (true);
CREATE POLICY "Allow service role to modify" ON leaderboard_integrity_flags FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_leaderboard_integrity_flags_leaderboard_id ON leaderboard_integrity_flags(leaderboard_id);

-- =========================== VIEWS ==========================================
CREATE OR REPLACE VIEW user_sessions_detail AS
SELECT id, user_id, created_at as logged_in_at, last_used_at, expires_at, device_info, ip_address, location,
  CASE WHEN last_used_at > now() - interval '5 minutes' THEN 'active'
       WHEN last_used_at > now() - interval '1 hour' THEN 'recent'
       WHEN last_used_at > now() - interval '24 hours' THEN 'idle'
       ELSE 'inactive' END as session_status,
  EXTRACT(EPOCH FROM (expires_at - now())) as seconds_until_expiry
FROM refresh_tokens WHERE revoked_at IS NULL AND expires_at > now() ORDER BY last_used_at DESC;

CREATE OR REPLACE VIEW suspicious_activity_24h AS
SELECT team_name, COUNT(*) as violation_count, MAX(severity) as max_severity,
  MAX(lockout_level) as max_lockout_level, MAX(created_at) as last_violation,
  ARRAY_AGG(DISTINCT challenge_id) as attempted_challenges
FROM rate_limit_logs WHERE created_at > now() - interval '24 hours'
GROUP BY team_name HAVING COUNT(*) >= 3 ORDER BY violation_count DESC;

-- =========================== FUNCTIONS ======================================
CREATE OR REPLACE FUNCTION sanitize_plain_text(input_text text) RETURNS text AS $$
DECLARE cleaned text;
BEGIN
  IF input_text IS NULL THEN RETURN NULL; END IF;
  cleaned := regexp_replace(input_text, '<[^>]*>', '', 'g');
  cleaned := regexp_replace(cleaned, '[\u0000-\u001F\u007F]', '', 'g');
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  RETURN btrim(cleaned);
END; $$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION validate_team_name(input_text text) RETURNS text AS $$
DECLARE cleaned text;
BEGIN
  cleaned := sanitize_plain_text(input_text);
  IF cleaned IS NULL OR cleaned = '' THEN RETURN cleaned; END IF;
  IF length(cleaned) < 3 OR length(cleaned) > 32 THEN RAISE EXCEPTION 'team_name must be between 3 and 32 characters'; END IF;
  IF cleaned !~ '^[A-Za-z0-9 _.-]+$' THEN RAISE EXCEPTION 'team_name contains invalid characters'; END IF;
  RETURN cleaned;
END; $$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens() RETURNS void AS $$
BEGIN
  DELETE FROM refresh_tokens WHERE expires_at < now() - interval '30 days';
  UPDATE refresh_tokens SET revoked_at = now(), revoked_reason = 'expired' WHERE expires_at < now() AND revoked_at IS NULL;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION revoke_all_user_tokens(p_user_id uuid, p_reason text DEFAULT 'user_logout_all') RETURNS integer AS $$
DECLARE revoked_count integer;
BEGIN
  UPDATE refresh_tokens SET revoked_at = now(), revoked_reason = p_reason WHERE user_id = p_user_id AND revoked_at IS NULL AND expires_at > now();
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  RETURN revoked_count;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_hint_reveal(p_team_id text, p_challenge_id text) RETURNS uuid AS $$
DECLARE v_session_id uuid;
BEGIN
  INSERT INTO challenge_sessions (team_id, challenge_id) VALUES (p_team_id, p_challenge_id) ON CONFLICT (team_id, challenge_id) DO NOTHING;
  UPDATE challenge_sessions SET hint_reveal_count = hint_reveal_count + 1, updated_at = now() WHERE team_id = p_team_id AND challenge_id = p_challenge_id RETURNING id INTO v_session_id;
  RETURN v_session_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_wrong_attempt(p_team_id text, p_challenge_id text) RETURNS uuid AS $$
DECLARE v_session_id uuid;
BEGIN
  INSERT INTO challenge_sessions (team_id, challenge_id) VALUES (p_team_id, p_challenge_id) ON CONFLICT (team_id, challenge_id) DO NOTHING;
  UPDATE challenge_sessions SET wrong_attempt_count = wrong_attempt_count + 1, first_attempt_time = COALESCE(first_attempt_time, now()), updated_at = now() WHERE team_id = p_team_id AND challenge_id = p_challenge_id RETURNING id INTO v_session_id;
  RETURN v_session_id;
END; $$ LANGUAGE plpgsql;

-- =========================== SANITIZATION TRIGGERS ==========================
CREATE OR REPLACE FUNCTION sanitize_profiles_content() RETURNS TRIGGER AS $$
BEGIN NEW.team_name := validate_team_name(NEW.team_name); NEW.leader_name := sanitize_plain_text(NEW.leader_name); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_sanitize_profiles_content ON profiles;
CREATE TRIGGER trigger_sanitize_profiles_content BEFORE INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION sanitize_profiles_content();

CREATE OR REPLACE FUNCTION sanitize_teams_content() RETURNS TRIGGER AS $$
BEGIN NEW.team_name := validate_team_name(NEW.team_name); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_sanitize_teams_content ON teams;
CREATE TRIGGER trigger_sanitize_teams_content BEFORE INSERT OR UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION sanitize_teams_content();

CREATE OR REPLACE FUNCTION sanitize_team_notes_content() RETURNS TRIGGER AS $$
BEGIN NEW.note_content := sanitize_plain_text(NEW.note_content); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_sanitize_team_notes_content ON team_notes;
CREATE TRIGGER trigger_sanitize_team_notes_content BEFORE INSERT OR UPDATE ON team_notes FOR EACH ROW EXECUTE FUNCTION sanitize_team_notes_content();

CREATE OR REPLACE FUNCTION sanitize_leaderboard_content() RETURNS TRIGGER AS $$
BEGIN NEW.team_name := validate_team_name(NEW.team_name); NEW.category := sanitize_plain_text(NEW.category); NEW.difficulty := sanitize_plain_text(NEW.difficulty); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_sanitize_leaderboard_content ON leaderboard;
CREATE TRIGGER trigger_sanitize_leaderboard_content BEFORE INSERT OR UPDATE ON leaderboard FOR EACH ROW EXECUTE FUNCTION sanitize_leaderboard_content();

-- Token rotation trigger
CREATE OR REPLACE FUNCTION mark_token_replaced() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_token_id IS NOT NULL THEN
    UPDATE refresh_tokens SET replaced_by_token_id = NEW.id, revoked_at = COALESCE(revoked_at, now()), revoked_reason = COALESCE(revoked_reason, 'token_rotated') WHERE id = NEW.parent_token_id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_mark_token_replaced AFTER INSERT ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION mark_token_replaced();

-- =========================== SEED DATA ======================================
INSERT INTO challenges (id, title, description, file_name, file_path, correct_flag, hints, category, difficulty, is_active) VALUES
('q1', 'The Cryptographer''s Dilemma', 'You are a cybersecurity consultant investigating a breach at the Ministry of Digital Secrets.', 'cipher_collection.txt', '/challenges/q1/cipher_collection.txt', 'CG{Guvf vf gur Synt!}', ARRAY['This code is based on a simple rotational shift of 3','This message uses Polybius square coordinates','The shift applied equals the length of the shift itself'], 'Cryptography', 'Intermediate', true),
('q2', 'Pair Sum Optimization', 'You are auditing a data processing script for a university that needs to quickly count successful pairings of student IDs.', '', '', 'CG{TWO_POINTERS_ALGORITHM}', ARRAY['Set one marker at first element and second at last','Calculate sum at two markers and compare to T','Solution fits in a while loop with low < high'], 'Programming', 'Beginner', true),
('q3', 'The Security Key Reverser', 'You have recovered a C program designed to validate a 10-character security key.', 'security.c', '/challenges/q3/security.c', 'CG{5E4D3A1B2C}', ARRAY['Swap the two halves','Reverse the new first half in place','The flag is the final state of the key array'], 'Programming', 'Intermediate', true),
('q4', 'Invisible Ink Scenario', 'You have recovered a text file which appears to contain nothing more than a simple sentence.', 'secretnote.txt', '/challenges/q4/secretnote.txt', 'CG{THIS_YOUR_FLAG}', ARRAY['Zero-width characters represent binary digits','Use a specialized tool to extract invisible Unicode','Correct mapping unlocks the true ASCII flag'], 'Steganography', 'Advanced', true),
('q5', 'The Final Register Readout', 'You are a penetration tester attempting to recover a sensitive 6-character access key.', '', '', 'CG{SPToWP}', ARRAY['Each three-digit number represents an ASCII character','Convert each quinary number to decimal using powers of 5','Map the resulting decimal values to ASCII characters'], 'Cryptography', 'Advanced', true)
ON CONFLICT (id) DO NOTHING;

