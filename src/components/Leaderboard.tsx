import React, { useState, useEffect } from 'react';
import { Trophy, Clock, Target, TrendingUp, Award } from 'lucide-react';
import { supabase, isSupabaseConfigured, LeaderboardEntry } from '../lib/supabase';
import { TerminalBox } from './TerminalBox';

interface LeaderboardProps {
  currentTeamName?: string;
  questionFilter?: string;
}

interface TeamScore {
  team_name: string;
  total_time: number;
  total_attempts: number;
  challenges_completed: number;
  last_completed: string;
  best_time?: number;
  total_points: number;
}

export function Leaderboard({ currentTeamName, questionFilter }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'time' | 'completed' | 'points'>('points');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    loadLeaderboard();

    // Real-time subscription for live updates
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard',
        },
        () => {
          loadLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [questionFilter]);

  const loadLeaderboard = async () => {
    try {
      let query = supabase
        .from('leaderboard')
        .select('*')
        .order('completed_at', { ascending: false });

      if (questionFilter) {
        query = query.eq('question_id', questionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEntries(data || []);

      // Calculate team aggregate scores
      if (data) {
        const teamMap = new Map<string, TeamScore>();

        data.forEach((entry) => {
          const existing = teamMap.get(entry.team_name);
          if (existing) {
            existing.total_time += entry.time_spent;
            existing.total_attempts += entry.attempts;
            existing.challenges_completed += 1;
            existing.total_points += entry.points || 0;
            if (entry.completed_at && entry.completed_at > existing.last_completed) {
              existing.last_completed = entry.completed_at;
            }
            if (!existing.best_time || entry.time_spent < existing.best_time) {
              existing.best_time = entry.time_spent;
            }
          } else {
            teamMap.set(entry.team_name, {
              team_name: entry.team_name,
              total_time: entry.time_spent,
              total_attempts: entry.attempts,
              challenges_completed: 1,
              last_completed: entry.completed_at || new Date().toISOString(),
              best_time: entry.time_spent,
              total_points: entry.points || 0,
            });
          }
        });

        const scores = Array.from(teamMap.values());
        setTeamScores(scores);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const sortedTeams = [...teamScores].sort((a, b) => {
    if (sortBy === 'completed') {
      // Sort by challenges completed (desc), then by total points (desc)
      if (b.challenges_completed !== a.challenges_completed) {
        return b.challenges_completed - a.challenges_completed;
      }
      return b.total_points - a.total_points;
    } else if (sortBy === 'time') {
      // Sort by total time (asc)
      return a.total_time - b.total_time;
    } else {
      // Sort by total points (desc)
      return b.total_points - a.total_points;
    }
  });

  if (!isSupabaseConfigured) {
    return (
      <TerminalBox title="leaderboard.sh">
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4 opacity-50" />
          <p className="text-green-300/60 mb-2">Leaderboard Unavailable</p>
          <p className="text-green-300/40 text-sm">
            Configure Supabase to enable live leaderboard tracking
          </p>
        </div>
      </TerminalBox>
    );
  }

  if (loading) {
    return (
      <TerminalBox title="leaderboard.sh">
        <div className="text-center py-8">
          <div className="animate-spin mb-4 mx-auto">
            <Trophy className="w-12 h-12 text-green-500" />
          </div>
          <p className="text-green-300/60">Loading leaderboard...</p>
        </div>
      </TerminalBox>
    );
  }

  if (teamScores.length === 0) {
    return (
      <TerminalBox title="leaderboard.sh">
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-50" />
          <p className="text-green-300/60 mb-2">No Scores Yet</p>
          <p className="text-green-300/40 text-sm">
            Be the first to complete a challenge and claim the top spot!
          </p>
        </div>
      </TerminalBox>
    );
  }

  return (
    <TerminalBox title="leaderboard.sh">
      <div className="space-y-4">
        {/* Header with sort controls */}
        <div className="flex items-center justify-between pb-3 border-b border-green-500/20">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="text-green-400 font-bold">
              {questionFilter ? `Challenge ${questionFilter} Rankings` : 'Overall Rankings'}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-300/60">Sort by:</span>
            <button
              onClick={() => setSortBy('completed')}
              className={`px-2 py-1 rounded transition-colors ${
                sortBy === 'completed'
                  ? 'bg-green-500/20 text-green-400 border border-green-500'
                  : 'text-green-300/60 hover:text-green-400'
              }`}
            >
              Progress
            </button>
            <button
              onClick={() => setSortBy('time')}
              className={`px-2 py-1 rounded transition-colors ${
                sortBy === 'time'
                  ? 'bg-green-500/20 text-green-400 border border-green-500'
                  : 'text-green-300/60 hover:text-green-400'
              }`}
            >
              Speed
            </button>
            <button
              onClick={() => setSortBy('points')}
              className={`px-2 py-1 rounded transition-colors ${
                sortBy === 'points'
                  ? 'bg-green-500/20 text-green-400 border border-green-500'
                  : 'text-green-300/60 hover:text-green-400'
              }`}
            >
              Points
            </button>
          </div>
        </div>

        {/* Leaderboard entries */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedTeams.map((team, idx) => {
            const isCurrentTeam = currentTeamName && team.team_name === currentTeamName;
            const rank = idx + 1;

            return (
              <div
                key={team.team_name}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  isCurrentTeam
                    ? 'bg-green-500/20 border-2 border-green-500 shadow-lg shadow-green-500/20'
                    : 'bg-black/30 border border-green-500/20 hover:border-green-500/40'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Rank badge */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      rank === 1
                        ? 'bg-yellow-500 text-black'
                        : rank === 2
                        ? 'bg-gray-400 text-black'
                        : rank === 3
                        ? 'bg-orange-600 text-white'
                        : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                  </div>

                  {/* Team info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold ${isCurrentTeam ? 'text-green-300' : 'text-green-400'}`}>
                        {team.team_name}
                      </p>
                      {isCurrentTeam && (
                        <span className="text-xs bg-green-500 text-black px-2 py-0.5 rounded font-bold">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-green-300/60 mt-1">
                      <div className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>{team.challenges_completed} completed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        <span>{team.total_attempts} attempts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end text-green-400 font-mono text-sm">
                    <Trophy className="w-4 h-4" />
                    <span>{team.total_points} pts</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end text-green-300/60 text-xs mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(team.total_time)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer stats */}
        <div className="pt-3 border-t border-green-500/20 text-center text-xs text-green-300/40">
          <p>
            {teamScores.length} team{teamScores.length !== 1 ? 's' : ''} • {entries.length} challenge
            {entries.length !== 1 ? 's' : ''} completed • Live updates enabled
          </p>
        </div>
      </div>
    </TerminalBox>
  );
}
