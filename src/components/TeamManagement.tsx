import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Crown, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Team {
  id: string;
  team_id: string;
  team_name: string;
  members: string[];
  shared_points: number;
  created_at: string;
}

interface TeamManagementProps {
  onTeamJoined: (team: Team) => void;
}

export function TeamManagement({ onTeamJoined }: TeamManagementProps) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userTeam, setUserTeam] = useState<Team | null>(null);

  useEffect(() => {
    loadTeams();
    checkUserTeam();
  }, [user]);

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Error loading teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkUserTeam = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .contains('members', [user.id])
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      setUserTeam(data);
    } catch (err) {
      console.error('Error checking user team:', err);
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTeamName.trim()) return;

    try {
      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from('teams')
        .insert({
          team_id: teamId,
          team_name: newTeamName.trim(),
          members: [user.id],
          shared_points: 100
        })
        .select()
        .single();

      if (error) throw error;

      setTeams([data, ...teams]);
      setUserTeam(data);
      setNewTeamName('');
      setShowCreateForm(false);
      onTeamJoined(data);
    } catch (err) {
      console.error('Error creating team:', err);
      alert('Failed to create team. Please try again.');
    }
  };

  const joinTeam = async (team: Team) => {
    if (!user || userTeam) return;

    try {
      const updatedMembers = [...team.members, user.id];
      const { data, error } = await supabase
        .from('teams')
        .update({ members: updatedMembers })
        .eq('id', team.id)
        .select()
        .single();

      if (error) throw error;

      setUserTeam(data);
      setTeams(teams.map(t => t.id === team.id ? data : t));
      onTeamJoined(data);
    } catch (err) {
      console.error('Error joining team:', err);
      alert('Failed to join team. Please try again.');
    }
  };

  const leaveTeam = async () => {
    if (!user || !userTeam) return;

    try {
      const updatedMembers = userTeam.members.filter(id => id !== user.id);
      const { error } = await supabase
        .from('teams')
        .update({ members: updatedMembers })
        .eq('id', userTeam.id);

      if (error) throw error;

      setUserTeam(null);
      setTeams(teams.map(t => t.id === userTeam.id ? { ...t, members: updatedMembers } : t));
    } catch (err) {
      console.error('Error leaving team:', err);
      alert('Failed to leave team. Please try again.');
    }
  };

  const filteredTeams = teams.filter(team =>
    team.team_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin">
          <Users className="w-8 h-8 text-emerald-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Team Status */}
      {userTeam && (
        <div className="border border-emerald-500/20 bg-emerald-900/10 backdrop-blur-xl p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="w-6 h-6 text-emerald-400" />
            <h3 className="text-xl font-bold text-emerald-400">Your Team</h3>
          </div>
          <div className="space-y-2">
            <p className="text-emerald-300">
              <span className="text-emerald-400/60">Team Name:</span> {userTeam.team_name}
            </p>
            <p className="text-emerald-300">
              <span className="text-emerald-400/60">Members:</span> {userTeam.members.length}
            </p>
            <p className="text-emerald-300">
              <span className="text-emerald-400/60">Shared Points:</span> {userTeam.shared_points}
            </p>
          </div>
          <button
            onClick={leaveTeam}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-black font-semibold rounded-lg transition"
          >
            Leave Team
          </button>
        </div>
      )}

      {/* Create Team */}
      {!userTeam && (
        <div className="border border-emerald-500/20 bg-zinc-900/70 backdrop-blur-xl p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Plus className="w-6 h-6 text-emerald-400" />
              <h3 className="text-xl font-bold text-emerald-400">Create New Team</h3>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-semibold rounded-lg transition"
            >
              {showCreateForm ? 'Cancel' : 'Create Team'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={createTeam} className="space-y-4">
              <div>
                <label className="block text-emerald-400 mb-2">Team Name</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name"
                  className="w-full bg-black/50 border border-emerald-500/30 rounded px-4 py-3 text-emerald-400 placeholder-emerald-700 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-semibold py-3 rounded-lg transition"
              >
                Create Team
              </button>
            </form>
          )}
        </div>
      )}

      {/* Join Team */}
      {!userTeam && (
        <div className="border border-emerald-500/20 bg-zinc-900/70 backdrop-blur-xl p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="w-6 h-6 text-emerald-400" />
            <h3 className="text-xl font-bold text-emerald-400">Join Existing Team</h3>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-400/60" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search teams..."
              className="w-full bg-black/50 border border-emerald-500/30 rounded pl-10 pr-4 py-3 text-emerald-400 placeholder-emerald-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Teams List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredTeams.length === 0 ? (
              <p className="text-emerald-400/60 text-center py-8">No teams found</p>
            ) : (
              filteredTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 bg-black/30 border border-emerald-500/20 rounded-lg"
                >
                  <div>
                    <h4 className="text-emerald-400 font-semibold">{team.team_name}</h4>
                    <p className="text-emerald-300/60 text-sm">
                      {team.members.length} member{team.members.length !== 1 ? 's' : ''} • {team.shared_points} points
                    </p>
                  </div>
                  <button
                    onClick={() => joinTeam(team)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-semibold rounded-lg transition"
                  >
                    Join
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
