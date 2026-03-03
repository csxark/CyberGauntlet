import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Token configuration
const TOKEN_CONFIG = {
  accessTokenExpiry: 15 * 60, // 15 minutes in seconds
  refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days in seconds
  maxRefreshesPerHour: 20, // Rate limit per token
}

/**
 * Hash a token using SHA-256
 * Never store plaintext tokens in database
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a cryptographically secure refresh token
 */
function generateRefreshToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Extract device info from request headers
 */
function getDeviceInfo(req: Request): {device_info: string; user_agent: string; ip_address: string} {
  const userAgent = req.headers.get('User-Agent') || 'Unknown'
  const ipAddress = req.headers.get('X-Forwarded-For') || req.headers.get('X-Real-IP') || 'Unknown'
  
  // Parse user agent to get device type
  let deviceType = 'Unknown'
  if (userAgent.includes('Mobile')) deviceType = 'Mobile'
  else if (userAgent.includes('Tablet')) deviceType = 'Tablet'
  else if (userAgent.includes('Windows')) deviceType = 'Windows PC'
  else if (userAgent.includes('Macintosh')) deviceType = 'Mac'
  else if (userAgent.includes('Linux')) deviceType = 'Linux'
  
  return {
    device_info: deviceType,
    user_agent: userAgent,
    ip_address: ipAddress,
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { refresh_token, logout_all } = await req.json()

    // ============ LOGOUT ALL DEVICES ============
    if (logout_all) {
      // Verify current token
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Revoke all refresh tokens for this user
      const { data, error } = await supabaseClient.rpc('revoke_all_user_tokens', {
        p_user_id: user.id,
        p_reason: 'user_logout_all'
      })

      if (error) {
        console.error('Error revoking tokens:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to revoke sessions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Logged out from ${data} device(s)`,
          revoked_count: data,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ REFRESH TOKEN ============
    if (!refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Missing refresh_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash the provided refresh token
    const tokenHash = await hashToken(refresh_token)

    // Check if token is valid
    const { data: isValid, error: validityError } = await supabaseClient.rpc('is_token_valid', {
      p_token_hash: tokenHash
    })

    if (validityError || !isValid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get token details
    const { data: tokenRecord, error: tokenError } = await supabaseClient
      .from('refresh_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .single()

    if (tokenError || !tokenRecord) {
      return new Response(
        JSON.stringify({ error: 'Token not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting check
    const refreshesLastHour = tokenRecord.refresh_count || 0
    const lastRefresh = tokenRecord.last_refresh_attempt ? new Date(tokenRecord.last_refresh_attempt) : null
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    if (lastRefresh && lastRefresh > oneHourAgo && refreshesLastHour >= TOKEN_CONFIG.maxRefreshesPerHour) {
      return new Response(
        JSON.stringify({
          error: 'Too many refresh attempts. Please try again later.',
          code: 'RATE_LIMITED',
          remaining_seconds: Math.ceil((lastRefresh.getTime() + 60 * 60 * 1000 - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '3600'
          }
        }
      )
    }

    // Generate new access token using Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.getUserById(
      tokenRecord.user_id
    )

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate new JWT access token
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.createUser({
      email: authData.user.email!,
      password: crypto.randomUUID(), // Dummy password, not actually used
      email_confirm: true
    })

    // Better approach: Use existing session
    const { data: newSession, error: newSessionError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: authData.user.email!,
    })

    if (newSessionError) {
      console.error('Error generating new session:', newSessionError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate new access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate new refresh token
    const newRefreshToken = generateRefreshToken()
    const newTokenHash = await hashToken(newRefreshToken)
    const deviceInfo = getDeviceInfo(req)

    // Insert new refresh token with reference to old one
    const { error: insertError } = await supabaseClient
      .from('refresh_tokens')
      .insert({
        user_id: tokenRecord.user_id,
        token_hash: newTokenHash,
        expires_at: new Date(Date.now() + TOKEN_CONFIG.refreshTokenExpiry * 1000).toISOString(),
        parent_token_id: tokenRecord.id,
        ...deviceInfo,
      })

    if (insertError) {
      console.error('Error inserting new refresh token:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create new refresh token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update refresh count on old token
    await supabaseClient
      .from('refresh_tokens')
      .update({
        refresh_count: refreshesLastHour + 1,
        last_refresh_attempt: new Date().toISOString(),
      })
      .eq('id', tokenRecord.id)

    // Old token will be automatically revoked by trigger

    // Return new tokens
    return new Response(
      JSON.stringify({
        access_token: newSession.properties.action_link.split('token=')[1] || newSession.properties.hashed_token,
        refresh_token: newRefreshToken,
        expires_in: TOKEN_CONFIG.accessTokenExpiry,
        token_type: 'Bearer',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in refresh-token function:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
