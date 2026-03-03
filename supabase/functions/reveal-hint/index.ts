import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HINT_COST = 10

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for transaction support
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        },
      }
    )

    const { team_name } = await req.json()

    if (!team_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: team_name' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Start a transaction: read current points and validate
    const { data: profileData, error: selectError } = await supabaseClient
      .from('profiles')
      .select('points')
      .eq('team_name', team_name)
      .single()

    if (selectError || !profileData) {
      return new Response(
        JSON.stringify({ error: 'Team profile not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const currentPoints = profileData.points

    // Check if team has sufficient points
    if (currentPoints < HINT_COST) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Insufficient points. Required: ${HINT_COST}, Available: ${currentPoints}`,
          current_points: currentPoints
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Atomically deduct points (this is done at the database level)
    // We use a conditional update to ensure we don't deduct if points have changed
    const newPoints = currentPoints - HINT_COST

    const { data: updateData, error: updateError } = await supabaseClient
      .from('profiles')
      .update({ points: newPoints })
      .eq('team_name', team_name)
      .eq('points', currentPoints) // This ensures atomic update - only succeeds if points haven't changed
      .select('points')
      .single()

    if (updateError || !updateData) {
      // If the conditional update failed, points may have changed
      // Return a conflict error so client can retry
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Point deduction failed. Points may have changed. Please try again.',
          reason: 'concurrent_modification'
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Success: hint can be revealed
    return new Response(
      JSON.stringify({
        success: true,
        previous_points: currentPoints,
        new_points: updateData.points,
        hint_cost: HINT_COST
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in reveal-hint:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
