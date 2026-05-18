CyberGauntlet — Audit README

Purpose
-------
This document summarizes the full technical audit of the CyberGauntlet repository, lists critical issues discovered, and provides concrete setup and remediation guidance to get the project runnable, secure, and production-ready.

Contents
--------
- Project overview
- Quick start (dev)
- Required environment and Supabase setup
- Missing database migrations & RPCs (what to add)
- Known critical issues and immediate mitigations
- Recommended next steps (roadmap)
- File map & where changes are needed
- Contact / ownership notes

PROJECT OVERVIEW
----------------
CyberGauntlet is a Vite + React (TypeScript) frontend that integrates with Supabase (Postgres + Edge Functions). It contains client code (src/...), Supabase Edge Functions (supabase/functions/*), and UI components for challenges, leaderboards, team/session management, and admin flows. The repo currently lacks DB migration SQL and several server-side database functions the Edge Functions expect.

QUICK START (DEVELOPMENT)
-------------------------
Prerequisites:
- Node 20+, npm
- Supabase project (or local/postgres with Supabase-compatible schema)
- Optional: Docker for reproducible environment

Local dev (frontend only):
1. Copy .env.example -> .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (client-only values).
2. npm ci
3. npm run dev

IMPORTANT: Many features rely on Supabase Edge Functions and DB schema. The app will crash or behave incorrectly if Supabase envs are missing. See "Supabase setup" below.

SUPABASE SETUP (ESSENTIAL)
--------------------------
Variables required (at minimum):
- VITE_SUPABASE_URL (client)
- VITE_SUPABASE_ANON_KEY (client)
- SUPABASE_URL (server/edge functions)
- SUPABASE_SERVICE_ROLE_KEY (server-only — must NOT be exposed to client)

Edge Functions (supabase/functions/) require Deno env variables when deployed. They also depend on a database schema which is NOT present in the repo — you must create it before deploying functions.

MIGRATIONS / DATABASE (MUST ADD)
--------------------------------
Create a migrations folder (recommended: supabase/migrations or sql/) and add SQL files for:
- profiles (user_id, team_name, role, points, created_at)
- teams (id, team_id, team_name, members (text[] or jsonb), shared_points, created_at)
- posts
- events
- challenges
- challenge_validations (challenge_id, correct_flag_hash, feedback_messages jsonb)
- challenge_sessions (team_id, challenge_id, session_start_time, wrong_attempt_count, leaderboard_id, hint_reveal_count)
- leaderboard (id, team_name, question_id, time_spent, attempts, hints_used, points, completed_at, idempotency_key)
- team_notes
- refresh_tokens (user_id, token_hash UNIQUE, expires_at, refresh_count, parent_token_id, device_info, last_refresh_attempt)
- team_sessions (team_id, user_id, device_id, is_active, logged_in_at, last_activity, rate_limit fields)
- rate_limit_logs

Also add RPCs/functions referenced by Edge Functions:
- is_token_valid(p_token_hash)
- revoke_all_user_tokens(p_user_id, p_reason)
- register_leaderboard_submission(...) (used by validate-flag)
- record_wrong_attempt(p_team_id, p_challenge_id)
- record_hint_reveal(p_team_id, p_challenge_id)

Add indexes and constraints:
- UNIQUE(idempotency_key) on leaderboard
- UNIQUE(token_hash) on refresh_tokens
- Indexes on leaderboard.completed_at, leaderboard.team_name
- Partial unique index or constraint to prevent multiple active sessions for the same team

KNOWN CRITICAL ISSUES & IMMEDIATE MITIGATIONS
---------------------------------------------
1) Missing DB schema & RPCs
- Symptom: Edge functions will fail on deploy or at runtime.
- Mitigation: Add the SQL DDL files, deploy them to your Supabase project before deploying functions.

2) Insecure / broken refresh token flow
- Files: supabase/functions/refresh-token/index.ts, src/context/AuthContext.tsx
- Symptom: refresh-token function currently creates users and attempts to parse magic links — insecure, incorrect, and will create duplicates.
- Mitigation (immediate): Disable client-side use of refresh-token (remove or guard call) until secure flow implemented. Move refresh tokens to HttpOnly cookie flow.

3) Tokens stored in localStorage
- Files: src/context/AuthContext.tsx
- Risk: XSS can steal refresh tokens.
- Mitigation: Stop using localStorage for refresh tokens; prefer HttpOnly cookies.

4) CORS wildcard in Edge Functions
- Files: supabase/functions/*
- Risk: mutation endpoints use 'Access-Control-Allow-Origin': '*' which is unsafe for state-changing endpoints.
- Mitigation: Restrict origins to your frontend origin(s) and require Authorization header.

5) Unchecked supabase client usage
- Files: many (AuthContext, Dashboard, Login)
- Symptom: If VITE_SUPABASE_* env missing, the client exports a casted undefined which causes runtime TypeError.
- Mitigation: Add a guarded factory and centralized check (isSupabaseConfigured) and guard all calls.

RECOMMENDED REMEDIATION ROADMAP (CONCISE)
----------------------------------------
Phase 0 — Safety & Runability (hours)
- Add isSupabaseConfigured guard in src/lib/supabase.ts.
- Update AuthContext to not call supabase when not configured and show a clear UI message.
- Add .env.example with required variables.

Phase 1 — Database & Functions (1-2 days)
- Create DB migrations + RPCs and deploy to Supabase.
- Rework refresh-token function to a secure pattern: validate hashed refresh token, create new refresh token record, and issue new access token via secure admin API or set secure cookie.
- Harden validate-flag with DB-backed validation routines and unit tests.

Phase 2 — Security & Production (1-2 days)
- Move refresh token to HttpOnly SameSite cookie.
- Restrict CORS and enforce Authorization for mutation endpoints.
- Add RLS policies for all tables and ensure least privilege.

Phase 3 — Performance, UX, Observability (days)
- Add server-side aggregated leaderboard endpoint & pagination.
- Add monitoring (Sentry) & structured logs.
- Remove heavy 3D elements on mobile; improve accessibility.

FILES THAT NEED CHANGES (SHORT LIST)
-----------------------------------
- src/lib/supabase.ts — export guarded client and central factory
- src/context/AuthContext.tsx — remove localStorage refresh token, guard supabase calls
- supabase/functions/refresh-token/index.ts — rework token rotation logic
- supabase/functions/validate-flag/index.ts — ensure referenced RPCs exist and add input validation
- Add supabase/migrations/0001_schema.sql and other migration files
- Add docs: supabase/README.md with deployment instructions

DEVELOPER CHECKLIST (PRIORITY)
------------------------------
- [ ] Create migration SQL for all referenced tables and RPCs
- [ ] Add .env.example and docs for SUPABASE keys
- [ ] Replace localStorage refresh token with HttpOnly cookie flow
- [ ] Harden Edge Functions CORS and authorization
- [ ] Add server-side leaderboard aggregation and pagination
- [ ] Add unit/integration tests for Edge Functions and DB RPCs

USEFUL NOTES
------------
- Never commit SUPABASE_SERVICE_ROLE_KEY to the repo. This key must remain server-only.
- When testing Edge Functions locally, set the appropriate Deno env variables and run 'deno run' or use Supabase CLI.
- For concurrency-sensitive inserts/upserts (leaderboard/challenge_sessions), rely on DB constraints and transactions; do not trust client-reported timing.

NEXT ACTIONS (I can implement)
-----------------------------
Pick one and I will implement it:
- (A) Create a complete supabase/migrations/0001_schema.sql with table DDL and stub RPCs used by functions.
- (B) Patch src/lib/supabase.ts and src/context/AuthContext.tsx to be guarded so the app runs without crashing when Supabase is not configured.
- (C) Generate a secure design for refresh-token flow and rework supabase/functions/refresh-token/index.ts accordingly.

CONTACT / OWNERSHIP
-------------------
If you want, next I can generate the migration SQL (A) which is the highest priority to allow the Edge Functions to run, or I can implement the guarded supabase client to make the frontend runnable in dev quickly (B).

Appendix: Short excerpts and references
--------------------------------------
- Frontend: src/ — React + Vite + Tailwind components (Auth, ChallengePage, Leaderboard, TeamManagement, SessionManagement).
- Backend: supabase/functions/ — Deno-based Edge Functions (refresh-token, validate-flag, create-session, end-session, admin-challenge, etc.)

End of AUDIT README
