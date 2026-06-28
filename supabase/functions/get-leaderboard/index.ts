import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
}

interface TeamScore {
  team_name: string
  total_points: number
  challenges_completed: number
  total_time: number
  total_attempts: number
  last_completed: string
  best_time: number
  rank?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const sortBy = url.searchParams.get('sort') || 'points'
    const questionFilter = url.searchParams.get('challenge_id') || null
    const search = url.searchParams.get('search') || null

    if (page < 1 || limit < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid pagination parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    let query = supabaseClient
      .from('leaderboard')
      .select('*')
      .eq('completed_at', null, { is: false })
      .order('completed_at', { ascending: false })

    if (questionFilter) {
      query = query.eq('question_id', questionFilter)
    }

    const { data: allEntries, error } = await query

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch leaderboard' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Server-side aggregation
    const teamMap = new Map<string, TeamScore>()

    allEntries?.forEach((entry: any) => {
      const existing = teamMap.get(entry.team_name)
      if (existing) {
        existing.total_time += entry.time_spent || 0
        existing.total_attempts += entry.attempts || 0
        existing.challenges_completed += 1
        existing.total_points += entry.points || 0
        if (entry.completed_at && entry.completed_at > existing.last_completed) {
          existing.last_completed = entry.completed_at
        }
        if (!existing.best_time || (entry.time_spent && entry.time_spent < existing.best_time)) {
          existing.best_time = entry.time_spent || 0
        }
      } else {
        teamMap.set(entry.team_name, {
          team_name: entry.team_name,
          total_points: entry.points || 0,
          challenges_completed: 1,
          total_time: entry.time_spent || 0,
          total_attempts: entry.attempts || 0,
          last_completed: entry.completed_at || new Date().toISOString(),
          best_time: entry.time_spent || 0,
        })
      }
    })

    // Convert to array and sort
    let scores = Array.from(teamMap.values())

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      scores = scores.filter(team =>
        team.team_name.toLowerCase().includes(searchLower)
      )
    }

    // Apply sorting
    scores.sort((a, b) => {
      switch (sortBy) {
        case 'completed':
          return b.challenges_completed - a.challenges_completed || b.total_points - a.total_points
        case 'time':
          return a.total_time - b.total_time
        case 'points':
        default:
          return b.total_points - a.total_points
      }
    })

    // Add ranks
    scores = scores.map((team, idx) => ({
      ...team,
      rank: idx + 1,
    }))

    // Pagination
    const totalCount = scores.length
    const totalPages = Math.ceil(totalCount / limit)
    const offset = (page - 1) * limit
    const paginatedScores = scores.slice(offset, offset + limit)

    // Cache headers for 30 seconds (leaderboard updates are event-driven)
    const cacheControl = 'public, max-age=30'

    return new Response(
      JSON.stringify({
        data: paginatedScores,
        pagination: {
          page,
          limit,
          total: totalCount,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
        metadata: {
          generated_at: new Date().toISOString(),
          filter: questionFilter ? { challenge_id: questionFilter } : null,
          sort: sortBy,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': cacheControl,
        },
      }
    )
  } catch (error) {
    console.error('Error in get-leaderboard function:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
