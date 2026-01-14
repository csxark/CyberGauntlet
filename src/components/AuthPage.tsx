import React, { useState } from 'react';
import { Shield, Users, User, LogIn } from 'lucide-react';
import { GlitchText } from './GlitchText';
import { TerminalBox } from './TerminalBox';
import { validateTeam } from '../data/teamData';

interface AuthPageProps {
  onAuth: (teamId: string, teamName: string, leaderName: string) => void;
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const team = validateTeam(teamName.trim(), leaderName.trim());

      if (!team) {
        setError('Invalid team name or leader name. Please check and try again.');
        setLoading(false);
        return;
      }

      onAuth(team.id, teamName.trim(), leaderName.trim());
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono flex items-center justify-center p-4">
      <div className="scanlines"></div>
      <div className="relative z-10 w-full max-w-md">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-green-500" />
            <h1 className="text-4xl font-bold">
              <GlitchText text="CYBER" className="text-green-500" />
              <span className="text-green-400">GAUNTLET</span>
            </h1>
          </div>
          <p className="text-green-300/60 text-sm">Security Challenge Portal</p>
        </header>

        <TerminalBox title="login.sh">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-green-400 mb-2 text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                TEAM NAME:
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g., Echo Force"
                className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-3 text-green-400 placeholder-green-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                required
              />
            </div>

            <div>
              <label className="text-green-400 mb-2 text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                LEADER NAME:
              </label>
              <input
                type="text"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                placeholder="e.g., Michael Chen"
                className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-3 text-green-400 placeholder-green-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-black font-bold py-3 rounded-lg transition-all hover:shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-5 h-5" />
              {loading ? 'CONNECTING...' : 'REGISTER & LOGIN'}
            </button>
          </form>
        </TerminalBox>

        <div className="mt-6 text-center text-green-300/40 text-xs space-y-2">
          <p>Only one team member can access the platform at a time</p>
          <div className="mt-4 pt-4 border-t border-green-500/20">
            
          </div>
        </div>
      </div>
    </div>
  );
}
