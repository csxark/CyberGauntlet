import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
}

const TOKEN_CONFIG = {
  accessTokenExpiry: 15 * 60,
  refreshTokenExpiry: 7 * 24 * 60 * 60,
  maxRefreshesPerHour: 20,
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateRefreshToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

async function generateJWT(userId: string, email: string, expiresIn: number): Promise<string> {
  const payload = {
    sub: userId,
    email: email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    aud: 'authenticated',
    role: 'authenticated'
  }
  return btoa(JSON.stringify(payload))
}

function getDeviceInfo(req: Request): {device_info: string; user_agent: string; ip_address: string} {
  const userAgent = req.headers.get('User-Agent') || 'Unknown'
  const ipAddress = req.headers.get('X-Forwarded-For') || req.headers.get('X-Real-IP') || 'Unknown'

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

function setRefreshTokenCookie(token: string, expiresInSeconds: number): string {
  const expiresDate = new Date(Date.now() + expiresInSeconds * 1000)

  return `refresh_token=${token}; ` +
    `Path=/; ` +
    `HttpOnly; ` +
    `Secure; ` +
    `SameSite=Strict; ` +
    `Max-Age=${expiresInSeconds}; ` +
    `Expires=${expiresDate.toUTCString()}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { refresh_token, logout_all } = await req.json()

    // ============ LOGOUT ALL DEVICES ============
    if (logout_all) {
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

      const headers = {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Set-Cookie': 'refresh_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Logged out from ${data} device(s)`,
          revoked_count: data,
        }),
        { status: 200, headers }
      )
    }

    // ============ REFRESH TOKEN ============
    if (!refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Missing refresh_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenHash = await hashToken(refresh_token)

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

    const { data: authData, error: authError } = await supabaseClient.auth.admin.getUserById(
      tokenRecord.user_id
    )

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newAccessToken = await generateJWT(
      tokenRecord.user_id,
      authData.user.email || '',
      TOKEN_CONFIG.accessTokenExpiry
    )

    const newRefreshToken = generateRefreshToken()
    const newTokenHash = await hashToken(newRefreshToken)
    const deviceInfo = getDeviceInfo(req)

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

    await supabaseClient
      .from('refresh_tokens')
      .update({
        refresh_count: refreshesLastHour + 1,
        last_refresh_attempt: new Date().toISOString(),
      })
      .eq('id', tokenRecord.id)

    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Set-Cookie': setRefreshTokenCookie(newRefreshToken, TOKEN_CONFIG.refreshTokenExpiry)
    }

    return new Response(
      JSON.stringify({
        access_token: newAccessToken,
        expires_in: TOKEN_CONFIG.accessTokenExpiry,
        token_type: 'Bearer',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      }),
      { status: 200, headers }
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
