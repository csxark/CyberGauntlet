# Supabase Authentication Setup Guide

## Problem
The error "Anonymous sign-ins are disabled" indicates your Supabase project isn't configured to allow user authentication. This prevents both new users from signing up and existing users from logging in.

## Solution: Configure Supabase Email/Password Authentication

### Step 1: Enable Email/Password Authentication
1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Authentication** → **Providers**
3. Find **Email** provider
4. Toggle it **ON**
5. Configure email provider settings:
   - **Confirm email**: Choose based on your needs
     - **Enabled**: Users must verify email before accessing
     - **Disabled**: Users can access immediately (faster for testing)
   - **Email OTP**: Can be left disabled unless you specifically need SMS
6. Save changes

### Step 2: Verify Email Provider Configuration
In the **Authentication** → **Configuration** section:
- Ensure **Site URL** is set to: `http://localhost:5173` (for local dev)
- For production, add your actual domain
- **Redirect URLs** should include:
  - `http://localhost:5173/challenges`
  - `http://localhost:5173/**` (for all local routes)
  - Your production URLs

### Step 3: Database Policies Setup
The migrations file includes Row Level Security (RLS) policies. Ensure these are working:

```sql
-- Check if tables have RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verify policies exist for key tables
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('refresh_tokens', 'profiles', 'team_sessions');
```

For **unauthenticated access** to public data (leaderboard, docs, etc):
- The `Leaderboard` table already has public read access via:
  ```sql
  CREATE POLICY "Allow public read access to leaderboard" 
  ON leaderboard FOR SELECT USING (true);
  ```

### Step 4: Test the Auth Flow

#### Test Signup (New User)
1. Go to `http://localhost:5173/auth`
2. Click **REGISTER NEW OPERATIVE**
3. Enter email: `testuser@example.com`
4. Enter password: `Test@123456`
5. Click submit
6. If email verification is enabled, check your inbox for verification link
7. Verify email and you should be redirected to challenges

#### Test Login (Existing User)
1. Go to `http://localhost:5173/auth`
2. Click **INITIATE SESSION**
3. Enter the email and password you just created
4. You should be logged in and redirected to `/challenges`

### Step 5: Configure Public Access Routes

The following routes should be accessible without authentication:
- `/` - Landing page ✓
- `/auth` - Auth page ✓
- `/docs` - Documentation ✓
- `/leader` - Leaderboard ✓

Protected routes (require login):
- `/challenges` - Challenge page
- `/dashboard` - User dashboard
- `/profile` - User profile
- `/admin` - Admin dashboard

These are already configured in `src/App.tsx` and `src/pages/ProtectedRoute.tsx`

### Step 6: Handle Email Verification (Optional)

If you enabled email verification, you need to:

1. **Set up Email Provider** in Supabase:
   - Go to **Authentication** → **Email Templates**
   - Customize confirmation email if desired
   - Make sure your email is properly configured (SMTP settings)

2. **Update Email Confirmation URL**:
   - Supabase sends confirmation links
   - Ensure your `Site URL` in Auth settings points to `http://localhost:5173`
   - The confirmation link will automatically redirect to your app

### Step 7: For Production Deployment

When deploying to production:

1. Update **Site URL** in Supabase Authentication settings:
   - Set to your production domain (e.g., `https://cybergauntlet.com`)

2. Add **Redirect URLs**:
   - `https://cybergauntlet.com/challenges`
   - `https://cybergauntlet.com/**`

3. Update `.env.production`:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Set proper SMTP credentials for email delivery

## Troubleshooting

### Error: "Anonymous sign-ins are disabled"
**Cause**: Email provider not enabled  
**Fix**: Follow Step 1 to enable Email provider

### Error: "User already registered"
**Cause**: Email is already in use  
**Fix**: Use a different email address or reset the password

### Error: "Invalid login credentials"
**Cause**: Wrong email/password combination  
**Fix**: Verify email and password are correct

### Email verification not received
**Cause**: SMTP not configured or email in spam folder  
**Fix**: 
- Check spam/trash folder
- Verify SMTP settings in Supabase
- If using free tier, make sure email is whitelisted

### Users can't access protected routes
**Cause**: User not properly authenticated  
**Fix**: 
- Ensure user is logged in (check browser console)
- Verify AuthProvider wraps entire app (src/App.tsx)
- Check if refresh tokens are being stored (check localStorage)

## Environment Variables

Ensure `.env` file has correct Supabase credentials:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx
```

These are already configured in `.env` for local development.

## Key Files

- **Auth Context**: `src/context/AuthContext.tsx` - Manages auth state and token refresh
- **Login Page**: `src/pages/Login.tsx` - Sign up and login UI
- **Protected Routes**: `src/pages/ProtectedRoute.tsx` - Restricts access to authenticated users
- **Supabase Client**: `src/lib/supabase.ts` - Supabase initialization

## Database Schema Notes

Key tables created by migrations:
- `auth.users` - Supabase managed (automatic)
- `profiles` - User profiles (RLS enabled)
- `refresh_tokens` - Session tokens (RLS enabled)
- `team_sessions` - Team authentication sessions
- `leaderboard` - Public challenge completions (RLS enabled, public read)

All tables have Row Level Security enabled for security. Public tables allow unauthenticated SELECT access as appropriate.
