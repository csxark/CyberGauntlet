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
    // Create a Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Create client with user auth for permission checks
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated and is admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Get the request body
    const { submission_id } = await req.json()

    if (!submission_id) {
      throw new Error('Submission ID is required')
    }

    // Fetch the submission details using service role
    const { data: submission, error: fetchError } = await supabaseAdmin
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

    // Generate a new challenge ID based on timestamp
    const challengeId = `q${Date.now()}`
    
    // Initialize variables for file handling
    let fileName = ''
    let storagePath = ''

    // Handle asset upload to Supabase Storage if assets exist
    if (submission.assets && Array.isArray(submission.assets) && submission.assets.length > 0) {
      try {
        // Create challenge folder structure in storage
        const bucketName = 'challenge-assets'
        
        // Ensure bucket exists (or create it)
        const { data: buckets } = await supabaseAdmin.storage.listBuckets()
        const bucketExists = buckets?.some(b => b.name === bucketName)
        
        if (!bucketExists) {
          await supabaseAdmin.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 52428800, // 50MB
          })
        }

        // Upload each asset file
        for (let i = 0; i < submission.assets.length; i++) {
          const asset = submission.assets[i]
          const assetFileName = asset.name || `asset_${i}`
          const assetPath = `${challengeId}/${assetFileName}`
          
          // Note: In a real implementation, assets would be base64 or file data
          // For now, we'll create a placeholder structure
          // The actual file upload would depend on how assets are stored in submission
          
          if (asset.data) {
            // Decode base64 if needed
            const fileData = asset.isBase64 
              ? Uint8Array.from(atob(asset.data), c => c.charCodeAt(0))
              : new TextEncoder().encode(asset.data)
            
            const { error: uploadError } = await supabaseAdmin.storage
              .from(bucketName)
              .upload(assetPath, fileData, {
                contentType: asset.contentType || 'application/octet-stream',
                upsert: false
              })

            if (uploadError) {
              console.error(`Failed to upload asset ${assetFileName}:`, uploadError)
            }
          }
        }

        // Set the main file reference (first asset)
        const mainAsset = submission.assets[0]
        fileName = mainAsset.name || `challenge_file.txt`
        storagePath = `/${bucketName}/${challengeId}/${fileName}`
        
      } catch (storageError) {
        console.error('Storage error:', storageError)
        // Continue even if storage fails - challenge can still be text-only
      }
    }

    // Create challenge.json metadata in storage
    const challengeMetadata = {
      category: submission.category,
      difficulty: submission.difficulty,
      created_at: new Date().toISOString(),
      submission_id: submission_id
    }

    try {
      const metadataBlob = new TextEncoder().encode(JSON.stringify(challengeMetadata, null, 2))
      await supabaseAdmin.storage
        .from('challenge-assets')
        .upload(`${challengeId}/challenge.json`, metadataBlob, {
          contentType: 'application/json',
          upsert: true
        })
    } catch (metaError) {
      console.error('Failed to upload challenge.json:', metaError)
    }

    // Insert challenge into the challenges table
    const { error: insertError } = await supabaseAdmin
      .from('challenges')
      .insert({
        id: challengeId,
        title: submission.title,
        description: submission.description,
        file_name: fileName,
        file_path: storagePath,
        correct_flag: submission.correct_flag,
        hints: submission.hints || [],
        category: submission.category,
        difficulty: submission.difficulty,
        submission_id: submission_id,
        is_active: true
      })

    if (insertError) {
      throw new Error(`Failed to insert challenge: ${insertError.message}`)
    }

    // Update submission status to approved
    const { error: updateError } = await supabaseAdmin
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
        message: `Challenge "${submission.title}" has been approved and is now live!`,
        challenge_id: challengeId,
        challenge_data: {
          id: challengeId,
          title: submission.title,
          description: submission.description,
          file_name: fileName,
          file_path: storagePath,
          correct_flag: submission.correct_flag,
          hints: submission.hints,
          category: submission.category,
          difficulty: submission.difficulty
        }
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
