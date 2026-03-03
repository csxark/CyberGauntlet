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

    const { sort_by = 'severity', filter_severity = null, limit = 100, offset = 0 } = await req.json()

    // Validate sort column
    const validSortColumns = ['severity', 'created_at', 'team_id', 'challenge_id']
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'severity'

    // Build query
    let query = supabaseClient
      .from('admin_review_queue')
      .select('*', { count: 'exact' })

    // Apply severity filter if provided
    if (filter_severity && ['low', 'medium', 'high', 'critical'].includes(filter_severity)) {
      query = query.eq('severity', filter_severity)
    }

    // Apply sorting
    const sortOrder = sortColumn === 'created_at' ? 'desc' : 'asc'
    query = query.order(sortColumn, { ascending: sortOrder !== 'desc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get statistics
    const { data: stats, error: statsError } = await supabaseClient
      .from('leaderboard_integrity_flags')
      .select('severity', { count: 'exact' })
      .is('reviewed_by', null)

    const stats_by_severity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }

    if (!statsError && stats) {
      stats.forEach((item: any) => {
        stats_by_severity[item.severity as keyof typeof stats_by_severity]++
      })
    }

    return new Response(
      JSON.stringify({
        flagged_submissions: data || [],
        total_count: count || 0,
        limit,
        offset,
        statistics: {
          total_flagged: count || 0,
          by_severity: stats_by_severity
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error retrieving admin review queue:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
