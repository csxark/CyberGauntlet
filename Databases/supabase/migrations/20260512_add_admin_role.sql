-- =============================================================================
-- CyberGauntlet — Add admin role to profiles
-- Run once against your Supabase project.
-- =============================================================================

-- 1. Add 'role' column to profiles (defaults to 'user')
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- 2. Index for fast role-based look-ups (admin checks)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 3. Allow authenticated users to read their own role
-- (existing SELECT policy already covers this via user_id = auth.uid())

-- 4. Only service-role / admin can promote another user to admin
--    The admin-challenge edge function uses service role, so this is enforced
--    at the function layer — no extra RLS policy needed here.

-- 5. Update challenges RLS so service-role can always manage challenges
--    (the edge function uses service role, these policies are belt-and-suspenders)
DROP POLICY IF EXISTS "Admins can insert challenges" ON challenges;
DROP POLICY IF EXISTS "Admins can update challenges" ON challenges;
DROP POLICY IF EXISTS "Admins can delete challenges" ON challenges;

CREATE POLICY "Admins can insert challenges" ON challenges
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update challenges" ON challenges
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete challenges" ON challenges
  FOR DELETE USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 6. Allow admins to view ALL challenge_submissions (not just their own)
DROP POLICY IF EXISTS "Admins can view all submissions" ON challenge_submissions;
DROP POLICY IF EXISTS "Admins can update all submissions" ON challenge_submissions;

CREATE POLICY "Admins can view all submissions" ON challenge_submissions
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all submissions" ON challenge_submissions
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- =============================================================================
-- TO PROMOTE YOURSELF TO ADMIN:
--
--   UPDATE profiles SET role = 'admin'
--   WHERE user_id = '<your-supabase-auth-user-id>';
--
-- Find your user ID at:
--   Authentication → Users in the Supabase Dashboard
-- =============================================================================
