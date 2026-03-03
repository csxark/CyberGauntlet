/*
  # Issue #82: Input Sanitization for User-Generated Content

  This migration adds database-level sanitization and validation triggers for
  user-generated content so malicious HTML/JS payloads are not persisted.
*/

-- Shared plain text sanitizer (strip tags + normalize whitespace)
CREATE OR REPLACE FUNCTION sanitize_plain_text(input_text text)
RETURNS text AS $$
DECLARE
  cleaned text;
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;

  cleaned := regexp_replace(input_text, '<[^>]*>', '', 'g');
  cleaned := regexp_replace(cleaned, '[\u0000-\u001F\u007F]', '', 'g');
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');

  RETURN btrim(cleaned);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Team name format validation
CREATE OR REPLACE FUNCTION validate_team_name(input_text text)
RETURNS text AS $$
DECLARE
  cleaned text;
BEGIN
  cleaned := sanitize_plain_text(input_text);

  IF cleaned IS NULL OR cleaned = '' THEN
    RETURN cleaned;
  END IF;

  IF length(cleaned) < 3 OR length(cleaned) > 32 THEN
    RAISE EXCEPTION 'team_name must be between 3 and 32 characters';
  END IF;

  IF cleaned !~ '^[A-Za-z0-9 _.-]+$' THEN
    RAISE EXCEPTION 'team_name contains invalid characters';
  END IF;

  RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Profiles sanitization
CREATE OR REPLACE FUNCTION sanitize_profiles_content()
RETURNS TRIGGER AS $$
BEGIN
  NEW.team_name := validate_team_name(NEW.team_name);
  NEW.leader_name := sanitize_plain_text(NEW.leader_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sanitize_profiles_content ON profiles;
CREATE TRIGGER trigger_sanitize_profiles_content
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_profiles_content();

-- Teams sanitization
CREATE OR REPLACE FUNCTION sanitize_teams_content()
RETURNS TRIGGER AS $$
BEGIN
  NEW.team_name := validate_team_name(NEW.team_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sanitize_teams_content ON teams;
CREATE TRIGGER trigger_sanitize_teams_content
  BEFORE INSERT OR UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_teams_content();

-- Team notes sanitization
CREATE OR REPLACE FUNCTION sanitize_team_notes_content()
RETURNS TRIGGER AS $$
BEGIN
  NEW.note_content := sanitize_plain_text(NEW.note_content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sanitize_team_notes_content ON team_notes;
CREATE TRIGGER trigger_sanitize_team_notes_content
  BEFORE INSERT OR UPDATE ON team_notes
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_team_notes_content();

-- Leaderboard sanitization
CREATE OR REPLACE FUNCTION sanitize_leaderboard_content()
RETURNS TRIGGER AS $$
BEGIN
  NEW.team_name := validate_team_name(NEW.team_name);
  NEW.category := sanitize_plain_text(NEW.category);
  NEW.difficulty := sanitize_plain_text(NEW.difficulty);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sanitize_leaderboard_content ON leaderboard;
CREATE TRIGGER trigger_sanitize_leaderboard_content
  BEFORE INSERT OR UPDATE ON leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_leaderboard_content();

-- Challenge submissions sanitization
CREATE OR REPLACE FUNCTION sanitize_challenge_submissions_content()
RETURNS TRIGGER AS $$
BEGIN
  NEW.title := sanitize_plain_text(NEW.title);
  NEW.description := sanitize_plain_text(NEW.description);
  NEW.category := sanitize_plain_text(NEW.category);
  NEW.difficulty := sanitize_plain_text(NEW.difficulty);
  NEW.correct_flag := sanitize_plain_text(NEW.correct_flag);

  IF NEW.hints IS NOT NULL THEN
    NEW.hints := (
      SELECT array_agg(sanitize_plain_text(h))
      FROM unnest(NEW.hints) AS h
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sanitize_challenge_submissions_content ON challenge_submissions;
CREATE TRIGGER trigger_sanitize_challenge_submissions_content
  BEFORE INSERT OR UPDATE ON challenge_submissions
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_challenge_submissions_content();
