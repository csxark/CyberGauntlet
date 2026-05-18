# Supabase Deployment Guide for CyberGauntlet

## Overview
This guide walks through setting up Supabase for CyberGauntlet, including database migrations, Edge Functions, and environment configuration.

## Prerequisites
- Supabase project (create at [supabase.com](https://supabase.com))
- Supabase CLI: `npm install -g supabase`
- Node.js 18+
- Deno (for local Edge Function testing)

## Step 1: Set Up Environment Variables

### Local Development
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Fill in your Supabase credentials:
- `VITE_SUPABASE_URL`: From Supabase Project Settings > API
- `VITE_SUPABASE_ANON_KEY`: From Supabase Project Settings > API (public/anon key)
- `SUPABASE_URL`: Same as VITE_SUPABASE_URL
- `SUPABASE_SERVICE_ROLE_KEY`: Server-only key (NEVER expose to client)

### Production
For production, add these to your CI/CD environment variables. Never commit `.env` with real keys.

## Step 2: Deploy Database Migrations

### Using Supabase CLI (Recommended)
```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_ID

# Push migrations to production
supabase db push
```

### Manual SQL Execution
1. Go to your Supabase dashboard
2. SQL Editor > New Query
3. Paste contents of `supabase/migrations/0001_schema.sql`
4. Run the query

This creates all required tables, indexes, RPCs, and RLS policies.

## Step 3: Deploy Edge Functions

```bash
# Deploy all Edge Functions
supabase functions deploy

# Or deploy a specific function
supabase functions deploy refresh-token
supabase functions deploy validate-flag
```

### Set Environment Variables for Edge Functions
In Supabase dashboard, go to Functions > Settings:
- `ALLOWED_ORIGINS`: Set to your frontend origin(s), e.g., `https://yourdomain.com,http://localhost:5173`
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (required for admin operations)

## Step 4: Enable Additional Features

### Real-time (for team notes)
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE team_notes;
```

### Row Level Security (RLS) Policies
Run this in SQL Editor to verify RLS is enabled:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
```

All tables should show `rowsecurity = true`.

## Step 5: Seed Initial Data (Optional)

Create challenges and validation rules:
```sql
INSERT INTO challenges (question_id, title, description, category, difficulty, points, correct_flag)
VALUES (
  'web-001',
  'SQL Injection Basics',
  'Find the hidden flag using SQL injection...',
  'Web Security',
  'Easy',
  100,
  'CG{sql_inj3ction_succ3ss}'
);

INSERT INTO challenge_validations (challenge_id, correct_flag_hash, feedback_messages)
SELECT id, 'hash_of_flag', '{"correct": "Well done!", "incorrect": "Try again"}'::jsonb
FROM challenges WHERE question_id = 'web-001';
```

## Step 6: Local Testing

### Run Edge Functions Locally
```bash
supabase functions serve
```

Then test with:
```bash
curl -X POST http://localhost:54321/functions/v1/validate-flag \
  -H "Content-Type: application/json" \
  -d '{
    "challenge_id": "web-001",
    "submitted_flag": "CG{test}",
    "team_name": "test_team"
  }'
```

## Troubleshooting

### Functions returning 404
- Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check logs: `supabase functions list` then view function logs

### Database connection errors
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Check network access: Supabase dashboard > Project Settings > Network
- Allow your IP address or use the public endpoint

### CORS errors
- Set `ALLOWED_ORIGINS` in Edge Function environment variables
- Include your frontend origin (e.g., `https://yourdomain.com`)

### Rate limiting not working
- Ensure `team_sessions` table exists (created by migration)
- Check that RLS policies don't block writes to `team_sessions`

## Security Checklist

- [ ] Never commit `.env` with real keys
- [ ] Use `SUPABASE_SERVICE_ROLE_KEY` only on server (Edge Functions)
- [ ] Enable RLS on all tables
- [ ] Set appropriate RLS policies (least privilege)
- [ ] Set `ALLOWED_ORIGINS` to restrict CORS
- [ ] Rotate keys periodically
- [ ] Monitor logs for abuse patterns
- [ ] Use HTTPS in production

## Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)
