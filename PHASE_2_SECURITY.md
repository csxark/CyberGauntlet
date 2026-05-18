# Phase 2 Security Hardening - Implementation Summary

## Changes Made

### 1. HttpOnly Secure Cookies for Refresh Tokens

**refresh-token function** (`supabase/functions/refresh-token/index.ts`):
- ✅ Refresh token now returned as HttpOnly, Secure, SameSite=Strict cookie
- ✅ Access token returned in response body (short-lived, 15 min)
- ✅ Cookie automatically sent by browser on subsequent requests
- ✅ Removed plaintext token transmission in response
- ✅ Logout clears cookie via Set-Cookie with Max-Age=0

**AuthContext** (`src/context/AuthContext.tsx`):
- ✅ Removed all localStorage usage for refresh tokens
- ✅ Removed TOKEN_STORAGE_KEY constant
- ✅ Updated token refresh to use `credentials: 'include'` for cookie-based auth
- ✅ Simplified auth state management - cookies handled by browser

**Benefits:**
- XSS cannot steal refresh tokens (HttpOnly flag prevents JS access)
- CSRF protection via SameSite=Strict
- Automatic cookie transmission on same-site requests
- Tokens isolated from malicious script execution

### 2. CORS and Credentials Configuration

**All Edge Functions:**
- ✅ Added `'Access-Control-Allow-Credentials': 'true'` to all CORS headers
- ✅ Added `'Access-Control-Allow-Methods': 'POST, OPTIONS'` for clarity
- ✅ ALLOWED_ORIGINS environment variable required for production

**Example:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
}
```

### 3. Authorization Header Enforcement

**All mutation endpoints enforce Authorization:**
- ✅ validate-flag
- ✅ create-session
- ✅ end-session
- ✅ reveal-hint
- ✅ admin-challenge
- ✅ approve-challenge
- ✅ admin-flag-action
- ✅ get-admin-review-queue

**Pattern:**
```typescript
const authHeader = req.headers.get('Authorization')
if (!authHeader) {
  return new Response(
    JSON.stringify({ error: 'Missing authorization header' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### 4. Enhanced Row Level Security (RLS) Policies

**Principle: Least Privilege**

**Restrictive Policies:**
- ✅ Profiles: Users read all, update only own
- ✅ Leaderboard: Public read, insert/update prevented (server-only)
- ✅ Challenges: Public read, modifications prevented
- ✅ Challenge Validations: Public read, modifications prevented
- ✅ Challenge Sessions: Public read, direct inserts/updates prevented
- ✅ Team Notes: Users create/update own, read all
- ✅ Refresh Tokens: Users read/insert own only, updates/deletes prevented
- ✅ Team Sessions: Users read/update own session only
- ✅ Rate Limit Logs: Completely blocked from user access
- ✅ Posts & Events: Public read, direct inserts prevented

**Key Safeguards:**
- `WITH CHECK (auth.uid() = user_id)` ensures proper user isolation
- `INSERT WITH CHECK (false)` prevents direct table inserts where server should handle it
- `UPDATE USING (false)` prevents unauthorized updates
- `DELETE USING (false)` prevents unauthorized deletes

## Deployment Instructions

### 1. Set Environment Variables

In Supabase Edge Functions Settings:
```
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Deploy Migrations

```bash
supabase db push
```

This enables all RLS policies and authorization constraints.

### 3. Deploy Updated Functions

```bash
supabase functions deploy
```

### 4. Test HttpOnly Cookie Behavior

```bash
# Initial login gets access token
curl -X POST https://your-function/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"pwd"}'

# Response includes refresh token as HttpOnly cookie
# Subsequent requests with credentials: 'include' send cookie automatically

# Verify cookies
curl -b cookies.txt -c cookies.txt https://your-function/validate-flag \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"challenge_id":"test","submitted_flag":"CG{test}","team_name":"test"}'
```

## Security Improvements Summary

| Issue | Before | After |
|-------|--------|-------|
| Refresh Token Storage | localStorage (vulnerable to XSS) | HttpOnly cookie (XSS-safe) |
| Token Transmission | Body + localStorage | Cookie (automatic) |
| CSRF Risk | Medium (no SameSite) | Low (SameSite=Strict) |
| CORS | Wildcard (*) | Restricted to ALLOWED_ORIGINS |
| Authorization | Optional | Enforced on mutations |
| RLS Policies | Permissive | Least privilege |
| User Isolation | Weak | Enforced via auth.uid() |
| Direct Table Inserts | Allowed | Prevented (server-only) |

## Breaking Changes for Clients

**If you have a frontend client (non-CyberGauntlet):**
- Must include `credentials: 'include'` in fetch options
- Must handle Authorization header for mutations
- No longer receive refresh token in response body
- Refresh token lifecycle managed automatically via cookies

**Example for React/JavaScript:**
```typescript
// Must use credentials: 'include'
const response = await fetch('/functions/v1/validate-flag', {
  method: 'POST',
  credentials: 'include',  // IMPORTANT: Send cookies
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({...})
})
```

## Next Steps (Phase 3)

- [ ] Add server-side leaderboard aggregation with pagination
- [ ] Implement structured logging (Sentry/Datadog)
- [ ] Add monitoring dashboards
- [ ] Performance optimization for large leaderboards
- [ ] Mobile-specific optimizations
- [ ] Add input validation schemas (zod/yup)
- [ ] Rate limiting enhancement with distributed systems
