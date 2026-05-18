import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - user not authenticated' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const requestBody = await req.json()
    const { challenge_id, team_name } = requestBody

    if (!challenge_id || !team_name) {
      return new Response(
        JSON.stringify({ error: 'Missing challenge_id or team_name' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { data, error } = await supabaseClient
      .from('challenge_sessions')
      .insert({
        team_id: team_name,
        challenge_id: challenge_id,
        session_start_time: new Date().toISOString(),
        wrong_attempt_count: 0,
        hint_reveal_count: 0,
      })
      .select()

    if (error) {
      console.error('Error creating session:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        session: data[0] || null
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

    // Create Supabase client with authentication headers
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - user not authenticated' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract request body
    const { team_id, device_id } = await req.json()

    if (!team_id || !device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: team_id, device_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if profile exists for this user
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found. Please create a profile first.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if team already has an active session from a different user
    const { data: existingSession } = await supabaseClient
      .from('team_sessions')
      .select('*')
      .eq('team_id', team_id)
      .eq('is_active', true)
      .single()

    if (existingSession && existingSession.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: 'This team is already logged in from another device',
          code: 'DEVICE_RESTRICTED',
          existing_device_id: existingSession.device_id,
          existing_logged_in_at: existingSession.logged_in_at
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If same user, update existing session
    if (existingSession && existingSession.user_id === user.id) {
      const { data: updatedSession, error: updateError } = await supabaseClient
        .from('team_sessions')
        .update({
          device_id,
          is_active: true,
          last_activity: new Date().toISOString()
        })
        .eq('id', existingSession.id)
        .select()
        .single()

      if (updateError || !updatedSession) {
        return new Response(
          JSON.stringify({ error: 'Failed to update session' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          session: updatedSession,
          message: 'Session reactivated'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create new session
    const { data: newSession, error: insertError } = await supabaseClient
      .from('team_sessions')
      .insert({
        user_id: user.id,
        team_id,
        device_id,
        is_active: true,
        logged_in_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError || !newSession) {
      console.error('Session creation error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        session: newSession,
        user_id: user.id,
        message: 'Session created successfully'
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in create-session:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
