# Fix: Input Sanitization Missing on User-Generated Content (#82)

## Overview
This PR implements comprehensive XSS prevention and input sanitization for all user-generated content across the platform.

## Problem
User-generated content (team names, challenge descriptions, team notes) lacked sanitization, allowing:
- Stored XSS attacks via malicious HTML/JS in text fields
- Session hijacking through cookie theft
- Page defacement
- Admin account compromise via XSS vectors
- No Content Security Policy headers to block inline scripts

## Solution Implemented

### 1) Frontend input sanitization + validation
Added file:
- `src/utils/inputSecurity.ts`

Provides centralized utilities:
- `sanitizePlainText(value, maxLength)` – strips HTML, control chars, normalizes whitespace
- `sanitizeMultilineText(value, maxLength)` – allows newlines, prevents triple newlines
- `sanitizeTeamName(value)` – applies regex validation (3-32 chars, alphanumeric/dash/underscore/dot)
- `isValidTeamName(value)` – checks format before submission
- `safeDisplayText(value, maxLength)` – safe render wrapper

Updated files:
- `src/pages/Profile.tsx` – sanitizes profile form inputs before submission
- `src/components/TeamManagement.tsx` – sanitizes team names on create, safe display on render
- `src/components/Leaderboard.tsx` – safe display of team names in rankings

### 2) Server-side input sanitization in Edge Function
Updated file:
- `supabase/functions/validate-flag/index.ts`

Added:
- `sanitizePlainText(value, maxLen)` – server-side equivalent
- `sanitizeTeamName(value)` – validates team name format
- Team name, category, difficulty all sanitized before leaderboard insert

### 3) Database-level sanitization triggers
Added migration:
- `Databases/supabase/migrations/20260303_sanitize_user_generated_content.sql`

Creates:
- `sanitize_plain_text()` function – removes HTML tags, control chars
- `validate_team_name()` function – enforces 3-32 char alphanumeric + dash/underscore/dot
- Triggers on INSERT/UPDATE to automatically sanitize:
  - `profiles` (team_name, leader_name)
  - `teams` (team_name)
  - `team_notes` (note_content)
  - `leaderboard` (team_name, category, difficulty)
  - `challenge_submissions` (title, description, category, difficulty, hints)

### 4) Content Security Policy (CSP) headers
Updated files:
- `vite.config.ts` – added security header configuration with CSP
- `index.html` – added CSP meta tag in document head

CSP policy:
- `default-src 'self'` – only load from same origin
- `script-src 'self'` – no inline scripts
- `style-src 'self' 'unsafe-inline'` – allow inline CSS (required for Tailwind)
- `img-src 'self' data: https:` – images from self or HTTPS/data URLs
- `object-src 'none'` – no plugins
- `frame-ancestors 'none'` – prevent clickjacking

## Security Improvements
- **Output encoding**: All user text escaped on render (no raw HTML)
- **Input validation**: Team names limited to safe characters, length-limited
- **Database layer**: Server-side triggers enforce sanitization even if frontend bypassed
- **Payload blocking**: CSP prevents execution of injected inline scripts
- **Defense in depth**: Sanitization at client, server, and database levels

## Files Changed
- `package.json` – added DOMPurify dependency
- `src/utils/inputSecurity.ts` – new sanitization utilities
- `src/pages/Profile.tsx` – integrated sanitization on form submission
- `src/components/TeamManagement.tsx` – integrated sanitization on create, safe display
- `src/components/Leaderboard.tsx` – integrated safe display
- `supabase/functions/validate-flag/index.ts` – server-side sanitization
- `Databases/supabase/migrations/20260303_sanitize_user_generated_content.sql` – database level
- `vite.config.ts` – CSP headers config
- `index.html` – CSP meta tag

## Testing Checklist
- [ ] Submit team name with `<script>alert('xss')</script>` → sanitized to plain text
- [ ] Submit challenge description with HTML tags → tags stripped
- [ ] Submit team note with malicious JS → stored and displayed as plain text
- [ ] Attempt to inject localStorage-stealing code via team name → blocked by CSP
- [ ] Check browser DevTools Network tab → CSP headers present on response
- [ ] Verify leaderboard displays sanitized team names
- [ ] Verify profile page saves sanitized inputs

## Deployment Notes
1. Run database migration to create sanitization functions/triggers
2. Deploy updated Edge Function
3. Deploy frontend changes (Profile, TeamManagement, Leaderboard components)
4. Clear browser cache/localStorage (CSP cache headers may be aggressive)
5. Test XSS payloads to confirm sanitization working across all layers

## Follow-up
- Implement rate limiting on submission forms to prevent injection attacks
- Add webhook for logging sanitized payloads (potential intrusion indicator)
- Regular security audit of all user input surfaces
