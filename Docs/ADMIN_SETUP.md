# CyberGauntlet - Challenge Portal Guide

## Features Implemented

### 1. Device Restriction (Supabase-Based)
- One device per team enforcement using Supabase `team_sessions` table
- Once a team logs in from a device, **no other device can access** that team account
- Device ID tracked in `team_sessions` table with `is_active` flag
- Login attempt from different device shows restriction screen
- Only logout deactivates the session, allowing re-login from another device

**How it works:**
1. Team logs in from Device A → Session created in Supabase
2. Team tries to login from Device B → Access blocked (session already active)
3. Team logs out from Device A → Session marked inactive
4. Team can now login from Device B or any other device

### 2. Multiple Question Flow
- Teams complete challenges sequentially
- After correct flag submission, system automatically loads next question
- Time and attempts tracked separately for each challenge
- Progress indicator shows: "X/3 challenges completed"
- Completion screen when all challenges finished

### 3. Local Progress Tracking
localStorage keys per team:
- `cybergauntlet_auth` - Session (teamId, teamName, leaderName)
- `cybergauntlet_progress_{teamId}` - Current challenge state
- `cybergauntlet_completed_{teamId}` - Array of completed question IDs
- `cybergauntlet_current_device` - Device identifier

## Database Tables

### team_sessions table
Tracks active login sessions:
- `id` (uuid, primary key)
- `team_id` (text, UNIQUE) - Team identifier
- `device_id` (text) - Device login identifier
- `logged_in_at` (timestamp) - Login time
- `last_activity` (timestamp) - Last activity time
- `is_active` (boolean) - Current session status

### leaderboard table
Challenge completion records:
- `id` (uuid, primary key)
- `team_name` (text) - Team identifier
- `question_id` (text) - Challenge ID
- `time_spent` (integer) - Seconds to complete
- `attempts` (integer) - Flag submissions
- `completed_at` (timestamp) - Completion time
- `created_at` (timestamp) - Record time

## Challenge Progression Flow

1. **Initial Load**: Random question from available pool
2. **Submit Answer**: 
   - Incorrect → Show error, clear after 3s, attempts++
   - Correct → Show success, save to leaderboard, 3s delay
3. **Next Question**: Auto-load from remaining available questions
4. **Completion**: When all questions done, show congratulations screen

## Key Files

- `src/App.tsx` - Device restriction logic (Supabase)
- `src/components/AuthPage.tsx` - Team login
- `src/components/ChallengePage.tsx` - Multi-question challenge flow
- `src/data/teamData.ts` - Pre-registered teams
- `supabase/migrations/20251102_create_team_sessions.sql` - Session table
- `supabase/migrations/20251102_create_leaderboard.sql` - Leaderboard table

## Sample Questions

3 security challenges included:
1. SQL Injection Detection
2. XSS Vulnerability  
3. Authentication Bypass

Each has Base64 downloadable files and hints.

## Usage

1. Team enters name and leader name
2. System validates against teamData.ts
3. Creates session in Supabase (device locked)
4. First available question randomly assigned
5. After correct flag: 3s wait, then next question loads
6. Progress displayed: "X/3 challenges completed"
7. Logout marks session inactive in Supabase
8. Re-login possible only after logout
