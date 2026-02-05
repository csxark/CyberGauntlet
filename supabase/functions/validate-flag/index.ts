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

    const { challenge_id, submitted_flag, team_name } = await req.json()

    if (!challenge_id || !submitted_flag || !team_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: challenge_id, submitted_flag, team_name' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get validation data for the challenge
    const { data: validation, error: validationError } = await supabaseClient
      .from('challenge_validations')
      .select('*')
      .eq('challenge_id', challenge_id)
      .single()

    if (validationError || !validation) {
      return new Response(
        JSON.stringify({ error: 'Challenge validation data not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Hash the submitted flag using SHA-256
    const encoder = new TextEncoder()
    const data = encoder.encode(submitted_flag)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const submittedFlagHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Check if flag is correct
    const isCorrect = submittedFlagHash === validation.correct_flag_hash

    let feedback = validation.feedback_messages.incorrect
    let status = 'incorrect'

    if (isCorrect) {
      feedback = validation.feedback_messages.correct
      status = 'correct'
    } else {
      // Check for format validation (flags should start with CG{ and end with })
      if (!submitted_flag.startsWith('CG{') || !submitted_flag.endsWith('}')) {
        feedback = validation.feedback_messages.format_error
        status = 'format_error'
      } else if (validation.validation_rules?.partial_validation) {
        // Implement partial validation logic here if needed
        // For now, just use the default incorrect message
        feedback = validation.feedback_messages.incorrect
      }
    }

    // Log the attempt in leaderboard (only for incorrect attempts to avoid duplicates)
    if (!isCorrect) {
      await supabaseClient
        .from('leaderboard')
        .insert({
          team_name,
          question_id: challenge_id,
          time_spent: 0, // Will be updated from client
          attempts: 1, // Will be updated from client
          completed_at: null
        })
    }

    return new Response(
      JSON.stringify({
        status,
        feedback,
        is_correct: isCorrect,
        challenge_id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error validating flag:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
