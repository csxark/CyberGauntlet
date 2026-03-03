import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxFailedAttempts: 5,           // Lockout threshold
  initialLockoutSeconds: 30,      // First lockout duration
  backoffMultiplier: 2,            // Exponential backoff multiplier
  maxLockoutSeconds: 28800,       // 8 hours max
  resetAfterSeconds: 86400,       // 24 hours inactivity
}

function sanitizePlainText(value: string, maxLen = 200): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

function sanitizeTeamName(value: string): string {
  return sanitizePlainText(value, 32)
}

/**
 * Check if team is currently rate limited
 */
async function checkTeamRateLimit(supabaseClient: any, teamName: string) {
  const { data: session, error } = await supabaseClient
    .from('team_sessions')
    .select('*')
    .eq('team_id', teamName)
    .single()

  if (error || !session) {
    return { isLocked: false, session: null, error }
  }

  const now = new Date()
  const lockedUntil = session.rate_limit_locked_until 
    ? new Date(session.rate_limit_locked_until)
    : null

  const isLocked = lockedUntil && lockedUntil > now

  return {
    isLocked: isLocked || false,
    session,
    remainingSeconds: isLocked && lockedUntil ? Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000) : 0,
    lockedUntil,
  }
}

/**
 * Calculate lockout duration based on exponential backoff
 */
function calculateLockoutDuration(currentLevel: number): number {
  const duration = RATE_LIMIT_CONFIG.initialLockoutSeconds * 
    Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, currentLevel)
  
  return Math.min(duration, RATE_LIMIT_CONFIG.maxLockoutSeconds)
}

/**
 * Update rate limit after failed attempt
 */
async function incrementFailedAttempts(supabaseClient: any, teamName: string, session: any) {
  const currentFailed = (session?.failed_attempts || 0) + 1
  const currentLevel = session?.rate_limit_level || 0
  let newLockedUntil = null

  // Apply lockout if threshold exceeded
  if (currentFailed >= RATE_LIMIT_CONFIG.maxFailedAttempts) {
    const lockoutSeconds = calculateLockoutDuration(currentLevel)
    newLockedUntil = new Date(Date.now() + lockoutSeconds * 1000)
  }

  const updateData: any = {
    failed_attempts: currentFailed,
    last_failed_attempt: new Date().toISOString(),
  }

  if (newLockedUntil) {
    updateData.rate_limit_locked_until = newLockedUntil.toISOString()
    updateData.rate_limit_level = currentLevel + 1
  }

  const { error: updateError } = await supabaseClient
    .from('team_sessions')
    .update(updateData)
    .eq('team_id', teamName)

  return {
    success: !updateError,
    newFailed: currentFailed,
    newLevel: newLockedUntil ? currentLevel + 1 : currentLevel,
    lockedUntil: newLockedUntil,
  }
}

/**
 * Reset failed attempts after successful submission
 */
async function resetFailedAttempts(supabaseClient: any, teamName: string) {
  const { error } = await supabaseClient
    .from('team_sessions')
    .update({
      failed_attempts: 0,
      rate_limit_level: 0,
      rate_limit_locked_until: null,
      last_failed_attempt: null,
    })
    .eq('team_id', teamName)

  return !error
}

/**
 * Log suspicious activity for monitoring
 */
function logAbusePattern(teamName: string, session: any, severity: string, action: string) {
  const pattern = {
    timestamp: new Date().toISOString(),
    team_name: teamName,
    failed_attempts: session?.failed_attempts || 0,
    lockout_level: session?.rate_limit_level || 0,
    severity,
    action,
  }

  console.warn(`RATE_LIMIT_ABUSE: ${JSON.stringify(pattern)}`)
}

/**
 * Log abuse to database for audit trail and analysis
 */
