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

    const { 
      challenge_id, 
      submitted_flag, 
      team_name,
      time_spent,
      attempts,
      hints_used,
      start_time,
      category,
      difficulty,
      event_id,
      idempotency_key
    } = await req.json()

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
    let leaderboardInserted = false

    if (isCorrect) {
      feedback = validation.feedback_messages.correct
      status = 'correct'

      // Insert to leaderboard atomically with correct submission
      // Use unique constraint to prevent duplicates from race conditions
      const completionTime = new Date().toISOString()
      const basePoints = 100
      const timeBonus = time_spent && time_spent < 300 ? 50 : time_spent && time_spent < 600 ? 25 : 0
      const totalPoints = basePoints + timeBonus

      const leaderboardEntry = {
        team_name,
        question_id: challenge_id,
        time_spent: time_spent || 0,
        attempts: attempts || 1,
        hints_used: hints_used || 0,
        start_time: start_time || completionTime,
        completion_time: completionTime,
        points: totalPoints,
        completed_at: completionTime,
        category: category || 'General',
        difficulty: difficulty || 'Unknown',
        event_id: event_id || null
      }

      // Add idempotency_key if provided
      if (idempotency_key) {
        leaderboardEntry.idempotency_key = idempotency_key
      }

      const { data: insertedData, error: insertError } = await supabaseClient
        .from('leaderboard')
        .insert(leaderboardEntry)
        .select()

      // If insert succeeded, record was created
      if (!insertError && insertedData && insertedData.length > 0) {
        leaderboardInserted = true
      } else if (insertError) {
        // Check if error is due to unique constraint violation (duplicate)
        // PostgreSQL unique constraint violation code is '23505'
        if (insertError.code === '23505') {
          // This is expected for concurrent submissions - not an error
          console.log('Duplicate leaderboard entry prevented:', team_name, challenge_id)
          leaderboardInserted = false
        } else {
          // Unexpected error - log it but don't fail the validation
          console.error('Leaderboard insert error:', insertError)
        }
      }
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

      // Log incorrect attempts (without completed_at to allow multiple records)
      await supabaseClient
        .from('leaderboard')
        .insert({
          team_name,
          question_id: challenge_id,
          time_spent: 0,
          attempts: 1,
          completed_at: null
        })
    }

    return new Response(
      JSON.stringify({
        status,
        feedback,
        is_correct: isCorrect,
        challenge_id,
        leaderboard_recorded: leaderboardInserted,
        duplicate_submission: isCorrect && !leaderboardInserted
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
