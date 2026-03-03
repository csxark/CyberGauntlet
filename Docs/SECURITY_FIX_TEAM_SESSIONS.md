# Team Sessions Security Fix - Issue #71

## Vulnerability Description

The initial RLS policies for the `team_sessions` table had critical security issues:

### Problems Identified:
1. **Public Read Access**: Anyone could view all active sessions using `USING (true)` policy
2. **Public Write Access**: Anyone could insert/update sessions without authentication
3. **Public Delete Access**: Anyone could delete any team's session record
4. **No Ownership Tracking**: No connection between sessions and user authentication

### Attack Scenarios:
- **Session Hijacking**: Any user could modify `device_id` to claim a team session
- **Forced Logout**: Any user could mark another team's session as `is_active = false`
- **Data Exfiltration**: Session data was readable by unauthenticated users
- **Denial of Service**: Malicious users could delete session records

## Solution Implemented

### 1. Added User Ownership Tracking
**Migration**: `20260201_add_user_id_to_team_sessions.sql`

```sql
ALTER TABLE team_sessions
ADD COLUMN user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE;
```

- Links sessions to authenticated users via `profiles.user_id`
- Cascading delete ensures data integrity
- Index on `user_id` for query performance

### 2. Secured RLS Policies
**Migration**: `20260202_secure_team_sessions_rls.sql`

#### Removed Insecure Policies:
- ❌ `Allow public read team sessions` 
- ❌ `Allow public insert team sessions`
- ❌ `Allow public update team sessions`
- ❌ `Allow public delete team sessions`

#### Added Authenticated Policies:
- ✅ `Users can read own team sessions` - Only see your own sessions
- ✅ `Users can insert own team sessions` - Create sessions only for yourself
- ✅ `Users can update own team sessions` - Modify only your own sessions
- ✅ **No delete policy** - Prevents accidental/malicious deletions

### 3. Service Role Operations

Delete operations must use the service role (admin-only):

```typescript
// This will fail (no delete policy for authenticated users)
await supabase
  .from('team_sessions')
  .delete()
  .eq('id', sessionId);

// This works (service role bypass)
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

await supabaseAdmin
  .from('team_sessions')
  .delete()
  .eq('id', sessionId);
```

## Usage Examples

### Create a Session (Authenticated User)
```typescript
const { data, error } = await supabase
  .from('team_sessions')
  .insert({
    user_id: (await supabase.auth.getUser()).data.user?.id,
    team_id: 'team_123',
    device_id: 'device_abc',
    is_active: true
  });

// ✅ Works - user_id matches authenticated user
// ❌ Fails - if user_id doesn't match authenticated user ID
```

### Read Session (Authenticated User)
```typescript
const { data, error } = await supabase
  .from('team_sessions')
  .select()
  .eq('team_id', 'team_123');

// ✅ Returns session only if user_id = auth.uid()
// ❌ No data returned if user doesn't own this session
```

### Update Session (Authenticated User)
```typescript
const { error } = await supabase
  .from('team_sessions')
  .update({ is_active: false })
  .eq('id', sessionId);

// ✅ Works - user owns this session
// ❌ Fails - user doesn't own this session
```

### Delete Session (Admin Only)
```typescript
// Frontend - Use Edge Function with service role verification
const { data, error } = await supabase.functions.invoke('admin-logout-team', {
  body: { session_id: sessionId }
});

// Edge Function - Uses service role
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

await supabaseAdmin
  .from('team_sessions')
  .delete()
  .eq('id', sessionId);
```

## Migration Steps

1. **Run Migration 1**: Add `user_id` column
   - Populates `user_id` for existing sessions (manual data migration if needed)

2. **Run Migration 2**: Replace RLS policies
   - Old policies automatically dropped
   - New authenticated policies created

3. **Update Application Code**:
   - Pass `user_id` when creating sessions
   - Verify operations work with new RLS constraints

4. **Test Thoroughly**:
   - Verify users can only access their own sessions
   - Confirm cross-team access is blocked
   - Validate delete operations (should fail for regular users)

## Security Checklist

- ✅ RLS policies use `auth.uid()` checks
- ✅ No public access policies
- ✅ User ownership tracked via `user_id` column
- ✅ Foreign key relationship to `profiles.user_id`
- ✅ Delete policy removed (service role only)
- ✅ Cascading delete on user profile deletion
- ✅ Indexes on frequently queried columns

## Compliance

This fix addresses:
- **CWE-639**: Authorization Bypass Through User-Controlled Key
- **OWASP A01:2021** - Broken Access Control
- **OWASP A05:2021** - Access Control

## Future Improvements

1. **Audit Logging**: Log all session modifications (who, what, when)
2. **Rate Limiting**: Prevent brute-force session creation
3. **Session Timeout**: Auto-invalidate sessions after inactivity period
4. **Device Fingerprinting**: Enhanced device ID tracking (user-agent, IP, etc.)
5. **Multi-Factor Authentication**: Require MFA for high-risk operations

## References

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [OWASP Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
