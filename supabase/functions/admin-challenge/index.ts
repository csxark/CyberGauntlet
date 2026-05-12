import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** SHA-256 hex digest of a plain-text flag */
async function hashFlag(flag: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(flag)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth client (checks the caller's JWT) ──────────────────────────────
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // ── Service-role client (bypasses RLS for admin writes) ─────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // ── Verify caller is authenticated ──────────────────────────────────────
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Verify caller is an admin ────────────────────────────────────────────
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    const body = await req.json()
    const { action } = body

    // ════════════════════════════════════════════════════════════════════════
    // CREATE
    // ════════════════════════════════════════════════════════════════════════
    if (action === 'create') {
      const {
        id, title, description, category, difficulty,
        correct_flag, hints = [], file_name = '', file_path = '',
      } = body

      if (!id || !title || !description || !category || !difficulty || !correct_flag) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Insert challenge (correct_flag stored for reference; hash goes to validations)
      const { error: insertErr } = await supabaseAdmin
        .from('challenges')
        .insert({
          id,
          title,
          description,
          category,
          difficulty,
          correct_flag,   // stored server-side; client column-select excludes it
          hints,
          file_name,
          file_path,
          is_active: true,
        })

      if (insertErr) {
        return new Response(
          JSON.stringify({ success: false, error: insertErr.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Insert flag hash into challenge_validations
      const flagHash = await hashFlag(correct_flag)
      const { error: validErr } = await supabaseAdmin
        .from('challenge_validations')
        .upsert({
          challenge_id: id,
          correct_flag_hash: flagHash,
          feedback_messages: {
            correct: 'Flag verified successfully!',
            incorrect: 'Incorrect flag. Keep analyzing...',
            format_error: 'Invalid flag format. Flags should start with CG{ and end with }.',
            partial_hint: 'Getting closer!',
          },
        }, { onConflict: 'challenge_id' })

      if (validErr) {
        // Roll back challenge insert
        await supabaseAdmin.from('challenges').delete().eq('id', id)
        return new Response(
          JSON.stringify({ success: false, error: `Validation record failed: ${validErr.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: `Challenge "${title}" created.`, challenge_id: id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ════════════════════════════════════════════════════════════════════════
    // UPDATE
    // ════════════════════════════════════════════════════════════════════════
    if (action === 'update') {
      const {
        id, title, description, category, difficulty,
        new_flag, hints, file_name, file_path, is_active,
      } = body

      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Challenge id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Build update payload (only defined fields)
      const patch: Record<string, unknown> = {}
      if (title !== undefined) patch.title = title
      if (description !== undefined) patch.description = description
      if (category !== undefined) patch.category = category
      if (difficulty !== undefined) patch.difficulty = difficulty
      if (hints !== undefined) patch.hints = hints
      if (file_name !== undefined) patch.file_name = file_name
      if (file_path !== undefined) patch.file_path = file_path
      if (is_active !== undefined) patch.is_active = is_active
      if (new_flag !== undefined) patch.correct_flag = new_flag

      if (Object.keys(patch).length > 0) {
        const { error: updateErr } = await supabaseAdmin
          .from('challenges')
          .update(patch)
          .eq('id', id)

        if (updateErr) {
          return new Response(
            JSON.stringify({ success: false, error: updateErr.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // If a new flag was supplied, rotate the hash in challenge_validations
      if (new_flag) {
        const newHash = await hashFlag(new_flag)
        const { error: validErr } = await supabaseAdmin
          .from('challenge_validations')
          .upsert({
            challenge_id: id,
            correct_flag_hash: newHash,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'challenge_id' })

        if (validErr) {
          return new Response(
            JSON.stringify({ success: false, error: `Hash update failed: ${validErr.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: `Challenge "${id}" updated.` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ════════════════════════════════════════════════════════════════════════
    // TOGGLE ACTIVE
    // ════════════════════════════════════════════════════════════════════════
    if (action === 'toggle_active') {
      const { id, is_active } = body
      if (!id || is_active === undefined) {
        return new Response(
          JSON.stringify({ success: false, error: 'id and is_active required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await supabaseAdmin
        .from('challenges')
        .update({ is_active })
        .eq('id', id)

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: `Challenge "${id}" ${is_active ? 'activated' : 'deactivated'}.` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ════════════════════════════════════════════════════════════════════════
    // DELETE
    // ════════════════════════════════════════════════════════════════════════
    if (action === 'delete') {
      const { id } = body
      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Challenge id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete validation record first (FK child)
      await supabaseAdmin.from('challenge_validations').delete().eq('challenge_id', id)

      const { error } = await supabaseAdmin.from('challenges').delete().eq('id', id)
      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: `Challenge "${id}" deleted.` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('admin-challenge error:', message)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
