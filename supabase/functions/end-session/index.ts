import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
    const { team_id } = await req.json()

    if (!team_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: team_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Find the session for this team
    const { data: session, error: selectError } = await supabaseClient
      .from('team_sessions')
      .select('*')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single()

    if (selectError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found or does not belong to this user' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Deactivate the session (mark as inactive instead of deleting)
    const { data: updatedSession, error: updateError } = await supabaseClient
      .from('team_sessions')
      .update({
        is_active: false,
        last_activity: new Date().toISOString()
      })
      .eq('id', session.id)
      .eq('user_id', user.id) // Extra safety check
      .select()
      .single()

    if (updateError || !updatedSession) {
      return new Response(
        JSON.stringify({ error: 'Failed to end session' }),
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
        message: 'Session ended successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in end-session:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