async function logAbuseToDB(
  supabaseClient: any,
  teamName: string,
  challengeId: string,
  session: any,
  severity: string,
  action: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const { error } = await supabaseClient
      .from('rate_limit_logs')
      .insert({
        team_name: teamName,
        challenge_id: challengeId,
        attempt_count: session?.failed_attempts || 0,
        lockout_level: session?.rate_limit_level || 0,
        locked_until: session?.rate_limit_locked_until,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        severity,
        action_taken: action,
      })

    if (error) {
      console.error('Failed to log abuse pattern:', error)
    }
  } catch (err) {
    console.error('Error logging abuse to database:', err)
  }
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

    const safeTeamName = sanitizeTeamName(team_name)
    const safeCategory = category ? sanitizePlainText(category, 80) : 'General'
    const safeDifficulty = difficulty ? sanitizePlainText(difficulty, 40) : 'Unknown'

    if (!/^[A-Za-z0-9 _.-]{3,32}$/.test(safeTeamName)) {
      return new Response(
        JSON.stringify({ error: 'Invalid team_name format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // ============ IDEMPOTENCY CHECK ============
    // Check if this submission was already processed (using idempotency_key)
    // This prevents duplicate leaderboard entries from retries or concurrent requests
    if (idempotency_key) {
      const { data: existingSubmission, error: idempotencyError } = await supabaseClient
        .from('leaderboard')
        .select('*')
        .eq('idempotency_key', idempotency_key)
        .eq('completed_at IS NOT', null)
        .maybeSingle()

      if (!idempotencyError && existingSubmission) {
        // This submission was already processed successfully
        console.log(`Duplicate submission detected: ${idempotency_key} for team ${safeTeamName}`)
        
        return new Response(
          JSON.stringify({
            is_correct: true,
            status: 'correct',
            feedback: 'Challenge already completed',
            duplicate_submission: true,
            leaderboard_id: existingSubmission.id,
            points: existingSubmission.points
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // ============ RATE LIMITING CHECK ============
    // Check if team is rate limited before processing
    const rateLimitCheck = await checkTeamRateLimit(supabaseClient, safeTeamName)

    if (rateLimitCheck.isLocked) {
      logAbusePattern(
        safeTeamName,
        rateLimitCheck.session,
        'MEDIUM',
        'Rate limited request attempted'
      )

      // Log to database for audit trail
      const ipAddress = req.headers.get('X-Forwarded-For') || req.headers.get('X-Real-IP')
      const userAgent = req.headers.get('User-Agent')
      await logAbuseToDB(
        supabaseClient,
        safeTeamName,
        challenge_id,
        rateLimitCheck.session,
        'medium',
        `Rate limited request (${rateLimitCheck.remainingSeconds}s remaining)`,
        ipAddress || undefined,
        userAgent || undefined
      )

      return new Response(
        JSON.stringify({
          error: 'Too many failed attempts. Please try again later.',
          status: 'rate_limited',
          remaining_seconds: rateLimitCheck.remainingSeconds,
          lockout_expires_at: rateLimitCheck.lockedUntil?.toISOString(),
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': rateLimitCheck.remainingSeconds.toString(),
          }
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

      // ============ RESET RATE LIMIT ON SUCCESS ============
      // Clear failed attempts and lockout when team submits correct flag
      await resetFailedAttempts(supabaseClient, safeTeamName)

      // Insert to leaderboard atomically with correct submission
      // Use unique constraint to prevent duplicates from race conditions
      const completionTime = new Date().toISOString()
      const basePoints = 100
      const timeBonus = time_spent && time_spent < 300 ? 50 : time_spent && time_spent < 600 ? 25 : 0
      const totalPoints = basePoints + timeBonus

      const leaderboardEntry: any = {
        team_name: safeTeamName,
        question_id: challenge_id,
        time_spent: time_spent || 0,
        attempts: attempts || 1,
        hints_used: hints_used || 0,
        start_time: start_time || completionTime,
        completion_time: completionTime,
        points: totalPoints,
        completed_at: completionTime,
        category: safeCategory,
        difficulty: safeDifficulty,
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
          console.log('Duplicate leaderboard entry prevented by unique constraint')
          leaderboardInserted = false // Record already exists
        } else {
          // Unexpected error - log it but don't fail the validation
          console.error('Leaderboard insert error:', insertError)
        }
      }
    } else {
      // ============ INCREMENT RATE LIMIT ON FAILURE ============
      // Track failed attempts and apply exponential backoff lockout
      const failureUpdate = await incrementFailedAttempts(supabaseClient, safeTeamName, rateLimitCheck.session)

      // Check for abuse patterns and log if necessary
      if (failureUpdate.newFailed >= 3) {
        const severity = failureUpdate.newLevel > 2 ? 'HIGH' : 'MEDIUM'
        const action = failureUpdate.lockedUntil ? 'Team locked out' : 'Threshold approaching'
        logAbusePattern(safeTeamName, rateLimitCheck.session, severity, action)
      }

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
          team_name: safeTeamName,
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
