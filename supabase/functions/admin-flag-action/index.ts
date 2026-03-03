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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { flag_id, action, admin_notes } = await req.json()

    // Validate required fields
    if (!flag_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: flag_id, action' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate action
    const validActions = ['approved', 'rejected', 'penalize']
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be approved, rejected, or penalize' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get current user for audit trail
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update the flag with admin action
    const { data, error } = await supabaseClient
      .from('leaderboard_integrity_flags')
      .update({
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        action: action,
        admin_notes: admin_notes || null
      })
      .eq('id', flag_id)
      .select()

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Flag not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const flagRecord = data[0]

    // Handle penalty action (remove points from team)
    if (action === 'penalize') {
      try {
        // Get current points
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('points')
          .eq('team_name', flagRecord.team_id)
          .single()

        if (!profileError && profile) {
          // Deduct penalty (5-50% of points gained, minimum 50 points)
          const leaderboardEntry = await supabaseClient
            .from('leaderboard')
            .select('points')
            .eq('id', flagRecord.leaderboard_id)
            .single()

          const pointsPenalty = leaderboardEntry.data 
            ? Math.max(50, Math.floor(leaderboardEntry.data.points * 0.25))
            : 50

          // Update profile points
          await supabaseClient
            .from('profiles')
            .update({ points: Math.max(0, profile.points - pointsPenalty) })
            .eq('team_name', flagRecord.team_id)

          // Log penalty action
          console.log(`PENALTY: Team ${flagRecord.team_id} deducted ${pointsPenalty} points for flag ${flagRecord.id}`)
        }
      } catch (err) {
        console.error('Error applying penalty:', err)
        // Non-blocking - flag is still marked as reviewed
      }
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        message: `Flag ${flag_id} marked as ${action}`,
        flag: data[0]
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error processing admin flag action:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
