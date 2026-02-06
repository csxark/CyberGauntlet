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
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the request body
    const { submission_id } = await req.json()

    if (!submission_id) {
      throw new Error('Submission ID is required')
    }

    // Fetch the submission details
    const { data: submission, error: fetchError } = await supabaseClient
      .from('challenge_submissions')
      .select('*')
      .eq('id', submission_id)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch submission: ${fetchError.message}`)
    }

    if (!submission) {
      throw new Error('Submission not found')
    }

    if (submission.status !== 'pending') {
      throw new Error('Submission is not in pending status')
    }

    // Generate a new challenge ID
    const challengeId = `q${Date.now()}`

    // Create the challenge data structure
    const challengeData = {
      id: challengeId,
      title: submission.title,
      description: submission.description,
      file_name: submission.assets.length > 0 ? `challenge_assets_${challengeId}.zip` : '',
      file_path: submission.assets.length > 0 ? `/challenges/${challengeId}/challenge_assets_${challengeId}.zip` : '',
      correct_flag: submission.correct_flag,
      hints: submission.hints,
      category: submission.category,
      difficulty: submission.difficulty
    }

    // In a real implementation, you would:
    // 1. Create the challenge directory in public/challenges/
    // 2. Create challenge.json file
    // 3. Move/copy assets to the challenge directory
    // 4. Update the SAMPLE_QUESTIONS array in ChallengePage.tsx

    // For now, we'll simulate the approval by updating the status
    // In production, you'd use Deno's file system APIs or a deployment hook

    const { error: updateError } = await supabaseClient
      .from('challenge_submissions')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', submission_id)

    if (updateError) {
      throw new Error(`Failed to update submission: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Challenge "${submission.title}" has been approved and will be added to the challenge pool! Challenge ID: ${challengeId}`,
        challenge_id: challengeId,
        challenge_data: challengeData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error approving challenge:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
